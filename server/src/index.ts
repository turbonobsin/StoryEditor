const port = 3001;

import * as http from "http";
import express, { NextFunction, Request, Response } from "express";
import {Server, Socket} from "socket.io";
import fs from "fs";
import cors from "cors";
import readline from "readline";

console.log("started...");

export function access(path:string){
    return new Promise<boolean>(resolve=>{
        fs.access(path,err=>{
            if(err){
                // console.log("err: ",err);
                resolve(false);
            }
            else resolve(true);
        });
    });
}
export function write(path:string,data:any,encoding?:BufferEncoding){
    return new Promise<boolean>(resolve=>{
        fs.writeFile(path,data,{encoding:"utf8"},err=>{
            if(err){
                console.log("err: could not find path: ",path);
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
                // console.log("err: ",err);
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
                // console.log("err: ",err);
                resolve(false);
            }
            else resolve(true);
        });
    });
}
export function removeDir(path:string){
    return new Promise<boolean>(resolve=>{
        // @ts-ignore
        fs.rm(path,{recursive:true},err=>{
            if(err){
                resolve(false);
            }
            else resolve(true);
        });
    });
}
export function mkdir(path:string){
    return new Promise<boolean>(resolve=>{
        fs.mkdir(path,{recursive:true},err=>{
            if(err){
                // console.log("err: ",err);
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
                // console.log("err: ",err);
                resolve(null);
            }
            else resolve(files);
        });
    });
}
export function copyFile(path:string,to:string){
    return new Promise<boolean>(resolve=>{
        fs.copyFile(path,to,(err)=>{
            if(err){
                // console.log("err: ",err);
                resolve(false);
            }
            else resolve(true);
        });
    });
}
export function copyDir(path:string,to:string){
    return new Promise<boolean>(resolve=>{
        fs.cp(path,to,{recursive:true},(err)=>{
            if(err){
                // console.log("err: ",err);
                resolve(false);
            }
            else resolve(true);
        });
    });
}

////////////////////////////////////////

class Story{
    constructor(project:Project){
        this._i = 0;
        this.start = new Board(this,0,g_gap);
        this.origin = new OriginPoint(this,0,0);
    }
    project:Project;

    // filename:string;
    _i:number;
    start:Board;
    origin:StoryObj;

    panX = 0;
    panY = 0;

    allBoards:Board[] = [];
    loadedObjs:StoryObj[] = [];

    // 

    isPanning = false;
    sx = 0;
    sy = 0;
    lx = 0;
    ly = 0;
    zoom = 1;
    hoverBoard:Board;
    selBoards:Board[] = [];
    dragBoards:Board[] = [];

    needsSave = false;
    _isSaving = false;

    // 

    init(){
        this.start.load();
        this.origin.load();
        this.makeConnection(this.origin,this.start,ConnectionType.start);
    }
    setZoom(v:number){
        this.zoom = v;
    }

    updateAllBoards(){
        for(const b of this.loadedObjs){
            b.update();
        }
    }
    addObj(o:StoryObj){
        if(!this.loadedObjs.includes(o)){
            this.loadedObjs.push(o);
            if(o instanceof Board) this.allBoards.push(o);
        }
    }
    deleteBoard(b:Board){
        let list = [...b.connections];
        for(const c of list){
            c.remove();
        }
        this.loadedObjs.splice(this.loadedObjs.indexOf(b),1);
        this.allBoards.splice(this.allBoards.indexOf(b),1);
    }

    makeConnection(from:StoryObj,to:StoryObj,type=ConnectionType.path){
        let c = new Connection(this,0,0,from,to,type);
        from.connections.push(c);
        to.connections.push(c);
        c.load();
    }
    makePath(from:Board,to:Board,ref:StoryButton){
        let c = new PathConnection(this,from,to,ref);
        from.connections.push(c);
        to.connections.push(c);
        c.load();
        return c;
    }

