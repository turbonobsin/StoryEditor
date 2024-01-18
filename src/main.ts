let grid = document.querySelector(".grid") as HTMLElement;
let grid2 = document.querySelector(".grid2") as HTMLElement;
let panes = document.querySelectorAll<HTMLElement>(".pane");
let pane_editBoard = document.querySelector(".edit-board");
let pane_editChoice = document.querySelector(".edit-choice");
let i_searchAll = document.querySelector(".i-search-all") as HTMLInputElement;

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
function loadEditBoard(b:Board){
    pane_editBoard.classList.add("open");
    
    let i_title = pane_editBoard.querySelector(".i-title") as HTMLInputElement;
    let ta_text = pane_editBoard.querySelector(".ta-text") as HTMLTextAreaElement;
    let ta_choices = pane_editBoard.querySelector(".ta-choices") as HTMLTextAreaElement;

    i_title.value = b.title;
    ta_text.value = b.text;
    ta_choices.value = b.buttons.map(v=>"[["+v.label+"]]").join("\n");

    i_title.onblur = function(){
        b.title = i_title.value;
        b.write();
    };
    ta_text.onblur = function(){
        b.text = ta_text.value;
        b.write();
    };
}

let g_gap = 200;

enum ConnectionType{
    start,
    path
}
let connectionData = [
    {
        col:"green"
    },
    {
        col:"gray"
    }
];
class Story{
    constructor(filename:string){
        this.filename = filename;
        this._i = 0;
        this.start = new Board(this,0,0);
        this.origin = new OriginPoint(this,0,-g_gap);
    }
    filename:string;
    _i:number;
    start:Board;
    origin:StoryObj;

    panX = 0;
    panY = 0;

    loadedObjs:StoryObj[] = [];

    // 

    isPanning = false;
    sx = 0;
    sy = 0;
    lx = 0;
    ly = 0;
    hoverBoard:Board;
    selBoards:Board[] = [];
    dragBoards:Board[] = [];

    // 

    init(){
        this.start.load();
        this.origin.load();
        this.makeConnection(this.origin,this.start,ConnectionType.start);

        // let res = this.start.addChoice("Choice 1","Choice 2","Choice 3","Choice 4");
        // for(const c of res){
        //     c.addChoice("Another Choice 1","Another Choice 2","Another Choice 2","Another Choice 2");
        // }
        let res = this.start.addChoice(["Choice 1","Choice 2"]);
        res[0].x -= g_gap/2;
        res[1].x += g_gap/2;
        for(const c of res){
            c.addChoice(["Another Choice 1","Another Choice 2"]);
            c.update();
        }

        // let newB = new Board(this,0,300,"Test 2");
        // newB.load();
        // this.makePath(this.start,newB,new StoryButton("Text",null));
    }
    setPan(px:number,py:number){
        this.panX = px;
        this.panY = py;
        grid2.style.backgroundPositionX = (-px)+"px";
        grid2.style.backgroundPositionY = (-py)+"px";

        grid.style.left = (-px)+"px";
        grid.style.top = (-py)+"px";

        // this.updateAllBoards();
    }

    updateAllBoards(){
        for(const b of this.loadedObjs){
            b.update();
        }
    }
    addObj(o:StoryObj){
        if(!this.loadedObjs.includes(o)){
            this.loadedObjs.push(o);
            grid.appendChild(o.div);
        }
    }

    getRootPos(){
        // let x = innerWidth/2 - this.panX;
        // let y = innerHeight/2-72 - this.panY;
        let x = innerWidth/2;
        let y = innerHeight/2-72;
        return {x,y};
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
    }

    selectBoard(o:Board){
        if(keys.shift){
            if(this.selBoards.includes(o)) this.selectRemoveBoard(o);
            else this.selectAddBoard(o);
            return;
        }
        if(this.selBoards.includes(o)) return;
        
        this.deselectBoards();
        this.selBoards = [o];
        o.select();
    }
    selectAddBoard(o:Board){
        this.selBoards.push(o);
        o.select();
        if(this.selBoards.length > 1) closeAllPanes();
    }
    selectRemoveBoard(o:Board){
        this.selBoards.splice(this.selBoards.indexOf(o),1);
        o.deselect();
        if(this.selBoards.length == 1) this.selBoards[0].select();
        else if(this.selBoards.length == 0) closeAllPanes();
    }
    deselectBoards(){
        for(const c of this.selBoards){
            c.deselect();
        }
        this.selBoards = [];
    }

