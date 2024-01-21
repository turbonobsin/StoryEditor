let serverURL = "http://localhost:3000";
const AID = "__SE-"; // app id

const global_visitors = document.querySelector(".global-visitors");

function LSGet(id:string){
    return localStorage.getItem(AID+id);
}
function LSGetSet(id:string,req:()=>string){
    let v = localStorage.getItem(AID+id);
    if(v) return v;
    v = req();
    localStorage.setItem(AID+id,v);
    return v;
}
function getUsername(){
    return LSGetSet("name",()=>prompt("Enter your username"));
}
let myEmail:string;
function getEmail(){
    return LSGetSet("email",()=>prompt("Enter your email"));
}

const cursors = document.querySelector(".cursors");
let myCursor:any;
let cursorList = [];
function genColChannel(){
    return Math.floor(256/4+Math.random()*127);
}
let _colHue = 0;
function addMouseCursor(dat:any){
    let email = dat.email;
    let name = dat.name;
    // let color = `rgb(${genColChannel()},${genColChannel()},${genColChannel()})`;
    // let col = `hsl(${Math.floor(Math.random()*360)},${100}%,${10}%)`;
    if(!dat.col){
        _colHue = 50*(cursorList.length-1);
        if(_colHue < 0) _colHue = 0;
    }
    let col = dat.col || `hsl(${Math.floor(_colHue) % 360}deg,${100}%,${40}%)`;
    dat.col = col;
    // if(!dat.col) _colHue += 35+Math.random()*30;
    let d = document.createElement("div");
    d.innerHTML = `<div>${name||email}</div><div class="material-symbols-outlined">arrow_selector_tool</div>`;
    d.className = "mouse-cursor";
    d.style.setProperty("--col",col);
    d.classList.add("cursor-"+email.replaceAll("@","").replaceAll(".",""));
    cursors.appendChild(d);
    let data = {
        email,
        name,
        div:d,
        col
    };
    cursorList.push(data);
    return data;
}

// @ts-ignore
let socket:Socket = io(serverURL);

function setConneted(){
    console.log("NEW Connection Status: ",socket.connected);
}
let hasConnected = false;
socket.on("connect",()=>{
    // if(!socket.connected){
    //     // reconnect
    //     // logUserIn();
    //     return;
    // }
    if(hasConnected){
        // alert("The server has restarted, we will refresh your page in a moment to reconnect.");
        // location.reload();
        return;
    }
    hasConnected = true;
    setConneted();
});
socket.on("disconnect",()=>{
    setConneted();
});
socket.on("requestUsername",(f:(email:string,name:string)=>void)=>{
    f(getEmail(),getUsername());
});

function createVisitorDiv(u:any,par?:HTMLElement){
    if(par) par.style.border = "solid 3px "+u.col;
    let div = document.createElement("div");
    if(par) div.innerHTML = `<div class="vl-name">${u.name}</div>`;
    else div.innerHTML = `
        <div class="vl-name" style="flex-direction:column;height:auto;align-items:start;border-radius:10px;padding:3px 10px">
            <div>${u.name}</div>
            <div style="font-weight:normal">${u.email}</div>
        </div>
    `;
    div.style.setProperty("--col",u.col);
    div.className = "vld vld-"+santitizeEmail(u.email); // visitor list div
    if(u == myCursor) div.classList.add("star");
    div.style.animation = "AddVBubble 0.15s ease-out";
    return div;
}
socket.on("userJoined",(selfEmail:string,isNew:boolean,data:any)=>{
    if(!isNew) if(!myEmail) myEmail = selfEmail;
    if(data.email == myEmail) data.col = "var(--my-col)";
    if(!isNew){
        console.log("User here: ",data.email,data.name);
        addMouseCursor(data);
    }
    else{
        console.log("User Joined: ",data.email,data.name);
        addMouseCursor(data);
        story.userData.push({
            email:data.email,
            name:data.name,
            sel:[]
        });
    }

    if(data.email != myEmail){
        let d = createVisitorDiv(data);
        global_visitors.appendChild(d);
    }
});
socket.on("userLeft",(data:any)=>{
    console.log("User left: ",data.email,data.name);
    let cursor = cursorList.find(v=>v.email == data.email);
    if(cursor) if(cursor.div.parentElement){
        cursors.removeChild(cursor.div);
        cursorList.splice(cursorList.findIndex(v=>v.email == data.email),1);
        story.userData.splice(story.userData.findIndex((v:any)=>v.email == data.email),1);

        let vld = global_visitors.querySelector(".vld-"+santitizeEmail(data.email));
        if(vld) global_visitors.removeChild(vld);
    }
});
let header = document.querySelector("header");
socket.on("moveCursor",(email:string,dx:number,dy:number)=>{
    let c = cursorList.find(v=>v.email == email);
    if(!c) return;

    let {x,y} = story.getRootPos();
    x += dx*blockW;
    y += dy*blockW;
    
    c.div.style.left = x+"px";
    c.div.style.top = y+"px";
});

let blockW = 111.333;
document.addEventListener("mousemove",e=>{
    if(!story) return;
    if(story.isPanning) return;
    if(cursorList.length < 2) return;
    if(myCursor){
        let {x,y} = story.getRootPos();
        let dx = (e.clientX+story.panX)-x;
        let dy = (e.clientY+story.panY)-y;
        dx /= blockW;
        dy /= blockW;
        
        // myCursor.div.style.left = x+"px";
        // myCursor.div.style.top = y+"px";
        socket.emit("s_moveCursor",dx,dy);
    }
});

