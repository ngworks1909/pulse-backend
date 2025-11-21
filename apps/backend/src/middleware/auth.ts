import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/client";

interface jwtClaims{
  userId: string,
}

interface jwtDecode{
    user: Pick<jwtClaims, "userId"> & {role: string}
}

export type UserRequest = Request & {user?: jwtClaims}

export const verifyAuth = (role: "ADMIN" | "USER") => async(req: UserRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).json({message: "Unauthorized"});
    }
    const token = authHeader.split(" ")[1];
    if(!token){
        return res.status(401).json({message: "Unauthorized"});
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwtDecode;
        const userId = decoded.user.userId
        const user = await prisma.user.findUnique({
            where: {
                userId,
            }, select: {userId: true, role: true}
        });
        if(!user){
            return res.status(401).json({message: "Unauthorized"});
        }

        if(user.role !== role){
            return res.status(403).json({message: "Forbidden"});
        }
        
        req.user = user
        next();
    } catch (error) {
        return res.status(500).json({message: "Invalid or expired token"});
    }
}