    // File Management
    getSaveObj(){
        let o = {
            filename:this.project.name,
            display:this.project.display,
            _i:this._i,
            panX:this.panX,
            panY:this.panY,
            start:this.start._id ?? 0,
            boards:this.loadedObjs.map(v=>v.save()).filter(v=>v!=null)
        };
        return o;
    }
    save(){
        this.needsSave = true;
    }
    handle:FileSystemDirectoryHandle;
    async _save(){
        if(this._isSaving) return;
        this._isSaving = true;
        let o = this.getSaveObj();
        let str = JSON.stringify(o);
        await write("projects/"+this.project.owner+"/"+this.project.name+"/data.json",str,"utf8");
        console.log("...saved story: ",this.project.name);
        this._isSaving = false;
    }
    static async load(project:Project){
        let str = await read("projects/"+project.owner+"/"+project.name+"/data.json","utf8");
        // console.log("DATA STR: ",str.length);
        let o:any;
        try{
            o = JSON.parse(str);
            // console.log("O: ",o);
        }
        catch(e){
            return;
        }
        
        let s = new Story(project);
        s.project = project;
        s._i = 0;

        let o1 = (o.start == null ? (o.boards.find((v:Board)=>v != null)) : (o.boards.find((v:Board)=>v._id == o.start)));
        let root = new Board(s,o1.x,o1.y,o1.title,o1.text,o1.tags);
        root.img = o1.img;
        root.audio = o1.audio;
        root._id = o1._id;
        s.start = root;
        root.load();
        
        let list:Board[] = [root];
        for(let i = 1; i < o.boards.length; i++){
            let b = o.boards[i];
            if(!b) continue;
            let b1 = new Board(s,b.x,b.y,b.title,b.text,b.tags);
            b1.img = b.img;
            b1.audio = b.audio;
            b1._id = b._id;
            list.push(b1);
        }
        for(let i = 0; i < o.boards.length; i++){
            let b = o.boards[i];
            if(!b) continue;
            let b1 = list[i];
            b1.addChoice(b.btns.map((v:any)=>v.l),b.btns.map((v:any)=>v.c),b.btns.map((v:any)=>list.find(w=>w._id == v.id)));
        }
        for(const b of list){
            if(b) if(!b._loaded) b.load();
        }

        s._i = o._i;

        return s;
    }
    // Network commands
    getBoard(id:number){
        return this.allBoards.find(v=>v._id == id);
    }
    moveBoardTo(id:number,x:number,y:number){
        let b = this.getBoard(id);
        if(!b) return;
        b.x = x;
        b.y = y;
        b.update();
    }
}
let g_gap = 200;
class StoryObj{
    constructor(title:string,story:Story,x:number,y:number){
        this.title = title;
        this.story = story;
        this.x = x;
        this.y = y;
    }
    title:string;
    story:Story;
    x:number;
    y:number;
    load(){
        this._loaded = true;
    }
    _loaded = false;

    left = 0;
    right = 0;
    top = 0;
    bottom = 0;

    update(){
        for(const c of this.connections){
            c.update();
        }
    }

    connections:Connection[] = [];
    addConnection(c:Connection){
        
    }
    removeConnection(c:Connection){
        if(!this.connections.includes(c)) return;
    }

    write(){
        this.update();
    }

    select(){

    }
    deselect(){

    }

    save():any{return null}
}
enum ConnectionType{
    start,
    path
}
class Connection extends StoryObj{
    constructor(story:Story,x:number,y:number,from:StoryObj,to:StoryObj,type:ConnectionType){
        super("",story,x,y);
        this.from = from;
        this.to = to;
        this.type = type;
    }
    from:StoryObj;
    to:StoryObj;
    type:ConnectionType;
    load(): void {
        super.load();
        this.update();
    }
    update(): void {

    }
    remove(){
        this.from.connections.splice(this.from.connections.indexOf(this),1);
        this.to.connections.splice(this.to.connections.indexOf(this),1);
    }
}
class PathConnection extends Connection{
    constructor(story:Story,from:Board,to:Board,ref:StoryButton){
        super(story,0,0,from,to,ConnectionType.path);
        this.ref = ref;
    }
    declare from:Board;
    declare to:Board;
    ref:StoryButton;
    load(): void {
        super.load();
    }
    update(): void {
        super.update();
    }
    remove(): void {
        super.remove();
        this.from.buttons.splice(this.from.buttons.indexOf(this.ref),1);
    }
}
class OriginPoint extends StoryObj{
    constructor(story:Story,x:number,y:number){
        super("Origin/Start",story,x,y);
    }
    load(): void {
        super.load();
        this.story.addObj(this);
        this.update();
    }
}
class Board extends StoryObj{
    constructor(story:Story,x:number,y:number,title?:string,text?:string,tags?:string[]){
        super(title || "New Board "+(story._i+1),story,x,y);
        this.text = text || "Here is some default text.";
        this._id = story._i++;
        this.tags = tags || [];
        if(tags == null || tags?.length == 0) this.tags.push(this.title.toLowerCase().replaceAll(" ","_"));
    }
    text:string;
    buttons:StoryButton[] = [];
    tags:string[];

    _id:number;

