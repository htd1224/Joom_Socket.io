const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");

const welcome = document.getElementById("welcome");
const call = document.getElementById("call");

call.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let peerStream;

async function getCameras(){
    try{
        const devices = await navigator.mediaDevices.enumerateDevices();
        //console.log(devices);
        const cameras = devices.filter(device => device.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks()[0]; //Current Camera
        console.log(currentCamera);
        cameras.forEach((camera) => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if(currentCamera.label == camera.label){
                option.selected = true;
            }
            camerasSelect.appendChild(option);
        })

    } catch(e){
        console.log(e);
    }
}

async function getMedia(deviceId){ //  비동기 함수
    const initialConstrains = {
        audio: true,
        video: { facingMode: "user" }, //mobile 환경 selfie mode , 후면 카메라 environment
    }
    const cameraConstraints = {
        audio: true,
        video: { deviceId: { exact: deviceId } },
    }
        console.log(initialConstrains);
        console.log(cameraConstraints);
    try {
        myStream = await navigator.mediaDevices.getUserMedia(deviceId ? cameraConstraints : initialConstrains); 
        // diviceId 가 있을때 cameraConstraints 없을때 initialConstrains 사용
        console.log(myStream);
        myFace.srcObject = myStream;
        if(!deviceId){
            await getCameras(); //Camera device 리스트
        }
        //console.log(myFace);
    } catch (e) {
        console.log(e);
    }
}

function handleMuteClick(){
    myStream
        .getAudioTracks()
        .forEach(track => track.enabled = !track.enabled); //track False => true , Mute <=> Unmute
    //console.log(myStream.getAudioTracks());
    if(!muted){
        muteBtn.innerText = "Unmute";
        muted = true;
    }
    else{
        muteBtn.innerText = "Mute";
        muted = false;
    }
}

function handleCameraClick(){
    myStream
    .getVideoTracks()
    .forEach(track => track.enabled = !track.enabled); //track False => true , video off <=> video on
    if(cameraOff){
        cameraBtn.innerText = "Turn Camera Off";
        cameraOff = false;
    }
    else{
        cameraBtn.innerText = "Turn Camera On";
        cameraOff = true;
    }
}

async function handleCameraChange(){
    await getMedia(camerasSelect.value);
    if(myPeerConnection){
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection
            .getSender()
            .find((sender) => sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack);
    }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);

//getMedia();

//Welcom form

const welcomeForm = welcome.querySelector("form");

async function handleWelcomeSubmit(event){
    event.preventDefault();
    const input = welcome.querySelector("input");
    await initCall();
    socket.emit("join_room", input.value);
    roomName = input.value;
    input.value = "";
}
async function initCall(){
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection();
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

//Socket Code

socket.on("welcome", async ()=>{ //peer A
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    console.log("sent the offer Peer A");
    socket.emit("offer", offer, roomName);
})
 //peer B
socket.on("offer", async(offer)=>{
    console.log("received the offer");
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    //console.log("answer Peer B : ", answer);
    socket.emit("answer", answer, roomName);
    console.log("sent the answer");
})

socket.on("answer", answer => {
    console.log("recieve the answer");
    //console.log("answer (peer A) : ", answer);
    myPeerConnection.setRemoteDescription(answer);
})

socket.on("ice", ice =>{
    console.log("recieved candidate");
    myPeerConnection.addIceCandidate(ice);
})  

//RTC code

function makeConnection(){
     myPeerConnection = new RTCPeerConnection({
        iceServers: [
            {
              urls: [
                "stun:stun.l.google.com:19302",
                "turn:numb.viagenie.ca'",
              ],
            },
          ],
     });
     myPeerConnection.addEventListener("icecandidate", handleIce);
     //myPeerConnection.addEventListener("addstream", handleAddstream);
     myPeerConnection.addEventListener("track", handleTrack);
     myStream
        .getTracks()
        .forEach((track) => myPeerConnection.addTrack(track, myStream)); //각각 브라우저의 트랙을 myPeerConnection 에 할당
}

function handleTrack(data) {
    console.log("handle track")
    const peerFace = document.querySelector("#peerFace")
    peerFace.srcObject = data.streams[0]
    console.log("my Stream ", myStream);
    console.log("Peer Stream ", data.streams[0]);
    }

function handleIce(data){
    socket.emit("ice", data.candidate, roomName,);
    console.log("sent icecandidate");
}

function handleAddstream(data){
    const peerFace = document.getElementById("peerFace");
    peerFace.srcObject = data.stream;
    console.log("my Stream ", myStream);
    console.log("Peer Stream ", data.stream);

}