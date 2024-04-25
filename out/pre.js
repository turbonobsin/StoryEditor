// let serverURL = "http://localhost:3000";
let serverURL = "https://next-overly-urchin.ngrok-free.app";
const AID = "__SE-"; // app id
let page = 0;
let isOffline = true;
try {
    // @ts-ignore
    let _ = __storyData;
}
catch (e) {
    isOffline = false;
}
//# sourceMappingURL=pre.js.map