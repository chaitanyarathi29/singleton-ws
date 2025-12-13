import { PrismaClient } from './generated/prisma/client';
import dotenv from 'dotenv';
dotenv.config();

if(!process.env.ACCELERATE_URL){
    throw new Error('accelerate url doesnot exist');
}

export const client = new PrismaClient({
    accelerateUrl: process.env.ACCELERATE_URL
})