    l_title:HTMLElement;
    l_tag:HTMLElement;

    img:string;
    audio:string;

    load(){
        super.load();
        this.story.addObj(this);
        this.update();
    }

    update(): void {
        super.update();
    }
    updateConnections(){
        for(const c of this.connections){
            c.update();
        }
    }

    addChoice(labels:string[],cols:string[],custom?:Board[]){
        let i = 0;
        let w = (labels.length-1)*g_gap;
        let list:Board[] = [];
        for(const l of labels){
            if(custom) if(!custom[i]){
                i++;
                // console.warn("... disconnection?");
                continue;
            }
            let b:Board;
            let btn:StoryButton;
            if(!custom){
                b = new Board(this.story,this.x-w/2+i*g_gap,this.y+g_gap);
            }
            else{
                b = custom[i];
            }
            list.push(b);
            btn = new StoryButton(l,b,this,cols[i]||"#ff0000");
            this.buttons.push(btn);
            b.load();

            btn.path = this.story.makePath(this,b,btn);
            i++;
        }
        return list;
    }
    removeChoice(i:number[],deleteBoard=false){
        let list = i.map(v=>this.buttons[v]);
        for(const b of list){
            if(!b) continue;
            let con = this.connections.find(v=>v.to == b.board);
            b.board.connections.splice(b.board.connections.indexOf(con),1);
            this.connections.splice(this.connections.indexOf(con),1);
            this.buttons.splice(this.buttons.indexOf(b),1);
            if(deleteBoard){
                this.story.deleteBoard(b.board);
            }
        }
    }

    write(): void {
        super.write();
        this.story.save();
    }

    select(): void {
        super.select();
    }

    save() {
        let o = {
            title:this.title,
            x:this.x,
            y:this.y,
            _id:this._id,
            text:this.text,
            tags:this.tags,
            img:this.img,
            audio:this.audio,
            btns:this.buttons.map(v=>{
                let o2 = {
                    l:v.label,
                    c:v.col,
                    id:v.board._id
                };
                return o2;
            })
        };
        return o;
    }

    _done = false;
}
class StoryButton{
    constructor(label:string,board:Board,par:Board,col:string){
        this.label = label;
        this.board = board;
        this.par = par;
        this.col = col;
    }
    label:string;
    board:Board;
    par:Board;
    path:PathConnection;
    col:string;
}

////////////////////////////////////////

const app = express();
app.use(cors({
//    origin:"http://localhost:5500",
   origin:"*",
   methods:["GET","POST"],
   allowedHeaders:["Content-Type"]
}));
// app.use((req,res,next)=>{
//     res.header("Access-Control-Allow-Origin","*");
//     next();
// });
// app.use("/test",express.static("../../"));
// app.use(express.static("../../"));
app.use("/",express.static("../../"));
app.use("/projects",(req,res,next)=>{
    next();
},express.static("projects/"));

const server = http.createServer(app);
const io = new Server(server,{
    cors:{
        // origin:"http://127.0.0.1:5500"
        origin:"*"
    },
    maxHttpBufferSize:1e7
});

class User{
    constructor(socket:Socket,name:string,email:string,pass:string){
        this.socket = socket;
        this.id = socket?.id;
        this.name = name;
        this.email = email;
        this.pass = pass;
    }
    id:string;
    name:string;
    email:string;
    myProjects:string[];
    socket:Socket;
    pass:string;
    allowedSocks:string[] = [];

    // story tmp

    selBoards:number[] = [];

    // 

