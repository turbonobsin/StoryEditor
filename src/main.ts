let b_theme = document.querySelector(".b-theme") as HTMLButtonElement;
let themeImg = b_theme.querySelector("img");
let theme = localStorage.getItem("__SE-theme") || "light";

let i_title = pane_editBoard.querySelector(".i-title") as HTMLInputElement;
let ta_text = pane_editBoard.querySelector(".ta-text") as HTMLTextAreaElement;
let _editBoard_b:Board;

function setTheme(val:string){
    let html = document.body.parentElement;
    // html.style.filter = (val == "dark" ? "invert(1) hue-rotate(180deg) brightness(0.8) contrast(0.8)" : "none");
    html.style.setProperty("--theme-filter",(val == "dark" ? "invert(1) hue-rotate(180deg) brightness(0.8) contrast(0.8)" : "none"));
    html.style.setProperty("--img-filter",(val == "dark" ? "invert(1) hue-rotate(180deg) brightness(1) contrast(1)" : "none"));
    localStorage.setItem("__SE-theme",val);
    themeImg.src = (val == "dark" ? "assets/dark_mode.svg" : "assets/light_mode.svg");
}
setTheme(theme);
b_theme.addEventListener("click",e=>{
    if(theme == "dark") theme = "light";
    else theme = "dark";
    setTheme(theme);
});

let b_open = document.querySelector(".b-open") as HTMLButtonElement;
let b_create = document.querySelector(".b-create") as HTMLButtonElement;
async function openDir(){
    // @ts-ignore
    story.handle = await showDirectoryPicker({
        mode:"readwrite",
        id:"openDir"
    });
}
b_open.addEventListener("click",e=>{
    // openDir();
    // let name = prompt("Please type the name of the project you wish to join");
    openProjectMenu();
});
b_create.addEventListener("click",e=>{
    let name = prompt("Please enter the project name:");
    if(!name) return;
    let code:string;
    while(true){
        code = prompt("Please enter a passcode in order to edit the project:");
        if(code == null) return;
        if(code) break;
    }
    socket.emit("createProject",name,code,(res:number)=>{
        if(res == 1){
            alert("Successfully created project: "+name);
            localStorage.setItem(AID+"code-"+name,code);
        }
        else alert("Failed to create project");
    });
});

let i_searchAll = document.querySelector(".i-search-all") as HTMLInputElement;
let choiceList = document.querySelector(".choice-list");
let i_addChoice = document.querySelector(".i-add-choice") as HTMLInputElement;
let b_addChoice = document.querySelector(".b-add-choice") as HTMLButtonElement;
let b_resumePlay = document.querySelector(".b-resume-play") as HTMLButtonElement;
let b_play = document.querySelector(".b-play") as HTMLButtonElement;
let b_save = document.querySelector(".b-save") as HTMLButtonElement;
let b_playFromHere = document.querySelector(".b-play-from-here") as HTMLButtonElement;
let b_export = document.querySelector(".b-export") as HTMLButtonElement;
let b_import = document.querySelector(".b-import") as HTMLButtonElement;
let b_reset = document.querySelector(".b-reset") as HTMLButtonElement;
let b_logout = document.querySelector(".b-logout") as HTMLButtonElement;
let l_g_email = document.querySelector(".l-g-email");

const b_chooseBGImg = document.querySelector(".b-choose-bg-img") as HTMLButtonElement;
const b_removeBGImg = document.querySelector(".b-remove-bg-img") as HTMLButtonElement;
const l_bgPreview = document.querySelector(".l-bg-preview") as HTMLImageElement;
const img_bgPreview = document.querySelector(".img-bg-preview") as HTMLImageElement;

const b_chooseBGAudio = document.querySelector(".b-choose-bg-audio") as HTMLButtonElement;
const b_removeBGAudio = document.querySelector(".b-remove-bg-audio") as HTMLButtonElement;
const l_bgAudioPreview = document.querySelector(".l-bg-audio-preview") as HTMLImageElement;
// const audio_bgPreview = document.querySelector(".audio-bg-preview") as HTMLImageElement;

