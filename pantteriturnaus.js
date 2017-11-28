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

	    if((type === "getTournamentDataForShow") &&
	       stateIs(cookie, "loggedIn")) { processTournamentDataShow(cookie, content); }
	    if((type === "getAllTournamentsDataForEdit") &&
	       stateIs(cookie, "loggedIn")) { processAllTournamentsDataEdit(cookie, content); }
	    if((type === "getOneTournamentScoresForEdit") &&
	       stateIs(cookie, "loggedIn")) { processOneTournamentScoresEdit(cookie, content); }
	    if((type === "getTournamentDataForEditByName") &&
	       stateIs(cookie, "loggedIn")) { processTournamentDataEditByName(cookie, content); }
	    if((type === "getTeamsDataForEdit") &&
	       stateIs(cookie, "loggedIn")) { processTeamsDataEdit(cookie, content); }
	    if((type === "saveTournamentData") &&
	       stateIs(cookie, "loggedIn")) { processSaveTournamentData(cookie, content); }
	    if((type === "saveAllTournamentsData") &&
	       stateIs(cookie, "loggedIn")) { processSaveAllTournamentsData(cookie, content); }
	    if((type === "saveTournamentGameData") &&
	       stateIs(cookie, "loggedIn")) { processSaveTournamentGameData(cookie, content); }
	    if((type === "gainAdminMode") &&
	       stateIs(cookie, "loggedIn")) { processGainAdminMode(cookie, content); }
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

function processTournamentDataShow(cookie, content) {
    var sendable;
    var data = JSON.parse(Aes.Ctr.decrypt(content, cookie.user.password, 128));
    try {
	var tournamentName = data.inputData.itemList.items.map(function(d) {
	    if(d[1].id===data.buttonId) {
		return d[0].text;
	    }
	}).filter(function(f){return f})[0];
    } catch(err) {
	servicelog("Cannot parse tournament name: " + err);
	return;
    }
    servicelog("Client #" + cookie.count + " requests tournament show: " + tournamentName);
    if(userHasViewPrivilige(cookie.user)) {	
	var tournmentWebPage = new Buffer(createPreviewHtmlPage(getTournamentDataByName(tournamentName)));
	sendable = { type: "showTournament",
		     content: tournmentWebPage.toString("base64") };
	sendCipherTextToClient(cookie, sendable);
	servicelog("sent tournament html view to client");
    } else {
	servicelog("user has insufficent priviliges to view tournament");
    }
}

function processAllTournamentsDataEdit(cookie, content) {
    var sendable;
    servicelog("Client #" + cookie.count + " requests all tournaments edit ");
    if(userHasEditTournamentsPrivilige(cookie.user)) {
	var tournaments = datastorage.read("tournaments").tournaments.map(function(t) {
	    return { name: t.name, locked: t.locked, outputFile: t.outputFile };
	});
	sendable = { type: "editAllTournaments",
		     content: { user: cookie.user.username,
				priviliges: cookie.user.applicationData.priviliges,
				tournaments: tournaments } };
	sendCipherTextToClient(cookie, sendable);
	servicelog("Sent editAllTournaments to client #" + cookie.count);
    } else {
	servicelog("user has insufficent priviliges to edit all tournaments");
    }
}

function processOneTournamentScoresEdit(cookie, content) {
    var sendable;
    var data = JSON.parse(Aes.Ctr.decrypt(content, cookie.user.password, 128));
    try {
	var tournamentName = data.inputData.itemList.items.map(function(d) {
	    if(d[2].id===data.buttonId) {
		return d[0].text;
	    }
	}).filter(function(f){return f})[0];
    } catch(err) {
	servicelog("Cannot parse tournament name: " + err);
	return;
    }
    servicelog("Client #" + cookie.count + " requests tournament scores edit: " + tournamentName);
    if(userHasEditScoresPrivilige(cookie.user)) {
	sendOneTournamentForScoresEdit(cookie, getTournamentDataByName(tournamentName));
    } else {
	servicelog("user has insufficent priviliges to edit tournament scores");
    }
}

function processTournamentDataEditByName(cookie, content) {
    var sendable;
    var tournamentName = JSON.parse(Aes.Ctr.decrypt(content, cookie.user.password, 128)).name;
    servicelog("Client #" + cookie.count + " requests tournament edit: " + JSON.stringify(tournamentName));
    if(userHasEditTournamentsPrivilige(cookie.user)) {
	var t = getTournamentDataByName(tournamentName);
	sendable = { type: "editOneTournamentData",
		     content: { user: cookie.user.username,
				priviliges: cookie.user.applicationData.priviliges,
				tournament: { name: t.name, locked: t.locked, games: t.games },
				teams: datastorage.read("teams").teams } };
	sendCipherTextToClient(cookie, sendable);
    } else {
	servicelog("user has insufficent priviliges to edit tournament data");
    }
}

