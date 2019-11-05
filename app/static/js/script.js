var serverAddr = "10.23.65.1";
var serverPort = "4200";
var socket = null;

var username = document.getElementById("myname");
var message = document.getElementById("message");
var btn_send = document.getElementById("send");
var chat = document.getElementById("chat");

var file = document.getElementById("File");
var btn_upload = document.getElementById("btn-upload");
var currentFile;
var incomingFile = {};
var receivedSize = 0;
var fileReader = new FileReader();
const BYTES_PER_CHUNK = 1200;
var currentChunk;
file.onchange = function() {
  currentFile = this.files[0];
  btn_upload.innerText = currentFile.name;
};

var numConnnection = 0;
var connection = [];
var chatBoxCss = [];

var currentConn = {};
var isinChat = false;

var url = window.location.href;
var myname = url.split("=")[1];

// set RTCPeerConnection

window.RTCPeerConnection =
  window.RTCPeerConnection ||
  window.mozRTCPeerConnection ||
  window.webkitRTCPeerConnection;
window.RTCIceCandidate =
  window.RTCIceCandidate ||
  window.mozRTCIceCandidate ||
  window.webkitRTCIceCandidate;
window.RTCSessionDescription =
  window.RTCSessionDescription ||
  window.mozRTCSessionDescription ||
  window.webkitRTCSessionDescription;

var configuration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302"] },
    {
      username:
        "BSXzU69-R3AtqxzAeZQ8bS5eh3e3eFKG5hpSFVt-yZg4XiyT2VFeLnciyzLrdy8LAAAAAF2y9LB0dWxpNDY=",
      credential: "10e15110-f729-11e9-816b-322c48b34491",
      urls: [
        "turn:ss-turn2.xirsys.com:80?transport=udp",
        "turn:ss-turn2.xirsys.com:3478?transport=tcp"
      ]
    }
  ]
};

function handleMessage(data) {
  switch (data.type) {
    case "reject":
      handleReject(data.from);
      break;
    case "notify":
      noti(data.message);
      handleState(data.username, data.status);
      break;
    case "onlineState":
      $(".card .usr-mg-info h3")
        .toArray()
        .forEach(v => {
          if (!data.usersOnline.includes(v.innerText)) {
            $("#button" + v.innerText)[0].className = "btn btn-dark";
            $("#button" + v.innerText)[0].disabled = true;
          } else {
            $("#button" + v.innerText)[0].className = "btn btn-primary";
            $("#button" + v.innerText)[0].disabled = false;
          }
        });
      break;
    case "offer":
      Confirm(
        "Chat Request",
        "Do you want to chat with " + data.from,
        "Yes",
        "Cancel",
        data
      );
      break;
    case "answer":
      pc = findPC(data.from);
      if (pc) pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      break;
    case "candidate":
      pc = findPC(data.from);
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(e =>
          console.error(e)
        );
        console.log("ICE Candidate added.");
      } else {
        console.log("not found user");
      }
      break;
    case "close":
      handleClose(data.from);
      break;
    default:
      break;
  }
}

function openDataChannel(dc, name) {
  dc.onerror = function(error) {
    console.log("Error on data channel:", error);
  };

  dc.onmessage = function(event) {
    if (typeof event.data == "string") {
      data = JSON.parse(event.data);
      switch (data.type) {
        case "message":
          currentBox = document.getElementById("box" + data.name);
          currentBox.innerHTML +=
            `<div class="message-left message"><p>` +
            data.message +
            `</p></div>`;
          currentBox.scrollTop =
            currentBox.scrollHeight - currentBox.clientHeight;
          break;
        case "file":
          incomingFile["filename"] = data.filename;
          incomingFile["filesize"] = data.filesize;
          incomingFile["name"] = data.name;
          incomingFile["filedata"] = [];
          receivedSize = 0;
          break;
      }
    } else {
      chunkData = new Blob([event.data]);
      mergeChunk(chunkData);
    }
  };

  dc.onopen = function() {
    box = document.getElementById("box" + name);
    box.innerHTML += `<div class="message-left message"><p class="bg-success text-white">Connection established</p></div>`;
    console.log("Channel established.");
  };

  dc.onclose = function() {
    box = document.getElementById("box" + name);
    btn = $("#li" + name + " button")[0];
    btn.className = "btn btn-outline-danger";
    btn.innerText = "Closed";
    btn.disabled = true;
    box.innerHTML += `<div class="message-left message"><p class="bg-danger text-white">Connection closed</p></div>`;
    console.log("Channel closed.");
    dc.close();
  };
}