b_chooseBGImg.addEventListener("click",async e=>{
    if(story.selBoards.length != 1) return;
    let sel = story.selBoards[0];
    
    let name = await chooseImage();
    if(!name) return;
    
    sel.setImg(name);
});
b_removeBGImg.addEventListener("click",async e=>{
    if(story.selBoards.length != 1) return;
    let sel = story.selBoards[0];
    
    if(sel.img == null) return;
    
    sel.setImg(null);
});
b_chooseBGAudio.addEventListener("click",async e=>{
    if(story.selBoards.length != 1) return;
    let sel = story.selBoards[0];
    
    let name = await chooseAudio();
    if(!name) return;
    
    sel.setAudio(name);
});
b_removeBGAudio.addEventListener("click",async e=>{
    if(story.selBoards.length != 1) return;
    let sel = story.selBoards[0];
    
    if(sel.audio == null) return;
    
    sel.setAudio(null);
});

b_logout.addEventListener("click",e=>{
    if(!confirm("Are you sure you want to log out?")) return;
    LSRemove("name");
    LSRemove("email");
    LSRemove("pc");
    location.reload();
});
b_export.addEventListener("click",e=>{
    let o = story.getSaveObj();
    if(!o) return;
    let str = JSON.stringify(o);
    if(!str) return;
    let filename = prompt("File name used for export",story.filename);
    if(!filename) return;
    let a = document.createElement("a");
    a.href = "data:text/json;charset=utf-8,"+encodeURIComponent(str);
    a.download = filename+".json";
    a.click();
    console.log("exported");
});
b_import.addEventListener("click",e=>{
    let i = document.createElement("input");
    i.type = "file";
    i.onchange = function(e){
        // @ts-ignore
        let file = e.target.files[0];
        let reader = new FileReader();
        reader.onload = function(e2){
            let text = e2.target.result as string;
            localStorage.setItem("__SELS-tmp",text);
            location.reload();
        };
        reader.readAsText(file);
    };
    i.click();
});
b_reset.addEventListener("click",e=>{
    if(!confirm("Are you sure you want to reset? You will lose anything that hasn't been exported!")) return;
    resetFile();
});

function setPlayI(i:number){
    let str = localStorage.getItem("__SE-PD") || '{"locId":0}';
    let o = JSON.parse(str);
    o.locId = i;
    localStorage.setItem("__SE-PD",JSON.stringify(o));
}

b_addChoice.addEventListener("click",e=>{
    if(!pane_editBoard.classList.contains("open")) return;
    let sel = story.selBoards[0];
    if(!sel) return;
    let name = i_addChoice.value;
    if(!name) return;

    let list = name.split(",");
    let res = sel.addChoice(list,[]);
    socket.emit("s_addChoice",sel._id,list,[]);
    story.save();
    i_addChoice.value = "";
    // loadEditBoard(sel);
    story.selectBoard(res[0]);
});
function getURLFix(){
    let s = location.pathname.split("/");
    if(s[s.length-1]?.includes(".")) s.pop();
    return location.origin+(s[0]?.startsWith("/")?"":"/")+s.join("/");
}
b_play.addEventListener("click",e=>{
    if(!story) return;
    story._save();
    setPlayI(0);
    // location.pathname = `/play/index.html?email=${story.owner}&pid=${story.filename}`;
    let url = new URL(location.href);
    url.href = getURLFix()+"play/index.html";
    url.searchParams.set("email",story.owner);
    url.searchParams.set("pid",story.filename);
    // location.assign(url);
    let a = document.createElement("a");
    a.href = url.href;
    a.target = "_blank";
    a.click();
});
b_resumePlay.addEventListener("click",e=>{
    if(!story) return;
    story._save();
    // location.pathname = `/play/index.html?email=${story.owner}&pid=${story.filename}`;
    let url = new URL(location.href);
    url.href = getURLFix()+"play/index.html";
    url.searchParams.set("email",story.owner);
    url.searchParams.set("pid",story.filename);
    // location.assign(url);
    let a = document.createElement("a");
    a.href = url.href;
    a.target = "_blank";
    a.click();
});
b_save.addEventListener("click",e=>{
    story._save();
});

