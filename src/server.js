import express from "express";
import http from "http"; 
import WebSoket from "ws";
import SocketIO from "socket.io"

const app = express();

app.set('view engine', "pug");
app.set("views", __dirname + "/views" );
app.use("/public", express.static(__dirname + "/public"));

app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/")); //catch all url

const handleListen = () => console.log('Listening on http://localhost:3000');
const httpserver = http.createServer(app); //http server by express
const wsServer = SocketIO(httpserver);



//Map() 사용하여 publicRoom (사용자 추가) 식별 하는 함수
function publicRooms(){
    //console.log("publicRooms");
    const{
        sockets: {
            adapter:{ sids, rooms },
        },
    } = wsServer;
    const publicRooms = [];
    rooms.forEach((_, key) => { //socket id (private) key 값 sorting
        if(sids.get(key) === undefined) {
            publicRooms.push(key);
        }
    });
    return publicRooms;
}

function countRoom(roomName){ //rooms size를 체크하여 참여자수 계산
    return wsServer.sockets.adapter.rooms.get(roomName)?.size; //물음표는 변수가 있을수도 없을수도
}

wsServer.on("connection", (socket)=>{
    wsServer.sockets.emit("room_change", publicRooms());
    //console.log(wsServer.sockets);
    //console.log(wsServer.sockets.adapter.sids);
    //console.log(wsServer.sockets.adapter.rooms);
    socket["nickname"] = "Anon";
    socket.onAny((event)=>{
        console.log(`Socket event : ${event}`);
    })
    socket.on("enter_room", (roomName, done)=>{
        socket.join(roomName);
        done() //Backend 에서 frontend 함수를 실행 시킬 수 있음
        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
        wsServer.sockets.emit("room_change", publicRooms());
    })
    socket.on("disconnecting", ()=>{
        console.log("disconnecting");
        socket.rooms.forEach((room) => {
            socket.to(room).emit("bye", socket.nickname, countRoom(room)-1); // Room 나가지 직전에 실행되므로 -1        
        });
    })
    socket.on("new_message", (msg,room,done)=>{
        socket.to(room).emit("new_message", `${socket.nickname} : ${msg}`);
        done()
    })
    socket.on("nickname", (nickname)=>{
        socket["nickname"] = nickname;
    })
    socket.on("disconnect",()=>{
        wsServer.sockets.emit("room_change", publicRooms());
    })


    socket.on("join_room",(roomName)=>{
        socket.join(roomName);
        //console.log(roomName);
        socket.to(roomName).emit("welcome");
    })
    socket.on("offer", (offer, roomName)=>{
        socket.to(roomName).emit("offer", offer);
    })
    socket.on("answer", (answer, roomName) =>{
        socket.to(roomName).emit("answer",answer);
    })
    socket.on("ice",(ice, roomName) =>{
        socket.to(roomName).emit("ice",ice);
    })
})

/* 
const wss = new WebSoket.Server({ server }); //http server  위에 ws 생성
const sockets = [];  //Our DB!

wss.on("connection", (socket) => {
    sockets.push(socket);
    socket["nickname"] = "Anon" //nickname 없는 사람 가능성
    console.log("Connected to Browser ✅");
    socket.on("close", () => console.log("Disconnected from the Browser ❌"));
    socket.on("message", (msg) => {    
        const message = JSON.parse(msg); //app에서 받은 JSON 문자열을 객체화
        switch (message.type){
            case "new_message" :
                sockets.forEach((isockets)=>{isockets.send(`${socket.nickname}: ${message.payload}`);})
                break;
            case "nickname" : 
                socket["nickname"] = message.payload;
                break;
        }
        
        //console.log(message.toString());
    });
    //socket.send("hello?");
  }); */

httpserver.listen(3000, handleListen);