function ask(name) {
  if (findConn(name)) {
    gotoChat(name);
    return;
  }
  numConnnection++;
  currentConn["name"] = name;
  chatbox = newChatBoxCss(name);
  chatbox.innerHTML +=
    `<div class="message-left message"><p class="bg-warning text-dark"> waiting for ` +
    name +
    ` to connect</p></div>`;
  gotoChat(name);
  var peerConnection, dataChannel;
  conn = {
    id: numConnnection,
    peerConnection: peerConnection,
    dataChannel: dataChannel,
    username: name
  };
  connection.push(conn);
  peerConnection = connection[
    connection.length - 1
  ].peerConnection = new RTCPeerConnection(configuration);
  //tạo data channel
  var dataChannelOptions = {
    reliable: true
  };
  dataChannel = connection[
    connection.length - 1
  ].dataChannel = peerConnection.createDataChannel(name, dataChannelOptions);

  openDataChannel(dataChannel, name);
  peerConnection.createOffer(
    function(offer) {
      socket.send(
        JSON.stringify({
          type: "offer",
          from: myname,
          username: name,
          offer: offer
        })
      );
      peerConnection.setLocalDescription(offer);
    },
    function(error) {
      console.log("Error: ", error);
    }
  );
  peerConnection.onicecandidate = function(event) {
    if (event.candidate) {
      socket.send(
        JSON.stringify({
          type: "candidate",
          from: myname,
          username: name,
          candidate: event.candidate
        })
      );
    }
  };
}

// chat
btn_send.addEventListener("click", function(event) {
  currentBox = document.getElementById("box" + currentConn["name"]);
  currentConn["datachannel"] = findDC(currentConn.name);
  var val = message.value;
  if (
    val &&
    currentConn["datachannel"] != null &&
    currentConn["datachannel"].readyState == "open"
  ) {
    currentBox.innerHTML +=
      `<div class="message-right message"><p>` + val + `</p></div>`;
    message.value = "";
    data = {
      type: "message",
      name: myname,
      message: val
    };
    currentConn["datachannel"].send(JSON.stringify(data));
  }
  if (currentFile != null) {
    data = {
      type: "file",
      filename: currentFile.name,
      filesize: currentFile.size,
      name: myname
    };
    currentConn["datachannel"].send(JSON.stringify(data));
    currentChunk = 0;
    readNextChunk();
    var anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(currentFile);
    anchor.download = currentFile.name;
    anchor.textContent = currentFile.name;
    currentBox.innerHTML +=
      `<div class="message-right message"><p>` +
      anchor.outerHTML +
      `</p></div>`;
  }
  currentBox.scrollTop = currentBox.scrollHeight - currentBox.clientHeight;
  file.value = null;
  btn_upload.innerText = "Send file";
});

// giao diện
function enterEV() {
  if (event.which == 13 || event.keyCode == 13) {
    btn_send.click();
    return false;
  }
  return true;
}

