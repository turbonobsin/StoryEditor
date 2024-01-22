class PlayData{
    locId:number;
    static load(){
        let str = localStorage.getItem("__SE-PD");
        if(!str){
            console.warn("No PD found, creating some");
            let p = new PlayData();
            p.locId = 0;
            p.save();
            return p;
        }
        let o = JSON.parse(str);
        let p = new PlayData();
        p.locId = o.locId;
        
        passage.scrollTop = o.scrollTop;
        return p;
    }
    save(){
        let o = {
            locId:this.locId,
            scrollTop:passage.scrollTop
        };
        if(!o){
            console.warn("Failed to save PD");
            return;
        }
        let str = JSON.stringify(o);
        if(!str){
            console.warn("Failed to save PD");
            return;
        }
        localStorage.setItem("__SE-PD",str);
    }
}
let playData:PlayData;
let playStory:Story;
let allBoards:Board[] = [];

let passage = document.querySelector(".passage");
// let buttons = document.querySelector(".buttons");

function madeChoice(btn:StoryButton,button:HTMLButtonElement){
    let p_btns = document.querySelectorAll(".p-btn");
    for(const c of p_btns){
        c.classList.add("done");
        btn.par._done = true;
    }
    button.classList.add("picked");
}
function scrollDown(){
    scrollTo({left:0,top:document.body.scrollHeight,behavior:"smooth"});
}
async function loadBoard(b:Board){
    playData.locId = b._id;
    playData.save();

    let cont = document.createElement("div");
    passage.appendChild(cont);

    let imgUrl = b.img;
    console.log("img",imgUrl);
    if(imgUrl){
        let img = document.createElement("img");
        img.src = `${serverURL}/projects/${playStory.owner}/${playStory.filename}/images/${imgUrl}`;
        let success = false;
        await new Promise<void>(resolve=>{
            img.onload = function(){
                success = true;
                resolve();
            };
            img.onerror = function(){
                resolve();
            };
        });
        // if(success){
            cont.appendChild(img);
            await wait(4000);
        // }
    }
    
    let lines = b.text.replaceAll("\n"," ").split(". ").map(v=>v.trim());
    await wait(500);
    for(const l of lines){
        let div = document.createElement("div");
        div.className = "p-item";
        div.textContent = l;
        cont.appendChild(div);
        scrollDown();
        await wait(2000);
    }

    if(b.buttons.length == 0){ // End
        let end = document.createElement("div");
        end.className = "end";
        end.textContent = "END";
        cont.appendChild(end);
        scrollDown();
        return;
    }
    await wait(500);
    
    let buttons = document.createElement("div");
    cont.appendChild(buttons);
    buttons.className = "buttons";
    for(const btn of b.buttons){
        let button = document.createElement("button");
        button.className = "p-btn";
        button.textContent = btn.label;
        buttons.appendChild(button);
        button.style.width = (100/b.buttons.length)+"%";

        button.addEventListener("click",e=>{
            if(btn.par._done){
                console.warn("Can't go back!");
                return;
            }
            loadBoard(btn.board);
            madeChoice(btn,button);
        });
        
        scrollDown();
        await wait(500);
    }
}

async function initPlay(){
    let url = new URL(location.href);
    let email = url.searchParams.get("email");
    let pid = url.searchParams.get("pid");
    if(!email || !pid){
        console.warn("Invalid search params");
        return;
    }
    console.log("...starting load");
    
    // 

    let code = LSGet("code-"+pid);
    let pdata:any;
    async function promptCode(isFirst=false){
        if(!isFirst){
            code = prompt("Please enter project pass code:");
            if(code == null) return;
        }
        pdata = await new Promise<any>(resolve=>{
            socket.emit("openProject_readonly",email,pid,code,((data:any)=>{
                resolve(data);
            }));
        });
        if(!pdata){
            console.log("could not find pdata");
            return;
        }
        if(pdata.err){
            if(pdata.code == 0){
                alert(pdata.err);
                return;
            }
            else if(pdata.code == 1){
                alert(pdata.err);
                await promptCode();
            }
        }
    }
    console.log("...finding code");
    await promptCode(true);
    console.log("...found?");

    localStorage.setItem(AID+"code-"+pid,code||"");
    if(!pdata){
        console.warn("could not get pdata");
        alert("Failed to find/load project");
        return;
    }

    console.warn("OWNER:",pdata.owner);
    if(!pdata.owner){
        console.warn("no owner found");
        return;
    }
    pdata.storyData.owner = pdata.owner;
    story = Story.load(pdata.storyData);
    console.log("story",story);

    // 
    
    playData = PlayData.load();
    // playStory = Story.load();
    playStory = story;
    for(const b of playStory.loadedObjs){
        if(b instanceof Board){
            allBoards[b._id] = b;
        }
    }

    let start = allBoards[playData.locId];
    if(!start){
        console.log("couldn't find start",playData.locId,allBoards);
        playData.locId = playStory.start._id;
        start = allBoards[playData.locId];
    }
    loadBoard(start);
}
// @ts-ignore
let myCursor:any;

// @ts-ignore
let socket:Socket = io(serverURL);
socket.on("connect",()=>{
    initPlay();
});