function processTeamsDataEdit(cookie, content) {
    var sendable;
    servicelog("Client #" + cookie.count + " requests teams edit");
    if(userHasEditTeamsPrivilige(cookie.user)) {
	sendable = { type: "editTeams",
		     content: { teams: datastorage.read("teams").teams } };
	sendCipherTextToClient(cookie, sendable);
    } else {
	servicelog("user has insufficent priviliges to edit teams");
    }
}

function processSaveTournamentData(cookie, content) {
    var sendable;
    var tournamentData = JSON.parse(Aes.Ctr.decrypt(content, cookie.user.password, 128));
    servicelog("Client #" + cookie.count + " requests tournament saving: " + JSON.stringify(tournamentData));
    if(getTournamentDataByName(tournamentData.name).locked === true) {
	servicelog("tournament " + tournamentData.name + " is locked from updates");
    } else {
	if(userHasEditScoresPrivilige(cookie.user)) {
	    updateTournamentFromClient(cookie, tournamentData);
	} else {
	    servicelog("user has insufficent priviliges to edit tournament tables");
	}
    }
    sendTournamentMainData(cookie);
}

function processSaveAllTournamentsData(cookie, content) {
    var sendable;
    var tournamentsData = JSON.parse(Aes.Ctr.decrypt(content, cookie.user.password, 128));
    servicelog("Client #" + cookie.count + " requests all tournaments saving: " + JSON.stringify(tournamentsData));
    if(userHasEditTournamentsPrivilige(cookie.user)) {
	updateAllTournamentsFromClient(cookie, tournamentsData);
    } else {
	servicelog("user has insufficent priviliges to edit all tournaments");
    }
    sendTournamentMainData(cookie);
}

function processSaveTournamentGameData(cookie, content) {
    var sendable;
    var tournamentData = JSON.parse(Aes.Ctr.decrypt(content, cookie.user.password, 128));
    servicelog("Client #" + cookie.count + " requests tournament games saving: " + JSON.stringify(tournamentData));
    if(userHasEditTournamentsPrivilige(cookie.user)) {
	updateSingleTournamentFromClient(cookie, tournamentData);
    } else {
	servicelog("user has insufficent priviliges to edit tournament games");
    }
    sendTournamentMainData(cookie);
}