function backtoFront() {
  socket.send(JSON.stringify({ type: "onlineState" }));
  isinChat = false;
  currentConn = {};
  connection.forEach((c, i, o) => {
    if (
      c.dataChannel.readyState == "closing" ||
      c.dataChannel.readyState == "closed" ||
      c.state == "reject"
    ) {
      document.getElementById("box" + c.username).remove();
      document.getElementById("li" + c.username).remove();
      o.splice(i, 1);
    }
  });
  fp = document.getElementById("frontpage");
  ic = document.getElementById("inchat");
  if (ic.style.display !== "none") {
    ic.style.display = "none";
  }
  fp.style.display = "block";
  return true;
}
function gotoChat(n) {
  fp = document.getElementById("frontpage");
  ic = document.getElementById("inchat");
  if (fp.style.display !== "none") {
    fp.style.display = "none";
  }
  ic.style.display = "flex";
  displayBoxChat(n);
  isinChat = true;
  return true;
}
function newChatBoxCss(name) {
  var newDiv = document.createElement("div");
  newDiv.className = "messages-line";
  newDiv.id = "box" + name;
  newDiv.innerHTML = ``;
  chat.insertBefore(newDiv, chat.firstChild);
  var li = document.createElement("li");
  li.id = "li" + name;
  li.className = "user-li";
  li.innerHTML =
    `<div class="usr-msg-details">
  <div class="usr-mg-info">
    <h3>` +
    name +
    `</h3>
  </div>
</div>`;
  var offButton = document.createElement("button");
  offButton.className = "btn btn-outline-danger";
  offButton.innerText = "Off Chat";
  offButton.onclick = function() {
    this.disabled = true;
    offButton.innerText = "Closed";
    offButton.className = "btn btn-danger";
    offChat(name);
  };
  li.appendChild(offButton);
  li.onclick = function() {
    displayBoxChat(name);
  };
  chatBoxCss.push({ box: newDiv, li: li, user: name });
  document.getElementById("list-user").appendChild(li);
  chatBoxCss.forEach(chatcss => {
    chatcss.box.style.display = "none";
    chatcss.li.className = "user-li";
  });
  newDiv.style.display = "block";
  li.className = "user-li active";
  return newDiv;
}
function displayBoxChat(name) {
  currentConn["name"] = name;
  chatBoxCss.forEach(chatcss => {
    if (chatcss.user == name) {
      chatcss.box.style.display = "block";
      chatcss.li.className = "user-li active";
    } else {
      chatcss.box.style.display = "none";
      chatcss.li.className = "user-li";
    }
  });
}

function Confirm(title, msg, $true, $false, $data) {
  var $content =
    "<div class='dialog-ovelay'>" +
    "<div class='dialog'><header>" +
    " <h3> " +
    title +
    " </h3> " +
    "<i class='fa fa-close'></i>" +
    "</header>" +
    "<div class='dialog-msg'>" +
    " <p> " +
    msg +
    " </p> " +
    "</div>" +
    "<footer>" +
    "<div class='controls'>" +
    " <button class='button button-danger doAction'>" +
    $true +
    "</button> " +
    " <button class='button button-default cancelAction'>" +
    $false +
    "</button> " +
    "</div>" +
    "</footer>" +
    "</div>" +
    "</div>";
  $("body").prepend($content);

  $(".doAction").click(function() {
    handleOffer($data);
    $(this)
      .parents(".dialog-ovelay")
      .fadeOut(500, function() {
        $(this).remove();
      });
  });
  $(".cancelAction, .fa-close").click(function() {
    socket.send(
      JSON.stringify({ type: "reject", from: myname, username: $data.from })
    );
    $(this)
      .parents(".dialog-ovelay")
      .fadeOut(500, function() {
        $(this).remove();
      });
  });
}