// Story events
socket.on("selectBoard",(email:string,id:number)=>{
    story.otherSelectBoard(email,id);
});
socket.on("deselectBoard",(email:string,id:number)=>{
    story.otherDeselectBoard(email,id);
});
socket.on("moveBoardTo",(email:string,id:number,x:number,y:number)=>{
    story.moveBoardTo(email,id,x,y);
});

socket.on("editBoardTitle",(email:string,id:number,title:string)=>{
    let b = story.getBoard(id);
    if(!b) return;
    b.title = title;
    if(_editBoard_b?._id == id){
        i_title.value = title;
    }
    b.update();
});
socket.on("editBoardText",(email:string,id:number,text:string)=>{
    let b = story.getBoard(id);
    if(!b) return;
    b.text = text;
    if(_editBoard_b?._id == id){
        ta_text.value = text;
    }
    b.update();
});
socket.on("renameChoice",(email:string,id:number,i:number,newtext:string)=>{
    let b = story.getBoard(id);
    if(!b) return;

    let choice = b.buttons[i];
    if(!choice) return;
    choice.label = newtext;
    b.update();
    b.updateConnections();
    if(_editBoard_b == b){
        loadEditBoard(b);
    }
});
socket.on("addChoice",(email:string,id:number,labels:string[])=>{
    let b = story.getBoard(id);
    if(!b) return;

    b.addChoice(labels,null,true);
});
socket.on("removeChoice",(email:string,id:number,i:number[],deleteBoard:boolean)=>{
    let b = story.getBoard(id);
    if(!b) return;

    b.removeChoice(i,deleteBoard,true);
});
socket.on("deleteBoard",(email:string,id:number)=>{
    let b = story.getBoard(id);
    if(!b) return;

    story.deleteBoard(b,true);
});


// socket.on("moveBoardsTo",(email:string,list:{id:number,x:number,y:number}[])=>{
//     for(const b of list){
//         story.moveBoardTo(email,b.id,b.x,b.y);
//     }
// });

class User{
    constructor(data:any){
        let ok = Object.keys(data);
        for(const k of ok){
            this[k] = data[k];
        }
    }
    name:string;
    id:string;
}

async function logUserIn(){
    let user = await new Promise<User>(resolve=>{
        let email:string;
        let username:string;
        while(!email){
            email = getEmail();
        }
        while(!username){
            username = getUsername();
        }
        socket.emit("login",email,username,(data:any)=>{
            let user = new User(data);
            resolve(user);
        });
    });
    console.log(user);
    let pdata = await new Promise<any>(resolve=>{
        socket.emit("openProject","claeb@example.com","tmp",((data:any)=>{
            resolve(data);
        }));
    });
    if(!pdata){
        console.log("could not find pdata");
        return;
    }
    story = Story.load(pdata.storyData);
    story.origin.load();
    story.makeConnection(story.origin,story.start,ConnectionType.start);

    story.setPan(0,0);

    let email = getEmail();
    // myEmail = email;
    story.deselectBoards();
    closeAllPanes();

    myCursor = cursorList.find(v=>v.email == myEmail);
    myCursor.div.style.display = "none";
    story.userData = pdata.userData;
    for(const u of pdata.userData){
        for(const id of u.sel){
            if(u.email != email) story.otherSelectBoard(u.email,id);
            else story.selectBoard(story.getBoard(id));
        }
    }
}

async function initNetworkFromEditor(){
    await logUserIn();
}

const menus = document.querySelector(".menus");
const b_images = document.querySelector(".b-images") as HTMLButtonElement;

function chooseImage(){
    let menu = document.createElement("div");
    menu.className = "pane image-menu";
    menus.appendChild(menu);
    menu.innerHTML = `
        <div class="head">
            <div>Select an Image</div>
            <div class="close">X</div>
        </div>
        <br>
        <div class="drag-cont">
            <div class="drag-zone">
                <div class="material-symbols-outlined">add</div>
                <div>Drag and drop images to import</div>
            </div>
        </div>
        <p>Your Images</p>
        <div class="your-images"></div>
    `;
    let dragZone = menu.querySelector(".drag-zone") as HTMLElement;
    let yi = menu.querySelector(".your-images");

    dragZone.addEventListener('dragover', function(e) {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    });
    dragZone.addEventListener("drop",async e=>{
        e.stopPropagation();
        e.preventDefault();
        if(!e.dataTransfer.effectAllowed){
            console.log("Err: data transfer wasn't allowed");
            return;
        }
        
        let allowedTypes = ["png","jpg","jpeg","bmp","gif"];
        for(const f of e.dataTransfer.files){
            let typeList = (f.type.includes("/") ? f.type.split("/") : ["any",f.type]);
            let superType = typeList[0];
            let type = typeList[1];
    
            if(superType != "image"){
                alert(f.name+": "+"this file is not an image");
                continue;
            }
            if(!allowedTypes.includes(type.toLowerCase())){
                alert(f.name+": "+"Unsupported file type: "+type+" ! Supported types are: "+allowedTypes.join(", "));
                continue;
            }
            
            await new Promise<void>(resolve=>{
                const reader = new FileReader();
                reader.onloadend = function () {
                    socket.emit("s_addImage",f.name,reader.result,(url:string)=>{
                        url = serverURL+"/"+url;
                        let img = document.createElement("img");
                        img.src = url;
                        yi.appendChild(img);
                        resolve();
                    });
                };
                reader.readAsDataURL(f);
            });
            await wait(2000);
        }
    });
    
    socket.emit("s_getImages",(list:string[])=>{
        console.log("LIST",list);
    });
}
chooseImage();