function simplifyText(t:string){
    return t.toLowerCase().replaceAll(" ","");
}
i_searchAll.addEventListener("input",e=>{
    if(!story) return;
    
    let v = simplifyText(i_searchAll.value);
    for(const b of story.loadedObjs){
        let a = simplifyText(b.title);
        if(a.includes(v)){
            story.setPan(b.x,b.y);
            if(b instanceof Board){
                story.deselectBoards();
                story.selectBoard(b);
            }
            return;
        }
    }
});
b_playFromHere.addEventListener("click",e=>{
    if(story.selBoards.length != 1) return;
    
    setPlayI(story.selBoards[0]._id);
    b_resumePlay.click();
});

let overPane = false;
function initPane(c:HTMLElement){
    let b_close = c.querySelector(".close");
    if(b_close) b_close.addEventListener("click",e=>{
        story.deselectBoards();
        closePane(c);
    });
}
function closePane(c:HTMLElement){
    c.classList.remove("open");
    if(c == pane_editBoard) _editBoard_b = null;
}
function closeAllPanes(){
    for(const c of panes){
        closePane(c);
    }
}
for(const c of panes){
    c.addEventListener("mouseenter",e=>{
        overPane = true;
    });
    c.addEventListener("mouseleave",e=>{
        overPane = false;
    });
    initPane(c);
}

function getM(e:MouseEvent){
    let x = e.clientX;
    let y = (e.clientY-72)/innerHeight*(innerHeight-72);
    return {x,y};
}

let mx = 0;
let my = 0;
document.addEventListener("mousemove",e=>{
    if(!story) return;
    mx = e.clientX;
    my = e.clientY;
    
    let {x,y} = getM(e);
    let dx = x-story.lx;
    let dy = y-story.ly;
    story.lx = x;
    story.ly = y;
    
    if(story.isPanning){
        story.setPan(story.panX-dx,story.panY-dy);
    }
    else if(story.dragBoards.length){
        story.moveBoards(story.dragBoards,dx/story.zoom,dy/story.zoom);
    }
});
let mouseDown = [false,false,false];
document.addEventListener("mousedown",e=>{
    if(menus.children.length) return;
    mouseDown[e.button] = true;
    if(!story) return;
    
    if(e.clientY <= 72) return;
    i_searchAll.value = "";
    
    let {x,y} = getM(e);
    story.sx = x;
    story.sy = y;
    story.lx = x;
    story.ly = y;
    if(story.hoverBoard){
        if(e.ctrlKey) if(story.selBoards.length >= 1){
            let children = [...story.selBoards].concat(story.hoverBoard);
            let par = children.splice(0,1)[0];
            let ind = children.indexOf(par);
            if(ind != -1) children.splice(ind,1);
            
            let list:string[] = [];// = children.map(v=>prompt("What should the choice text be to go to: "+v.title+"?"));
            let cancel = false;
            for(const v of children){
                let choice = prompt("What should the choice text be to go to: "+v.title+"?");
                if(!choice){
                    cancel = true;
                    break;
                }
                list.push(choice);
            }
            if(cancel) return;
            par.addChoice(list,[],children);
            socket.emit("s_addChoice",par._id,list,[],children.map(v=>v._id));

            story.save();
            story.deselectBoards();
            children.forEach(v=>story.selectAddBoard(v));
            return;
        }
        
        if(story.selBoards.length) story.dragBoards = [...story.selBoards];
        else story.dragBoards = [story.hoverBoard];
        // story.selectBoard(story.hoverBoard);
    }
    else if(!overPane && menus.children.length == 0){
        story.isPanning = true;
    }
});
document.addEventListener("mouseup",e=>{
    mouseDown[e.button] = false;
    if(!story) return;
    
    if(!story.hoverBoard) if(!overPane) if(story.sx == story.lx && story.sy == story.ly){
        story.deselectBoards();
        closeAllPanes();
    }
    // if(story.dragBoards.length != 0 || story.isPanning) story.save();
    if(story.dragBoards.length != 0) story.save();
    story.isPanning = false;
    story.dragBoards = [];
});

