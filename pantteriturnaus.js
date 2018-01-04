var websocket = require("websocket");
var http = require("http");
var fs = require("fs");
var path = require("path");
var Aes = require('./crypto/aes.js');
Aes.Ctr = require('./crypto/aes-ctr.js');
var sha1 = require('./crypto/sha1.js');
var datastorage = require('./datastorage/datastorage.js');

var globalSalt = sha1.hash(JSON.stringify(new Date().getTime()));
var DatabaseVersion = 1;

function servicelog(s) {
    console.log((new Date()) + " --- " + s);
}

function setStatustoClient(cookie, status) {
    var sendable = { type: "statusData",
		     content: status };
    cookie.connection.send(JSON.stringify(sendable));
}

function sendPlainTextToClient(cookie, sendable) {
    cookie.connection.send(JSON.stringify(sendable));
}

function sendCipherTextToClient(cookie, sendable) {
    var cipherSendable = { type: "payload",
			   content: Aes.Ctr.encrypt(JSON.stringify(sendable),
						    cookie.aesKey, 128) };
    cookie.connection.send(JSON.stringify(cipherSendable));
}

function getClientVariables() {
    return "var WEBSOCK_PORT = " + mainConfig.port + ";\n";
}

var webServer = http.createServer(function(request,response){
    var clienthead = fs.readFileSync("./clienthead", "utf8");
    var variables = getClientVariables();
    var clientbody = fs.readFileSync("./client.js", "utf8");
    var aesjs = fs.readFileSync("./crypto/aes.js", "utf8");
    var aesctrjs = fs.readFileSync("./crypto/aes-ctr.js", "utf8");
    var sha1js = fs.readFileSync("./crypto/sha1.js", "utf8");
    var sendable = clienthead + variables + clientbody + aesjs + aesctrjs + sha1js + "</script></body></html>";
    response.writeHeader(200, { "Content-Type": "text/html",
                                "X-Frame-Options": "deny",
                                "X-XSS-Protection": "1; mode=block",
                                "X-Content-Type-Options": "nosniff" });
    response.write(sendable);
    response.end();
    servicelog("Respond with client to: " + JSON.stringify(request.headers));
});

wsServer = new websocket.server({
    httpServer: webServer,
    autoAcceptConnections: false
});

var connectionCount = 0;

wsServer.on('request', function(request) {
    servicelog("Connection from origin " + request.origin);
    var connection = request.accept(null, request.origin);
    var cookie = { count:connectionCount++, connection:connection, state:"new" };
    var sendable;
    var defaultUserRights = { priviliges: [ "none" ] }
    servicelog("Client #" + cookie.count  + " accepted");

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
	    try {
		var receivable = JSON.parse(message.utf8Data);
	    } catch(err) {
		servicelog("Received illegal message: " + err);
		return;
	    }
	    if(!receivable.type || !receivable.content) {
		servicelog("Received broken message: " + JSON.stringify(receivable));
		return;
	    }

//	    servicelog("Incoming message: " + JSON.stringify(receivable));

	    var type = receivable.type;
	    var content = receivable.content;

            if(type === "clientStarted") { processClientStarted(cookie); }
	    if(type === "userLogin") { processUserLogin(cookie, content); }
	    if(type === "loginResponse") { processLoginResponse(cookie, content); }
	    if(type === "payload") {
		try {
		    var decryptedMessage = JSON.parse(Aes.Ctr.decrypt(content, cookie.user.password, 128));
		    handleIncomingMessage(cookie, decryptedMessage);
		} catch(err) {
		    servicelog("problem parsing JSON from message: " + err);
		    return;
		}
	    }
	}
    });

    connection.on('close', function(connection) {
	servicelog("Client #" + cookie.count  + " disconnected");
        cookie = {};
    });
});

function handleIncomingMessage(cookie, decryptedMessage) {

//    servicelog("decrypted message: " + JSON.stringify(decryptedMessage));

    if(decryptedMessage.type === "clientStarted") {
	processClientStarted(cookie); }

    if(stateIs(cookie, "loggedIn")) {
	if(decryptedMessage.type === "getTournamentDataForShow") {
	    processGetTournamentDataForShow(cookie, decryptedMessage.content); }
	if(decryptedMessage.type === "getTournamentsDataForEdit") {
	    processGetTournamentsDataForEdit(cookie, decryptedMessage.content); }
	if(decryptedMessage.type === "saveAllTournamentsData") {
	    processSaveAllTournamentsData(cookie, decryptedMessage.content); }
	if(decryptedMessage.type === "getSingleTournamentForEdit") {
	    processGetSingleTournamentForEdit(cookie, decryptedMessage.content); }
	if(decryptedMessage.type === "saveTournamentGameData") {
	    processSaveTournamentGameData(cookie, decryptedMessage.content); }
	if(decryptedMessage.type === "getOneTournamentScoresForEdit") {
            processOneTournamentScoresEdit(cookie, decryptedMessage.content); }
	if(decryptedMessage.type === "getTeamsDataForEdit") {
	    processTeamsDataEdit(cookie, decryptedMessage.content); }
	if(decryptedMessage.type === "gainAdminMode") {
	    processGainAdminMode(cookie, decryptedMessage.content); }
	if(decryptedMessage.type === "saveAdminData") {
	    processSaveAdminData(cookie, decryptedMessage.content); }
	if(decryptedMessage.type === "changeUserPassword") {
	    processChangeUserPassword(cookie, decryptedMessage.content); }
	if(decryptedMessage.type === "resetToMain") {
	    processResetToMainState(cookie, decryptedMessage.content); }
	if(decryptedMessage.type === "getOneMatchScoresForEdit") {
	    processOneMatchScoresForEdit(cookie, decryptedMessage.content); }
	if(decryptedMessage.type === "saveMatchScores") {
	    processSaveMatchScores(cookie, decryptedMessage.content); }
	if(decryptedMessage.type === "saveAllTeamsData") {
	    processSaveAllTeamsData(cookie, decryptedMessage.content); }
	if(decryptedMessage.type === "getSingleTeamForEdit") {
	    processGetSingleTeamForEdit(cookie, decryptedMessage.content); }
	if(decryptedMessage.type === "saveSingleTeamData") {
	    processSaveSingleTeamData(cookie, decryptedMessage.content); }
    }
}

function stateIs(cookie, state) {
    return (cookie.state === state);
}

function setState(cookie, state) {
    cookie.state = state;
}

function processClientStarted(cookie) {
    if(cookie["user"] !== undefined) {
	if(cookie.user["username"] !== undefined) {
	    servicelog("User " + cookie.user.username + " logged out");
	}
    }
    servicelog("Sending initial login view to client #" + cookie.count);
    setState(cookie, "clientStarted");
    cookie.aesKey = "";
    cookie.user = {};
    cookie.challenge = "";
    var sendable = { type: "loginView" }
    sendPlainTextToClient(cookie, sendable);
    setStatustoClient(cookie, "Login");
}

