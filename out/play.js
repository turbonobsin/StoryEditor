class PlayData {
    locId;
    static load() {
        let str = localStorage.getItem("__SE-PD");
        if (!str) {
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
    save() {
        let o = {
            locId: this.locId,
            scrollTop: passage.scrollTop
        };
        if (!o) {
            console.warn("Failed to save PD");
            return;
        }
        let str = JSON.stringify(o);
        if (!str) {
            console.warn("Failed to save PD");
            return;
        }
        localStorage.setItem("__SE-PD", str);
    }
}
let playData;
let playStory;
let allBoards = [];
let passage = document.querySelector(".passage");
// let buttons = document.querySelector(".buttons");
function wait(delay) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, delay);
    });
}
function madeChoice(btn, button) {
    let p_btns = document.querySelectorAll(".p-btn");
    for (const c of p_btns) {
        c.classList.add("done");
        btn.par._done = true;
    }
    button.classList.add("picked");
}
function scrollDown() {
    scrollTo({ left: 0, top: document.body.scrollHeight, behavior: "smooth" });
}
async function loadBoard(b) {
    playData.locId = b._id;
    playData.save();
    let lines = b.text.replaceAll("\n", " ").split(". ").map(v => v.trim());
    await wait(500);
    for (const l of lines) {
        let div = document.createElement("div");
        div.className = "p-item";
        div.textContent = l;
        passage.appendChild(div);
        scrollDown();
        await wait(2000);
    }
    if (b.buttons.length == 0) { // End
        let end = document.createElement("div");
        end.className = "end";
        end.textContent = "END";
        passage.appendChild(end);
        scrollDown();
        return;
    }
    await wait(500);
    let buttons = document.createElement("div");
    passage.appendChild(buttons);
    buttons.className = "buttons";
    for (const btn of b.buttons) {
        let button = document.createElement("button");
        button.className = "p-btn";
        button.textContent = btn.label;
        buttons.appendChild(button);
        button.style.width = (100 / b.buttons.length) + "%";
        button.addEventListener("click", e => {
            if (btn.par._done) {
                console.warn("Can't go back!");
                return;
            }
            loadBoard(btn.board);
            madeChoice(btn, button);
        });
        scrollDown();
        await wait(500);
    }
}
function initPlay() {
    playData = PlayData.load();
    playStory = Story.load();
    for (const b of playStory.loadedObjs) {
        if (b instanceof Board) {
            allBoards[b._id] = b;
        }
    }
    let start = allBoards[playData.locId];
    if (!start) {
        console.log("couldn't find start", playData.locId, allBoards);
        playData.locId = playStory.start._id;
        start = allBoards[playData.locId];
    }
    loadBoard(allBoards[playData.locId]);
}
initPlay();
//# sourceMappingURL=play.js.map