    // File Management
    getSaveObj(){
        let o = {
            filename:this.filename,
            _i:this._i,
            panX:this.panX,
            panY:this.panY,
            boards:this.loadedObjs.map(v=>v.save()).filter(v=>v!=null)
        };
        return o;
    }
    save(){
        let o = this.getSaveObj();
        let str = JSON.stringify(o);
        localStorage.setItem("__SELS-tmp",str);
    }
    static load(){
        let str = localStorage.getItem("__SELS-tmp");
        if(!str) return;
        let o = JSON.parse(str);
        if(!o) return;
        
        let s = new Story(o.filename);
        s._i = 0;
        s.setPan(o.panX,o.panY);
        let o1 = o.boards[0];
        let root = new Board(s,o1.x,o1.y,o1.title,o1.text,o1.tags);
        root._id = o1._id;
        s.start = root;
        root.load();
        
        let list:Board[] = [root];
        for(let i = 1; i < o.boards.length; i++){
            let b = o.boards[i];
            let b1 = new Board(s,b.x,b.y,b.title,b.text,b.tags);
            b1._id = b._id;
            list.push(b1);
        }
        for(let i = 0; i < o.boards.length; i++){
            let b = o.boards[i];
            let b1 = list[i];
            b1.addChoice(b.btns.map((v:any)=>v.l),b.btns.map((v:any)=>list[v.id]));
            // if(i == 0) s.start.load();
            // for(const btn of b.btns){
                // let btn2 = new StoryButton(btn.l,list.find(v=>v._id == btn.id),b1);
                // b1.buttons.push(btn2);
                // b1.addChoice()
            // }
            // b1.load();
        }

        s._i = o._i;

        return s;
    }
}
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
    div:HTMLElement;
    load(){}

    top = 0;
    bottom = 0;

    update(){
        let d = this.div;
        let {x,y} = this.story.getRootPos();
        x += this.x;
        y += this.y;
        d.style.left = x+"px";
        d.style.top = y+"px";

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
        this.div.classList.add("sel");
    }
    deselect(){
        this.div.classList.remove("sel");
    }

    save():any{return null}
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
    beam:HTMLElement;
    joint:HTMLElement;
    load(): void {
        let div = document.createElement("div");
        div.className = "connect";
        div.innerHTML = `
            <div class="beam"></div>
            <div class="joint"></div>
        `;
        grid.appendChild(div);
        this.div = div;
        this.beam = div.querySelector(".beam");
        this.joint = div.querySelector(".joint");

        let data = connectionData[this.type];
        div.style.setProperty("--col",data.col);

        this.update();
    }
    update(): void {
        let d = this.div;
        let {x,y} = this.story.getRootPos();

        let dx = this.to.x-this.from.x;
        let dy = this.to.y-this.to.top-(this.from.y+this.from.bottom);
        let cx = (this.from.x+this.to.x)/2;
        let cy = (this.from.y+this.from.bottom+(this.to.y-this.to.top))/2;
        x += cx;
        y += cy;

        let ang = Math.atan2(dy,dx);
        let dist = Math.sqrt(dx**2+dy**2);
        this.beam.style.rotate = ang+"rad";
        this.beam.style.width = dist+"px";

        d.style.left = x+"px";
        d.style.top = y+"px";
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
    choice:HTMLElement;
    load(): void {
        super.load();
        this.div.removeChild(this.joint);
        let textDiv = document.createElement("div");
        textDiv.className = "choice";
        textDiv.textContent = this.ref.label;
        this.div.appendChild(textDiv);
        this.choice = textDiv;
    }
}
class OriginPoint extends StoryObj{
    constructor(story:Story,x:number,y:number){
        super("Origin/Start",story,x,y);
    }
    load(): void {
        let div = document.createElement("div");
        div.className = "origin";
        this.div = div;
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

        // this.top = 50;
        // this.bottom = 50; // enable these if you want the top and bottom of the boards to be the connecting points
    }
    text:string;
    buttons:StoryButton[] = [];
    tags:string[];

    _id:number;

    l_title:HTMLElement;
    l_tag:HTMLElement;

    load(){
        if(this.div) grid.removeChild(this.div);
        
        let div = document.createElement("div");
        div.className = "board";
        div.innerHTML = `
            <div class="title">${this.title}</div>
            <div class="tag">${this.tags.join(", ")}</div>
        `;
        this.div = div;

        div.addEventListener("mouseenter",e=>{
            this.story.hoverBoard = this;
        });
        div.addEventListener("mouseleave",e=>{
            this.story.hoverBoard = null;
        });
        div.addEventListener("mousedown",e=>{
            this.story.selectBoard(this);
        });

        this.story.addObj(this);
        this.l_title = div.querySelector(".title");
        this.l_tag = div.querySelector(".tag");
        
        this.update();
    }

    update(): void {
        super.update();

        this.l_title.textContent = this.title;
        this.l_tag.textContent = this.tags.join(", ");

        if(false){ // collision
            let x = this.x;
            let y = this.y;

            let w = 100;
            let h = 100;
            for(const c of this.story.loadedObjs){
                if(c == this) continue;
                if(x+w < c.x) continue;
                if(x > c.x+w) continue;
                if(y+h < c.y) continue;
                if(y > c.y+h) continue;
                
                this.y += g_gap;
                this.update();
                // setTimeout(()=>this.update(),2000);
                return;
            }
        }
    }

    addChoice(labels:string[],custom?:Board[]){
        let i = 0;
        let w = (labels.length-1)*g_gap;
        let list:Board[] = [];
        for(const l of labels){
            let b:Board;
            let btn:StoryButton;
            if(!custom){
                b = new Board(this.story,this.x-w/2+i*g_gap,this.y+g_gap);
            }
            else{
                b = custom[i];
            }
            list.push(b);
            btn = new StoryButton(l,b,this);
            this.buttons.push(btn);
            b.load();

            this.story.makePath(this,b,btn);
            i++;
        }
        return list;
    }

    write(): void {
        super.write();
        this.story.save();
    }

    select(): void {
        super.select();
        loadEditBoard(this);
    }

    save() {
        let o = {
            title:this.title,
            x:this.x,
            y:this.y,
            _id:this._id,
            text:this.text,
            tags:this.tags,
            btns:this.buttons.map(v=>{
                let o2 = {
                    l:v.label,
                    id:v.board._id
                };
                return o2;
            })
        };
        return o;
    }
}
class StoryButton{
    constructor(label:string,board:Board,par:Board){
        this.label = label;
        this.board = board;
        this.par = par;
    }
    label:string;
    board:Board;
    par:Board;
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
        for(const b of story.dragBoards){
            function loop(board:Board,once=false){
                board.x += dx;
                board.y += dy;
                board.update();

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

let keys:Record<string,boolean> = {};
document.addEventListener("keydown",e=>{
    let k = e.key.toLowerCase();
    keys[k] = true;
});
document.addEventListener("keyup",e=>{
    let k = e.key.toLowerCase();
    keys[k] = false;
});

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