function processUserLogin(cookie, content) {
    var sendable;
    if(!content.username) {
	servicelog("Illegal user login message");
	processClientStarted(cookie);
	return;
    } else {
	var user = getUserByHashedName(content.username);
	if(user.length === 0) {
	    servicelog("Unknown user login attempt");
	    processClientStarted(cookie);
	    return;
	} else {
	    cookie.user = user[0];
	    cookie.aesKey = user[0].password;
	    servicelog("User " + user[0].username + " logging in");
	    var plainChallenge = getNewChallenge();
	    servicelog("plainChallenge: " + plainChallenge);
	    cookie.challenge = plainChallenge;
	    sendable = { type: "loginChallenge",
			 content: plainChallenge };
	    sendCipherTextToClient(cookie, sendable);
	}
    }
}

function processLoginResponse(cookie, content) {
    var sendable;
    var plainResponse = Aes.Ctr.decrypt(content, cookie.user.password, 128);
    if(cookie.challenge === plainResponse) {
	servicelog("User login OK");
	setState(cookie, "loggedIn");
	setStatustoClient(cookie, "Login OK");
	if(getUserPriviliges(cookie.user).length === 0) {
	    // for unpriviliged login, only send logout button and nothing more
	    sendable = { type: "unpriviligedLogin",
			 content: { topButtonList: [ { id: 100,
						       text: "Kirjaudu Ulos",
						       callbackMessage: "clientStarted" } ] } };

	    sendCipherTextToClient(cookie, sendable);
	    servicelog("Sent unpriviligedLogin info to client #" + cookie.count);
	} else {
	    sendTournamentMainData(cookie);
	}
    } else {
	servicelog("User login failed on client #" + cookie.count);
	processClientStarted(cookie);
    }
}

function processGetTournamentDataForShow(cookie, data) {
    var sendable;
    try {
	var tournamentId = data.buttonData;
    } catch(err) {
	servicelog("Cannot parse tournament id: " + err);
	return;
    }
    servicelog("Client #" + cookie.count + " requests tournament show: " + tournamentId);
    if(userHasViewPrivilige(cookie.user)) {	
	var tournmentWebPage = new Buffer(createPreviewHtmlPage(getTournamentDataById(tournamentId)));
	sendable = { type: "showTournament",
		     content: tournmentWebPage.toString("ascii") };
	sendCipherTextToClient(cookie, sendable);
	servicelog("sent tournament html view to client");
    } else {
	servicelog("user has insufficent priviliges to view tournament");
    }
}

function processGetTournamentsDataForEdit(cookie, data) {
    servicelog("Client #" + cookie.count + " requests tournament data for edit.");
    if(userHasEditTournamentsPrivilige(cookie.user)) {
	var sendable;
	var topButtonList =  createTopButtonList(cookie, false);
	var items = [];
	datastorage.read("tournaments").tournaments.forEach(function(t) {
	    items.push([ [ createUiTextNode("id", t.id, 10) ],
			 [ createUiTextArea("name", t.name, 30) ],
			 [ createUiTextArea("outputfile", t.outputFile, 40) ],
			 [ createUiCheckBox("locked", t.locked, "locked") ], 
			 [ createUiButton("Muokkaa", "getSingleTournamentForEdit", t.id) ] ]);
	});

	var itemList = { title: "Tournaments",
			 frameId: 0,
			 header: [ { text: "Id" }, { text: "Name" }, { text: "Outputfile" },
				   { text: "Locked" },  { text: "Edit" }],
			 items: items,
			 newItem: [ [ createUiTextNode("id", "", 10) ],
				    [ createUiTextArea("name", "<name>", 30) ],
				    [ createUiTextArea("outputfile", "<outputfile>", 40) ],
				    [ createUiCheckBox("locked", false, "locked") ],
				    [ createUiTextNode("", "", 25) ] ] };

	var frameList = [ { frameType: "editListFrame", frame: itemList } ];

	sendable = { type: "createUiPage",
		     content: { user: cookie.user.username,
				priviliges: cookie.user.applicationData.priviliges,
				topButtonList: topButtonList,
				frameList: frameList,
				buttonList: [ { id: 501, text: "OK", callbackMessage: "saveAllTournamentsData" },
					      { id: 502, text: "Cancel",  callbackMessage: "resetToMain" } ] } };

	sendCipherTextToClient(cookie, sendable);
	servicelog("Sent NEW tournamentData to client #" + cookie.count);
    } else {
	servicelog("user has insufficent priviliges to edit tournaments.");
	sendTournamentMainData(cookie);
    }
}

function processSaveAllTournamentsData(cookie, data) {
    servicelog("Client #" + cookie.count + " requests tournament data saving: " + JSON.stringify(data));
    if(userHasEditTournamentsPrivilige(cookie.user)) {
	var newTournaments = [];
	var oldTournaments = datastorage.read("tournaments").tournaments;
	var nextId = datastorage.read("tournaments").nextId;
	var tournamentData = extractTournamentsDataFromInputData(data);
	if(tournamentData === null) {
	    sendTournamentMainData(cookie);
	    return;
	}
	tournamentData.forEach(function(t) {
	    var flag = true;
	    oldTournaments.forEach(function(u) {
		if(t.id === u.id) {
		    flag = false;
		    newTournaments.push({ name: t.name,
					  id: t.id,
					  outputFile: t.outputFile,
					  locked: t.locked,
					  games: u.games });
		}
	    });
	    if(flag) {
		newTournaments.push({ name: t.name,
				      id: nextId++,
				      outputFile: t.outputFile,
				      locked: t.locked,
				      games: [] });
	    }
	});
	if(datastorage.write("tournaments", { nextId: nextId, tournaments: newTournaments }) === false) {
	    servicelog("Tournaments database write failed");
	} else {
	    servicelog("Updated tournaments database");
	}
    } else {
	servicelog("user has insufficent priviliges to edit tournament data");
    }
    sendTournamentMainData(cookie);
}

function processGetSingleTournamentForEdit(cookie, data) {
    servicelog("Client #" + cookie.count + " requests single tournament data for edit: " + JSON.stringify(data));
    if(userHasEditTournamentsPrivilige(cookie.user)) {
	var tournament = datastorage.read("tournaments").tournaments.map(function(t) {
	    if(t.id === data.buttonData) { return t; }
	}).filter(function(f){return f;})[0];
	var sendable;
	var topButtonList =  createTopButtonList(cookie, false);
	var items = [];
	tournament.games.forEach(function(t) {
	    items.push([ [ createUiTextArea("time", t.time, 20) ],
			 [ createUiSelectionList("home", createTeamList(), getTeamNameFromId(t.home)) ],
			 [ createUiSelectionList("guest", createTeamList(), getTeamNameFromId(t.guest)) ] ]);
	});

	var itemList = { title: tournament.name,
			 frameId: 0,
			 header: [ { text: "Time" }, { text: "Home" }, { text: "Guest" } ],
			 items: items,
			 newItem: [ [ createUiTextArea("time", "<time>", 20) ],
				    [ createUiSelectionList("home", createTeamList(), "") ],
				    [ createUiSelectionList("guest", createTeamList(), "") ] ] };

	var frameList = [ { frameType: "editListFrame", frame: itemList } ];

	sendable = { type: "createUiPage",
		     content: { user: cookie.user.username,
				priviliges: cookie.user.applicationData.priviliges,
				topButtonList: topButtonList,
				frameList: frameList,
				buttonList: [ { id: 501, text: "OK", callbackMessage: "saveTournamentGameData", data: tournament.id },
					      { id: 502, text: "Cancel",  callbackMessage: "resetToMain" } ] } };

	sendCipherTextToClient(cookie, sendable);
	servicelog("Sent NEW gameData to client #" + cookie.count);
    } else {
	servicelog("user has insufficent priviliges to edit tournament data");
	sendTournamentMainData(cookie);
    }
}

