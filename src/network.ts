const global_visitors = document.querySelector(".global-visitors");

let myEmail:string;
function getEmail(){
    return LSGetSet("email",()=>prompt("Enter your email"));
}

const cursors = document.querySelector(".cursors");
// @ts-ignore
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
    console.log("added mouse cursor...");
    cursorList.push(data);
    return data;
}

// @ts-ignore
let socket:Socket = io(serverURL);
function _changeServerURL(s:string){
    serverURL = s;
    // @ts-ignore
    socket = io(s);
}

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
        location.reload();
        return;
    }
    hasConnected = true;
    setConneted();
});
socket.on("disconnect",()=>{
    setConneted();
});
// socket.on("requestUsername",(f:(email:string,name:string)=>void)=>{
//     f(getEmail(),getUsername());
// });

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
socket.on("addChoice",(email:string,id:number,labels:string[],custom?:number[])=>{
    let b = story.getBoard(id);
    if(!b) return;

    if(custom) b.addChoice(labels,custom.map(v=>story.allBoards.find(w=>w._id == v)),true);
    else b.addChoice(labels,null,true);
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
socket.on("setBGImage",(email:string,id:number,img:string)=>{
    let b = story.getBoard(id);
    if(!b) return;

    b.setImg(img,true);
});

socket.on("fix",(msg:string)=>{
    alert(msg);
    location.reload();
});
socket.on("deleteProject",()=>{
    alert("The project you are currently editing has been deleted by the owner, refreshing page.");
    location.reload();
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
    email:string;
    name:string;
    id:string;
    curP:string;
}

let g_user:User;
async function logUserIn(){
    let user = await new Promise<User>(resolve=>{
        let email = LSGet("email");
        let username:string;
        let pass = LSGet("pc");
        let times = 0;
        function reset(){
            email = null;
            username = null;
            times = 0;
            test();
        }
        async function test(){
            times++;
            while(!email){
                // email = getEmail();
                email = prompt("Enter your email");
            }

            let needsNewAccount = await new Promise<boolean>(resolve=>{
                socket.emit("accountExists",email,(v:boolean)=>{
                    resolve(!v);
                });
            });

            if(needsNewAccount){
                username = getUsername(email);
                if(username == null){
                    reset();
                    return;
                }
                pass = prompt("(We found that your account doesn't have a password)\n\nPlease choose a password\n\n**I recommend something you don't use anywhere else because these passwords aren't encrypted**");
                if(pass == null){
                    reset();
                    return;
                }
            }
            // while(!pass){
            //     pass = getPass();
            // }
            socket.emit("login",email,username,pass,(data:any)=>{
                if(!data){
                    resolve(null);
                    console.warn("Unknown error logging in");
                    return;
                }
                if(data.err){
                    if(data.err == "pwDNE"){
                        LSRemove("pc");
                        pass = prompt("(We found that your account doesn't have a password)\n\nPlease choose a password\n\n**I recommend something you don't use anywhere else because these passwords aren't encrypted**");
                        test();
                        return;
                    }
                    if(times > 1) alert("Err: "+data.err);
                    pass = prompt("Please enter your password:");
                    if(pass == null) if(confirm("Go back and use a different email?")){
                        LSRemove("name");
                        LSRemove("email");
                        LSRemove("pc");
                        location.reload();
                    }
                    test();
                    return;
                }
                let user = new User(data);
                LSSet("email",email);
                LSSet("pc",pass);
                resolve(user);
            });
        }
        test();
    });
    g_user = user;
    l_g_email.textContent = user.email;
    let url = new URL(location.href);
    let owner = url.searchParams.get("o");
    let proj = url.searchParams.get("p");
    if(owner && proj){
        let res = await loadProject(owner,proj);
        if(!res){
            url.searchParams.delete("o");
            url.searchParams.delete("p");
            location.href = url.href;
        }
    }
    else openProjectMenu();
}
async function loadProject(email:string,name:string){
    // let proj = g_user.curP || "tmp";
    let code = LSGet("code-"+name);
    let codeIsWrong = (code == null);
    let pdata:any;
    async function promptCode(isFirst=false){
        if(codeIsWrong){
            code = prompt("Please enter project pass code:");
            if(code == null) return;
        }
        pdata = await new Promise<any>(resolve=>{
            socket.emit("openProject",email,name,code,((data:any)=>{
                resolve(data);
            }));
        });
        if(!pdata){
            console.log("could not find pdata");
            return;
        }
        if(pdata.err){
            codeIsWrong = true;
            if(pdata.code == 0){
                alert(pdata.err);
                return;
            }
            else if(pdata.code == 1){
                if(!isFirst) alert(pdata.err);
                await promptCode();
            }
        }
    }
    await promptCode(true);
    if(!code) return;

    localStorage.setItem(AID+"code-"+name,code||"");
    if(!pdata){
        console.warn("could not get pdata");
        alert("Failed to find/load project");
        return;
    }

    console.warn("OWNER:",pdata.owner);
    if(!pdata.owner) return;
    pdata.storyData.owner = pdata.owner;
    story = Story.load(pdata.storyData);
    story.origin.load();
    story.makeConnection(story.origin,story.start,ConnectionType.start);

    story.setPan(0,0);

    // let email = getEmail();
    // myEmail = email;
    story.deselectBoards();
    closeAllPanes();

    myCursor = cursorList.find(v=>v.email == myEmail);
    if(myCursor) myCursor.div.style.display = "none";
    story.userData = pdata.userData;
    for(const u of pdata.userData){
        for(const id of u.sel){
            if(u.email != myEmail) story.otherSelectBoard(u.email,id);
            else story.selectBoard(story.getBoard(id));
        }
    }

    return true;
}

async function initNetworkFromEditor(){
    await logUserIn();
}

const menus = document.querySelector(".menus");
const b_images = document.querySelector(".b-images") as HTMLButtonElement;

function closeMenu(div:HTMLElement){
    if(div.parentElement) div.parentElement.removeChild(div);
    back.classList.add("hide");
}
function closeMenuEV(div:HTMLElement){
    let close = div.querySelector(".close") as HTMLButtonElement;
    if(close) close.click();
}

const back = document.querySelector(".back");
async function chooseImage(){
    back.classList.remove("hide");
    
    let res:(v:string)=>void;
    let prom = new Promise<string>(resolve=>res = resolve);
    
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
        <div class="select-footer">
            <div class="l-img-name">No image selected.</div>
            <button class="b-confirm" disabled>Confirm</button>
        </div>
    `;
    let sel:string;
    let l_imgName = menu.querySelector(".l-img-name");
    let b_confirm = menu.querySelector(".b-confirm") as HTMLButtonElement;
    b_confirm.addEventListener("click",e=>{
        res(sel);
        closeMenu(menu);
    });

    let close = menu.querySelector(".close") as HTMLButtonElement;
    close.addEventListener("click",e=>{
        res(null);
        closeMenu(menu);
    });
    
    let dragZone = menu.querySelector(".drag-zone") as HTMLElement;
    let yi = menu.querySelector(".your-images");

    dragZone.addEventListener('dragover', function(e) {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    });

    function createImg(name:string,url?:string){
        let img = document.createElement("img");
        yi.appendChild(img);
        if(url) img.src = url;

        img.onclick = function(){
            sel = name;
            for(const c of yi.children){
                c.classList.remove("sel");
            }
            img.classList.add("sel");
            l_imgName.textContent = "Selected: "+name;
            b_confirm.disabled = false;
        };

        return img;
    }

    dragZone.addEventListener("drop",async e=>{
        e.stopPropagation();
        e.preventDefault();
        if(!e.dataTransfer.effectAllowed){
            console.log("Err: data transfer wasn't allowed");
            return;
        }
        
        let allowedTypes = ["png","jpg","jpeg","bmp","gif"];
        for(const f of e.dataTransfer.files){
            if(f.size >= 1e7){
                alert("The size of the file: "+f.name+" is too large.");
                continue;
            }
            
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

            let img = createImg(f.name);
            socket.emit("s_uploadImage",f.name,f,(url:string)=>{
                url = serverURL+"/"+url;
                img.src = url;
            });
        }
    });
    
    socket.emit("s_getImages",(list:string[])=>{
        if(!list) return;
        for(const name of list){
            createImg(name,serverURL+"/projects/"+story.owner+"/"+story.filename+"/images/"+name);
        }
    });

    return prom;
}
function openProjectMenu(){
    back.classList.remove("hide");

    let menu = document.createElement("div");
    menu.className = "pane open-project-menu";
    menus.appendChild(menu);
    menu.innerHTML = `
        <div class="head">
            <div>Open Project</div>
            <div class="close">X</div>
        </div>
        <br>
        <div>
            <input type="text" placeholder="Search..." class="i-search-proj"><br><br>
        </div>
        <div class="proj-list"></div>
        <br>
        <div class="select-footer">
            <div class="l-proj-name">No project selected.</div>
            <button class="b-confirm" disabled>Confirm</button>
        </div>
    `;
    let projList = menu.querySelector(".proj-list");
    let i_searchProj = menu.querySelector(".i-search-proj") as HTMLInputElement;
    let list2:any[] = [];
    i_searchProj.addEventListener("input",e=>{
        let v = i_searchProj.value;
        if(v == ""){
            for(const c of projList.children){
                c.classList.remove("hide");
            }
            return;
        }
        for(let i = 0; i < projList.children.length; i++){
            let c = projList.children[i];
            let name = list2[i].display;
            c.classList.add("hide");
            if(name.toLowerCase().includes(v.toLowerCase())){
                c.classList.remove("hide");
            }
        }
    });
    
    let sel:any;
    let b_confirm = menu.querySelector(".b-confirm") as HTMLButtonElement;
    b_confirm.addEventListener("click",async e=>{
        let preStory = story;
        let res = await loadProject(sel.email,sel.pid);
        if(res){
            closeMenu(menu);
            let url = new URL(location.href);
            url.searchParams.set("o",story.owner);
            url.searchParams.set("p",story.filename);
            if(preStory) location.href = url.href;
            else history.pushState(null,null,url.href);
        }
    });

    let close = menu.querySelector(".close") as HTMLButtonElement;
    close.addEventListener("click",e=>{
        closeMenu(menu);
    });

    socket.emit("getAllProjects",(list:any[])=>{
        // console.warn("All projects",list);
        myEmail = LSGet("email");
        if(!myEmail) return;
        list = list.filter(v=>v.pid != "images");
        list2 = list;
        for(const data of list){
            let d = document.createElement("div");
            d.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <div>
                        <div class="l-display">${data.display}</div>
                        <div>${data.email}</div>
                    </div>
                    ${data.email == myEmail ? `
                    <div style="display:flex;align-items:center;gap:20px">
                        <button class="b-rename" style="height:30px">Rename</button>
                        <button class="b-delete-proj" style="display:flex;justify-content:center;align-items:center"><div class="material-symbols-outlined">delete</div></button>
                    </div>
                    `:""}
                </div>
            `;
            d.addEventListener("click",e=>{
                for(const d1 of projList.children){
                    d1.classList.remove("sel");
                }
                d.classList.add("sel");
                sel = data;
                b_confirm.disabled = false;
            });
            d.addEventListener("dblclick",e=>{
                sel = data;
                b_confirm.disabled = false;
                b_confirm.click();
            });
            projList.appendChild(d);
            let display = d.querySelector(".l-display");
            let b_rename = d.querySelector(".b-rename") as HTMLButtonElement;
            if(b_rename) b_rename.addEventListener("click",e=>{
                let newName = prompt("Old name: ("+data.display+")\nNew name:");
                if(!newName) return;
                socket.emit("s_renameProject",data.email,data.pid,newName,(res:any)=>{
                    if(res.err) alert(res.err);
                    else{
                        display.textContent = newName;
                        data.display = newName;
                    }
                });
            });
            let b_delete = d.querySelector(".b-delete-proj") as HTMLButtonElement;
            if(b_delete) b_delete.addEventListener("click",e=>{
                if(!confirm("Are you sure you want to delete project: "+data.display+"?")) return;
                socket.emit("s_deleteProject",data.email,data.pid,(res:any)=>{
                    if(res.err) alert(res.err);
                    else{
                        d.parentElement.removeChild(d);
                    }
                });
            });
        }
    });
}

// window.addEventListener("beforeunload",e=>{
//     grid.innerHTML = "";
// });
// window.addEventListener("popstate",e=>{
//     location.reload();
// });