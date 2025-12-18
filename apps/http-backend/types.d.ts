import { Express, type Request } from "express";

export interface request extends Request {
    userId?: string 
}