function processSaveTournamentGameData(cookie, data) {
    servicelog("Client #" + cookie.count + " requests saving single tournament game data: " + JSON.stringify(data));
    if(userHasEditTournamentsPrivilige(cookie.user)) {
	var newTournaments = [];
	var oldTournaments = datastorage.read("tournaments");
	var gameData = extractGamesDataFromInputData(data);
	if(gameData === null) {
	    sendTournamentMainData(cookie);
	    return;
	}
	var id = data.buttonList.map(function(b) {
	    if(b.text === "OK") { return b.data; }
	}).filter(function(f){return f;})[0];
	oldTournaments.tournaments.forEach(function(t) {
	    if(t.id !== id) {
		newTournaments.push(t);
	    } else {
		newTournaments.push({ name: t.name,
				      id: t.id,
				      outputFile: t.outputFile,
				      locked: t.locked,
				      games: gameData });
	    }
	});
	if(datastorage.write("tournaments", { nextId: oldTournaments.nextId, tournaments: newTournaments }) === false) {
	    servicelog("Tournaments database write failed");
	} else {
	    servicelog("Updated tournaments database");
	}
    } else {
	servicelog("user has insufficent priviliges to edit tournament data");
    }
    sendTournamentMainData(cookie);
}

function processOneTournamentScoresEdit(cookie, data) {
    try {
	var tournamentId = data.buttonData;
    } catch(err) {
	servicelog("Cannot parse tournament id: " + err);
	return;
    }
    servicelog("Client #" + cookie.count + " requests tournament scores edit: " + tournamentId);
    if(userHasEditScoresPrivilige(cookie.user)) {
	sendOneTournamentForScoresEdit(cookie, getTournamentDataById(tournamentId));
    } else {
	servicelog("user has insufficent priviliges to edit tournament scores");
    }
}

function processOneMatchScoresForEdit(cookie, data) {
    try {
	var tournamentId = data.buttonData.id;
	var tournamentRound = data.buttonData.round;
    } catch(err) {
	servicelog("Cannot parse either tournament name or round: " + err);
	return;
    }
    servicelog("Client #" + cookie.count + " requests match scores edit: " + tournamentId + " / " + tournamentRound);
    if(userHasEditScoresPrivilige(cookie.user)) {
	sendOneMatchForScoresEdit(cookie, getMatchDataById(tournamentId, tournamentRound));
    } else {
	servicelog("user has insufficent priviliges to edit match scores");
    }
}

function processTeamsDataEdit(cookie, content) {
    servicelog("Client #" + cookie.count + " requests teams edit");
    if(userHasEditTeamsPrivilige(cookie.user)) {
	var sendable;
	var topButtonList =  createTopButtonList(cookie, false);
	var items = [];
	datastorage.read("teams").teams.forEach(function(t) {
	    items.push([ [ createUiTextNode("id", t.id, 10) ],
			 [ createUiTextArea("name", t.name, 25) ],
			 [ createUiButton("Muokkaa", "getSingleTeamForEdit", t.id) ] ]);
	});

	var itemList = { title: "Teams",
			 frameId: 0,
			 header: [ { text: "Id" }, { text: "Name" }, { text: "" } ],
			 items: items,
			 newItem: [ [ createUiTextNode("id", "", 10) ],
				    [ createUiTextArea("name", "<name>", 25) ],
				    [ createUiTextNode("", "", 25) ] ] };

	var frameList = [ { frameType: "editListFrame", frame: itemList } ];

	sendable = { type: "createUiPage",
		     content: { user: cookie.user.username,
				priviliges: cookie.user.applicationData.priviliges,
				topButtonList: topButtonList,
				frameList: frameList,
				buttonList: [ { id: 501, text: "OK", callbackMessage: "saveAllTeamsData" },
					      { id: 502, text: "Cancel",  callbackMessage: "resetToMain" } ] } };

	sendCipherTextToClient(cookie, sendable);
	servicelog("Sent NEW teamsData to client #" + cookie.count);
    } else {
	servicelog("user has insufficent priviliges to edit teams");
	sendTournamentMainData(cookie);
    }
}

function processSaveAllTeamsData(cookie, data) {
    servicelog("Client #" + cookie.count + " requests teams data saving: " + JSON.stringify(data));
    if(userHasEditTeamsPrivilige(cookie.user)) {
	var newTeams = [];
	var oldTeams = datastorage.read("teams").teams;
	var nextId = datastorage.read("teams").nextId;
	var teamData = extractTeamsDataFromInputData(data);
	if(teamData === null) {
	    sendTournamentMainData(cookie);
	    return;
	}
	teamData.forEach(function(t) {
	    var flag = true;
	    oldTeams.forEach(function(u) {
		if(t.id === u.id) {
		    flag = false;
		    newTeams.push({ name: t.name,
				    id: t.id,
				    players: u.players });
		}
	    });
	    if(flag) { newTeams.push({ name: t.name, id: nextId++, players: [] }); }
	});
	if(datastorage.write("teams", { nextId: nextId, teams: newTeams }) === false) {
	    servicelog("Teams database write failed");
	} else {
	    servicelog("Updated teams database");
	}
    } else {
	servicelog("user has insufficent priviliges to edit teams");
    }
    sendTournamentMainData(cookie);
}

function processGetSingleTeamForEdit(cookie, data) {
    servicelog("Client #" + cookie.count + " requests team data for editing: " + JSON.stringify(data.buttonData));
    if(userHasEditTeamsPrivilige(cookie.user)) {
	var sendable;
	var topButtonList =  createTopButtonList(cookie, false);
	var items = [];
	datastorage.read("teams").teams.forEach(function(t) {
	    if(t.id === data.buttonData) {
		t.players.forEach(function(p) {
		    items.push([ [ createUiTextArea("name", p.name, 25) ],
				 [ createUiTextArea("number", p.number, 25) ] ]);
		});
	    }
	});

	var itemList = { title: getTeamNameFromId(data.buttonData),
			 frameId: 0,
			 header: [ { text: "Name" }, { text: "Number" } ],
			 items: items,
			 newItem: [ [ createUiTextArea("name", "<name>", 25) ],
				    [ createUiTextArea("number", "<x>", 25) ] ] };

	var frameList = [ { frameType: "editListFrame", frame: itemList } ];

	sendable = { type: "createUiPage",
		     content: { user: cookie.user.username,
				priviliges: cookie.user.applicationData.priviliges,
				topButtonList: topButtonList,
				frameList: frameList,
				buttonList: [ { id: 501, text: "OK", callbackMessage: "saveSingleTeamData", data: data.buttonData },
					      { id: 502, text: "Cancel",  callbackMessage: "resetToMain" } ] } };

	sendCipherTextToClient(cookie, sendable);
	servicelog("Sent NEW teamData to client #" + cookie.count);
    } else {
	servicelog("user has insufficent priviliges to edit teams");
	sendTournamentMainData(cookie);
    }
}

