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

    public async createRoom(user:User, name: string) {
        
        const room = await client.room.create({
            data: {
                name: name
            }
        });

        const roomId = room.id;
        await client.roomAdmin.create({
            data: {
                adminId: user.userId,
                roomId: roomId
            }
        });
        await client.roomMember.create({
            data: {
                userId: user.userId,
                roomId: roomId
            }
        })
        this.rooms.set(roomId,[user]);
        
        return roomId;
    }

    public async addUser(roomId:string,user: User) {
        if(!(this.rooms.get(roomId))){
            throw new Error('room not found');
        }
        let users = this.rooms.get(roomId) ?? [];
        for(let u of users){
            if(u.id === user.id){  //so that the join event agr do baar request krdiya then i will recieve the message twice
                return false;
            }
        }
        try {
            const ifUserExists = await client.roomMember.findFirst({
                where: {
                    userId: user.userId,
                    roomId: roomId
                }
            });
            if(!ifUserExists){
                await client.roomMember.create({
                    data: {
                        userId: user.userId,
                        roomId: roomId
                    }
                })
            }
        } catch (error) {
            throw new Error('db call failed');    
        }
        this.rooms.set(roomId,[...users,user]);
        return true;
    }

    public async leaveUser(roomId:string, userId: string){
        let users = this.rooms.get(roomId) ?? [];
        try {
            const user = await client.roomMember.findFirst({
                where: {
                    userId: userId,
                    roomId: roomId
                }
            });
            if(!user){
                return false;
            }
            await client.roomMember.delete({
                where: {
                    id: user?.id
                }
            });
            users = users.filter((u) => userId !== u.userId); //and if i am leaving from a tab for eg toh mera vhi waala connection should be closed....
            this.rooms.set(roomId, users);
            return true;
        } catch (error) {
            return false;
        } 
    }

    public async removeUser(roomId:string, username: string, adminId: string){

        try {
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
        const user = await client.user.findUnique({
            where:{
                username: username
            }
        })
        if(!user){
            return false;
        }
        const rem = await client.roomMember.findFirst({
            where:{
                userId: user?.id,
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
                id: rem.id
            }
        });
        users = users.filter((u) => {
            if(user.id == u.userId){
                u.ws.close();
            }  //if admin is removing me so mere jitne bhi connections h all of them should be removed from the roomId....
        });
        this.rooms.set(roomId, users);
        return true;
        } catch (error) {
            return false;
        } 
    }

    public async messageUser(roomId: string,user: User, message: string){
        try {
            const mess = await client.message.create({
                data: {
                    roomId: roomId,
                    userId: user.userId,
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