const BASE_URL = "https://studytalk.inform.hs-hannover.de";

let client;

let roomIdsByNames = {};
let roomsRadioBts = [];
let membersByNames = {};
let memberRadioBts = [];

function main(){
    initUI();
}

/* Matrix-SDK-Access */
async function login(url, username, password, callback){
    client = matrixcs.createClient(url);

    await client.loginWithPassword(username, password);
    await client.startClient();

    await client.once('sync', function(state, prevState, res) {
        if (state == "PREPARED") {
            callback();
        }
    });
}

function addMessageReceiveCallback(callback){
    client.on("Room.timeline", function(event, room, toStartOfTimeline) {
        if (event.getType() == "m.room.message" && event.getContent().body != "") {
            const message = event.getContent().body;
            const roomName = room.name;
            const roomId = event.getRoomId();
            const sender = event.getSender();
            callback(message, sender, roomId, roomName);
        }
        
    });
}

function sendMessage(roomId, messageText){
    client.sendMessage(
        roomId,
        {
            body: messageText,
            msgtype: 'm.text',
        }
    );
}

async function createRoom(roomName, callback){
    const options = {
        topic: "Dies ist ein Raum zum Testen",
        name: roomName
    }
    let result = await client.createRoom(options);
    callback(result.roomId);
}

function forgetRoom(roomId){
    client.leave(roomId, function(){
        client.forget(roomId, true);
        displayRooms(true);
    });
}

function inviteMemberToRoom(roomId, memberId){
    //Todo: Implement
}

/* UI */
function initUI(){
    const loginNameTxtField = document.getElementById("username");
    const loginPwTxtField = document.getElementById("password");
    if (loginCredentials) {
        loginNameTxtField.value = loginCredentials.username;
        loginPwTxtField.value = loginCredentials.password;
    }

    const createRoomTxtField = document.getElementById("newRoomName");

    const roomMsgTxtField = document.getElementById("room_msg");

    const createRoomBt = document.getElementById("createRoomBt");
    createRoomBt.addEventListener("click", function(){
        createRoom(createRoomTxtField.value, function(){
            displayRooms(true);
        });
    });

    function onLoggedInCallback(){
        setAfterLoginSectionVisible();
        displayRooms(false);
        displayContacts(false);
        addMessageReceiveCallback(onMessageArrived);
    }

    const loginBt = document.getElementById("loginBt");
    loginBt.addEventListener("click", function(){
        login(BASE_URL, loginNameTxtField.value, loginPwTxtField.value, onLoggedInCallback);
    });   

    const sendRoomMsgBt = document.getElementById("send_room_msg_bt");
    sendRoomMsgBt.addEventListener("click", function(){
        const roomId = getIdOfSelectedRoom();
        const messageTxt = roomMsgTxtField.value;
        sendMessage(roomId, messageTxt);
    });

    const deleteRoomBt = document.getElementById("deleteGroupBt");
    deleteRoomBt.addEventListener("click", function(){
        const roomId = getIdOfSelectedRoom();
        forgetRoom(roomId);
    });

    const inviteToRoomBt = document.getElementById("inviteBt");
    inviteToRoomBt.addEventListener("click", function(){
        const memberId = getIdOfSelectedMember();
        const roomId = getIdOfSelectedRoom();
        inviteMemberToRoom(memberId, roomId);
    })
}

function displayRooms(sync){
    function display(){
        const roomsListElem = document.getElementById("rooms");
        roomsListElem.innerHTML = "";

        function displayRoomOnPage(roomName, roomId){
            roomIdsByNames[roomName] = roomId;

            let roomElem = document.createElement("li");
            let roomElemBt = document.createElement("input");
            roomElemBt.type = "radio";
            roomElemBt.name = "rooms";
            roomElemBt.value = roomName;
            let roomElemLbl = document.createElement("label");
            roomElemLbl.innerHTML = roomName;

            roomElem.appendChild(roomElemLbl);
            roomElem.appendChild(roomElemBt);
            roomsListElem.appendChild(roomElem);

            roomsRadioBts.push(roomElemBt);
        }
        const rooms = client.getRooms();
        rooms.forEach(room => {
            displayRoomOnPage(room.name, room.roomId);
        });
    }
    roomsRadioBts = [];
    roomIdsByNames = {};
    if (sync) {
        client.once('sync', display);
    }else{
        display();
    }
}

function displayContacts(sync){
    function display(){
        const contactListElem = document.getElementById("contacts");
        contactListElem.innerHTML = "";

        function displayUserOnPage(member){
            const userName = member.name;
            if (membersByNames[userName] != null) {
                return;
            }
            membersByNames[userName] = member;

            let contactElem = document.createElement("li");
            const contactBt = document.createElement("input");
            contactBt.type = "radio";
            contactBt.name = "member";
            contactBt.value = member.userId;
            memberRadioBts.push(contactBt);

            contactElem.innerHTML = userName;
            contactElem.appendChild(contactBt);
            contactListElem.appendChild(contactElem);
        }

        membersByNames = {};
        memberRadioBts = [];
        const rooms = client.getRooms();
        rooms.forEach(room => {
            const members = room.getJoinedMembers();
            members.forEach(member => {
                displayUserOnPage(member);
            })            
        });
    }
    if (sync) {
        client.once('sync', display);
    }else{
        display();
    }
}

function getIdOfSelectedRoom(){
    let roomId = null;
    roomsRadioBts.forEach(roomRadioBt => {
        if (roomRadioBt.checked) {
            roomId = roomIdsByNames[roomRadioBt.value]
            
        }
    });
    return roomId;
}

function getIdOfSelectedMember(){
    let memberId = null;
    memberRadioBts.forEach(memberRadioBt => {
        if (memberRadioBt.checked) {
            memberId = memberRadioBt.value;
        }
    });
    return memberId;
}

function setAfterLoginSectionVisible(){
    document.getElementById("afterLogin").hidden = false;
}

function onMessageArrived(message, sender, roomId, roomName){
    alert(sender + " hat eine Nachricht in " + roomName + " gesendet: " + message);
}