function processSaveSingleTeamData(cookie, data) {
    servicelog("Client #" + cookie.count + " requests single team saving: " + JSON.stringify(data));
    if(userHasEditTeamsPrivilige(cookie.user)) {
	data.buttonList.forEach(function(b) {
	    if(b.text === "OK") { updateSingleTeamFromClient(cookie, b.data, data); }
	});
    } else {
	servicelog("user has insufficent priviliges to edit teams");
    }
    sendTournamentMainData(cookie);
}

function updateSingleTeamFromClient(cookie, teamId, data) {
    var newTeams = [];
    var nextId = datastorage.read("teams").nextId;
    datastorage.read("teams").teams.forEach(function(t) {
	if(t.id !== teamId) {
	    newTeams.push(t);
	} else {
	    var players = extractSingleTeamDataFromInputData(data);
	    if(players === null) {
		sendTournamentMainData(cookie);
		return;
	    }
	    newTeams.push({ name: t.name,
			    id: teamId,
			    players: players });
	}
    });
    if(datastorage.write("teams", { nextId: nextId, teams: newTeams }) === false) {
	servicelog("Teams database write failed");
    } else {
	servicelog("Updated teams database");
    }
}

function processGainAdminMode(cookie, content) {
    servicelog("Client #" + cookie.count + " requests Sytem Administration priviliges");
    if(userHasSysAdminPrivilige(cookie.user)) {
	servicelog("Granting Sytem Administration priviliges to user " + cookie.user.username);
	var sendable;
	var topButtonList =  createTopButtonList(cookie, true);

	var items = [];
	datastorage.read("users").users.forEach(function(u) {
	    items.push([ [ createUiTextNode("username", u.username) ],
			 [ createUiTextArea("realname", u.realname, 25) ],
			 [ createUiTextArea("email", u.email, 30) ],
			 [ createUiTextArea("phone", u.phone, 15) ],
			 [ createUiCheckBox("view", userHasViewPrivilige(u), "v"),
			   createUiCheckBox("score-edit", userHasEditScoresPrivilige(u), "se"),
			   createUiCheckBox("team-edit", userHasEditTeamsPrivilige(u), "te"),
			   createUiCheckBox("tournament-edit", userHasEditTournamentsPrivilige(u), "to"),
			   createUiCheckBox("system-admin", userHasSysAdminPrivilige(u), "a") ],
		         [ createUiButton("Vaihda", "changeUserPassword", u.username),
			   createUiInputField("password", "", true) ] ] )
	});

	var itemList = { title: "User Admin Data",
			 frameId: 0,
			 header: [ { text: "username" }, { text: "realname" }, { text: "email" },
				   { text: "phone" }, { text: "V / S / Te / To / A" }, { text: "Vaihda Salasana" } ],
			 items: items,
			 newItem: [ [ createUiTextArea("username", "<username>") ],
				    [ createUiTextArea("realname", "<realname>", 25) ],
				    [ createUiTextArea("email", "<email>", 30) ],
				    [ createUiTextArea("phone", "<phone>", 15) ],
				    [ createUiCheckBox("view", false, "v"),
				      createUiCheckBox("score-edit", false, "se"),
				      createUiCheckBox("team-edit", false, "te"),
				      createUiCheckBox("tournament-edit", false, "to"),
				      createUiCheckBox("system-admin", false, "a") ],
				    [ createUiTextNode("password", "") ] ] };

	var frameList = [ { frameType: "editListFrame", frame: itemList } ];

	sendable = { type: "createUiPage",
		     content: { user: cookie.user.username,
				priviliges: cookie.user.applicationData.priviliges,
				topButtonList: topButtonList,
				frameList: frameList,
				buttonList: [ { id: 501, text: "OK", callbackMessage: "saveAdminData" },
					      { id: 502, text: "Cancel",  callbackMessage: "resetToMain" } ] } };

	sendCipherTextToClient(cookie, sendable);
	servicelog("Sent NEW adminData to client #" + cookie.count);

    } else {
	servicelog("user " + cookie.user.username + " does not have Sytem Administration priviliges!");
	processClientStarted(cookie);
    }	
}

function processSaveAdminData(cookie, data) {
    servicelog("Client #" + cookie.count + " requests admin data saving: " + JSON.stringify(data));
    if(userHasSysAdminPrivilige(cookie.user)) {
	updateAdminDataFromClient(cookie, data);
	cookie.user = getUserByUserName(cookie.user.username)[0];
    } else {
	servicelog("user has insufficent priviliges to edit admin data");
    }
    sendTournamentMainData(cookie);
}

function processChangeUserPassword(cookie, data) {
    servicelog("Client #" + cookie.count + " requests user passwor change: " + JSON.stringify(data));
}

function processResetToMainState(cookie, content) {
    servicelog("User session reset to main state");
    sendTournamentMainData(cookie);
}


/**********/

function createUiTextNode(key, text) {
    return { itemType: "textnode", key: key, text: text };
}

function createUiTextArea(key, value, cols, rows) {
    if(cols === undefined) { cols = 10; }
    if(rows === undefined) { rows = 1; }
    return { itemType: "textarea", key: key, value: value, cols: cols, rows: rows };
}

function createUiCheckBox(key, checked, title, active) {
    if(title === undefined) { title = ""; }
    if(active === undefined) { active = true; }
    return { itemType: "checkbox", key: key, checked: checked, title: title, active: active };
}

function createUiSelectionList(key, list, selected, active) {
    var listItems = list.map(function(i) {
	return { text: i, item: i }
    }).filter(function(f) { return f; });
    if(active === undefined) { active = true; }
    return { itemType: "selection", key: key, list: listItems, selected: selected, active: active };
}

function createUiButton(text, callbackMessage, data, active) {
    if(active === undefined) { active = true; }
    return { itemType: "button", text: text, callbackMessage: callbackMessage, data: data, active: active };
}

function createUiInputField(key, value, password) {
    if(password  === undefined) { password = false; }
    return { itemType: "input", key: key, value: value, password: password };
}

/**********/

function getTournamentDataById(id) {
    var tournament = datastorage.read("tournaments").tournaments.map(function(t) {
	if(t.id === id) { return t;}
    }).filter(function(f){return f;})[0];
    return tournament;
}

function getTournamentDataByName(name) {
    var tournament = datastorage.read("tournaments").tournaments.map(function(t) {
	if(t.name === name) { return t;}
    }).filter(function(f){return f;})[0];
    return tournament;
}

function getMatchDataById(id, round) {
    var match = getTournamentDataById(id).games.map(function(t) {
	if(t.round === round) { return t;}
    }).filter(function(f){return f;})[0];
    match.id = { id: id, round: round };
    return match;
}

function createTopButtonList(cookie, adminRequest) {
    var topButtonList = [ { id: 101, text: "Kirjaudu Ulos", callbackMessage: "clientStarted" } ];
    if(userHasEditTeamsPrivilige(cookie.user)) {
	topButtonList.push( { id: 102, text: "Muokkaa Joukkueita", callbackMessage: "getTeamsDataForEdit" } );
    }
    if(userHasEditTournamentsPrivilige(cookie.user)) {
	topButtonList.push( { id: 103, text: "Muokkaa Turnauksia", callbackMessage: "getTournamentsDataForEdit" } );
    }
    if(userHasSysAdminPrivilige(cookie.user)) {
	if(adminRequest) {
	    topButtonList.push( { id: 104, text: "User Mode", callbackMessage: "resetToMain" } );
	} else {
	    topButtonList.push( { id: 104, text: "Admin Mode", callbackMessage: "gainAdminMode" } );
	}
    }
    return topButtonList;
}

