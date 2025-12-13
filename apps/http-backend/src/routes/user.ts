import { Router } from "express";
import { userSigninSchema, userSignupSchema } from "../types/index.js";
import brcypt from 'bcrypt';
import { client } from "@repo/db/client";
import jwt from 'jsonwebtoken';

export const router = Router();

router.post('/signup', async (req,res) => {
    const userResult = userSignupSchema.safeParse(req.body);
    if(userResult.error){
        return res.status(400).json({message: "invalid inputs"});
    }
    const data = userResult.data;
    const hashedPassword = await brcypt.hash(data.password,10);
    try {
        const user = await client.user.create({
            data: {
                username: data.username,
                password: hashedPassword
            }
        })
        if(!process.env.JWT_SECRET){
            return res.status(403).json({message: 'unauthorized'});
        }
        const secret=process.env.JWT_SECRET;

        const token = jwt.sign(user.id,secret);
        res.json({
            userId: user.id,
            token: token
        })
    } catch (error) {
        console.log(error);
        res.status(400).json({
            message: "User already exists"
        }) 
    }
});

router.post('/signin', async (req,res)=> {
    const userResult = userSigninSchema.safeParse(req.body);
    if(userResult.error){
        return res.status(400).json({message: "invalid inputs"})
    }
    const result = userResult.data;

    try {
        
        const user = await client.user.findUnique({
            where:{
                username: result.username
            }
        });
        if(!user){
            return res.status(404).json({message: "not found"});
        }
        if(!process.env.JWT_SECRET){
            return res.status(403).json({message: 'unauthorized'});
        }
        const secret=process.env.JWT_SECRET;

        const token = jwt.sign(user.id,secret);
        
        return res.json({
            userId: user.id,
            token: token
        })

    } catch (error) {
        console.log(error);
        return res.status(400).json({
            message: "User not found"
        }) 
    }
})
