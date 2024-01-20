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
                console.log("err: ", err);
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
        fs_1.default.writeFile(path, data, { encoding }, err => {
            if (err) {
                console.log("err: ", err);
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
                console.log("err: ", err);
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
                console.log("err: ", err);
                resolve(false);
            }
            else
                resolve(true);
        });
    });
}
exports.removeFile = removeFile;
function mkdir(path, encoding) {
    return new Promise(resolve => {
        fs_1.default.mkdir(path, { recursive: true }, err => {
            if (err) {
                console.log("err: ", err);
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
                console.log("err: ", err);
                resolve(null);
            }
            else
                resolve(files);
        });
    });
}
exports.readdir = readdir;
const app = (0, express_1.default)();
const server = http.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        // origin:"http://127.0.0.1:5500"
        origin: "*"
    }
});
class User {
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }
    id;
    name;
    async save() {
        let str = JSON.stringify({
            name: this.name
        });
        await write("users/" + this.name + ".json", str);
    }
}
class Project {
    owner;
    active;
}
const users = new Map();
io.on("connection", socket => {
    socket.on("login", (name, f) => {
        let user = users.get(socket.id);
        if (!user) {
            user = new User(socket.id, name);
            users.set(socket.id, user);
        }
        f(user);
    });
});
server.listen(3000, () => {
    console.log('listening on *:3000');
});