function sendTournamentMainData(cookie) {
    var sendable;
    var topButtonList =  createTopButtonList(cookie, false);

    var tournaments = datastorage.read("tournaments").tournaments.map(function(t) {
	return { id: t.id, name: t.name, locked: t.locked };
    });

    var items = [];
    tournaments.forEach(function(t) {
	items.push( [ [ createUiTextNode("name", t.name) ],
		      [ createUiButton("Tulokset", "getTournamentDataForShow", t.id) ],
		      [ createUiButton("Muokkaa", "getOneTournamentScoresForEdit", t.id, !t.locked) ] ] );
    });

    var itemList = { title: "Tournament",
		     frameId: 0,
		     header: [ { text: "" }, { text: "" }, { text: "" } ],
		     items: items };

    var frameList = [ { frameType: "fixedListFrame", frame: itemList } ];

    sendable = { type: "createUiPage",
		 content: { user: cookie.user.username,
			    priviliges: cookie.user.applicationData.priviliges,
			    topButtonList: topButtonList,
			    frameList: frameList } };

    sendCipherTextToClient(cookie, sendable);
    servicelog("Sent NEW tournamentMainData to client #" + cookie.count);
}

function sendOneTournamentForScoresEdit(cookie, tournament) {
    var sendable;
    var topButtonList =  createTopButtonList(cookie, false);
    var items = [];
    var count = 1;
    tournament.games.forEach(function(t) {
	items.push( [ [ createUiTextNode("time", t.time) ],
		      [ createUiTextNode("home", getTeamNameFromId(t.home)) ],
		      [ createUiTextNode("guest", getTeamNameFromId(t.guest)) ],
		      [ createUiTextNode("result", t.result) ],
		      [ createUiButton("Muokkaa", "getOneMatchScoresForEdit", 
				       { id: tournament.id, round: count++ }) ] ] );
    });

    var itemList = { title: tournament.name,
		     frameId: 0,
		     header: [ { text: "Aika" }, { text: "Koti" }, { text: "Vieras" },
			       { text: "Tulos" }, {text: ""} ],
		     items: items };

    var buttonList =  [ { id: 501, text: "OK", callbackMessage: "resetToMain" } ];

    var frameList = [ { frameType: "fixedListFrame", frame: itemList } ];

    sendable = { type: "createUiPage",
		 content: { user: cookie.user.username,
			    priviliges: cookie.user.applicationData.priviliges,
			    topButtonList: topButtonList,
			    frameList: frameList,
			    buttonList: buttonList } };
			    
    sendCipherTextToClient(cookie, sendable);
    servicelog("Sent NEW editTournamentScores to client #" + cookie.count);
}

function getTeamIdFromName(name) {
    var name = datastorage.read("teams").teams.map(function(t) {
	if(t.name == name) { return t.id; }
    }).filter(function(f) { return f; })[0];
    return name;
}

function getTeamNameFromId(id) {
    var id = datastorage.read("teams").teams.map(function(t) {
	if(t.id == id) { return t.name; }
    }).filter(function(f) { return f; })[0];
    return id;
}

function createTeamList() {
    var teams = [];
    datastorage.read("teams").teams.forEach(function(t) {
	teams.push(t.name);
    });
    return teams;
}

function createPlayerList(match) {
    var players = [];
    datastorage.read("teams").teams.forEach(function(t) {
	if((t.id == match.home) || (t.id == match.guest)) {
	    t.players.forEach(function(p) {
		players.push(p.name + " / " + p.number);
	    });
	}
    });

    return players;
}

function createPlayer(tuple) {
    return tuple.name + " / " + tuple.number;
}

function sendOneMatchForScoresEdit(cookie, match) {
    var sendable;
    var topButtonList =  createTopButtonList(cookie, false);
    var items = [];
    
    match.scores.forEach(function(s) {
	items.push([ [ createUiSelectionList("piste", [ getTeamNameFromId(match.home),
							getTeamNameFromId(match.guest) ],
					     getTeamNameFromId(s.point)) ],
		     [ createUiSelectionList("tyyppi", [ "maali", "rankkari", "omari" ], s.type) ],
		     [ createUiTextArea("aika", s.time) ],
		     [ createUiSelectionList("tekijä", createPlayerList(match), createPlayer(s.scorer)) ],
		     [ createUiSelectionList("syöttäjä", createPlayerList(match), createPlayer(s.passer)) ] ])
	});

    var itemList = { title: getTeamNameFromId(match.home) + " vs. " + getTeamNameFromId(match.guest),
		     frameId: 0,
		     header: [ { text: "piste" }, { text: "tyyppi" }, { text: "aika" },
			       { text: "tekijä" }, { text: "syöttäjä" } ],
		     items: items,
		     newItem: [ [ createUiSelectionList("piste", [ getTeamNameFromId(match.home),
								   getTeamNameFromId(match.guest) ], "" ) ],
				[ createUiSelectionList("tyyppi", [ "maali", "rankkari", "omari" ], "") ],
				[ createUiTextArea("aika", "") ],
				[ createUiSelectionList("tekijä", createPlayerList(match), "") ],
				[ createUiSelectionList("syöttäjä", createPlayerList(match), "") ]
			      ] };

    var frameList = [ { frameType: "editListFrame", frame: itemList } ];

    sendable = { type: "createUiPage",
		 content: { user: cookie.user.username,
			    priviliges: cookie.user.applicationData.priviliges,
			    topButtonList: topButtonList,
			    frameList: frameList,
			    buttonList: [ { id: 501, text: "OK", callbackMessage: "saveMatchScores", data: match.id },
					  { id: 502, text: "Cancel",  callbackMessage: "resetToMain" } ] } };

    sendCipherTextToClient(cookie, sendable);
    servicelog("Sent NEW editMatchScores to client #" + cookie.count);
}

function processSaveMatchScores(cookie, data) {
    servicelog("Client #" + cookie.count + " requests match scores saving: " + JSON.stringify(data));
    if(userHasEditScoresPrivilige(cookie.user)) {
	data.buttonList.forEach(function(b) {
	    if(b.text === "OK") { updateMatchScoresFromClient(cookie, b.data, data); }
	});
    } else {
	servicelog("user has insufficent priviliges to edit match scores");
    }
    sendTournamentMainData(cookie);
}

function createTournamentHtmlPages(myTournament) {
    fs.writeFileSync(myTournament.outputFile + ".html", createHtmlMainResultsPage(myTournament));
    myTournament.games.forEach(function(g) {
	if(g.result !== "-") {
	    fs.writeFileSync(myTournament.outputFile + "_" + g.round + ".html", createHtmlSubResultsPage(g));
	}
    });
    fs.writeFileSync(myTournament.outputFile + "_toplist" + ".html", createHtmlTopListPage(myTournament));
    fs.writeFileSync(myTournament.outputFile + "_positions" + ".html", createHtmlPositionsPage(myTournament));
}

