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

var cmdList = [ { cmd: "get-credentials",
		  func: null,
		  args: 3,
		  help: "",
		  err: "Command does not take arguments" },
                { cmd: "list-players",
		  func: { operation: "commandGetPlayerList", argumentList: [] },
		  args: 3,
		  help: "",
		  err: "Command does not take arguments" },
		{ cmd: "add-player",
		  func: { operation: "commandAddPlayerToList", argumentList: [ "player" ] },
		  args: 4,
		  help: "<name,number,role,team>",
		  err: "Command takes player string as argument" },
		{ cmd: "delete-player",
		  func: { operation: "commandDeletePlayerFromList", argumentList: [ "id" ] },
		  args: 4,
		  help: "<player ID>",
		  err: "Command takes player ID as argument" },
		{ cmd: "modify-player",
		  func: { operation: "commandModifyPlayerInList", argumentList: [ "id", "player" ] },
		  args: 5,
		  help: "<player ID> <name,number,role,team>",
		  err: "Command takes player ID and player string as arguments" },
		{ cmd: "list-teams",
		  func: { operation: "commandGetTeamList", argumentList: [] },
		  args: 3,
		  help: "",
		  err: "Command does not take arguments" } ];

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

    if(defragmentedMessage.type === "unpriviligedLogin" && !gotUiResponse) {
	gotUiResponse = true;
	sendQueryToServer();
    }

    if(defragmentedMessage.type === "showHtmlPage") {
	// we don't care about html page messages
    }

    if(defragmentedMessage.type === "createUiPage" && !gotUiResponse) {
	gotUiResponse = true;
	sendQueryToServer();
    }

    if(defragmentedMessage.type === "rawDataMessage") {
//	console.log("got raw dataset")
	handleRawDataSet(defragmentedMessage.content);
    }
}

function sendQueryToServer() {
    cmdFlag = false;
    cmdList.forEach(function(c) {
	if(c.cmd === process.argv[2]) {
	    cmdFlag = true;
	    if(c.args === 3) {
		if(process.argv.length === 3) {
		    sendToServerEncrypted(c.func.operation, {});
		} else {
		    console.log("error: " + c.err);
		    process.exit(1);
		}
	    }
	    if(c.args === 4) {
		if(process.argv.length === 4) {
		    var option = {};
		    option[c.func.argumentList[0]] = process.argv[3];
		    sendToServerEncrypted(c.func.operation, option);
		} else {
		    console.log("error: " + c.err);
		    process.exit(1);
		}
	    }
	    if(c.args === 5) {
		if(process.argv.length === 5) {
		    var option = {};
		    option[c.func.argumentList[0]] = process.argv[3];
		    option[c.func.argumentList[1]] = process.argv[4];
		    sendToServerEncrypted(c.func.operation, option);
		} else {
		    console.log("error: " + c.err);
		    process.exit(1);
		}
	    }
	}
    });
    if(!cmdFlag) {
	console.log("error: Unknown command")
	process.exit(1);
    }
}

function handleRawDataSet(dataSet) {
    if(dataSet.type === "commandAcknowledge") {
	if(dataSet.data.status === true) {
	    console.log("OK");
	    process.exit(0);
	}
	else {
	    console.log("operation FAILED: " + dataSet.data.error );
	    process.exit(1);
	}
    }
    if(dataSet.type === "playerList") {
	sortAscendingNumber("id", dataSet.data);
	dataSet.data.forEach(function(p) {
	    if(p.role === "") { p.role = "P"; }
	    console.log(p.id + "," + p.name + "," + p.number + "," + p.role  + "," + p.team);
	});
    }
    if(dataSet.type === "teamList") {
	dataSet.data.forEach(function(t) {
	    console.log(t.id + "," + t.name + "," + t.tag);
	});
    }
    if(dataSet.type === "teamPlayerList") {
	sortAscendingNumber("id", dataSet.data);
	dataSet.data.forEach(function(p) {
	    console.log(p.id + "," + p.name + "," + p.number);
	});
    }
    sendToServerEncrypted("clientStarted", {});
    process.exit(0);
}

if(process.argv.length < 3) {
    console.log("\n  Console tool to access tournament server")
    console.log("  Usage: \'node tournamentctl.js <command> [arguments]\'\n");
    console.log("  Commands:");
    cmdList.forEach(function(c) {
	var filler = "                     ".substring(0, 20 - c.cmd.length);
	console.log("    " + c.cmd + filler + c.help);
    });
    console.log();
    process.exit(1);
}

if(process.argv[2] === "get-credentials") {
    var server = readlineSync.question("server address:port: ");
    var username = readlineSync.question("username: ");
    var password = readlineSync.question("password: ", { hideEchoBack: true });
    var credentials = { server: server,
			username: sha1.hash(username),
			password: sha1.hash(password + sha1.hash(username).slice(0,4)) }
    fs.writeFileSync("./credentials", JSON.stringify(credentials));
    console.log("Created new credentials")
    process.exit(0);
}

if(fs.existsSync("./credentials") !== true) {
    console.log("Credentials file is missing");
    process.exit(1);
}

var credentials = JSON.parse(fs.readFileSync("./credentials").toString("utf8"));
mySocket.connect("ws://" + credentials.server + "/");
