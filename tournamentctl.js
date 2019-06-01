var fs = require("fs");
var readlineSync = require("readline-sync");
var websocketClient = require("./framework/node_modules/websocket").client;
var mySocket = new websocketClient();
var incomingMessageBuffer = "";
var sha1 = require('./framework/crypto/sha1.js');
var Aes = require('./framework/crypto/aes.js');
Aes.Ctr = require('./framework/crypto/aes-ctr.js');

var myConnection;
var sessionPassword;

mySocket.on('connectFailed', function(error) {
    if(error.code === "ECONNREFUSED") {
	console.log("Could not connect to server")
	process.exit(1);
    } else {
	console.log('Connect Error: ' + error.toString());
	process.exit(1);
    }
});

mySocket.on('connect', function(connection) {
//    console.log('WebSocket Client Connected');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
	process.exit(1);
    });
    connection.on('close', function() {
        console.log('Connection Closed');
	process.exit(1);
    });
    connection.on('message', function(message) {
        if (message.type !== 'utf8') {
            console.log("Received non-utf8 message: " + JSON.stringify(message));
	    process.exit(1);
        } else {
//	    console.log("Received message: " + JSON.stringify(message.utf8Data));
	    var receivable = JSON.parse(message.utf8Data);
	    if(receivable.type === "statusData") {
		// we don't care about status messages
	    }
	    if(receivable.type === "createUiPage") {
		// login screen is the only object sent over plaintext.
		// use credentials from the provided file
		sessionPassword = credentials.password
		sendToServer('userLogin', { username: credentials.username });
	    }
	    if(receivable.type === "payload") {
		// payload is always encrypted, if authentication is not successiful then JSON parsing
		// fails and we bail out
		try {
		    var content = JSON.parse(Aes.Ctr.decrypt(receivable.content, sessionPassword, 128));
		    defragmentIncomingMessage(content);
		} catch(err) {
		    console.log("Error in credentials")
		    process.exit(1);
		}
	    }
	}

    });
    if (connection.connected) {
	myConnection = connection;
	var sendable = {type:"clientStarted", content:"none"};
	myConnection.send(JSON.stringify(sendable));
    }
});

var sortAscending = function(prop, arr) {
    arr.sort(function(a, b) {
        if(a[prop] < b[prop]) {
            return -1;
        } else if(a[prop] > b[prop]) {
            return 1;
        } else {
            return 0;
        }
    });
};

var sortAscendingNumber = function(prop, arr) {
    arr.sort(function(a, b) {
        if(parseInt(a[prop], 10) < parseInt(b[prop], 10)) {
            return -1;
        } else if(parseInt(a[prop], 10) > parseInt(b[prop], 10)) {
            return 1;
        } else {
            return 0;
        }
    });
};

function sendToServer(type, content) {
    var sendable = { type: type, content: content };
    myConnection.send(JSON.stringify(sendable));
}

function sendFragment(type, id, data) {
    var fragment = JSON.stringify({ type: type, id: id, length: data.length, data: data });
    var cipherSendable = JSON.stringify({ type: "payload",
					  content: Aes.Ctr.encrypt(fragment, sessionPassword, 128) });
    myConnection.send(cipherSendable);
}

var fragmentSize = 10000;

function sendToServerEncrypted(type, content) {
    var sendableString = JSON.stringify({ type: type, content: content });
    var count = 0;
    var originalLength = sendableString.length;
    if(sendableString.length <= fragmentSize) {
	sendFragment("nonFragmented", count++, sendableString);
    } else {
	while(sendableString.length > fragmentSize) {
	    sendableStringFragment = sendableString.slice(0, fragmentSize);
	    sendableString = sendableString.slice(fragmentSize, sendableString.length);
	    sendFragment("fragment", count++, sendableStringFragment);
	}
	if(sendableString.length > 0) {
	    sendFragment("lastFragment", count++, sendableString);
	}
    }
//    console.log("Sent " + originalLength + " bytes in " + count + " fragments to server");
}

var incomingMessageBuffer = "";