// utilities
function findConn(name) {
  for (let i = 0; i < connection.length; i++) {
    if (connection[i].username == name) {
      return connection[i];
    }
  }
  return null;
}
function findPC(name) {
  for (let i = 0; i < connection.length; i++) {
    if (connection[i].username == name) {
      return connection[i].peerConnection;
    }
  }
  return null;
}
function findDC(name) {
  for (let i = 0; i < connection.length; i++) {
    if (connection[i].username == name) {
      return connection[i].dataChannel;
    }
  }
  return null;
}
$(document).ready(function() {
  url = window.location.href;
  myname = url.split("=")[1];
  socket = new WebSocket("ws:" + serverAddr + ":" + serverPort);
  socket.onopen = function(e) {
    socket.send(JSON.stringify({ username: myname }));
    socket.send(JSON.stringify({ type: "onlineState" }));
  };
  socket.onmessage = function(event) {
    handleMessage(JSON.parse(event.data));
  };
  socket.onclose = function(event) {
    if (event.wasClean) {
    } else {
      console.log("close");
    }
  };
  socket.onerror = function(error) {
    alert(`[error] ${error.message}`);
  };
});
function offChat(name) {
  findDC(name).close();
  findPC(name).close();
  socket.send(
    JSON.stringify({
      type: "close",
      from: myname,
      username: name
    })
  );
  currentBox = document.getElementById("box" + name);
  currentBox.innerHTML +=
    `<div class="message-right message"><p class="bg-danger text-white">` +
    `close connection with ` +
    name +
    `</p></div>`;
  return false;
}
function handleReject(name) {
  btn = $("#li" + name + " button")[0];
  btn.className = "btn btn-outline-danger";
  btn.innerText = "Closed";
  btn.disabled = true;
  currentBox = document.getElementById("box" + name);
  currentBox.innerHTML +=
    `<div class="message-left message"><p class="bg-danger text-white">` +
    name +
    ` rejected request</p></div>`;
  conn = findConn(name);
  conn["state"] = "reject";
}
function handleState(name, state) {
  if (state == "online") {
    $("#button" + name)[0].className = "btn btn-primary";
    $("#button" + name)[0].disabled = false;
  } else if (state == "offline") {
    $("#button" + name)[0].className = "btn btn-dark";
    $("#button" + name)[0].disabled = true;
  }
}
function handleClose(name) {
  findConn(name).dataChannel.close();
  findConn(name).peerConnection.close();
  currentBox = document.getElementById("box" + name);
  $("#li" + name + " button")[0].className = "btn btn-danger";
  $("#li" + name + " button")[0].innerText = "Closed";
  $("#li" + name + " button")[0].disabled = true;
  currentBox.innerHTML +=
    `<div class="message-left message"><p class="bg-danger text-white">` +
    name +
    ` close connection` +
    `</p></div>`;
  if (!isinChat) {
    connection.forEach((c, i, o) => {
      if (c.username == name) {
        document.getElementById("box" + c.username).remove();
        document.getElementById("li" + c.username).remove();
        o.splice(i, 1);
      }
    });
  }
}
function handleOffer(data) {
  currentConn["name"] = data.from;
  numConnnection++;
  isExist = false;
  connection.forEach((c, i, o) => {
    if (c.username == data.from) {
      isExist = true;
      o.splice(i, 1);
      $("#li" + c.username + " button")[0].className = "btn btn-outline-danger";
      $("#li" + c.username + " button")[0].innerText = "Off Chat";
      $("#li" + c.username + " button")[0].disabled = false;
    }
  });
  if (!isExist) newChatBoxCss(data.from);
  gotoChat(data.from);
  var peerConnection, dataChannel;
  conn = {
    id: numConnnection,
    peerConnection: peerConnection,
    dataChannel: dataChannel,
    username: data.from
  };
  connection.push(conn);
  peerConnection = connection[
    connection.length - 1
  ].peerConnection = new RTCPeerConnection(configuration);

  peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
  peerConnection.createAnswer(
    function(answer) {
      peerConnection.setLocalDescription(answer);
      socket.send(
        JSON.stringify({
          type: "answer",
          from: myname,
          username: data.from,
          answer: answer
        })
      );
    },
    function(error) {
      console.log("Error on receiving the offer: ", error);
    }
  );
  peerConnection.ondatachannel = function(ev) {
    connection[connection.length - 1].dataChannel = NewdataChannel = ev.channel;
    openDataChannel(NewdataChannel, data.from);
  };
  peerConnection.onicecandidate = function(event) {
    if (event.candidate) {
      socket.send(
        JSON.stringify({
          type: "candidate",
          from: myname,
          username: data.from,
          candidate: event.candidate
        })
      );
    }
  };
}
function noti(message) {
  var notiDiv = document.createElement("div");
  notiDiv.className = "noti";
  notiDiv.innerHTML =
    `
  <p class="noti-message text-dark">` +
    message +
    `</p>`;
  $("body").prepend(notiDiv);
  $(".noti").fadeOut(2500, function() {
    $(this).remove();
  });
}

// gửi File
function readNextChunk() {
  var start = BYTES_PER_CHUNK * currentChunk;
  var end = Math.min(currentFile.size, start + BYTES_PER_CHUNK);
  fileReader.readAsArrayBuffer(currentFile.slice(start, end));
}
function mergeChunk(newChunk) {
  incomingFile["filedata"].push(newChunk);
  receivedSize += newChunk.size;
  if (receivedSize >= incomingFile.filesize) {
    createDownload();
  }
}

fileReader.onload = function() {
  currentConn.datachannel.send(fileReader.result);
  currentChunk++;
  if (BYTES_PER_CHUNK * currentChunk < currentFile.size) {
    readNextChunk();
  } else {
    currentFile = null;
  }
};
function createDownload() {
  currentBox = document.getElementById("box" + incomingFile.name);
  var anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(new Blob(incomingFile["filedata"]));
  anchor.download = incomingFile.filename;
  anchor.textContent = incomingFile.filename;
  currentBox.innerHTML +=
    `<div class="message-left message"><p>` + anchor.outerHTML + `</p></div>`;
  currentBox.scrollTop = currentBox.scrollHeight - currentBox.clientHeight;
}