document.addEventListener("keydown",e=>{
    let k = e.key.toLowerCase();
    keys[k] = true;
    let active = document.activeElement?.tagName.toLowerCase();
    if(active == "input" || active == "textarea") return;
    if(k == "backspace" || k == "delete") if(confirm("Are you sure you want to delete board(s): "+(story.selBoards.map(v=>v.title).join(", "))+"?")){
        let list = [...story.selBoards];
        for(const b of list){
            story.deleteBoard(b);
        }
        if(list.length) story.save();
    }
});
document.addEventListener("keyup",e=>{
    let k = e.key.toLowerCase();
    keys[k] = false;
});
let _lw = -1;
let _lh = -1;
let mainCont = document.querySelector(".main") as HTMLElement;
function zoomBy(r:number){    
    if(!story) return;
    
    let panCont = grid;
    let cont = grid;
    
    story.zoom *= r;
    if(story.zoom < 0.1) story.zoom = 0.1;
    if(story.zoom > 5) story.zoom = 5; //3
    let r1 = panCont.getBoundingClientRect();

    panCont.style.scale = story.zoom.toString();
    mainCont.style.backgroundSize = (story.zoom*2)+"vw";

    // FINAL!!! (for center zooming only)
    // story.panX *= r;
    // story.panY *= r;

    let r2 = cont.getBoundingClientRect();
    // let r2 = panCont.getBoundingClientRect();
    
    let a1 = r2.width-r1.width;
    let b1 = r2.height-r1.height;
    // let a1 = r1.width*r-r1.width;
    // let b1 = r1.height*r-r1.height;

    let cxd = mx-(r1.x+r1.width/2);
    let cyd = my-(r1.y+r1.height/2);
    let cx = cxd/r1.width;
    let cy = cyd/r1.height;
    
    story.panX += a1*cx;
    story.panY += b1*cy;

    story.setPan(story.panX,story.panY);
}
document.addEventListener("wheel",e=>{
    if(menus.children.length) return;
    if(!e.ctrlKey) return;
    e.preventDefault();
    let speed = Math.abs(e.deltaY)/500;
    let scale = 1.001+speed; //1.1
    zoomBy(e.deltaY > 0 ? 1/scale : scale);
},{
    passive:false
});
if(false) document.addEventListener("wheel",e=>{
    let v = (e.deltaY > 0 ? -1 : 1) / 10;
    if(_lw == -1){
        let r = grid.getBoundingClientRect();
        _lw = r.width;
        _lh = r.height;
    }
    story.setZoom(story.zoom+v);
    let r = grid.getBoundingClientRect();
    let dw = r.width-_lw;
    _lw = r.width;
    let dh = r.height-_lh;
    _lh = r.height;

    let {x,y} = story.getRootPos();
    x -= story.panX;
    y -= story.panY;
    let ratX = (e.clientX-x)/r.width;
    let ratY = (e.clientY-y-story.origin.y*story.zoom)/innerHeight;
    story.panX += ratX/dw;
    story.panX += ratY/dh;
    story.setPan(story.panX,story.panY);
});

class Hist{ // to do at a later time
    constructor(){

    }
    list:HistState[];
    i = 0;
    undo(){

    }
    redo(){
        
    }
}
class HistState{
    constructor(label:string){
        this.label = label;
    }
    label:string;
}

let story:Story;
if(false){
    if(localStorage.getItem("__SELS-tmp")){
        story = Story.load();
        story.origin.load();
        story.makeConnection(story.origin,story.start,ConnectionType.start);
    }
    else{
        story = new Story("TestFile1","");
        story.init();
    }
}
window.addEventListener("load",e=>{
    initNetworkFromEditor();
});

function resetFile(){
    localStorage.removeItem("__SELS-tmp");
    location.reload();
}

// Auto Save Interval
setInterval(()=>{
    if(!story) return;
    if(story.needsSave){
        story._save();
        story.needsSave = false;
    }
},3000);