function processGainAdminMode(cookie, content) {
    servicelog("Client #" + cookie.count + " requests Sytem Administration priviliges");
    if(userHasSysAdminPrivilige(cookie.user)) {
	servicelog("Granting Sytem Administration priviliges to user " + cookie.user.username);
	var sendable;
	var topButtonList =  createTopButtonList(cookie);

	var items = [];
	datastorage.read("users").users.forEach(function(u) {
	    items.push([ [ createUiTextNode(u.username) ],
			 [ createUiTextArea(u.realname, 25) ],
			 [ createUiTextArea(u.email, 30) ],
			 [ createUiTextArea(u.phone, 15) ],
			 [ createUiCheckBox(userHasViewPrivilige(u), "view"),
			     createUiCheckBox(userHasEditScoresPrivilige(u), "view"),
			     createUiCheckBox(userHasEditTeamsPrivilige(u), "teams"),
			     createUiCheckBox(userHasEditTournamentsPrivilige(u), "tournements"),
			     createUiCheckBox(userHasSysAdminPrivilige(u), "admin") ] ] )
	});

	var itemList = { title: "User Admin Data",
			 header: [ { text: "username" }, { text: "realname" }, { text: "email" },
				   { text: "phone" }, { text: "V / S / Te / To / A" } ],
			 items: items,
			 newItem: [ [ createUiTextArea("<username>") ],
				    [ createUiTextArea("<realname>", 25) ],
				    [ createUiTextArea("<email>", 30) ],
				    [ createUiTextArea("<phone>", 15) ],
				    [ createUiCheckBox(false, "view"), createUiCheckBox(false, "scores"),
				      createUiCheckBox(false, "teams"), createUiCheckBox(false, "tournaments"),
				      createUiCheckBox(false, "admin") ] ] };

	sendable = { type: "createGenericEditFrame",
		     content: { user: cookie.user.username,
				priviliges: cookie.user.applicationData.priviliges,
				topButtonList: topButtonList,
				itemList: itemList,
				buttonList: [ { id: 501, text: "OK", callbackMessage: "hilipatipippan" } ] } };

	sendCipherTextToClient(cookie, sendable);
	servicelog("Sent NEW adminData to client #" + cookie.count);

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

function createUiTextNode(text) {
    return { itemType: "textnode", text: text };
}

function createUiTextArea(value, cols, rows) {
    if(cols === undefined) { cols = 10; }
    if(rows === undefined) { rows = 1; }
    return { itemType: "textarea", value: value, cols: cols, rows: rows };
}

function createUiCheckBox(checked, title) {
    if(title === undefined) { title = ""; }
    return { itemType: "checkbox", checked: checked, title: title };
}

function createUiSelectionList(list, selected) {
    var listItems = list.map(function(i) {
	return { text: i, item: i }
    }).filter(function(f) { return f; });

    return { itemType: "selection", list: listItems, selected: selected };
}

function createUiButton(text, callbackMessage) {
    return { itemType: "button", text: text, callbackMessage: callbackMessage };
}


/**********/

function getTournamentDataByName(name) {
    return datastorage.read("tournaments").tournaments.map(function(t) {
	if(t.name === name) { return t;}
    }).filter(function(f){return f;})[0];
}

function createTopButtonList(cookie) {
    var topButtonList = [ { id: 101, text: "Kirjaudu Ulos", callbackMessage: "clientStarted" } ];
    if(userHasEditTeamsPrivilige(cookie.user)) {
	topButtonList.push( { id: 102, text: "Muokkaa Joukkueita", callbackMessage: "getTeamsDataForEdit" } );
    }
    if(userHasEditTournamentsPrivilige(cookie.user)) {
	topButtonList.push( { id: 103, text: "Muokkaa Turnauksia", callbackMessage: "getTournamentsDataForEdit" } );
    }
    if(userHasSysAdminPrivilige(cookie.user)) {
	topButtonList.push( { id: 104, text: "Admin Mode", callbackMessage: "gainAdminMode" } );
    }
    return topButtonList;
}

function sendTournamentMainData(cookie) {
    var sendable;
    var topButtonList =  createTopButtonList(cookie);

    var tournaments = datastorage.read("tournaments").tournaments.map(function(t) {
	return { name: t.name, locked: t.locked };
    });

    var items = [];
    tournaments.forEach(function(t) {
	items.push( [ [ createUiTextNode(t.name) ],
		      [ createUiButton("Tulokset", "getTournamentDataForShow") ],
		      [ createUiButton("Muokkaa", "getOneTournamentScoresForEdit") ] ] );
    });

    var itemList = { title: "Tournament",
		     header: [ { text: "" }, { text: "" }, { text: "" } ],
		     items: items };

    sendable = { type: "createGenericListFrame",
		 content: { user: cookie.user.username,
			    priviliges: cookie.user.applicationData.priviliges,
			    topButtonList: topButtonList,
			    itemList: itemList } };

    sendCipherTextToClient(cookie, sendable);
    servicelog("Sent NEW tournamentMainData to client #" + cookie.count);
}

function sendOneTournamentForScoresEdit(cookie, tournament) {
    var sendable;
    var topButtonList =  createTopButtonList(cookie);

    console.log(JSON.stringify(tournament));

    var items = [];
    tournament.games.forEach(function(t) {
	items.push( [ [ createUiTextNode(t.time) ],
		      [ createUiTextNode(t.home) ],
		      [ createUiTextNode(t.guest) ],
		      [ createUiTextNode(t.result) ],
		      [ createUiButton("Muokkaa", "getOneMatchScoresForEdit") ] ] );
    });

    var itemList = { title: tournament.name,
		     header: [ { text: "Aika" }, { text: "Koti" }, { text: "Vieras" },
			       { text: "Tulos" }, {text: ""} ],
		     items: items };

    var buttonList =  [ { id: 501, text: "OK", callbackMessage: "sendOkMessage" },
			{ id: 502, text: "Cancel", callbackMessage: "resetToMain" } ];

    sendable = { type: "createGenericListFrame",
		 content: { user: cookie.user.username,
			    priviliges: cookie.user.applicationData.priviliges,
			    topButtonList: topButtonList,
			    itemList: itemList,
			    buttonList: buttonList } };
			    
    sendCipherTextToClient(cookie, sendable);
    servicelog("Sent NEW editTournamentScores to client #" + cookie.count);
}

function updateTournamentFromClient(cookie, tournament) {
    var tournamentData = datastorage.read("tournaments");
    var myTournament = getTournamentDataByName(tournament.name)

    myTournament.games = tournament.games;
    var newTournaments = tournamentData.tournaments.map(function(t) {
	if(t.name !== tournament.name) { return t; }
    }).filter(function(f) { return f; });
    newTournaments.push(myTournament);

    if(datastorage.write("tournaments", { tournaments: newTournaments }) === false) {
	servicelog("Tournament database write failed");
    } else {
	createTournamentHtmlPages(myTournament);
	servicelog("Updated tournament database with new tournament data");
    }
}

function updateAllTournamentsFromClient(cookie, tournamentsData) {
    var tournaments = datastorage.read("tournaments").tournaments;
    var newTournaments = [];

    tournamentsData.forEach(function(t) {
	var flag = true;
	tournaments.forEach(function(u) {
	    if(u.name === t.name) {
		flag = false;
		u.locked = t.locked;
		u.outputFile = t.outputFile;
		newTournaments.push(u);
	    }
	});
	if (flag) {
	    t.games = [];
	    t.outputFile = "";
	    newTournaments.push(t);
	}
    });

    if(datastorage.write("tournaments", { tournaments: newTournaments }) === false) {
	servicelog("Tournament database write failed");
    } else {
	servicelog("Updated tournament database with new tournament data");
    }
}

function updateSingleTournamentFromClient(cookie, tournamentData) {
    var tournaments = datastorage.read("tournaments").tournaments;

    var newTournaments = tournaments.map(function(t) {
	if(t.name !== tournamentData.name) { return t; }
    }).filter(function(f) { return f; });
    newTournaments.push(tournamentData);

    if(datastorage.write("tournaments", { tournaments: newTournaments }) === false) {
	servicelog("Tournament database write failed");
    } else {
	servicelog("Updated tournament database with new tournament data");
    }
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
	tableBody.push("<br><table><tr><th colspan=5>" + g.home + " - " + g.guest  + "</th></tr><tr><th>Aika</th><th>Piste</th><th>Tyyppi</th><th>Maalintekijä</th><th>Syöttäjä</th></tr><tr><td></td><td></td><td></td><td></td><td></td></tr>");
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
    var header = "<!DOCTYPE html><meta charset=\"UTF-8\"><style>table { font-family: arial, sans-serif; border-collapse: collapse; width: 100%; } td, th { border: 1px solid #dddddd; text-align: left; padding: 8px; } </style><table><tr><th colspan=5>" + game.home + " - " + game.guest  + "</th></tr><tr><th>Aika</th><th>Piste</th><th>Tyyppi</th><th>Maalintekijä</th><th>Syöttäjä</th></tr><tr><td></td><td></td><td></td><td></td><td></td></tr>";
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
	tableBody.push("<tr><td>" + g.round + "</td><td>" + g.home +
		       "</td><td>" + g.guest + "</td><td>" + g.time +
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
	tableBody.push("<tr><td>" + t.name + "</td><td>" + t.wins + "</td><td>" + t.loses + "</td><td>" + t.evens +
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
	    row = "Rangaistuspotku</td><td>" + scorer + "</td><td>";
	}
	if(s.type === "omari") {
	    row = "Oma Maali" + "</td><td>" + "</td><td>";
	}
	tableBody.push("<tr><td>" + s.time + "</td><td>" + s.point + "</td><td>" + row + "</td></tr>");
    });
    return tableBody.join().replace(/,/g, '');
}

function getGameScoresAsTooltip(scores) {
    return  "title = \"&#013;" + scores.map(function(s) {
	if(s.type === "maali") {
	    return s.time + " -- Maali: " + s.point + "; score: " + s.scorer.name + "; pass: " + s.passer.name + "&#013;&#013;";
	}
	if(s.type === "rankkari") {
	    return s.time + " -- Rangaistuspotku: " + s.point + "; score: " + s.scorer.name + "&#013;&#013;";
	}
	if(s.type === "omari") {
	    return s.time + " -- Oma Maali: " + s.point + "&#013;&#013;";
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
datastorage.initialize("tournaments", { tournaments: [ { name: "Panthers Cup 2017",
							 locked: false,
							 outputFile: "./panthescup2017",
							 games: [ { round: 1,
								    home: "team1",
								    guest: "team2",
								    time: "10:00 - 10:45",
								    result: "-",
								    scores: [] } ] } ] }, true);
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


