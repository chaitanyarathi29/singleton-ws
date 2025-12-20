import type WebSocket from "ws";
import { RoomManager } from "./RoomManager.js";
import client from "@repo/db/client";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

function getRandomId(length: number) {    

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result = characters.charAt(Math.floor(Math.random() * characters.length)) + result;
    }
    return result;
}

export class User {
    public id: string;
    public userId: string;
    public roomId: string[];
    public ws: WebSocket; 

    public constructor(ws: WebSocket, token: string){
        this.id = getRandomId(10);
        this.ws = ws;
        if(!process.env.JWT_SECRET){
            throw new Error('unauthorized');
        }
        const uid = jwt.verify(token,process.env.JWT_SECRET)as string;
        this.userId = uid;
        this.roomId = [];
        this.initHandlers();
    }

    public async initHandlers(){
        const rooms = await client.user.findUnique({
                where:{
                    id: this.userId!
                },select: {
                    rooms: true
                }
            });
            if(rooms){
                for( let room of rooms.rooms){
                    this.roomId?.push(room.id);
                }
            };
        this.ws.on('message', async (data) => {
            try{
                console.log(data);
                const message = JSON.parse(data.toString());

                switch(message.event){
                case "create":
                    const roomId = await RoomManager.getinstance().createRoom(this,message.name);
                    this.roomId?.push(roomId);
                    this.ws.send(JSON.stringify({roomId: roomId}));
                    break;
                case "join":
                    const join = await RoomManager.getinstance().addUser(message.roomId,this);
                    this.roomId?.push(message.roomId);
                    if(join){
                        this.ws.send(JSON.stringify({message: 'joined'}));
                    }else{
                        this.ws.send(JSON.stringify({message: 'user already exists'}));
                    }
                    break;
                    //join, roomId, userId
                case "leave":
                    const leave = await RoomManager.getinstance().leaveUser(message.roomId,this.userId);
                    this.roomId = this.roomId?.filter((r) => r !== message.roomId) as string[];
                    if(leave){
                        this.ws.send(JSON.stringify({message: "user left"}))
                    }
                    break;
                    //leave
                case "remove":
                    const remove = await RoomManager.getinstance().removeUser(message.roomId,message.username,this.userId);
                    if(remove){
                        this.ws.send(JSON.stringify({message: "user removed by the admin"}))
                    }
                    break;
                    //remove
                case "message":
                    await RoomManager.getinstance().messageUser(message.roomId,this,message.message);
                    break;
            }
            } catch (error) {
                console.error('Error processing message:', error);
                this.ws.send(JSON.stringify({error: "Failed to process message"}));
            }
        });
    }
}

//when i give a frontend call to the ws server -> send a token -> will verify me -> constructor initialisation userid and existing rooms added