    room(){
        if(!this.curProject) return;
        return this.socket.to(this.curProject.getId());
    }
    serialize(){
        return {
            name:this.name,
            email:this.email,
            myProjects:this.myProjects,
        };
    }
    serializeSave(){
        return {
            name:this.name,
            email:this.email,
            myProjects:this.myProjects,
            pass:this.pass
        };
    }
    async save(){
        let str = JSON.stringify(this.serializeSave());
        await write("users/"+this.email+".json",str,"utf8");
        if(!await access("projects/"+this.email)){
            await mkdir("projects/"+this.email);
            // await mkdir("projects/"+this.email+"/images");
            // await mkdir("projects/"+this.email+"/audio");
        }
    }
    static from(data:any,socket:Socket){
        let u = new User(socket,null,null,null);
        let ok = Object.keys(data);
        for(const k of ok){
            u[k] = data[k];
        }
        return u;
    }
    curProject:Project;
    async createProject(name:string,code:string){
        let exists = await access("projects/"+this.email+"/"+name+"/meta.json");
        if(exists){
            console.log("** project already exists, not creating");
            return;
        }
        let p = new Project();
        p.name = name;
        p.display = name;
        p.code = code;
        p.owner = this.email;
        p._owner = this;
        projects.set(p.getId(),p);
        await mkdir("projects/"+this.email+"/"+name);
        let dataStr = await read("TestFile2.json","utf8");
        let data = JSON.parse(dataStr);
        data.filename = name;
        data.owner = this.email;
        await write("projects/"+this.email+"/"+name+"/data.json",JSON.stringify(data),"utf8");
        p.save();
        console.log(":: created project: "+name+" by "+this.email);
        return 1;
    }
    async openProject(socket:Socket,email:string,name:string,code:string,f:(d:any)=>void){
        if(this.curProject) this.leaveProject();
        let p = await getProject(email,name);
        if(!p){
            console.log("** tried to get project that doesn't exist: "+name+" by "+this.email);
            if(f) f({err:"a project with that name doesn't exist",code:0});
            return;
        }
        if(p.code != code && p.code != null){
            if(f) f({err:"wrong code",code:1});
            return;
        }
        this.curProject = p;
        if(!p.active.includes(this.email)){
            p.active.push(this.email);
            p._active.push(this);
        }
        // if(!this.socket) this.socket = socket;
        if(!this.socket){
            console.log("Err: could not find user socket");
            return;
        }
        this.socket.join(this.curProject.getId());
        console.log(this.email+" joined: "+this.curProject.name,p.active);
        for(const u of p._active){
            this.socket.emit("userJoined",this.email,false,{email:u.email,name:u.name});
        }
        this.socket.to(p.getId()).emit("userJoined",null,true,{email:this.email,name:this.name});
        return p;
    }
    leaveProject(){
        if(this.curProject){
            this.socket.leave(this.curProject.getId());
            console.log(this.email+" left: "+this.curProject.name);
            let p = this.curProject;
            p.active.splice(p.active.indexOf(this.email),1);
            p._active.splice(p._active.indexOf(this),1);
            io.to(p.getId()).emit("userLeft",{email:this.email,name:this.name});

            for(const id of this.selBoards){
                this.room().emit("deselectBoard",this.email,id);
            }
            this.selBoards = [];

            this.curProject = null;
        }
    }
}
async function openProjectReadOnly(email:string,name:string,code:string,f?:(data:any)=>void){
    let p = await getProject(email,name);
    if(!p){
        if(f) f({err:"a project with that name doesn't exist",code:0});
        return;
    }
    if(p.code != code && p.code != null){
        if(f) f({err:"wrong code",code:1});
        return;
    }
    return p;
}
class Project{
    constructor(){
        this.active = [];
        this._active = [];
    }
    display:string;
    owner:string;
    active:string[];
    _owner:User;
    _active:User[];
    name:string;
    code:string;

    _data:string;

    story:Story;

    images:string[] = [];
    audio:string[] = [];

    getId(){
        return this.owner+"_"+this.name;
    }
    static from(data:any,u:User){
        let p = new Project();
        p.owner = u.email;
        p.name = data.name;
        p.display = data.display;
        p._owner = u;
        let ok = Object.keys(data);
        for(const k of ok){
            p[k] = data[k];
        }
        return p;
    }
    serializeNetwork(){
        return {
            name:this.name,
            owner:this.owner,
            active:this.active,
            storyData:this.story.getSaveObj(),
            userData:this._active.map(v=>{
                return {
                    email:v.email,
                    name:v.name,
                    sel:v.selBoards
                };
            })
        };
    }
    serialize(){
        return {
            name:this.name,
            owner:this.owner,
            code:this.code,
            display:this.display||this.name
        };
    }
    async save(){
        await write("projects/"+this.owner+"/"+this.name+"/meta.json",JSON.stringify(this.serialize()),"utf8");
        if(this.story) this.story._save();
        // await write("projects/"+this.owner+"/"+this.name+"/data.json",this._data,"utf8");
        console.log("-- saved project: "+this.name);
        io.to(this.getId()).emit("alert-save");
    }

    changeDisplayName(display:string){
        this.display = display;
        this.save();
    }
}

const users:Map<string,User> = new Map();
const projects:Map<string,Project> = new Map();

