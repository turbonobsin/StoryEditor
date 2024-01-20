import * as http from "http";
import express, { NextFunction, Request, Response } from "express";
import {Server, Socket} from "socket.io";
import fs from "fs";

console.log("started...");

export function access(path:string){
    return new Promise<boolean>(resolve=>{
        fs.access(path,err=>{
            if(err){
                console.log("err: ",err);
                resolve(false);
            }
            else resolve(true);
        });
    });
}
export function write(path:string,data:any,encoding?:BufferEncoding){
    return new Promise<boolean>(resolve=>{
        fs.writeFile(path,data,{encoding},err=>{
            if(err){
                console.log("err: ",err);
                resolve(false);
            }
            else resolve(true);
        });
    });
}
export function read(path:string,encoding?:BufferEncoding){
    return new Promise<any>(resolve=>{
        fs.readFile(path,{encoding},(err,data)=>{
            if(err){
                console.log("err: ",err);
                resolve(null);
            }
            else resolve(data);
        });
    });
}
export function removeFile(path:string){
    return new Promise<boolean>(resolve=>{
        fs.rm(path,err=>{
            if(err){
                console.log("err: ",err);
                resolve(false);
            }
            else resolve(true);
        });
    });
}
export function mkdir(path:string,encoding?:BufferEncoding){
    return new Promise<boolean>(resolve=>{
        fs.mkdir(path,{recursive:true},err=>{
            if(err){
                console.log("err: ",err);
                resolve(false);
            }
            else resolve(true);
        });
    });
}
export function readdir(path:string){
    return new Promise<string[]>(resolve=>{
        fs.readdir(path,(err,files)=>{
            if(err){
                console.log("err: ",err);
                resolve(null);
            }
            else resolve(files);
        });
    });
}

const app = express();
const server = http.createServer(app);
const io = new Server(server,{
    cors:{
        // origin:"http://127.0.0.1:5500"
        origin:"*"
    }
});

class User{
    constructor(id:string,name:string){
        this.id = id;
        this.name = name;
    }
    id:string;
    name:string;
    async save(){
        let str = JSON.stringify({
            name:this.name
        });
        await write("users/"+this.name+".json",str);
    }
}
class Project{
    owner:string;
    active:string[];
}

const users:Map<string,User> = new Map();

io.on("connection",socket=>{
    socket.on("login",(name:string,f:(u:User)=>void)=>{
        let user = users.get(socket.id);
        if(!user){
            user = new User(socket.id,name);
            users.set(socket.id,user);
        }
        f(user);
    });
});

server.listen(3000,()=>{
    console.log('listening on *:3000');
});