function defragmentIncomingMessage(decryptedMessage) {
//    console.log("Decrypted incoming message: " + JSON.stringify(decryptedMessage));
    if(decryptedMessage.type === "nonFragmented") {
	handleIncomingMessage(JSON.parse(decryptedMessage.data));
    }
    if(decryptedMessage.type === "fragment") {
	if(decryptedMessage.id === 0) {
	    incomingMessageBuffer = decryptedMessage.data;
	} else {
	    incomingMessageBuffer = incomingMessageBuffer + decryptedMessage.data;
	}
    }
    if(decryptedMessage.type === "lastFragment") {
	incomingMessageBuffer = incomingMessageBuffer + decryptedMessage.data;
	handleIncomingMessage(JSON.parse(incomingMessageBuffer));
    }
}

var gotUiResponse = false;

function handleIncomingMessage(defragmentedMessage) {
//    console.log("Defragmented incoming message: " + JSON.stringify(defragmentedMessage));

    if(defragmentedMessage.type === "statusData") {
	// we don't care about status messages
    }

    if(defragmentedMessage.type === "loginChallenge") {
	var cipheredResponce = Aes.Ctr.encrypt(defragmentedMessage.content, sessionPassword, 128);
	sendToServer("loginResponse", cipheredResponce);
    }

    if(defragmentedMessage.type === "unpriviligedLogin") {
	// we don't care about unpriviliged login
    }

    if(defragmentedMessage.type === "showHtmlPage") {
	// we don't care about html page messages
    }

    if(defragmentedMessage.type === "createUiPage" && !gotUiResponse) {
	gotUiResponse = true;
//	console.log("Logged IN");
	sendQueryToServer();
    }

    if(defragmentedMessage.type === "rawDataMessage") {
//	console.log("got raw dataset")
	handleRawDataSet(defragmentedMessage.content);
    }
}

function sendQueryToServer() {
    if(process.argv[2] === "list-players") {
	sendToServerEncrypted("commandGetPlayerList", {});
    }
    if(process.argv[2] === "add-player") {
	if(process.argv.length !== 4) {
	    console.log("add-player command needs an argument")
	    process.exit(1);
	} else {
	    sendToServerEncrypted("commandAddPlayerToList", { player: process.argv[3] });
	}
    }
    if(process.argv[2] === "delete-player") {
	if(process.argv.length !== 4) {
	    console.log("delete-player command needs an argument")
	    process.exit(1);
	} else {
	    sendToServerEncrypted("commandDeletePlayerFromList", { id: process.argv[3] });
	}
    }
    if(process.argv[2] === "modify-player") {
	if(process.argv.length !== 5) {
	    console.log("modify-player command needs two arguments")
	    process.exit(1);
	} else {
	    sendToServerEncrypted("commandModifyPlayerInList", { id: process.argv[3],
								 player: process.argv[4] });
	}
    }
}

function handleRawDataSet(dataSet) {
    if(dataSet.type === "commandAcknowledge") {
	if(dataSet.data === true) { console.log("OK"); }
	else { console.log("operation FAILED"); }
	process.exit(1);
    }
    if(dataSet.type === "playerList") {
	sortAscendingNumber("id", dataSet.data);
	dataSet.data.forEach(function(p) {
	    if(p.role === "") { p.role = "P"; }
	    console.log(p.id + "," + p.name + "," + p.number + "," + p.role  + "," + p.team);
	});
    }
    sendToServerEncrypted("clientStarted", {});
    process.exit(1);
}

if(process.argv.length < 3) {
    console.log("You need to give command to execute")
    process.exit(1);
}

if(process.argv[2] === "get-credentials") {
    var username = readlineSync.question("username: ");
    var password = readlineSync.question("password: ", { hideEchoBack: true });
    var credentials = { username: sha1.hash(username),
			password: sha1.hash(password + sha1.hash(username).slice(0,4)) }
    fs.writeFileSync("./credentials", JSON.stringify(credentials));
    process.exit(0);
}

if(fs.existsSync("./credentials") !== true) {
    console.log("Credentials file is missing");
    process.exit(1);
}

var credentials = JSON.parse(fs.readFileSync("./credentials").toString("utf8"));
mySocket.connect('ws://localhost:8080/');

