import type { NextFunction, Request, Response } from "express"
import jwt from 'jsonwebtoken';
import type { request } from "../../types.js";

export const userMiddleware = (req: request,res: Response, next: NextFunction) => {
    
    const token = req.headers["authorization"] ;
    
    if(!token){
        return res.status(403).json({message: "unauthorized"});
    }

    if(!process.env.JWT_SECRET){
        return res.status(400).json({message: 'wrong secret'})
    }
    const secret = process.env.JWT_SECRET;
    const userId = jwt.verify(token,secret) as string;

    req.userId = userId;
    next();
}