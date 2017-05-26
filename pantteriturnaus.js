var websocket = require("websocket");
var http = require("http");
var fs = require("fs");
var path = require("path");
var Aes = require('./crypto/aes.js');
Aes.Ctr = require('./crypto/aes-ctr.js');
var sha1 = require('./crypto/sha1.js');
var datastorage = require('./datastorage/datastorage.js');

var globalSalt = sha1.hash(JSON.stringify(new Date().getTime()));

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
    var cipherSendable = { type: sendable.type,
			   content: Aes.Ctr.encrypt(JSON.stringify(sendable.content),
						    cookie.aesKey, 128) };
    cookie.connection.send(JSON.stringify(cipherSendable));
}

function getClientVariables() {
    return "var WEBSOCK_PORT = " + mainConfig.main.port + ";\n";
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
	    if((type === "saveTournamentData") &&
	       stateIs(cookie, "loggedIn")) { processSaveTournamentData(cookie, content); }
	    if((type === "adminMode") &&
	       stateIs(cookie, "loggedIn")) { processAdminMode(cookie, content); }
	    if((type === "saveAdminData") &&
	       stateIs(cookie, "loggedIn")) { processSaveAdminData(cookie, content); }
	    if((type === "saveTeamData") &&
	       stateIs(cookie, "loggedIn")) { processSaveTeamData(cookie, content); }
	    if((type === "resetToMain") &&
	       stateIs(cookie, "loggedIn")) { processResetToMainState(cookie, content); }

	}
    });

    connection.on('close', function(connection) {
	servicelog("Client #" + cookie.count  + " disconnected");
        cookie = {};
    });
});

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
	    servicelog("plainChallenge:   " + plainChallenge);
	    cookie.challenge = JSON.stringify(plainChallenge);
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
	    sendable = { type: "unpriviligedLogin",
			 content: "" };
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

function processSaveTournamentData(cookie, content) {
    var sendable;
    var tournamentData = JSON.parse(Aes.Ctr.decrypt(content, cookie.user.password, 128));
    servicelog("Client #" + cookie.count + " requests tournament saving: " + JSON.stringify(tournamentData.tournament));
    if(userHasEditTournamentPrivilige(cookie.user)) {
	updateTournamentFromClient(cookie, { tournament: tournamentData.tournament.tournament });
    } else {
	servicelog("user has insufficent priviliges to edit tournament tables");
    }
    sendTournamentMainData(cookie);
}

function processAdminMode(cookie, content) {
    servicelog("Client #" + cookie.count + " requests Sytem Administration priviliges");
    if(userHasSysAdminPrivilige(cookie.user)) {
	servicelog("Granted Sytem Administration priviliges to user " + cookie.user.username);
	sendable = { type: "adminData",
		     content: createAdminData(cookie) };
	sendCipherTextToClient(cookie, sendable);
	servicelog("Sent adminData to client #" + cookie.count);
    } else {
	servicelog("user " + cookie.user.username + " does not have Sytem Administration priviliges!");
	processClientStarted(cookie);
    }	
}

function processSaveAdminData(cookie, content) {
    var sendable;
    var adminData = JSON.parse(Aes.Ctr.decrypt(content, cookie.user.password, 128));
    servicelog("Client #" + cookie.count + " requests admin data saving: " + JSON.stringify(adminData));
    if(userHasSysAdminPrivilige(cookie.user)) {
	updateAdminDataFromClient(cookie, adminData);
	cookie.user = getUserByUserName(cookie.user.username)[0];
    } else {
	servicelog("user has insufficent priviliges to edit admin data");
    }
    sendTournamentMainData(cookie);
}

function processSaveTeamData(cookie, content) {
    var sendable;
    var teamData = JSON.parse(Aes.Ctr.decrypt(content, cookie.user.password, 128));
    servicelog("Client #" + cookie.count + " requests team data saving: " + JSON.stringify(teamData));
    if(userHasEditTeamsPrivilige(cookie.user)) {
	updateTeamDataFromClient(cookie, teamData);
    } else {
	servicelog("user has insufficent priviliges to edit team data");
    }
    sendTournamentMainData(cookie);
}

function processResetToMainState(cookie, content) {
    servicelog("User session reset to main state");
    sendTournamentMainData(cookie);
}


/**********/

function sendTournamentMainData(cookie) {
    var sendable = { type: "tournamentMainData",
		     content: { user: cookie.user.username,
				priviliges: cookie.user.applicationData.priviliges,
				tournament: datastorage.read("tournament").tournament,
				teams: datastorage.read("teams").teams}};
    sendCipherTextToClient(cookie, sendable);
    servicelog("Sent tournamentMainData to client #" + cookie.count);
}

function updateTournamentFromClient(cookie, tournament) {
    var tournamentData = datastorage.read("tournament");

    servicelog("Existing tournament:  " + JSON.stringify(tournamentData));
    servicelog("Replacing tournament: " + JSON.stringify(tournament));

    if(datastorage.write("tournament", tournament) === false) {
	servicelog("Tournament database write failed");
    } else {
	createHtmlresultsPage(tournament);
	servicelog("Updated tournament database with new tournament data");
    }
}

function createHtmlresultsPage(tournament) {
    
    var header = "<!DOCTYPE html><html><style>table { font-family: arial, sans-serif; border-collapse: collapse; width: 100%; } td, th { border: 1px solid #dddddd; text-align: left; padding: 8px; } tr:nth-child(even) { background-color: #dddddd; } </style><table><tr><th>Ottelu</th><th>Kotijoukkue</th><th>Vierasjoukkue</th><th>Aika</th><th>Tulos</th></tr>";
    var tailer = "</table></html>";

    var tableBody = [];
    tournament.tournament.forEach(function(t){
	tableBody.push("<tr><td>" + t.round + "</td><td>" + t.home + "</td><td>" + t.guest + "</td><td>" + t.time + "</td><td>" + t.result + "</td></tr>")
    });
    
    fs.writeFileSync("./results.html", header + tableBody + tailer);
}

function readUserData() {
    userData = datastorage.read("users");
    if(userData === false) {
	servicelog("User database read failed");
    } 
    return userData;
 }

function updateAdminDataFromClient(cookie, adminData) {
    if(datastorage.write("users", { users: adminData.users }) === false) {
	servicelog("User database write failed");
    } else {
	servicelog("Updated User database: " + JSON.stringify(adminData.users));
    }
}

function updateTeamDataFromClient(cookie, teamData) {
    if(datastorage.write("teams", { teams: teamData.teams }) === false) {
	servicelog("User database write failed");
    } else {
	servicelog("Updated User database: " + JSON.stringify(teamData.teams));
    }
}

function getNewChallenge() {
    return ("challenge_" + sha1.hash(globalSalt + new Date().getTime().toString()) + "1");
}

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

function userHasEditTournamentPrivilige(user) {
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

function createAdminData(cookie) {
    return { users: datastorage.read("users").users };
}

// datastorage.setLogger(servicelog);
datastorage.initialize("main", { main: { port: 8080,
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
datastorage.initialize("tournament", { tournament: [ {round: 1,
						      home: "team1",
						      guest: "team2",
						      time: "10:00 - 10:45",
						      result: "-",
						      scores: [] } ] }, true);
datastorage.initialize("teams", { teams: [ { name: "team1",
					     players: [ { name: "player1",
							  number: "1"} ] },
					   { name: "team2",
					     players: [ { name: "player2",
							  number: "2"} ] } ] }, true);

var mainConfig = datastorage.read("main");

webServer.listen(mainConfig.main.port, function() {
    servicelog("Waiting for client connection to port " + mainConfig.main.port + "...");
});