async function getWho(socket:Socket){
    let u = users.get(socket.id);
    if(u){
        if(!u.allowedSocks.includes(socket.id)){
            console.log(" >> a user wasn't logged in but tried to access");
            socket.emit("fix","The server has reloaded, this page will refresh to reconnect");
            return;
        }
        return u;
    }
    return;
    let email = await new Promise<string>(resolve=>{
        socket.emit("requestUsername",(email:string,name:string)=>{
            resolve(email);
        });
    });
    if(!email) return;
    u = await new Promise<User>(async resolve=>{
        fs.readFile("users/"+email+".json",{encoding:"utf8"},(err,data)=>{
            if(err) resolve(null);
            else{
                try{
                    resolve(User.from(JSON.parse(data),socket));
                }
                catch(e){
                    resolve(null);
                }
            }
        });
    });
    return u;
}
async function getUserByEmail(email:string){
    if(!email) return;
    for(const [k,v] of users){
        if(v.email == email){
            return v;
        }
    }
    if(!(await access("users/"+email+".json"))) return;
    return await new Promise<User>(async resolve=>{
        fs.readFile("users/"+email+".json",{encoding:"utf8"},(err,data)=>{
            if(err) resolve(null);
            else{
                try{
                    resolve(User.from(JSON.parse(data),null));
                }
                catch(e){
                    resolve(null);
                }
            }
        });
    });
}
async function getProject(email:string,pname:string){
    if(!email) return;
    let p = projects.get(email+"_"+pname);
    if(p){
        projects.set(p.getId(),p);
        if(!p.story) p.story = await Story.load(p);
        console.log("...found");
        return p;
    }
    p = await new Promise<Project>(async resolve=>{
        console.log("...didn't find, reading",email,pname);
        fs.readFile("projects/"+email+"/"+pname+"/"+"meta.json",{encoding:"utf8"},async (err,data)=>{
            console.log("dat:",data);
            if(err) resolve(null);
            else{
                try{
                    resolve(Project.from(JSON.parse(data),await getUserByEmail(email)));
                }
                catch(e){
                    resolve(null);
                }
            }
        });
        await mkdir(`projects/${email}/${pname}/images`);
        await mkdir(`projects/${email}/${pname}/audio`);
    });
    if(!p){
        console.log("...couldn't find file/folder");
        return;
    }
    p.story = await Story.load(p);
    console.log("...found and loading!!!");

    p.images = await readdir(`projects/${email}/${pname}/images`) || [];
    p.audio = await readdir(`projects/${email}/${pname}/audio`) || [];

    projects.set(p.getId(),p);
    return p;
}

