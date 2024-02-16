function LSGet(id) {
    return localStorage.getItem(AID + id);
}
function LSSet(id, v) {
    localStorage.setItem(AID + id, v);
}
function LSRemove(id) {
    localStorage.removeItem(AID + id);
}
function LSGetSet(id, req) {
    let v = localStorage.getItem(AID + id);
    if (v == "null")
        v = null;
    if (v)
        return v;
    v = req();
    localStorage.setItem(AID + id, v);
    return v;
}
function getUsername(email) {
    return prompt("Creating a new account with email (" + email + "):\n\n Enter your username");
    // return LSGetSet("name",()=>prompt("Creating a new account with email ("+email+"):\n\n Enter your username"));
}
function getPass() {
    return LSGetSet("pc", () => prompt((LSGet("email") ? "(We found that your account doesn't have a password)\n\n" : "") + "Please choose a password\n\n**I recommend something you don't use anywhere else because these passwords aren't encrypted**"));
}
let _curWait;
function wait(delay) {
    if (keys[" "])
        return;
    if (keys.shift) {
        return new Promise(resolve => {
            _curWait = resolve;
            setTimeout(() => {
                _curWait = null;
                resolve();
            }, 100);
        });
    }
    return new Promise(resolve => {
        _curWait = resolve;
        setTimeout(() => {
            _curWait = null;
            resolve();
        }, delay);
    });
}
let panes = document.querySelectorAll(".pane");
let pane_editBoard = document.querySelector(".edit-board");
let pane_editChoice = document.querySelector(".edit-choice");
let grid = document.querySelector(".grid");
let grid2 = document.querySelector(".grid2");
let keys = {};
function santitizeEmail(email) {
    return email.replaceAll("@", "").replaceAll(".", "");
}
var ConnectionType;
(function (ConnectionType) {
    ConnectionType[ConnectionType["start"] = 0] = "start";
    ConnectionType[ConnectionType["path"] = 1] = "path";
})(ConnectionType || (ConnectionType = {}));
let connectionData = [
    {
        col: "green",
        filter: "hue-rotate(135deg)"
    },
    {
        col: "gray",
        filter: "contrast(0)"
    }
];
class Story {
    constructor(filename, owner) {
        this.filename = filename;
        this._i = 0;
        this.start = new Board(this, 0, g_gap);
        this.origin = new OriginPoint(this, 0, 0);
        this.owner = owner;
    }
    filename;
    owner;
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
    userData;
    // 
    init() {
        this.start.load();
        this.origin.load();
        this.makeConnection(this.origin, this.start, ConnectionType.start);
        // MOST UP TO DATE: 1/18/24 working
        if (false) {
            let res = this.start.addChoice(["Choice 1", "Choice 2"]);
            res[0].x -= g_gap / 2;
            res[1].x += g_gap / 2;
            for (const c of res) {
                c.addChoice(["Another Choice 1", "Another Choice 2"]);
                c.update();
            }
        }
        // let res = this.start.addChoice("Choice 1","Choice 2","Choice 3","Choice 4");
        // for(const c of res){
        //     c.addChoice("Another Choice 1","Another Choice 2","Another Choice 2","Another Choice 2");
        // }
        // let newB = new Board(this,0,300,"Test 2");
        // newB.load();
        // this.makePath(this.start,newB,new StoryButton("Text",null));
    }
    setPan(px, py) {
        if (!grid2)
            return;
        this.panX = px;
        this.panY = py;
        grid2.style.backgroundPositionX = (-px) + "px";
        grid2.style.backgroundPositionY = (-py) + "px";
        grid.style.left = (-px) + "px";
        grid.style.top = (-py) + "px";
        // this.updateAllBoards();
    }
    setZoom(v) {
        this.zoom = v;
        grid.style.scale = v.toString();
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
            if (grid)
                grid.appendChild(o.div);
        }
    }
    deleteBoard(b, isOther = false) {
        if (b.connections.some(v => v.from == this.origin)) {
            alert("You can't delete the root board!");
            return;
        }
        let list = [...b.connections];
        for (const c of list) {
            c.remove();
        }
        b.div.parentElement.removeChild(b.div);
        this.loadedObjs.splice(this.loadedObjs.indexOf(b), 1);
        if (!isOther) {
            if (this.selBoards.includes(b))
                this.deselectBoards();
            this.hoverBoard = null;
            closePane(pane_editBoard);
            socket.emit("s_deleteBoard", b._id);
        }
        else {
            this.selectRemoveBoard(b);
        }
        this.allBoards.splice(this.allBoards.indexOf(b), 1);
    }
    getRootPos() {
        // let x = innerWidth/2 - this.panX;
        // let y = innerHeight/2-72 - this.panY;
        let x = innerWidth / 2;
        let y = innerHeight / 2 - 72;
        return { x, y };
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
    selectBoard(o) {
        if (keys.shift) {
            if (this.selBoards.includes(o))
                this.selectRemoveBoard(o);
            else
                this.selectAddBoard(o);
            return;
        }
        if (this.selBoards.includes(o))
            return;
        this.deselectBoards();
        this.selBoards = [o];
        o.select();
    }
    selectAddBoard(o) {
        this.selBoards.push(o);
        o.select();
        if (this.selBoards.length > 1)
            closeAllPanes();
    }
    selectRemoveBoard(o) {
        this.selBoards.splice(this.selBoards.indexOf(o), 1);
        o.deselect();
        if (this.selBoards.length == 1)
            this.selBoards[0].select();
        else if (this.selBoards.length == 0)
            closeAllPanes();
    }
    deselectBoards() {
        for (const c of this.selBoards) {
            c.deselect();
        }
        this.selBoards = [];
    }
    getBoard(id) {
        return this.allBoards.find(v => v._id == id);
    }
    otherSelectBoard(email, id) {
        let b = this.getBoard(id);
        if (!b)
            return;
        let u = cursorList.find((v) => v.email == email);
        if (!b.visitors.some(v => v.email == email)) {
            b.visitors.push(u);
            b.updateVisitors();
        }
        // b.div.style.border = "solid 3px "+u.col;
        // let div = document.createElement("div");
        // div.innerHTML = `
        //     <div class="vl-name></div>
        // `;
        // div.style.setProperty("--col",u.col);
        // div.className = "vld-"+santitizeEmail(email); // visitor list div
        // b.visitorList.appendChild(div);
    }
    otherDeselectBoard(email, id) {
        let b = this.getBoard(id);
        if (!b)
            return;
        if (b.visitors.some(v => v.email == email)) {
            b.visitors.splice(b.visitors.findIndex(v => v.email == email), 1);
            b.updateVisitors();
        }
        // b.div.style.border = null;
        // let div = b.visitorList.querySelector(".vld-"+santitizeEmail(email));
        // if(div) b.visitorList.removeChild(div);
    }
    moveBoardTo(email, id, x, y) {
        let b = this.getBoard(id);
        if (!b)
            return;
        b.x = x;
        b.y = y;
        b.update();
    }
    moveBoards(list, dx, dy) {
        let done = [];
        for (const b of list) {
            function loop(board, once = false) {
                if (done.includes(board))
                    return;
                board.x += dx;
                board.y += dy;
                board.update();
                socket.emit("s_moveBoardTo", board._id, board.x, board.y);
                done.push(board);
                if (once)
                    return;
                for (const c of board.buttons) {
                    loop(c.board);
                }
            }
            loop(b, keys.alt);
        }
        // socket.emit("s_moveBoardsTo",list.map(v=>{
        //     return {
        //         id:v._id,
        //         x:v.x,
        //         y:v.y
        //     };
        // }));
    }
    // File Management
    getSaveObj() {
        let o = {
            filename: this.filename,
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
        socket.emit("s_save");
        return;
        if (!grid) {
            console.warn("Warn! prevented trying to change story while playing it!");
            return;
        }
        // if(!story.handle) await openDir();
        // console.log("saved (new folder system)");
        // return;
        let o = this.getSaveObj();
        let str = JSON.stringify(o);
        localStorage.setItem("__SELS-tmp", str);
        console.log("...saved");
    }
    static load(o) {
        if (!o) {
            return;
            let str = localStorage.getItem("__SELS-tmp");
            if (!str)
                return;
            o = JSON.parse(str);
            if (!o)
                return;
        }
        let s = new Story(o.filename, o.owner);
        s._i = 0;
        s.setPan(o.panX, o.panY);
        let o1 = o.boards[0];
        let root = new Board(s, o1.x, o1.y, o1.title, o1.text, o1.tags);
        root.img = o1.img;
        root.audio = o1.audio;
        root._id = o1._id;
        s.start = root;
        root.load();
        let list = [root];
        for (let i = 1; i < o.boards.length; i++) {
            let b = o.boards[i];
            let b1 = new Board(s, b.x, b.y, b.title, b.text, b.tags);
            b1.img = b.img;
            b1.audio = b.audio;
            b1._id = b._id;
            list.push(b1);
        }
        for (let i = 0; i < o.boards.length; i++) {
            let b = o.boards[i];
            let b1 = list[i];
            b1.addChoice(b.btns.map((v) => v.l), b.btns.map((v) => list.find(w => w._id == v.id)));
            // b1.addChoice(b.btns.map((v:any)=>v.l),b.btns.map((v:any)=>list[v.id]));
            // if(i == 0) s.start.load();
            // for(const btn of b.btns){
            // let btn2 = new StoryButton(btn.l,list.find(v=>v._id == btn.id),b1);
            // b1.buttons.push(btn2);
            // b1.addChoice()
            // }
            // b1.load();
        }
        for (const b of list) {
            if (!b._loaded)
                b.load();
        }
        s._i = o._i;
        return s;
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
    div;
    load() {
        this._loaded = true;
    }
    _loaded = false;
    left = 0;
    right = 0;
    top = 0;
    bottom = 0;
    update() {
        let d = this.div;
        let { x, y } = this.story.getRootPos();
        x += this.x;
        y += this.y;
        d.style.left = x + "px";
        d.style.top = y + "px";
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
        this.div.classList.add("sel");
    }
    deselect() {
        this.div.classList.remove("sel");
        // if(this.story.selBoards.length == 0) closePane(pane_editBoard); // this may not be needed?
    }
    save() { return null; }
}
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
    beam;
    joint;
    load() {
        super.load();
        if (!grid)
            return;
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
        this.update();
    }
    update() {
        let d = this.div;
        let { x, y } = this.story.getRootPos();
        let dx0 = this.to.x - this.from.x;
        let dy0 = this.to.y - this.from.y;
        let ang0 = Math.atan2(dy0, dx0);
        let tx = Math.cos(ang0) * 100;
        let ty = Math.sin(ang0) * 100;
        if (tx < -50)
            tx = -50;
        else if (tx > 50)
            tx = 50;
        if (ty < -50)
            ty = -50;
        else if (ty > 50)
            ty = 50;
        if (this.from instanceof Board) {
            this.from.left = tx;
            this.from.right = tx;
            this.from.top = ty;
            this.from.bottom = ty;
        }
        this.to.left = tx;
        this.to.right = tx;
        this.to.top = ty;
        this.to.bottom = ty;
        let dx = this.to.x - this.to.left - (this.from.x + this.from.right);
        let dy = this.to.y - this.to.top - (this.from.y + this.from.bottom);
        let cx = (this.from.x + this.from.right + (this.to.x - this.to.left)) / 2;
        let cy = (this.from.y + this.from.bottom + (this.to.y - this.to.top)) / 2;
        x += cx;
        y += cy;
        let ang = Math.atan2(dy, dx);
        let dist = Math.sqrt(dx ** 2 + dy ** 2);
        this.beam.style.rotate = ang + "rad";
        this.beam.style.width = dist + "px";
        d.style.left = x + "px";
        d.style.top = y + "px";
        let data = connectionData[this.type];
        this.div.style.setProperty("--col", data.col);
        this.div.style.setProperty("--filter", data.filter);
    }
    remove() {
        this.div.parentElement.removeChild(this.div);
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
    choice;
    load() {
        super.load();
        if (!grid)
            return;
        this.div.removeChild(this.joint);
        let textDiv = document.createElement("div");
        textDiv.className = "choice";
        textDiv.textContent = this.ref.label;
        this.div.appendChild(textDiv);
        this.choice = textDiv;
    }
    update() {
        super.update();
        if (this.choice)
            this.choice.textContent = this.ref.label;
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
        let div = document.createElement("div");
        div.className = "origin";
        this.div = div;
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
        // this.top = 50;
        // this.bottom = 50; // enable these if you want the top and bottom of the boards to be the connecting points
    }
    text;
    buttons = [];
    tags;
    _id;
    l_title;
    l_tag;
    visitorList;
    visitors = [];
    img;
    audio;
    load() {
        super.load();
        if (this.div)
            if (this.div.parentElement)
                grid.removeChild(this.div);
        let div = document.createElement("div");
        div.className = "board";
        let max = 40;
        div.innerHTML = `
            <div class="visitor-list"></div>
            <div class="title">${this.title}</div>
            <div class="tag">${this.text.substring(0, max) + (this.text.length > max ? "..." : "")}</div>
            <!--<div class="tag">${this.tags.join(", ")}</div>-->
        `;
        this.div = div;
        div.addEventListener("mouseenter", e => {
            this.story.hoverBoard = this;
        });
        div.addEventListener("mouseleave", e => {
            this.story.hoverBoard = null;
        });
        div.addEventListener("mousedown", e => {
            if (menus.children.length)
                return;
            if (e.ctrlKey)
                return;
            this.story.selectBoard(this);
        });
        this.story.addObj(this);
        this.l_title = div.querySelector(".title");
        this.l_tag = div.querySelector(".tag");
        this.visitorList = div.querySelector(".visitor-list");
        if (false) { // collision
            let t = this;
            function test() {
                let x = t.x;
                let y = t.y;
                let w = 100;
                let h = 100;
                for (const c of t.story.loadedObjs) {
                    if (c == t)
                        continue;
                    if (x + w < c.x)
                        continue;
                    if (x > c.x + w)
                        continue;
                    if (y + h < c.y)
                        continue;
                    if (y > c.y + h)
                        continue;
                    // let con = c.connections[0];
                    // if(con){
                    //     let dx = con.to.x-con.from.x;
                    //     let dy = con.to.y-con.from.y;
                    //     if(Math.abs(dx) > Math.abs(dy)){
                    //         t.y += g_gap*0.75 * (dy > 0 ? 1 : -1);
                    //     }
                    //     else{
                    //         t.x += g_gap * (dx > 0 ? 1 : -1);
                    //     }
                    // }
                    t.x += g_gap;
                    // this.update();
                    // setTimeout(()=>this.update(),2000);
                    test();
                    break;
                }
            }
            test();
        }
        this.update();
    }
    update() {
        super.update();
        this.l_title.textContent = this.title;
        let max = 40;
        this.l_tag.textContent = this.text.substring(0, max) + (this.text.length > max ? "..." : "");
        // this.l_tag.textContent = this.tags.join(", ");
        if (grid)
            if (!this.div.parentElement)
                grid.appendChild(this.div);
        if (this.img) {
            this.div.classList.add("has-img");
            let url = `${serverURL}/projects/${this.story.owner}/${this.story.filename}/images/${this.img}`;
            this.div.style.setProperty("--bg-img", `url(${url})`);
        }
        else
            this.div.classList.remove("has-img");
        if (false) { // collision
            let x = this.x;
            let y = this.y;
            let w = 100;
            let h = 100;
            for (const c of this.story.loadedObjs) {
                if (c == this)
                    continue;
                if (x + w < c.x)
                    continue;
                if (x > c.x + w)
                    continue;
                if (y + h < c.y)
                    continue;
                if (y > c.y + h)
                    continue;
                this.y += g_gap;
                this.update();
                // setTimeout(()=>this.update(),2000);
                return;
            }
        }
    }
    updateConnections() {
        for (const c of this.connections) {
            c.update();
        }
    }
    updateVisitors() {
        this.div.style.border = null;
        this.visitorList.textContent = "";
        for (const u of this.visitors) {
            if (!u) {
                console.warn("Warn: could not find u from visitors:", this.visitors);
                continue;
            }
            let div = createVisitorDiv(u, this.div);
            this.visitorList.appendChild(div);
        }
    }
    addChoice(labels, custom, isOther = false) {
        let i = 0;
        let w = (labels.length - 1) * g_gap;
        let list = [];
        for (const l of labels) {
            if (custom)
                if (!custom[i]) {
                    i++;
                    console.warn("... disconnection?");
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
            if (!isOther) {
                this.story.selectBoard(b);
                loadEditBoard(b);
            }
            i++;
        }
        return list;
    }
    removeChoice(i, deleteBoard = false, isOther = false) {
        let list = i.map(v => this.buttons[v]);
        for (const b of list) {
            if (!b)
                continue;
            let con = this.connections.find(v => v.to == b.board);
            con.div.parentElement.removeChild(con.div);
            b.board.connections.splice(b.board.connections.indexOf(con), 1);
            this.connections.splice(this.connections.indexOf(con), 1);
            this.buttons.splice(this.buttons.indexOf(b), 1);
            if (deleteBoard) {
                story.deleteBoard(b.board);
            }
            if (!isOther)
                loadEditBoard(this);
        }
    }
    write() {
        super.write();
        this.story.save();
    }
    select() {
        super.select();
        loadEditBoard(this);
        if (myCursor)
            if (!this.visitors.includes(myCursor)) {
                this.visitors.push(myCursor);
                this.updateVisitors();
            }
        socket.emit("s_selectBoard", this._id);
    }
    deselect() {
        super.deselect();
        if (myCursor)
            if (this.visitors.includes(myCursor)) {
                this.visitors.splice(this.visitors.findIndex(v => v.email == myCursor.email), 1);
                this.updateVisitors();
            }
        socket.emit("s_deselectBoard", this._id);
    }
    setImg(name, noEmit = false) {
        this.img = name;
        if (name == null) {
            if (_editBoard_b == this) {
                l_bgPreview.textContent = "No file.";
                img_bgPreview.classList.add("hide");
                img_bgPreview.src = "#";
            }
        }
        if (name == null && noEmit) {
            this.update();
            return;
        }
        if (name) {
            if (_editBoard_b == this) {
                l_bgPreview.textContent = name;
                img_bgPreview.classList.remove("hide");
                img_bgPreview.src = `${serverURL}/projects/${this.story.owner}/${this.story.filename}/images/${name}`;
            }
        }
        if (!noEmit)
            socket.emit("s_setBGImage", this._id, name, (code) => {
                if (code == 0) {
                    console.warn("failed to set bg img, it doesn't exist");
                    this.img = null;
                    if (_editBoard_b == this) {
                        l_bgPreview.textContent = "No file.";
                        img_bgPreview.classList.add("hide");
                        img_bgPreview.src = "#";
                    }
                }
            });
        this.story.save();
        this.update();
    }
    setAudio(name, noEmit = false) {
        this.audio = name;
        if (name == null) {
            if (_editBoard_b == this) {
                l_bgAudioPreview.textContent = "No file.";
                // audio_bgPreview.classList.add("hide");
                // audio_bgPreview.src = "#";
            }
        }
        if (name == null && noEmit) {
            this.update();
            return;
        }
        if (name) {
            if (_editBoard_b == this) {
                l_bgAudioPreview.textContent = name;
                // audio_bgPreview.classList.remove("hide");
                // audio_bgPreview.src = `${serverURL}/projects/${this.story.owner}/${this.story.filename}/images/${name}`;
            }
        }
        if (!noEmit)
            socket.emit("s_setBGAudio", this._id, name, (code) => {
                if (code == 0) {
                    console.warn("failed to set bg audio, it doesn't exist");
                    this.audio = null;
                    if (_editBoard_b == this) {
                        l_bgAudioPreview.textContent = "No file.";
                        // img_bgPreview.classList.add("hide");
                        // img_bgPreview.src = "#";
                    }
                }
            });
        this.story.save();
        this.update();
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
function loadEditBoard(b) {
    if (!grid)
        return;
    _editBoard_b = b;
    pane_editBoard.classList.add("open");
    // let ta_choices = pane_editBoard.querySelector(".ta-choices") as HTMLTextAreaElement;
    i_title.value = b.title;
    ta_text.value = b.text;
    // ta_choices.value = b.buttons.map(v=>"[["+v.label+"]]").join("\n");
    while (choiceList.children.length > 1) {
        choiceList.removeChild(choiceList.children[0]);
    }
    let list = [...b.buttons];
    for (let i = 0; i < list.length; i++) {
        let c = list[i];
        let div = document.createElement("div");
        div.innerHTML = `
            <div class="label"><input type="text" class="inp"></div>
            <button class="b-remove-choice">-</button>
        `;
        choiceList.insertBefore(div, choiceList.children[choiceList.children.length - 1]);
        let inp = div.querySelector(".inp");
        inp.value = c.label;
        inp.addEventListener("input", e => {
            c.label = inp.value;
            c.board.updateConnections();
            story.save();
            socket.emit("s_renameChoice", b._id, i, c.label);
        });
        inp.addEventListener("mouseenter", e => {
            c.path.div.classList.add("highlight");
        });
        inp.addEventListener("mouseleave", e => {
            c.path.div.classList.remove("highlight");
        });
        let b_remove = div.querySelector(".b-remove-choice");
        b_remove.addEventListener("click", function () {
            b.removeChoice([i]);
            socket.emit("s_removeChoice", b._id, [i], false);
            // b.buttons.splice(b.buttons.indexOf(c),1);
            // choiceList.removeChild(div);
            story.save();
        });
    }
    i_title.oninput = function () {
        b.title = i_title.value;
        b.write();
        socket.emit("s_editBoardTitle", b._id, b.title);
    };
    ta_text.oninput = function () {
        b.text = ta_text.value;
        b.write();
        socket.emit("s_editBoardText", b._id, b.text);
    };
    b.setImg(b.img, true);
    b.setAudio(b.audio, true);
}
// function setupInput(inp:HTMLInputElement,f:()=>void){
//     inp.addEventListener("blur",f);
//     inp.addEventListener("keydown",e=>{
//         let k = e.key.toLowerCase();
//         if(k == "enter" || k == "return") f();
//     });
// }
//# sourceMappingURL=core.js.map