function createPreviewHtmlPage(tournament) {
    var header = "<!DOCTYPE html><meta charset=\"UTF-8\"><style>table { font-family: arial, sans-serif; border-collapse: collapse; width: 100%; } td, th { border: 1px solid #dddddd; text-align: left; padding: 8px; } </style><table><tr><th>Ottelu</th><th>Kotijoukkue</th><th>Vierasjoukkue</th><th>Aika</th><th>Tulos</th></tr>";
    var mainBody = createMainResultBody(tournament) + "</table>";
    var resultsBody = createTournamentPositionResults(tournament);
    var tableBody = [];
    tournament.games.forEach(function(g) {
	tableBody.push("<br><table><tr><th colspan=5>" + getTeamNameFromId(g.home) + " - " + getTeamNameFromId(g.guest) + "</th></tr><tr><th>Aika</th><th>Piste</th><th>Tyyppi</th><th>Maalintekijä</th><th>Syöttäjä</th></tr><tr><td></td><td></td><td></td><td></td><td></td></tr>");
	tableBody.push(createSubResultBody(g));
	tableBody.push("</table>");
    });
    var topListHeader = "<br><table>><tr><th colspan=2>Toplist</th></tr><tr><th>Pelaaja</th><th>Tehopisteet</th></tr><tr><td></td><td></td></tr>";
    return header + mainBody + resultsBody + tableBody.join().replace(/,/g, '') + topListHeader + createHtmlTopListBody(tournament) + "</html>"
}

function createHtmlMainResultsPage(tournament) {
    var header = "<!DOCTYPE html><meta charset=\"UTF-8\"><style>table { font-family: arial, sans-serif; border-collapse: collapse; width: 100%; } td, th { border: 1px solid #dddddd; text-align: left; padding: 8px; } tr:nth-child(even) { background-color: #dddddd; } </style><table><tr><th>Ottelu</th><th>Kotijoukkue</th><th>Vierasjoukkue</th><th>Aika</th><th>Tulos</th></tr>";
    var mainBody = createMainResultBody(tournament) + "</table>";
    var tailer = "</table></html>";
    return header + mainBody + tailer;
}

function createHtmlPositionsPage(tournament) {
    var header = "<!DOCTYPE html><meta charset=\"UTF-8\"><style>table { font-family: arial, sans-serif; border-collapse: collapse; width: 100%; } td, th { border: 1px solid #dddddd; text-align: left; padding: 8px; } </style>";
    mainBody = createTournamentPositionResults(tournament);
    var tailer = "</table></html>";
    return header + mainBody + tailer;
}

function createHtmlSubResultsPage(game) {
    var header = "<!DOCTYPE html><meta charset=\"UTF-8\"><style>table { font-family: arial, sans-serif; border-collapse: collapse; width: 100%; } td, th { border: 1px solid #dddddd; text-align: left; padding: 8px; } </style><table><tr><th colspan=5>" + getTeamNameFromId(game.home) + " - " + getTeamNameFromId(game.guest) + "</th></tr><tr><th>Aika</th><th>Piste</th><th>Tyyppi</th><th>Maalintekijä</th><th>Syöttäjä</th></tr><tr><td></td><td></td><td></td><td></td><td></td></tr>";
    var tailer = "</table></html>";
    return header + createSubResultBody(game) + tailer;
}

function createMainResultBody(tournament) {
    var tableBody = [];
    tournament.games.forEach(function(g) {
	var resultPageLink = "-"
	if(g.result !== "-") {
	    resultPageLink = "<a href=\"" + tournament.outputFile.substring(tournament.outputFile.lastIndexOf("/")+1) + "_" + g.round + ".html\">" +  g.result + "</a>";
	}
	tableBody.push("<tr><td>" + g.round + "</td><td>" + getTeamNameFromId(g.home) +
		       "</td><td>" + getTeamNameFromId(g.guest) + "</td><td>" + g.time +
		       "</td><td " + getGameScoresAsTooltip(g.scores) + " >" + resultPageLink + "</td></tr>")
    });
    return tableBody.join().replace(/,/g, '');
}

function createTournamentPositionResults(tournament) {
    var positions = [];
    tournament.games.forEach(function(g) {
	var flag = true;
	positions.forEach(function(p) { if(p.name === g.home) { flag = false; }});
	if (flag) {
	    positions.push( { name: g.home, wins: 0, evens: 0, loses: 0, scoresMade: 0, scoresLost: 0 } );
	}
    });
    positions.forEach(function(t) {
	tournament.games.forEach(function(g) {
	    if (t.name == g.home) {
		if((getScores(g.scores, g.home) !== 0) || (getScores(g.scores, g.guest) !== 0)) {
		    t.scoresMade += getScores(g.scores, g.home);
		    t.scoresLost += getScores(g.scores, g.guest);
		    if(getScores(g.scores, g.home) > getScores(g.scores, g.guest)) { t.wins++; }
		    if(getScores(g.scores, g.home) === getScores(g.scores, g.guest)) { t.evens++; }
		    if(getScores(g.scores, g.home) < getScores(g.scores, g.guest)) { t.loses++; }
		}
	    }
	    if (t.name == g.guest) {
		if((getScores(g.scores, g.home) !== 0) || (getScores(g.scores, g.guest) !== 0)) {
		    t.scoresMade += getScores(g.scores, g.guest);
		    t.scoresLost += getScores(g.scores, g.home);
		    if(getScores(g.scores, g.home) < getScores(g.scores, g.guest)) { t.wins++; }
		    if(getScores(g.scores, g.home) === getScores(g.scores, g.guest)) { t.evens++; }
		    if(getScores(g.scores, g.home) > getScores(g.scores, g.guest)) { t.loses++; }
		}
	    }
	});
    });
    positions.forEach(function(t) {
	t.difference = t.scoresMade - t.scoresLost;
    });
    sort("wins", positions);

    var tableHeader = "<br><table><tr><th colspan=7>SIJOITUS</th></tr><tr><th>Joukkue</th><th>V</th><th>H</th><th>T</th><th>TM</th><th>PM</th><th>ME</th></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>";

    var tableBody = [];
    positions.forEach(function(t) {
	tableBody.push("<tr><td>" + getTeamNameFromId(t.name) + "</td><td>" + t.wins + "</td><td>" + t.loses + "</td><td>" + t.evens +
		       "</td><td>" + t.scoresMade + "</td><td>" + t.scoresLost + "</td><td>" + t.difference + "</td></tr>");
    });
    return tableHeader + tableBody.join().replace(/,/g, '') + "</table>";
}

function getScores(scores, team) {
    if(scores.length === 0) return 0;
    return scores.map(function(a) {
	if(a.point === team) {
	    return 1;
	} else {
	    return 0;
	}
    }).reduce(function(a, b) {
	return a+b;
    });
}

function createSubResultBody(game) {
    var tableBody = [];
    game.scores.forEach(function(s) {
	var scorer = "";
	var passer = "";
	var row = "";
	if(s.type === "maali") {
	    if(s.scorer.name !== undefined) { scorer = s.scorer.name; }
	    if(s.passer.name !== undefined) { passer = s.passer.name; }
	    row = "Maali</td><td>" + scorer + "</td><td>" + passer;
	}
	if(s.type === "rankkari") {
	    if(s.scorer.name !== undefined) { scorer = s.scorer.name; }
	    row = "Rangaistuslaukaus</td><td>" + scorer + "</td><td>";
	}
	if(s.type === "omari") {
	    row = "Oma Maali" + "</td><td>" + "</td><td>";
	}
	tableBody.push("<tr><td>" + s.time + "</td><td>" + getTeamNameFromId(s.point) + "</td><td>" + row + "</td></tr>");
    });
    return tableBody.join().replace(/,/g, '');
}

