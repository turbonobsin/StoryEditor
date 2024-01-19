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
    let str = localStorage.getItem("__SE-PD") || "{locId:0}";
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

    let res = sel.addChoice(name.split(","));
    story.save();
    i_addChoice.value = "";
    // loadEditBoard(sel);
    story.selectBoard(res[0]);
});
b_play.addEventListener("click",e=>{
    story._save();
    setPlayI(0);
    location.pathname = "/play";
});
b_resumePlay.addEventListener("click",e=>{
    story._save();
    location.pathname = "/play";
});
b_save.addEventListener("click",e=>{
    story._save();
});

function simplifyText(t:string){
    return t.toLowerCase().replaceAll(" ","");
}
i_searchAll.addEventListener("input",e=>{
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
    console.log("CLSOE");
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

document.addEventListener("mousemove",e=>{
    let {x,y} = getM(e);
    let dx = x-story.lx;
    let dy = y-story.ly;
    story.lx = x;
    story.ly = y;
    
    if(story.isPanning){
        story.setPan(story.panX-dx,story.panY-dy);
    }
    else if(story.dragBoards.length){
        let done:Board[] = [];
        for(const b of story.dragBoards){
            function loop(board:Board,once=false){
                if(done.includes(board)) return;
                
                board.x += dx;
                board.y += dy;
                board.update();

                done.push(board);

                if(once) return;
                
                for(const c of board.buttons){
                    loop(c.board);
                }
            }
            loop(b,keys.alt);
        }
    }
});
document.addEventListener("mousedown",e=>{
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
            par.addChoice(list,children);

            story.save();
            story.deselectBoards();
            children.forEach(v=>story.selectAddBoard(v));
            return;
        }
        
        if(story.selBoards.length) story.dragBoards = [...story.selBoards];
        else story.dragBoards = [story.hoverBoard];
        // story.selectBoard(story.hoverBoard);
    }
    else if(!overPane){
        story.isPanning = true;
    }
});
document.addEventListener("mouseup",e=>{
    if(!story.hoverBoard) if(!overPane) if(story.sx == story.lx && story.sy == story.ly){
        story.deselectBoards();
        closeAllPanes();
    }
    if(story.dragBoards.length != 0 || story.isPanning) story.save();
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
if(localStorage.getItem("__SELS-tmp")){
    story = Story.load();
    story.origin.load();
    story.makeConnection(story.origin,story.start,ConnectionType.start);
}
else{
    story = new Story("TestFile1");
    story.init();
}

function resetFile(){
    localStorage.removeItem("__SELS-tmp");
    location.reload();
}

// Auto Save Interval
setInterval(()=>{
    if(story.needsSave){
        story._save();
        story.needsSave = false;
    }
},3000);