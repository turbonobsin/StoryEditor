"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readdir = exports.mkdir = exports.removeFile = exports.read = exports.write = exports.access = void 0;
const http = __importStar(require("http"));
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const fs_1 = __importDefault(require("fs"));
console.log("started...");
function access(path) {
    return new Promise(resolve => {
        fs_1.default.access(path, err => {
            if (err) {
                // console.log("err: ",err);
                resolve(false);
            }
            else
                resolve(true);
        });
    });
}
exports.access = access;
function write(path, data, encoding) {
    return new Promise(resolve => {
        fs_1.default.writeFile(path, data, { encoding: "utf8" }, err => {
            if (err) {
                // console.log("err: could not find path: ",path);
                resolve(false);
            }
            else
                resolve(true);
        });
    });
}
exports.write = write;
function read(path, encoding) {
    return new Promise(resolve => {
        fs_1.default.readFile(path, { encoding }, (err, data) => {
            if (err) {
                // console.log("err: ",err);
                resolve(null);
            }
            else
                resolve(data);
        });
    });
}
exports.read = read;
function removeFile(path) {
    return new Promise(resolve => {
        fs_1.default.rm(path, err => {
            if (err) {
                // console.log("err: ",err);
                resolve(false);
            }
            else
                resolve(true);
        });
    });
}
exports.removeFile = removeFile;
function mkdir(path) {
    return new Promise(resolve => {
        fs_1.default.mkdir(path, { recursive: true }, err => {
            if (err) {
                // console.log("err: ",err);
                resolve(false);
            }
            else
                resolve(true);
        });
    });
}
exports.mkdir = mkdir;
function readdir(path) {
    return new Promise(resolve => {
        fs_1.default.readdir(path, (err, files) => {
            if (err) {
                // console.log("err: ",err);
                resolve(null);
            }
            else
                resolve(files);
        });
    });
}
exports.readdir = readdir;
////////////////////////////////////////
class Story {
    constructor(project) {
        this._i = 0;
        this.start = new Board(this, 0, g_gap);
        this.origin = new OriginPoint(this, 0, 0);
    }
    project;
    // filename:string;
    _i;
    start;
    origin;
    panX = 0;
    panY = 0;
    allBoards = [];
    loadedObjs = [];
    // 
    isPanning = false;
    sx = 0;
    sy = 0;
    lx = 0;
    ly = 0;
    zoom = 1;
    hoverBoard;
    selBoards = [];
    dragBoards = [];
    needsSave = false;
    _isSaving = false;
    // 
    init() {
        this.start.load();
        this.origin.load();
        this.makeConnection(this.origin, this.start, ConnectionType.start);
    }
    setZoom(v) {
        this.zoom = v;
    }
    updateAllBoards() {
        for (const b of this.loadedObjs) {
            b.update();
        }
    }
    addObj(o) {
        if (!this.loadedObjs.includes(o)) {
            this.loadedObjs.push(o);
            if (o instanceof Board)
                this.allBoards.push(o);
        }
    }
    deleteBoard(b) {
        let list = [...b.connections];
        for (const c of list) {
            c.remove();
        }
        this.loadedObjs.splice(this.loadedObjs.indexOf(b), 1);
        this.allBoards.splice(this.allBoards.indexOf(b), 1);
    }
    makeConnection(from, to, type = ConnectionType.path) {
        let c = new Connection(this, 0, 0, from, to, type);
        from.connections.push(c);
        to.connections.push(c);
        c.load();
    }
    makePath(from, to, ref) {
        let c = new PathConnection(this, from, to, ref);
        from.connections.push(c);
        to.connections.push(c);
        c.load();
        return c;
    }
    // File Management
    getSaveObj() {
        let o = {
            filename: this.project.name,
            _i: this._i,
            panX: this.panX,
            panY: this.panY,
            boards: this.loadedObjs.map(v => v.save()).filter(v => v != null)
        };
        return o;
    }
    save() {
        this.needsSave = true;
    }
    handle;
    async _save() {
        if (this._isSaving)
            return;
        this._isSaving = true;
        let o = this.getSaveObj();
        let str = JSON.stringify(o);
        await write("projects/" + this.project.owner + "/" + this.project.name + "/data.json", str, "utf8");
        console.log("...saved story: ", this.project.name);
        this._isSaving = false;
    }
    static async load(project) {
        let str = await read("projects/" + project.owner + "/" + project.name + "/data.json", "utf8");
        let o = JSON.parse(str);
        let s = new Story(project);
        s.project = project;
        s._i = 0;
        let o1 = o.boards[0];
        let root = new Board(s, o1.x, o1.y, o1.title, o1.text, o1.tags);
        root._id = o1._id;
        s.start = root;
        root.load();
        let list = [root];
        for (let i = 1; i < o.boards.length; i++) {
            let b = o.boards[i];
            let b1 = new Board(s, b.x, b.y, b.title, b.text, b.tags);
            b1._id = b._id;
            list.push(b1);
        }
        for (let i = 0; i < o.boards.length; i++) {
            let b = o.boards[i];
            let b1 = list[i];
            b1.addChoice(b.btns.map((v) => v.l), b.btns.map((v) => list.find(w => w._id == v.id)));
        }
        for (const b of list) {
            if (!b._loaded)
                b.load();
        }
        s._i = o._i;
        return s;
    }
    // Network commands
    getBoard(id) {
        return this.allBoards.find(v => v._id == id);
    }
    moveBoardTo(id, x, y) {
        let b = this.getBoard(id);
        if (!b)
            return;
        b.x = x;
        b.y = y;
        b.update();
    }
}
let g_gap = 200;
class StoryObj {
    constructor(title, story, x, y) {
        this.title = title;
        this.story = story;
        this.x = x;
        this.y = y;
    }
    title;
    story;
    x;
    y;
    load() {
        this._loaded = true;
    }
    _loaded = false;
    left = 0;
    right = 0;
    top = 0;
    bottom = 0;
    update() {
        for (const c of this.connections) {
            c.update();
        }
    }
    connections = [];
    addConnection(c) {
    }
    removeConnection(c) {
        if (!this.connections.includes(c))
            return;
    }
    write() {
        this.update();
    }
    select() {
    }
    deselect() {
    }
    save() { return null; }
}
var ConnectionType;
(function (ConnectionType) {
    ConnectionType[ConnectionType["start"] = 0] = "start";
    ConnectionType[ConnectionType["path"] = 1] = "path";
})(ConnectionType || (ConnectionType = {}));
class Connection extends StoryObj {
    constructor(story, x, y, from, to, type) {
        super("", story, x, y);
        this.from = from;
        this.to = to;
        this.type = type;
    }
    from;
    to;
    type;
    load() {
        super.load();
        this.update();
    }
    update() {
    }
    remove() {
        this.from.connections.splice(this.from.connections.indexOf(this), 1);
        this.to.connections.splice(this.to.connections.indexOf(this), 1);
    }
}
class PathConnection extends Connection {
    constructor(story, from, to, ref) {
        super(story, 0, 0, from, to, ConnectionType.path);
        this.ref = ref;
    }
    ref;
    load() {
        super.load();
    }
    update() {
        super.update();
    }
    remove() {
        super.remove();
        this.from.buttons.splice(this.from.buttons.indexOf(this.ref), 1);
    }
}
class OriginPoint extends StoryObj {
    constructor(story, x, y) {
        super("Origin/Start", story, x, y);
    }
    load() {
        super.load();
        this.story.addObj(this);
        this.update();
    }
}
class Board extends StoryObj {
    constructor(story, x, y, title, text, tags) {
        super(title || "New Board " + (story._i + 1), story, x, y);
        this.text = text || "Here is some default text.";
        this._id = story._i++;
        this.tags = tags || [];
        if (tags == null || tags?.length == 0)
            this.tags.push(this.title.toLowerCase().replaceAll(" ", "_"));
    }
    text;
    buttons = [];
    tags;
    _id;
    l_title;
    l_tag;
    load() {
        super.load();
        this.story.addObj(this);
        this.update();
    }
    update() {
        super.update();
    }
    updateConnections() {
        for (const c of this.connections) {
            c.update();
        }
    }
    addChoice(labels, custom) {
        let i = 0;
        let w = (labels.length - 1) * g_gap;
        let list = [];
        for (const l of labels) {
            if (custom)
                if (!custom[i]) {
                    i++;
                    // console.warn("... disconnection?");
                    continue;
                }
            let b;
            let btn;
            if (!custom) {
                b = new Board(this.story, this.x - w / 2 + i * g_gap, this.y + g_gap);
            }
            else {
                b = custom[i];
            }
            list.push(b);
            btn = new StoryButton(l, b, this);
            this.buttons.push(btn);
            b.load();
            btn.path = this.story.makePath(this, b, btn);
            i++;
        }
        return list;
    }
    removeChoice(i, deleteBoard = false) {
        let list = i.map(v => this.buttons[v]);
        for (const b of list) {
            if (!b)
                continue;
            let con = this.connections.find(v => v.to == b.board);
            b.board.connections.splice(b.board.connections.indexOf(con), 1);
            this.connections.splice(this.connections.indexOf(con), 1);
            this.buttons.splice(this.buttons.indexOf(b), 1);
            if (deleteBoard) {
                this.story.deleteBoard(b.board);
            }
        }
    }
    write() {
        super.write();
        this.story.save();
    }
    select() {
        super.select();
    }
    save() {
        let o = {
            title: this.title,
            x: this.x,
            y: this.y,
            _id: this._id,
            text: this.text,
            tags: this.tags,
            btns: this.buttons.map(v => {
                let o2 = {
                    l: v.label,
                    id: v.board._id
                };
                return o2;
            })
        };
        return o;
    }
    _done = false;
}
class StoryButton {
    constructor(label, board, par) {
        this.label = label;
        this.board = board;
        this.par = par;
    }
    label;
    board;
    par;
    path;
}
////////////////////////////////////////
const app = (0, express_1.default)();
app.use("/projects", (req, res, next) => {
    next();
}, express_1.default.static("projects/"));
const server = http.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        // origin:"http://127.0.0.1:5500"
        origin: "*"
    }
});
class User {
    constructor(socket, name, email) {
        this.socket = socket;
        this.id = socket?.id;
        this.name = name;
        this.email = email;
    }
    id;
    name;
    email;
    myProjects;
    socket;
    // story tmp
    selBoards = [];
    // 
    room() {
        if (!this.curProject)
            return;
        return this.socket.to(this.curProject.getId());
    }
    serialize() {
        return {
            name: this.name,
            email: this.email,
            myProjects: this.myProjects
        };
    }
    async save() {
        let str = JSON.stringify(this.serialize());
        await write("users/" + this.email + ".json", str, "utf8");
        if (!await access("projects/" + this.email)) {
            await mkdir("projects/" + this.email);
            await mkdir("projects/" + this.email + "/images");
        }
    }
    static from(data, socket) {
        let u = new User(socket, null, null);
        let ok = Object.keys(data);
        for (const k of ok) {
            u[k] = data[k];
        }
        return u;
    }
    curProject;
    async createProject(name) {
        let exists = await access("projects/" + this.email + "/" + name + "/meta.json");
        if (exists) {
            console.log("** project already exists, not creating");
            return;
        }
        let p = new Project();
        p.name = name;
        p.owner = this.email;
        p._owner = this;
        projects.set(p.getId(), p);
        await mkdir("projects/" + this.email + "/" + name);
        await write("projects/" + this.email + "/" + name + "/data.json", await read("TestFile1.json", "utf8"), "utf8");
        p.save();
        console.log(":: created project: " + name + " by " + this.email);
    }
    async openProject(email, name) {
        if (this.curProject)
            this.leaveProject();
        let p = await getProject(email, name);
        if (!p) {
            console.log("** tried to get project that doesn't exist: " + name + " by " + this.email);
            return;
        }
        this.curProject = p;
        if (!p.active.includes(this.email)) {
            p.active.push(this.email);
            p._active.push(this);
        }
        this.socket.join(this.curProject.getId());
        console.log(this.email + " joined: " + this.curProject.name, p.active);
        for (const u of p._active) {
            this.socket.emit("userJoined", this.email, false, { email: u.email, name: u.name });
        }
        this.socket.to(p.getId()).emit("userJoined", null, true, { email: this.email, name: this.name });
        return p;
    }
    leaveProject() {
        if (this.curProject) {
            this.socket.leave(this.curProject.getId());
            console.log(this.email + " left: " + this.curProject.name);
            let p = this.curProject;
            p.active.splice(p.active.indexOf(this.email), 1);
            p._active.splice(p._active.indexOf(this), 1);
            io.to(p.getId()).emit("userLeft", { email: this.email, name: this.name });
            for (const id of this.selBoards) {
                this.room().emit("deselectBoard", this.email, id);
            }
            this.selBoards = [];
            this.curProject = null;
        }
    }
}
class Project {
    constructor() {
        this.active = [];
        this._active = [];
    }
    owner;
    active;
    _owner;
    _active;
    name;
    _data;
    story;
    getId() {
        return this.owner + "_" + this.name;
    }
    static from(data, u) {
        let p = new Project();
        p.owner = u.email;
        p._owner = u;
        let ok = Object.keys(data);
        for (const k of ok) {
            p[k] = data[k];
        }
        return p;
    }
    serializeNetwork() {
        return {
            name: this.name,
            owner: this.owner,
            active: this.active,
            storyData: this.story.getSaveObj(),
            userData: this._active.map(v => {
                return {
                    email: v.email,
                    name: v.name,
                    sel: v.selBoards
                };
            })
        };
    }
    serialize() {
        return {
            name: this.name,
            owner: this.owner
        };
    }
    async save() {
        await write("projects/" + this.owner + "/" + this.name + "/meta.json", JSON.stringify(this.serialize()), "utf8");
        if (this.story)
            this.story._save();
        // await write("projects/"+this.owner+"/"+this.name+"/data.json",this._data,"utf8");
        console.log("-- saved project: " + this.name);
    }
}
const users = new Map();
const projects = new Map();
async function getWho(socket) {
    let u = users.get(socket.id);
    if (u)
        return u;
    let email = await new Promise(resolve => {
        socket.emit("requestUsername", (email, name) => {
            resolve(email);
        });
    });
    if (!email)
        return;
    u = await new Promise(async (resolve) => {
        fs_1.default.readFile("users/" + email + ".json", { encoding: "utf8" }, (err, data) => {
            // console.log("found",email,data);
            if (err)
                resolve(null);
            else
                resolve(User.from(JSON.parse(data), socket));
        });
    });
    return u;
}
async function getUserByEmail(email) {
    if (!email)
        return;
    for (const [k, v] of users) {
        if (v.email == email) {
            return v;
        }
    }
    return await new Promise(async (resolve) => {
        fs_1.default.readFile("users/" + email + ".json", { encoding: "utf8" }, (err, data) => {
            // console.log("found",email,data);
            if (err)
                resolve(null);
            else
                resolve(User.from(JSON.parse(data), null));
        });
    });
}
async function getProject(email, pname) {
    if (!email)
        return;
    let p = projects.get(email + "_" + pname);
    if (p) {
        projects.set(p.getId(), p);
        return p;
    }
    p = await new Promise(async (resolve) => {
        fs_1.default.readFile("projects/" + email + "/" + pname + "/" + "meta.json", { encoding: "utf8" }, async (err, data) => {
            if (err)
                resolve(null);
            else
                resolve(Project.from(JSON.parse(data), await getUserByEmail(email)));
        });
    });
    if (!p)
        return;
    p.story = await Story.load(p);
    projects.set(p.getId(), p);
    return p;
}
io.on("connection", socket => {
    socket.on("login", async (email, name, f) => {
        let user = users.get(socket.id);
        if (!user) {
            user = new User(socket, name, email);
            users.set(socket.id, user);
        }
        f(user.serialize());
        users.set(socket.id, user);
        console.log(":: user logged in: ", user.email);
        user.save();
    });
    socket.on("disconnect", e => {
        let u = users.get(socket.id);
        if (u) {
            u.save();
            u.leaveProject();
        }
        else
            console.log("** user disconnected but didn't have an account");
    });
    socket.on("msg", async (msg) => {
        let u = await getWho(socket);
        if (!u)
            return;
        console.log(u.email + ": " + msg);
    });
    socket.on("createProject", async (name) => {
        let u = await getWho(socket);
        if (!u)
            return;
        await u.createProject(name);
    });
    socket.on("openProject", async (email, name, f) => {
        let u = await getWho(socket);
        if (!u)
            return;
        let p = await u.openProject(email, name);
        f(p?.serializeNetwork());
    });
    // Story
    socket.on("s_selectBoard", async (id) => {
        let u = await getWho(socket);
        if (!u)
            return;
        let p = u.curProject;
        if (!p)
            return;
        if (!u.selBoards.includes(id))
            u.selBoards.push(id);
        u.room().emit("selectBoard", u.email, id);
    });
    socket.on("s_deselectBoard", async (id) => {
        let u = await getWho(socket);
        if (!u)
            return;
        let p = u.curProject;
        if (!p)
            return;
        u.selBoards.splice(u.selBoards.indexOf(id), 1);
        u.room().emit("deselectBoard", u.email, id);
    });
    socket.on("s_moveBoardTo", async (id, x, y) => {
        let u = await getWho(socket);
        if (!u)
            return;
        let p = u.curProject;
        if (!p)
            return;
        p.story.moveBoardTo(id, x, y);
        u.room().emit("moveBoardTo", u.email, id, x, y);
        p.story.save();
    });
    socket.on("s_editBoardTitle", async (id, title) => {
        let u = await getWho(socket);
        if (!u)
            return;
        let p = u.curProject;
        if (!p)
            return;
        let b = p.story.getBoard(id);
        if (!b)
            return;
        b.title = title;
        p.story.save();
        u.room().emit("editBoardTitle", u.email, id, title);
    });
    socket.on("s_editBoardText", async (id, text) => {
        let u = await getWho(socket);
        if (!u)
            return;
        let p = u.curProject;
        if (!p)
            return;
        let b = p.story.getBoard(id);
        if (!b)
            return;
        b.text = text;
        p.story.save();
        u.room().emit("editBoardText", u.email, id, text);
    });
    socket.on("s_renameChoice", async (id, i, newtext) => {
        let u = await getWho(socket);
        if (!u)
            return;
        let p = u.curProject;
        if (!p)
            return;
        let b = p.story.getBoard(id);
        if (!b)
            return;
        let choice = b.buttons[i];
        if (!choice)
            return;
        choice.label = newtext;
        p.story.save();
        u.room().emit("renameChoice", u.email, id, i, newtext);
    });
    socket.on("s_addChoice", async (id, labels) => {
        let u = await getWho(socket);
        if (!u)
            return;
        let p = u.curProject;
        if (!p)
            return;
        let b = p.story.getBoard(id);
        if (!b)
            return;
        b.addChoice(labels);
        p.story.save();
        u.room().emit("addChoice", u.email, id, labels);
    });
    socket.on("s_removeChoice", async (id, i, deleteBoard) => {
        let u = await getWho(socket);
        if (!u)
            return;
        let p = u.curProject;
        if (!p)
            return;
        let b = p.story.getBoard(id);
        if (!b)
            return;
        b.removeChoice(i, deleteBoard);
        p.story.save();
        u.room().emit("removeChoice", u.email, id, i, deleteBoard);
    });
    socket.on("s_deleteBoard", async (id) => {
        let u = await getWho(socket);
        if (!u)
            return;
        let p = u.curProject;
        if (!p)
            return;
        let b = p.story.getBoard(id);
        if (!b)
            return;
        p.story.deleteBoard(b);
        u.room().emit("deleteBoard", u.email, id);
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
    socket.on("s_save", async () => {
        let u = await getWho(socket);
        if (!u)
            return;
        let p = u.curProject;
        if (!p)
            return;
        p.story._save();
    });
    socket.on("s_moveCursor", async (x, y) => {
        let u = await getWho(socket);
        if (!u)
            return;
        u.room().emit("moveCursor", u.email, x, y);
    });
    socket.on("s_addImage", async (name, img, f) => {
        let u = await getWho(socket);
        if (!u)
            return;
        let p = u.curProject;
        if (!p)
            return;
        let base64Data = img.replace(/^data:image\/png;base64,/, "");
        let binaryData = Buffer.from(base64Data, 'base64');
        let url = "projects/" + p.owner + "/" + p.name + "/images/" + name;
        await write(url, binaryData, "binary");
        f(url);
    });
    socket.on("s_getImages", async () => {
        let u = await getWho(socket);
        if (!u)
            return;
        let p = u.curProject;
        if (!p)
            return;
    });
});
server.listen(3000, () => {
    console.log('listening on *:3000');
});