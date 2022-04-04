const BASE_URL = "https://studytalk.inform.hs-hannover.de";

let client;

let roomIdsByNames = {};
let roomsRadioBts = [];
let membersByNames = {};

function main(){

    if (!Olm) {
        console.error(
            "global.Olm does not seem to be present."
            + " Did you forget to add olm in the lib/ directory?"
        );
    }
    initUI();
}

/* Matrix-SDK-Calling */
async function login(username, password){
    let loginClient = matrixcs.createClient(BASE_URL)
    let loginResult = await loginClient.loginWithPassword(username, password);

    const opts = {
        baseUrl: BASE_URL,
        userId: loginResult.user_id,
        accessToken: loginResult.access_token,
        deviceId: loginResult.device_id,
        sessionStore: new matrixcs.WebStorageSessionStore(window.localStorage),
        cryptoStore: new matrixcs.MemoryCryptoStore(),
    }
    client = matrixcs.createClient(opts);

    
    await client.loginWithPassword(username, password);
    await client.initCrypto();
    await client.startClient();

    await client.once('sync', function(state, prevState, res) {
        console.log(state);
        if (state == "PREPARED") {
            client.setGlobalErrorOnUnknownDevices(false);
            setAfterLoginSectionVisible();
            displayRooms(false);
            displayContacts(false);

            client.on("Room.timeline", function(event, room, toStartOfTimeline) {
                // we know we only want to respond to messages
                console.log("Mein EVENT: ", event);
                console.log(room);
                if (event.getType() == "m.room.message" && event.getContent().body != "") {
                    const message = event.getContent().body;
                    const roomName = room.name;
                    const roomId = event.getRoomId();
                    const sender = event.getSender();
                    onMessageArrived(message, sender, roomId, roomName);
                }
                
            });
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

async function createRoom(roomName){
    const options = {
        topic: "Dies ist ein Raum zum Testen",
        name: roomName
    }
    let result = await client.createRoom(options);
    displayRooms(true);
    return result.roomId;
}

function forgetRoom(roomId){
    client.leave(roomId, function(){
        client.forget(roomId, true);
        displayRooms(true);
    });
}

/* UI Stuff */
function initUI(){
    const loginNameTxtField = document.getElementById("username");
    loginNameTxtField.value = loginCredentials.username;

    const loginPwTxtField = document.getElementById("password");
    loginPwTxtField.value = loginCredentials.password;

    const createRoomTxtField = document.getElementById("newRoomName");

    const roomMsgTxtField = document.getElementById("room_msg");

    const createRoomBt = document.getElementById("createRoomBt");
    createRoomBt.addEventListener("click", function(){
        createRoom(createRoomTxtField.value);
    });

    const loginBt = document.getElementById("loginBt");
    loginBt.addEventListener("click", function(){
        login(loginNameTxtField.value, loginPwTxtField.value);
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
            console.log("Roomid: ", room.roomId, "Roomname: ", room.name)
            displayRoomOnPage(room.name, room.roomId);
        });
        console.log("called")
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
            contactElem.innerHTML = userName;
            contactListElem.appendChild(contactElem);
        }

        membersByNames = {};
        const rooms = client.getRooms();
        rooms.forEach(room => {
            const members = room.getJoinedMembers();
            members.forEach(member => {
                console.log(member);
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

function setAfterLoginSectionVisible(){
    document.getElementById("afterLogin").hidden = false;
}

function onMessageArrived(message, sender, roomId, roomName){
    alert(sender + " hat eine Nachricht in " + roomName + " gesendet: " + message);
}