function getGameScoresAsTooltip(scores) {
    return  "title = \"&#013;" + scores.map(function(s) {
	if(s.type === "maali") {
	    return s.time + " -- Maali: " + getTeamNameFromId(s.point) + "; score: " + s.scorer.name + "; pass: " + s.passer.name + "&#013;&#013;";
	}
	if(s.type === "rankkari") {
	    return s.time + " -- Rangaistuslaukaus: " + getTeamNameFromId(s.point) + "; score: " + s.scorer.name + "&#013;&#013;";
	}
	if(s.type === "omari") {
	    return s.time + " -- Oma Maali: " + getTeamNameFromId(s.point) + "&#013;&#013;";
	}
    }).filter(function(f) { return f; }).toString().replace(/,/g, '') + "&#013;\"";
}

function createHtmlTopListPage(tournament) {
    var header = "<!DOCTYPE html><meta charset=\"UTF-8\"><style>table { font-family: arial, sans-serif; border-collapse: collapse; width: 100%; } td, th { border: 1px solid #dddddd; text-align: left; padding: 8px; } </style><table><tr><th>Pelaaja</th><th>Tehopisteet</th></tr><tr><td></td><td></td></tr>";
    return header + createHtmlTopListBody(tournament) + "</table></html>";
}


function createHtmlTopListBody(tournament) {
    teams = datastorage.read("teams").teams;
    var allPlayers = [];
    teams.forEach(function(t) {
	t.players.forEach(function(p) {
	    allPlayers.push({ name: p.name, number: p.number, scores: 0, passes: 0, key: 0 });
	});
    });
    allPlayers.forEach(function(p) {
	tournament.games.forEach(function(g) {
	    g.scores.forEach(function(s) {
		if(p.name === s.passer.name) { p.passes++; p.key++; }
		if(p.name === s.scorer.name) { p.scores++; p.key+=10; }
	    }); 
	});
    });
    var topPlayers = allPlayers.filter(function(p) {
	if((p.passes > 0) || (p.scores > 0)) { return p; }
    });
    sort("key", topPlayers);
    var tableBody = [];
    topPlayers.forEach(function(p) {
	tableBody.push("<tr><td>" + p.name + "</td><td>" + p.scores + " + " + p.passes + "</td></tr>");
    });
    return tableBody.join().replace(/,/g, '');
}

var sort = function(prop, arr) {
    arr.sort(function(a, b) {
        if (a[prop] > b[prop]) {
            return -1;
        } else if (a[prop] < b[prop]) {
            return 1;
        } else {
            return 0;
        }
    });
};

function readUserData() {
    userData = datastorage.read("users");
    if(userData === false) {
	servicelog("User database read failed");
    } 
    return userData;
 }

function updateAdminDataFromClient(cookie, userData) {
    var userList = extractUserListFromInputData(userData);
    if(userList === null) {
	sendTournamentMainData(cookie);
	return;
    }

    var newUsers = [];
    var oldUsers = datastorage.read("users").users;

    userList.forEach(function(n) {
	var flag = true;
	oldUsers.forEach(function(u) {
	    if(n.username === u.username) {
		flag = false;
		n.password = u.password;
		newUsers.push(n);
	    }
	});
	if(flag) {
	    n.password = "";
	    newUsers.push(n);
	}
    });

    if(datastorage.write("users", { users: newUsers }) === false) {
	servicelog("User database write failed");
    } else {
	servicelog("Updated User database: " + JSON.stringify(newUsers));
    }
}

function updateMatchScoresFromClient(cookie, match, matchData) {
    var oldTournaments = datastorage.read("tournaments");
    var newTournaments = [];
    oldTournaments.tournaments.forEach(function(t) {
	if(t.id !== match.id) {
	    newTournaments.push(t);
	} else {
	    var tournament = { name: t.name,
			       id: t.id,
			       locked: t.locked,
			       outputFile: t.outputFile };
	    var newGames = [];
	    t.games.forEach(function(g) {
		if(g.round !== match.round) {
		    newGames.push(g);
		} else {
		    var newScores = extractMatchScoresFromInputData(matchData);
		    if(newScores === null) {
			sendTournamentMainData(cookie);
			return;
		    }

		    newGames.push({ round: match.round,
				    home: g.home,
				    guest: g.guest,
				    result: calculateResultFromScores(newScores, { home: g.home, guest:g.guest }),
				    scores: newScores,
				    time: g.time });
		}
	    });
	    tournament.games = newGames;
	    newTournaments.push(tournament);
	}
    });
    if(datastorage.write("tournaments", { nextId: oldTournaments.nextId, tournaments: newTournaments }) === false) {
	servicelog("Tournament database write failed");
    } else {
	createTournamentHtmlPages(getTournamentDataById(match.id));
	servicelog("Updated tournament database: " + JSON.stringify(newTournaments));
    }
}

function calculateResultFromScores(scores, teams) {
    var home = 0;
    var guest = 0;
    scores.forEach(function(s) {
	if(s.point === teams.home) { home++; }
	if(s.point === teams.guest) { guest++; }
    });
    return home + " - " + guest;
}

function getNewChallenge() {
    return ("challenge_" + sha1.hash(globalSalt + new Date().getTime().toString()) + "1");
}


// input data verification and formatters

function inputItemsFailVerification(inputData) {
    if(inputData.items === undefined) {
	servicelog("inputData does not contain items");
	return true;
    }
    if(inputData.buttonList === undefined) {
	servicelog("inputData does not contain buttonList");
	return true;
    }
    return false;
}

function extractGamesDataFromInputData(data) {
    if(inputItemsFailVerification(data)) {
	return null;
    }
    var games = [];
    var round = 1;
    data.items.forEach(function(i) {
	i.frame.forEach(function(g) {
	    games.push({ round: round++,
			 time: g[0][0].value,
			 home: getTeamIdFromName(g[1][0].selected),
			 guest: getTeamIdFromName(g[2][0].selected),
			 result: "-",
			 scores: [] });
	});
    });
    return games;
}

function extractTournamentsDataFromInputData(data) {
    if(inputItemsFailVerification(data)) {
	return null;
    }
    var tournaments = [];
    data.items.forEach(function(i) {
	i.frame.forEach(function(t) {
	    tournaments.push({ id: t[0][0].text,
			       name: t[1][0].value,
			       outputFile: t[2][0].value,
			       locked: t[3][0].checked });
	});
    });
    return tournaments;
}

function extractTeamsDataFromInputData(data) {
    if(inputItemsFailVerification(data)) {
	return null;
    }
    var teams = [];
    data.items.forEach(function(i) {
	i.frame.forEach(function(t) {
	    teams.push({ id: t[0][0].text,
			 name: t[1][0].value });
	});
    });
    return teams;
}

function extractSingleTeamDataFromInputData(data) {
    if(inputItemsFailVerification(data)) {
	return null;
    }
    var players = [];
    data.items.forEach(function(i) {
	i.frame.forEach(function(p) {
	    players.push({ name: p[0][0].value,
			   number: p[1][0].value });
	});
    });
    return players;
}

