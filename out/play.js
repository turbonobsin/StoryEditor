page = 1; // play page
class PlayData {
    locId;
    static load(newStart = 0) {
        let str = localStorage.getItem("__SE-PD");
        if (!str) {
            console.warn("No PD found, creating some");
            let p = new PlayData();
            p.locId = newStart;
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
let imgCont = document.querySelector(".img-cont");
let main = document.querySelector(".main");
// let buttons = document.querySelector(".buttons");
function madeChoice(btn, button) {
    let p_btns = document.querySelectorAll(".p-btn");
    for (const c of p_btns) {
        c.classList.add("done");
        btn.par._done = true;
    }
    button.classList.add("picked");
}
function scrollDown() {
    main.scrollTo({ left: 0, top: main.scrollHeight, behavior: "smooth" });
}
let curImage;
let curAudio;
let soundId;
async function loadBoard(b) {
    document.body.classList.remove("no-wait");
    playData.locId = b._id;
    playData.save();
    let imgUrl = b.img;
    let audioUrl = b.audio;
    if (audioUrl) {
        if (curAudio) {
            (async () => {
                await wait(500);
                curAudio.fade(0.5, 0, 2000, soundId);
                // curAudio.pause();
                curAudio = null;
                soundId = null;
            })();
        }
    }
    if (imgUrl) {
        if (curImage) {
            await wait(500);
            document.body.classList.add("fade-out");
            await wait(2000);
            curImage.remove();
            passage.textContent = "";
            await wait(1000);
            document.body.classList.remove("fade-out");
        }
    }
    let cont = document.createElement("div");
    passage.appendChild(cont);
    if (audioUrl) {
        let url = (isOffline ? `audio/${audioUrl}` : `${serverURL}/projects/${playStory.owner}/${playStory.filename}/audio/${audioUrl}`);
        // let audio = document.createElement("audio");
        // let audio = new Audio(`${serverURL}/projects/${playStory.owner}/${playStory.filename}/audio/${audioUrl}`);
        // audio.className = "audio-elm";
        // audio.loop = true;
        // audio.controls = false;
        // imgCont.appendChild(audio);
        // audio.play();
        // // audio.volume = 0.5;
        // console.log(audio.volume);
        // curAudio = audio;
        // @ts-ignore
        var sound = new Howl({
            src: [url],
            volume: 0.5,
            loop: true,
            onend: function () {
                console.log('Finished!');
            }
        });
        soundId = sound.play();
        console.log(sound);
        curAudio = sound;
    }
    if (imgUrl) {
        let img = document.createElement("img");
        img.draggable = false;
        curImage = img;
        img.src = (isOffline ? `images/${imgUrl}` : `${serverURL}/projects/${playStory.owner}/${playStory.filename}/images/${imgUrl}`);
        let success = false;
        await new Promise(resolve => {
            img.onload = function () {
                success = true;
                resolve();
            };
            img.onerror = function () {
                resolve();
            };
        });
        // if(success){
        // cont.appendChild(img);
        imgCont.appendChild(img);
        // document.body.insertAdjacentElement("beforebegin",img);
        await wait(4100);
        // }
        // wait for image anim
        // await wait(10000);
    }
    let lines = b.text.replaceAll("\n", " ").split(". ").map(v => v.trim());
    await wait(200); //500
    for (const l of lines) {
        let div = document.createElement("div");
        div.className = "p-item";
        div.textContent = l;
        cont.appendChild(div);
        scrollDown();
        await wait(2000);
    }
    if (b.buttons.length == 0) { // End
        let end = document.createElement("div");
        end.className = "end";
        end.textContent = "END";
        cont.appendChild(end);
        scrollDown();
        return;
    }
    await wait(300); //500
    let buttons = document.createElement("div");
    cont.appendChild(buttons);
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
        await wait(300); //500
    }
}
const b_replay = document.querySelector(".b-replay");
b_replay.addEventListener("click", e => {
    if (!confirm("Are you sure you want to reset all progress and start this story over?\n\nYou won't be able to get your progress back."))
        return;
    localStorage.removeItem(AID + "PD");
    location.reload();
});
async function initPlay() {
    let url = new URL(location.href);
    let email = url.searchParams.get("email");
    let pid = url.searchParams.get("pid");
    if (!isOffline)
        if (!email || !pid) {
            console.warn("Invalid search params");
            return;
        }
    console.log("...starting load");
    // 
    let code = LSGet("code-" + pid);
    let pdata;
    async function promptCode(isFirst = false) {
        if (!isFirst) {
            code = prompt("Please enter project pass code:");
            if (code == null)
                return;
        }
        if (!isOffline) {
            pdata = await new Promise(resolve => {
                socket.emit("openProject_readonly", email, pid, code, ((data) => {
                    resolve(data);
                }));
            });
        }
        // @ts-ignore
        else
            pdata = __storyData;
        if (!pdata) {
            console.log("could not find pdata");
            return;
        }
        if (pdata.err) {
            if (pdata.code == 0) {
                alert(pdata.err);
                return;
            }
            else if (pdata.code == 1) {
                alert(pdata.err);
                await promptCode();
            }
        }
    }
    console.log("...finding code");
    await promptCode(true);
    console.log("...found?");
    localStorage.setItem(AID + "code-" + pid, code || "");
    if (!pdata) {
        console.warn("could not get pdata");
        alert("Failed to find/load project");
        return;
    }
    console.warn("OWNER:", pdata.owner);
    if (!pdata.owner) {
        console.warn("no owner found");
        return;
    }
    pdata.storyData.owner = pdata.owner;
    story = Story.load(pdata.storyData);
    // story.start = story.getBoard(pdata.start);
    console.log("story", story);
    document.title = story.filename;
    // 
    console.log("START: ", pdata.storyData.start);
    playData = PlayData.load(pdata.storyData.start);
    // playStory = Story.load();
    playStory = story;
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
    loadBoard(start);
}
// @ts-ignore
let myCursor;
// @ts-ignore
let socket;
if (!isOffline) {
    // @ts-ignore
    socket = io(serverURL);
    socket.on("connect", () => {
        initPlay();
    });
}
else {
    socket = {
        emit() { }
    };
    initPlay();
}
document.addEventListener("keydown", e => {
    let key = e.key.toLowerCase();
    keys[key] = true;
    if (key == "shift") {
        if (_curWait)
            setTimeout(() => {
                if (_curWait)
                    _curWait();
            }, 100);
        document.body.classList.add("short-wait");
    }
    if (key == " ") {
        if (_curWait)
            _curWait();
        document.body.classList.add("no-wait");
    }
    else
        document.body.classList.remove("no-wait", "short-wait");
});
document.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});
//# sourceMappingURL=play.js.map