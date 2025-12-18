import { User } from "./User.js";
import client from '@repo/db/client';

export class RoomManager {
    rooms: Map< string,User[] >;
    static instance: RoomManager;

    private constructor() {
        this.rooms = new Map();
    }

    public static getinstance() {
        if(!this.instance){
            this.instance = new RoomManager();
        }
        return this.instance;
    } 

    public async createRoom(userId:string, name: string) {
        
        const room = await client.room.create({
            data: {
                name: name
            }
        });

        const roomId = room.id;
        await client.roomAdmin.create({
            data: {
                adminId: userId,
                roomId: roomId
            }
        });
        return roomId;

    }

    public async addUser(roomId:string,user: User) {
        if(!(this.rooms.get(roomId))){
            throw new Error('room not found');
        }
        let users = this.rooms.get(roomId) ?? [];
        for(let u of users){
            if(u.id === user.id){  //so that the join event agr do baar request krdiya then i will recieve the message twice
                return;
            }
        }
        try {
            await client.roomMember.create({
            data: {
                userId: user.userId!,
                roomId: roomId
            }
            })
        } catch (error) {
            throw new Error('db call failed');    
        }
        this.rooms.set(roomId,[...users,user]);
        return;
    }

    public async leaveUser(roomId:string, userId: string){
        let users = this.rooms.get(roomId) ?? [];
        try {
            const uid = await client.user.findUnique({
            where: {
                username: userId
            },
            select: {
                id: true
            }
            });
            if(!uid){
                return false;
            }
            await client.roomMember.delete({
                where: {
                    id: uid.id
                }
            });
        } catch (error) {
            return false;
        } 
        users = users.filter((u) => userId !== u.userId); //and if i am leaving from a tab for eg toh mera vhi waala connection should be closed....
        this.rooms.set(roomId, users);
        return true;
    }

    public async removeUser(roomId:string, userId: string, adminId: string){

        let users = this.rooms.get(roomId) ?? [];
        const id = await client.roomAdmin.findFirst({
            where: {
                adminId: adminId,
                roomId: roomId
            }
        });
        if(!id){
            return false;
        }
        const rem = await client.roomMember.findFirst({
            where:{
                userId: userId,
                roomId: roomId
            },
            select: {
                id: true
            }
        });
        if(!rem){
            return false;
        }
        await client.roomMember.delete({
            where: {
                id: rem?.id
            }
        });
        users = users.filter((u) => {
            userId !== u.userId  //if admin is removing me so mere jitne bhi connections h all of them should be removed from the roomId....
            u.ws.close()
        });
        this.rooms.set(roomId, users);
        return true; 
    }

    public async messageUser(roomId: string, userId: string, message: string){
        try {
            const mess = await client.message.create({
                data: {
                    roomId: roomId,
                    userId: userId,
                    message: message
                }
            });
            const users = this.rooms.get(roomId) ?? [];
            for( let u of users){
                u.ws.send(JSON.stringify({message, roomId}));
            }
        } catch (error) {
            throw new Error('db call failed');
        }
    }

}