function extractMatchScoresFromInputData(data) {
    if(inputItemsFailVerification(data)) {
	return null;
    }
    var scores = [];
    data.items.forEach(function(i) {
	i.frame.forEach(function(m) {
	    var scorer = { name: m[3][0].selected.slice(0, m[3][0].selected.indexOf(' / ')),
			   number: m[3][0].selected.slice(m[3][0].selected.indexOf(' / ') + 3, m[3][0].selected.length) };
	    var passer = { name: m[4][0].selected.slice(0, m[4][0].selected.indexOf(' / ')),
			   number: m[4][0].selected.slice(m[4][0].selected.indexOf(' / ') + 3, m[4][0].selected.length) };
	    scores.push({ point: getTeamIdFromName(m[0][0].selected),
			  type: m[1][0].selected,
			  time: m[2][0].value,
			  scorer: scorer,
			  passer: passer });
	});
    });
    return scores;
}

function extractUserListFromInputData(data) {
    if(inputItemsFailVerification(data)) {
	return null;
    }
    var userList = [];
    data.items.forEach(function(i) {
	i.frame.forEach(function(u) {
	    var user = { applicationData: { priviliges: [] } };
	    u.forEach(function(row) {
		if(row.length === 1) {
		    if(row[0].key === "username") {
			if(row[0].text !== undefined) {
			    user.username = row[0].text;
			    user.hash = sha1.hash(row[0].text);
			}
			if(row[0].value !== undefined) {
			    user.username = row[0].value;
			    user.hash = sha1.hash(row[0].value);
			}
		    }
		    if(row[0].key === "realname") { user.realname = row[0].value; }
		    if(row[0].key === "email") { user.email = row[0].value; }
		    if(row[0].key === "phone") { user.phone = row[0].value; }
		} else {
	    	    row.forEach(function(item) {
			if(item.key === "view") {
			    if(item.checked) { user.applicationData.priviliges.push("view"); } }
			if(item.key === "score-edit") {
			    if(item.checked) { user.applicationData.priviliges.push("score-edit"); } }
			if(item.key === "team-edit") {
			    if(item.checked) { user.applicationData.priviliges.push("team-edit"); } }
			if(item.key === "tournament-edit") {
			    if(item.checked) { user.applicationData.priviliges.push("tournament-edit"); } }
			if(item.key === "system-admin") {
			    if(item.checked) { user.applicationData.priviliges.push("system-admin"); } }
		    });
		}
	    });
	    userList.push(user);
	});
    });
    return userList;
}


// privilige management

function getUserPriviliges(user) {
    if(user.applicationData.priviliges.length === 0) { return []; }
    if(user.applicationData.priviliges.indexOf("none") > -1) { return []; }
    return user.applicationData.priviliges;
}

function userHasSysAdminPrivilige(user) {
    if(user.applicationData.priviliges.length === 0) { return false; }
    if(user.applicationData.priviliges.indexOf("system-admin") < 0) { return false; }
    return true;
}

function userHasEditTournamentsPrivilige(user) {
    if(user.applicationData.priviliges.length === 0) { return false; }
    if(user.applicationData.priviliges.indexOf("tournament-edit") < 0) { return false; }
    return true;
}

function userHasEditTeamsPrivilige(user) {
    if(user.applicationData.priviliges.length === 0) { return false; }
    if(user.applicationData.priviliges.indexOf("team-edit") < 0) { return false; }
    return true;
}

function userHasEditScoresPrivilige(user) {
    if(user.applicationData.priviliges.length === 0) { return false; }
    if(user.applicationData.priviliges.indexOf("score-edit") < 0) { return false; }
    return true;
}

function userHasViewPrivilige(user) {
    if(user.applicationData.priviliges.length === 0) { return false; }
    if(user.applicationData.priviliges.indexOf("view") < 0) { return false; }
    return true;
}

function getUserByUserName(username) {
    return readUserData().users.filter(function(u) {
	return u.username === username;
    });
}

function getUserByHashedName(hash) {
    return readUserData().users.filter(function(u) {
	return u.hash === hash;
    });
}


// database conversion and update

function updateDatabaseVersionTo_1() {
    var newTeams = [];
    var nextId = 1;
    datastorage.read("teams").teams.forEach(function(t) {
	newTeams.push({ id: nextId++,
			name: t.name,
			players: t.players });
    });
    if(datastorage.write("teams", { nextId: nextId, teams: newTeams }) === false) {
	servicelog("Updated teams database write failed");
	process.exit(1);
    } else {
	servicelog("Updated teams database to v.1");
    }
    var newTournaments = [];
    var nextId = 1;
    datastorage.read("tournaments").tournaments.forEach(function(t) {
	var newGames = [];
	t.games.forEach(function(g) {
	    var newScores = [];
	    g.scores.forEach(function(s) {
		newScores.push({ point: getTeamIdFromName(s.point),
				 type: s.type,
				 time: s.time,
				 scorer: s.scorer,
				 passer: s.passer });
	    });
	    newGames.push({ round: g.round,
			    home: getTeamIdFromName(g.home),
			    guest: getTeamIdFromName(g.guest),
			    result: g.result,
			    time: g.time,
			    scores: newScores });
	});
	newTournaments.push({ id: nextId++,
			      name: t.name,
			      locked: t.locked,
			      outputFile: t.outputFile,
			      games: newGames });
    });
    if(datastorage.write("tournaments", { nextId: nextId, tournaments: newTournaments }) === false) {
	servicelog("Updated tournaments database write failed");
	process.exit(1);
    } else {
	servicelog("Updated tournaments database to v.1");
    }
    mainConfig.version = DatabaseVersion;
    if(datastorage.write("main", { main: mainConfig }) === false) {
	servicelog("Updated main database write failed");
	process.exit(1);
    } else {
	servicelog("Updated main database to v.1");
    }
}


// datastorage.setLogger(servicelog);
datastorage.initialize("main", { main: { version: DatabaseVersion,
					 port: 8080,
					 siteFullUrl: "http://url.to.pantterilasku/" } });
datastorage.initialize("users", { users: [ { username: "test",
					     hash: "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3",
					     password: "7e58f6bee079ce2b5c34b23cd340f2105d0e14e2",
					     applicationData: {
						 priviliges: ["none"]
					     },
					     realname: "",
					     email: "",
					     phone: "" } ] }, true);
datastorage.initialize("tournaments", { nextId: 1,
					tournaments: [ ] }, true);
datastorage.initialize("teams", { nextId: 1,
				  teams: [ ] }, true);

var mainConfig = datastorage.read("main").main;

if(mainConfig.version === undefined) { mainConfig.version = 0; }
if(mainConfig.version > DatabaseVersion) {
    servicelog("Database version is too high for this program release, please update program.");
    process.exit(1);
}
if(mainConfig.version < DatabaseVersion) {
    servicelog("Updating database version to most recent supported by this program release.");
    if(mainConfig.version === 0) {
	// update database version from 0 to 1
	updateDatabaseVersionTo_1();
    }
}

webServer.listen(mainConfig.port, function() {
    servicelog("Waiting for client connection to port " + mainConfig.port + "...");
});


