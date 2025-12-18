import type WebSocket from "ws";
import { RoomManager } from "./RoomManager.js";

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
    public userId?: string;
    public roomId?: string[];
    public ws: WebSocket; 

    public constructor(ws: WebSocket){
        this.id = getRandomId(10);
        this.ws = ws;

        this.initHandlers();
    }

    public async initHandlers(){
        this.ws.on('message', async (data) => {
            const message = JSON.parse(data.toString());

            switch(message.event){
                case "create":
                    this.userId = message.userId;
                    const roomId = await RoomManager.getinstance().createRoom(this.userId!,message.name);
                    this.roomId?.push(roomId);
                    this.ws.send(JSON.stringify({roomId: roomId}));
                    break;
                case "join":
                    this.userId = message.userId;
                    await RoomManager.getinstance().addUser(message.roomId,this);
                    this.roomId?.push(message.roomId);
                    break;
                    //join, roomId, userId
                case "leave":
                    const leave = await RoomManager.getinstance().leaveUser(message.roomId,this.id);
                    this.roomId = this.roomId?.filter((r) => r !== message.roomId) as string[];
                    if(leave){
                        this.ws.send(JSON.stringify({message: "user left"}))
                    }
                    break;
                    //leave
                case "remove":
                    const remove = await RoomManager.getinstance().removeUser(message.roomId,message.userId,this.userId!);
                    
                    if(remove){
                        this.ws.send(JSON.stringify({message: "user removed by the admin"}))
                    }
                    break;
                    //remove
                case "message":
                    await RoomManager.getinstance().messageUser(message.roomId,message.userId,message.message);
                    break;
            }
        });
    }
}

//when i give a frontend call to the ws server -> send a token -> will verify me -> constructor initialisation userid and existing rooms added