io.on("connection",socket=>{
    socket.on("login",async (email:string,name:string,pass:string,f:(u:any)=>void)=>{
        if(!f) return;
        let user = await getUserByEmail(email);
        if(!user && !name){
            f({err:"invalid username"});
            return;
        }
        // let user = users.get(socket.id);
        if(!user){
            user = new User(socket,name,email,pass);
            users.set(socket.id,user);
        }
        else{
            user.socket = socket;
        }
        if(user.pass == null && pass == null){
            f({err:"pwDNE"});
            return;
        }
        if(user.pass == null){
            user.pass = pass;
            await user.save();
            console.log("saved user pass!");
        }
        if(user.pass != pass){
            f({err:"password incorrect"});
            return;
        }
        
        f(user.serialize());
        user.allowedSocks.push(socket.id);
        users.set(socket.id,user);
        console.log(":: user logged in: ",user.email);
        user.save();
    });
    socket.on("disconnect",e=>{
        let u = users.get(socket.id);
        if(u){
            u.allowedSocks.splice(u.allowedSocks.indexOf(socket.id));
            u.save();
            u.leaveProject();
        }
        // else console.log("** user disconnected but didn't have an account");
    });
    socket.on("msg",async (msg:string)=>{
        let u = await getWho(socket);
        if(!u) return;
        console.log(u.email+": "+msg);
    });
    socket.on("createProject",async (name:string,code:string,f:(i:number)=>void)=>{
        let u = await getWho(socket);
        if(!u) return;
        let res = await u.createProject(name,code);
        f(res);
    });
    socket.on("openProject",async (email:string,name:string,code:string,f:(data:any)=>void)=>{
        let u = await getWho(socket);
        if(!u) return;
        let p = await u.openProject(socket,email,name,code,f);
        f(p?.serializeNetwork());
    });
    socket.on("openProject_readonly",async (email:string,name:string,code:string,f:(data:any)=>void)=>{
        let p = await openProjectReadOnly(email,name,code,f);
        f(p?.serializeNetwork());
    });
    socket.on("getAllProjects",async (f:(list:string[])=>void)=>{
        let u = await getWho(socket);
        if(!u) return;
        
        let users = await readdir("projects");
        let allP = [];
        for(const u of users){
            let projects = await readdir("projects/"+u);
            // let newList = [];
            for(const v of projects){
                let mStr = await read("projects/"+u+"/"+v+"/meta.json");
                let m = (mStr ? JSON.parse(mStr) : null);
                console.log(m);
                allP.push({
                    email:u,pid:v,display:(m?.display||v)
                });
            }
            // allP = allP.concat(newList);
        }
        f(allP);
    });
    // Story
    socket.on("s_selectBoard",async (id:number)=>{
        let u = await getWho(socket);
        if(!u) return;
        let p = u.curProject;
        if(!p) return;
        if(!u.selBoards.includes(id)) u.selBoards.push(id);
        u.room().emit("selectBoard",u.email,id);
    });
    socket.on("s_deselectBoard",async (id:number)=>{
        let u = await getWho(socket);
        if(!u) return;
        let p = u.curProject;
        if(!p) return;
        u.selBoards.splice(u.selBoards.indexOf(id),1);
        u.room().emit("deselectBoard",u.email,id);
    });
    socket.on("s_moveBoardTo",async (id:number,x:number,y:number)=>{
        let u = await getWho(socket);
        if(!u) return;
        let p = u.curProject;
        if(!p) return;
        p.story.moveBoardTo(id,x,y);
        u.room().emit("moveBoardTo",u.email,id,x,y);
        p.story.save();
    });
    socket.on("s_editBoardTitle",async (id:number,title:string)=>{
        let u = await getWho(socket);
        if(!u) return;
        let p = u.curProject;
        if(!p) return;
        
        let b = p.story.getBoard(id);
        if(!b) return;
        b.title = title;
        p.story.save();

        u.room().emit("editBoardTitle",u.email,id,title);
    });
    socket.on("s_editBoardText",async (id:number,text:string)=>{
        let u = await getWho(socket);
        if(!u) return;
        let p = u.curProject;
        if(!p) return;

        let b = p.story.getBoard(id);
        if(!b) return;
        b.text = text;
        p.story.save();

        u.room().emit("editBoardText",u.email,id,text);
    });
    socket.on("s_renameChoice",async (id:number,i:number,newtext:string)=>{
        let u = await getWho(socket);
        if(!u) return;
        let p = u.curProject;
        if(!p) return;

        let b = p.story.getBoard(id);
        if(!b) return;
        let choice = b.buttons[i];
        if(!choice) return;
        choice.label = newtext;
        p.story.save();

        u.room().emit("renameChoice",u.email,id,i,newtext);
    });
    socket.on("s_recolorChoice",async (id:number,i:number,newcol:string)=>{
        let u = await getWho(socket);
        if(!u) return;
        let p = u.curProject;
        if(!p) return;

        let b = p.story.getBoard(id);
        if(!b) return;
        let choice = b.buttons[i];
        if(!choice) return;
        choice.col = newcol;
        p.story.save();

        u.room().emit("recolorChoice",u.email,id,i,newcol);
    });
    socket.on("s_addChoice",async (id:number,labels:string[],cols:string[]=[],custom?:number[])=>{
        let u = await getWho(socket);
        if(!u) return;
        let p = u.curProject;
        if(!p) return;

        let b = p.story.getBoard(id);
        if(!b) return;
        if(custom) b.addChoice(labels,cols,custom.map(v=>p.story.allBoards.find(w=>w._id == v)));
        else b.addChoice(labels,cols);
        p.story.save();

        u.room().emit("addChoice",u.email,id,labels,cols,custom);
    });
    socket.on("s_removeChoice",async (id:number,i:number[],deleteBoard:boolean)=>{
        let u = await getWho(socket);
        if(!u) return;
        let p = u.curProject;
        if(!p) return;

        let b = p.story.getBoard(id);
        if(!b) return;
        b.removeChoice(i,deleteBoard);
        p.story.save();

        u.room().emit("removeChoice",u.email,id,i,deleteBoard);
    });
    socket.on("s_deleteBoard",async (id:number)=>{
        let u = await getWho(socket);
        if(!u) return;
        let p = u.curProject;
        if(!p) return;

        let b = p.story.getBoard(id);
        if(!b) return;
        p.story.deleteBoard(b);

        u.room().emit("deleteBoard",u.email,id);
    });
    socket.on("s_setBGImage",async (id:number,name:string,f:(res:number)=>void)=>{
        let u = await getWho(socket);
        if(!u) return;
        let p = u.curProject;
        if(!p) return;

        if(!p.images.includes(name) && name != null){
            f(0);
            return;
        }

        let b = p.story.getBoard(id);
        if(!b) return;
        b.img = name;
        
        u.room().emit("setBGImage",u.email,id,name);
    });
    socket.on("s_setBGAudio",async (id:number,name:string,f:(res:number)=>void)=>{
        let u = await getWho(socket);
        if(!u) return;
        let p = u.curProject;
        if(!p) return;

        if(!p.audio.includes(name) && name != null){
            f(0);
            return;
        }

        let b = p.story.getBoard(id);
        if(!b) return;
        b.audio = name;
        
        u.room().emit("setBGAudio",u.email,id,name);
    });
    // socket.on("s_moveBoardsTo",async (list:{id:number,x:number,y:number}[])=>{
    //     let u = await getWho(socket);
    //     if(!u) return;
    //     let p = u.curProject;
    //     if(!p) return;
    //     for(const b of list){
    //         p.story.moveBoardTo(b.id,b.x,b.y);
    //     }
    //     socket.to(p.getId()).emit("moveBoardsTo",u.email,id,x,y);
    // });
    socket.on("s_save",async ()=>{
        let u = await getWho(socket);
        if(!u) return;
        let p = u.curProject;
        if(!p) return;
        // p.story._save();
        p.save();
    });

    socket.on("s_moveCursor",async (x:number,y:number)=>{
        let u = await getWho(socket);
        if(!u) return;
        
        u.room().emit("moveCursor",u.email,x,y);
    });
    socket.on("s_addImage",async (name:string,img:string,f:(url:string)=>void)=>{
        let u = await getWho(socket);
        if(!u) return;
        let p = u.curProject;
        if(!p) return;

        let base64Data = img.replace(/^data:image\/png;base64,/, "");
        let binaryData = Buffer.from(base64Data, 'base64');

        let url = "projects/"+p.owner+"/"+p.name+"/images/"+name;
        await write(url,binaryData,"binary");
        f(url);
    });
    socket.on("s_getImages",async (f:(list:string[])=>void)=>{
        let u = await getWho(socket);
        if(!u) return;
        let p = u.curProject;
        if(!p) return;

        f(p.images);
    });
    socket.on("s_uploadImage",async (name:string,file:File,f:(url:string)=>void)=>{
        if(name.includes("/")) return;
        
        let u = await getWho(socket);
        if(!u) return;
        let p = u.curProject;
        if(!p) return;
        
        if(!p.images.includes(name)){
            p.images.push(name);
        }
        let url = "projects/"+p.owner+"/"+p.name+"/images/"+name;
        await write(url,file);
        f(url);
    });

    socket.on("s_addAudioFile",async (name:string,filedata:string,f:(url:string)=>void)=>{
        let u = await getWho(socket);
        if(!u) return;
        let p = u.curProject;
        if(!p) return;

        // let base64Data = filedata.replace(/^data:image\/png;base64,/, "");
        // let binaryData = Buffer.from(base64Data, 'base64');

        // let url = "projects/"+p.owner+"/"+p.name+"/audio/"+name;
        // await write(url,binaryData,"binary");

        // console.log("going to write some audio data...");
        
        let url = "";
        f(url);
    });
    socket.on("s_getAudioFiles",async (f:(list:string[])=>void)=>{
        let u = await getWho(socket);
        if(!u) return;
        let p = u.curProject;
        if(!p) return;

        f(p.audio);
    });
    socket.on("s_uploadAudioFile",async (name:string,file:File,f:(url:string)=>void)=>{
        if(name.includes("/")) return;
        
        let u = await getWho(socket);
        if(!u) return;
        let p = u.curProject;
        if(!p) return;
        
        console.log("$ start uploading audio file");
        if(!p.audio.includes(name)){
            p.audio.push(name);
        }
        let url = "projects/"+p.owner+"/"+p.name+"/audio/"+name;
        await write(url,file);
        f(url);
    });

    socket.on("s_renameProject",async (email:string,pid:string,display:string,f:(res:any)=>void)=>{
        if(!f) return;
        if(!display || !pid){
            f({err:"err: invalid name"});
            return;
        }
        
        let u = await getWho(socket);
        if(!u){
            f({err:"err: you don't have permission to do this"});
            return;
        }
        let p = await getProject(email,pid);
        if(!p){
            f({err:"err: can't find project"});
            return;
        }
        if(email != u.email){
            f({err:"err: you don't have permission to do this"});
            return;
        }
        if(p.display == display){
            f({err:"err: same name"});
            return;
        }

        p.changeDisplayName(display);
        f({});
    });
    socket.on("s_deleteProject",async (email:string,pid:string,f:(res:any)=>void)=>{
        if(!f) return;
        if(!email) return;
        if(!pid) return;

        if(email.includes("/")) return;
        if(pid.includes("/")) return;

        let u = await getWho(socket);
        if(!u){
            f({err:"err: you don't have permission to do this"});
            return;
        }
        let p = await getProject(email,pid);
        if(!p){
            f({err:"err: can't find project"});
            return;
        }
        if(email != u.email){
            f({err:"err: you don't have permission to do this"});
            return;
        }

        if(u.curProject == p) u.curProject = null;
        projects.delete(p.name);
        await removeDir("projects/"+email+"/"+pid);

        socket.to(p.getId()).emit("deleteProject");
        f({});
    });

    socket.on("accountExists",async (email:string,f:(v:boolean)=>void)=>{
        if(!email) return;
        if(!f) return;
        if(users.has(email)){
            f(true);
            return;
        }
        f(await access("users/"+email+".json"));
    });

    socket.on("exportPlay",async (email:string,pid:string,code:string,f:(res:any)=>void)=>{
        if(!email) return;
        if(!pid) return;
        if(!f) return;

        if(email.includes("/")) return;
        if(pid.includes("/")) return;

        let u = await getWho(socket);
        if(!u){
            f({err:"err: you don't have permission to do this"});
            return;
        }
        // let p = await getProject(email,pid);
        let p = await openProjectReadOnly(email,pid,code);
        if(!p){
            f({err:"err: can't get project"});
            return;
        }
        
        let dat = {
            images:[],
            audio:[]
        };

        let path = `projects/${email}/${pid}`;
        let images = await readdir(path+"/images");
        if(!images){
            f({err:"err: can't get project"});
            return;
        }
        let audio = await readdir(path+"/audio");
        if(!audio){
            f({err:"err: can't get project"});
            return;
        }
        dat.images = images;
        dat.audio = audio;

        f(dat);
        return;

        // // depricated, moved to client side

        // let path = `projects/${email}/${pid}`;
        // path += "/exp";
        // await mkdir(path);

        // // 

        // // let p = await openProjectReadOnly(email,name,code,f);
        // // f(p?.serializeNetwork());
        // let data = p.serializeNetwork();
        
        // // test
        // await removeDir(path);

        // path += "/_tmp";
        // await mkdir(path);
        
        // await mkdir(path+"/lib");
        // await mkdir(path+"/assets");
        // await mkdir(path+"/styles");

        // await copyFile("../../styles/play.css",path+"/styles/play.css");
        // await copyFile("../../assets/icon.svg",path+"/assets/icon.svg");
        // await copyFile("../../out/pre.js",path+"/lib/pre.js");
        // await copyFile("../../out/socket.io.min.js",path+"/lib/socket.io.min.js");
        // await copyFile("../../out/core.js",path+"/lib/core.js");
        // await copyFile("../../out/play.js",path+"/lib/play.js");

        // await write(path+"/lib/data.js",`const __storyData = ${JSON.stringify(data)};`,"utf8");
    });

    socket.on("s_makeStart",async (toId:number,f:(res:any)=>void)=>{
        let u = await getWho(socket);
        if(!u) return;
        let p = u.curProject;
        if(!p) return;
        
        let start = p.story.start;
        if(!start) return;
        let to = p.story.getBoard(toId);
        if(!to) return;

        // p.story.origin.connections[0].to = to;
        // p.story.origin.connections[0].update();
        p.story.start = to;

        p.story.save();

        u.room().emit("moveStart",toId);
        f(0);
    });
});

// app.use(express.urlencoded({extended:true}));
// app.post("/upload",(req, res) => {
//     console.log("UPLOAD",req.body.name);
//     res.send("success");
//     // return;
//     // req.on("end",()=>{
//     //     console.log("...upload",req.body);
//     // });

//     return;
    
//     const writeStream = fs.createWriteStream('uploads/image.jpg');
//     req.pipe(writeStream);
//     req.on('end', () => {
//       console.log('Image uploaded successfully!');
//       res.send('Image uploaded successfully!');
//     });
// });

server.listen(port,()=>{
    console.log('listening on *:'+port);
});

let rl = readline.createInterface(process.stdin,process.stdout);
rl.on("line",(v:string)=>{
    // v = v.substring(2);
    if(!v) return;

    if(v == "stop"){
        process.exit(0);
    }
    
    // console.log("> "+v);
    // rl.write("> ");
});