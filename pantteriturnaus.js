var framework = require("./framework/framework.js");
var fs = require("fs");
var datastorage = require("./datastorage/datastorage.js");
var pdfprinter = require("./pdfprinter.js");

var databaseVersion = 7;


// Application specific part starts from here

function handleApplicationMessage(cookie, decryptedMessage) {
    if(decryptedMessage.type === "getTournamentDataForShow") {
	processGetTournamentDataForShow(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "getOneTournamentScoresForEdit") {
        processGetOneTournamentScoresForEdit(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "getTournamentsDataForEdit") {
	processGetTournamentsDataForEdit(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "saveAllTournamentsData") {
	processSaveAllTournamentsData(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "getSingleTournamentForEdit") {
	processGetSingleTournamentForEdit(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "saveTournamentGameData") {
	processSaveTournamentGameData(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "getPlayersDataForEdit") {
	processGetPlayersDataForEdit(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "getTeamsDataForEdit") {
	processGetTeamsDataForEdit(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "updateFinalistTeams") {
	processUpdateFinalistTeams(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "resetToMain") {
	processResetToMainState(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "getOneMatchScoresForEdit") {
	processGetOneMatchScoresForEdit(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "saveMatchScores") {
	processSaveMatchScores(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "saveMatchScoresAndReturn") {
	processSaveMatchScoresAndReturn(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "saveAllPlayersData") {
	processSaveAllPlayersData(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "saveAllTeamsData") {
	processSaveAllTeamsData(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "getSingleTeamForEdit") {
	processGetSingleTeamForEdit(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "saveSingleTeamData") {
	processSaveSingleTeamData(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "getTournamentMainHelp") {
	processGetTournamentMainHelp(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "getAllTournamentsEditHelp") {
	processGetAllTournamentsEditHelp(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "commandGetPlayerList") {
	processCommandGetPlayerList(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "commandAddPlayerToList") {
	processCommandAddPlayerToList(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "commandDeletePlayerFromList") {
	processCommandDeletePlayerFromList(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "commandModifyPlayerInList") {
	processCommandModifyPlayerInList(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "commandGetTeamList") {
	processCommandGetTeamList(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "commandListSingleTeam") {
	processCommandListSingleTeam(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "commandAddTeamPlayer") {
	processCommandAddTeamPlayer(cookie, decryptedMessage.content); }
    if(decryptedMessage.type === "commandDeleteTeamPlayer") {
	processCommandDeleteTeamPlayer(cookie, decryptedMessage.content); }
}


// helpers

function getAllTournamentData() {
    var allTournaments = [];
    datastorage.read("tournaments").tournaments.forEach(function(t) {
	allTournaments.push(datastorage.read(t).tournament);
    });
    return allTournaments;
}

function getTournamentDataById(id) {
    if(datastorage.read("tournaments").tournaments.map(function(t) {
	if(parseInt(t.split("_")[1]) === id) { return true;}
    }).filter(function(f){return f;})[0] === true) {
	return datastorage.read("tournament_" + id).tournament;
    } else {
	return false;
    }
}

function getMatchDataById(id, round) {
    var match = getTournamentDataById(id).games.map(function(t) {
	if(t.round === round) { return t;}
    }).filter(function(f){return f;})[0];
    match.id = { id: id, round: round };
    return match;
}

function getTeamIdFromNameInIdList(name, teamIdList) {
    var id = [];
    datastorage.read("teams").teams.forEach(function(t) {
	teamIdList.forEach(function(l) {
	    if((t.id === l) && (t.name === name)) { id.push(t.id); }
	});
    });
    return id[0];
}

function getTeamIdFromName(name, teams) {
    var id = datastorage.read("teams").teams.map(function(t) {
	if(t.name === name) { return t.id; }
    }).filter(function(f) { return f; })[0];
    return id;
}

function getTeamIdFromTag(tag) {
    var id = datastorage.read("teams").teams.map(function(t) {
	if(t.tag === tag) { return t.id; }
    }).filter(function(f) { return f; })[0];
    return id;
}

function getTeamNameById(id) {
    var team = getTeamById(id);
    if(team !== null) { return team.name; }
    else { return "-"; }
}

function getTeamTagById(id) {
    var team = getTeamById(id);
    if(team !== null) { return team.tag; }
    else { return "-"; }
}

function getAllTeamsTagList() {
    var teams = [];
    datastorage.read("teams").teams.forEach(function(t) {
	teams.push(t.tag);
    });
    return teams;
}

function getPlayerIdByName(name) {
    var id = datastorage.read("players").players.map(function(p) {
	if(p.name === name) { return p.id; }
    }).filter(function(f) { return f; })[0];
    if(id === undefined) { return ""; }
    else { return id; }
}

function getPlayerIdByNameAndNumber(name, number) {
    var id = datastorage.read("players").players.map(function(p) {
	if((p.name === name) && (p.number === number )) { return p.id; }
    }).filter(function(f) { return f; })[0];
    if(id === undefined) { return ""; }
    else { return id; }
}

function getPlayerNameById(id) {
    var player = getPlayerById(id);
    if(player !== null) { return player.name; }
    else { return ""; }
}

function getPlayerNumberById(id) {
    var player = getPlayerById(id);
    if(player !== null) { return player.number; }
    else { return ""; }
}

function getTournamentTeamList(id) {
    var teams = [""];
    getTournamentDataById(id).games.forEach(function(g) {
	teams.push(g.home);
	teams.push(g.guest);
    });
    return teams.filter(function(elem, pos) {
	return teams.indexOf(elem) === pos;
    }).filter(function(f) {
	return f;
    }).map(function(t) {
	return getTeamNameById(t);
    });
}

function getTeamPlayers(id) {
    var players = datastorage.read("players").players;
    var playerList = [];
    datastorage.read("teams").teams.forEach(function(t) {
	if(t.id === id) {
	    t.players.forEach(function(p) {
		players.forEach(function(r) {
		    if(r.id === p) { playerList.push(r); }
		});
	    });
	}
    });
    return playerList;
}

function getTeamById(id) {
    var team = datastorage.read("teams").teams.map(function(t) {
	if(t.id === id) { return t; }
    }).filter(function(f) { return f; })[0];
    if(team  === undefined) { return null; }
    else { return team; }
}

function getPlayerById(id) {
    var player = datastorage.read("players").players.map(function(p) {
	if(p.id === id) { return p; }
    }).filter(function(f) { return f; })[0];
    if(player === undefined) { return null; }
    else { return player; }
}

// Administration UI panel requires application to provide needed priviliges

function createAdminPanelUserPriviliges() {
    return [ { privilige: "view", code: "v" },
	     { privilige: "score-edit", code: "se"},
	     { privilige: "team-view", code: "tv"},
	     { privilige: "team-edit", code: "te"},
	     { privilige: "team-delete", code: "td"},
	     { privilige: "player-view", code: "pv"},
	     { privilige: "player-edit", code: "pe"},
	     { privilige: "player-delete", code: "pd"},
	     { privilige: "tournament-edit", code: "to"} ];
}


// No default priviliges needed for self-created users.

function createDefaultPriviliges() {
    return [ ];
}


// Define the top button panel, always visible.
// The panel automatically contains "Logout" and "Admin Mode" buttons so no need to include those.

function createTopButtonList(cookie) {
    return [ { button: { text: "Muokkaa Pelaajia", callbackMessage: "getPlayersDataForEdit" },
	       priviliges: [ "player-view", "player-edit", "player-delete" ] },
	     { button: { text: "Muokkaa Joukkueita", callbackMessage: "getTeamsDataForEdit" },
	       priviliges: [ "team-view", "team-edit", "team-delete" ] },
	     { button: { text: "Muokkaa Turnauksia", callbackMessage: "getTournamentsDataForEdit" },
	       priviliges: [ "tournament-edit" ] } ];
}


// Main tournament UI panel, list of available tournaments

function processResetToMainState(cookie, content) {
    // this shows up the first UI panel when uses login succeeds or other panels send "OK" / "Cancel" 
    framework.servicelog("User session reset to main state");
    cookie.user = datastorage.read("users").users.filter(function(u) {
	return u.username === cookie.user.username;
    })[0];
    sendTournamentMainData(cookie);
}

function sendTournamentMainData(cookie) {
    var sendable;
    var topButtonList = framework.createTopButtons(cookie, [ { button: { text: "Help",
									 callbackMessage: "getTournamentMainHelp" } } ]);
    var tournaments = getAllTournamentData().map(function(t) {
	return { id: t.id, name: t.name, locked: t.locked };
    });
   
    var items = [];
    tournaments.forEach(function(t) {
	if(!framework.userHasPrivilige("score-edit", cookie.user)) { t.locked = true; }
	items.push( [ [ framework.createUiTextNode("name", t.name) ],
		      [ framework.createUiMessageButton("Tulokset", "getTournamentDataForShow", t.id, framework.userHasPrivilige("view", cookie.user)) ],
		      [ framework.createUiMessageButton("Muokkaa", "getOneTournamentScoresForEdit", t.id, !t.locked) ] ] );
    });

    var itemList = { title: "Tournament",
		     frameId: 0,
		     header: [ [ [ framework.createUiHtmlCell("", "") ],
				 [ framework.createUiHtmlCell("", "") ],
				 [ framework.createUiHtmlCell("", "") ] ] ],
		     items: items };

    var frameList = [ { frameType: "fixedListFrame", frame: itemList } ];

    sendable = { type: "createUiPage",
		 content: { topButtonList: topButtonList,
			    frameList: frameList } };

    framework.sendCipherTextToClient(cookie, sendable);
    framework.servicelog("Sent NEW tournamentMainData to client #" + cookie.count);
}

function processGetTournamentDataForShow(cookie, data) {
    var sendable;
    try {
	var tournamentId = data.buttonData;
    } catch(err) {
	framework.servicelog("Cannot parse tournament id: " + err);
	return;
    }
    framework.servicelog("Client #" + cookie.count + " requests tournament show: " + tournamentId);
    if(framework.userHasPrivilige("view", cookie.user)) {	
	var tournmentWebPage = createPreviewHtmlPage(getTournamentDataById(tournamentId));
	sendable = { type: "showHtmlPage",
		     content: tournmentWebPage.toString("ascii") };
	framework.sendCipherTextToClient(cookie, sendable);
	framework.servicelog("Sent tournament html view to client");
    } else {
	framework.servicelog("User " + cookie.user.username + " does not have priviliges to view tournament");
    }
}

function processGetOneTournamentScoresForEdit(cookie, data) {
    try {
	var tournamentId = data.buttonData;
    } catch(err) {
	framework.servicelog("Cannot parse tournament id: " + err);
	return;
    }
    framework.servicelog("Client #" + cookie.count + " requests tournament scores edit: " + tournamentId);
    if(framework.userHasPrivilige("score-edit", cookie.user)) {
	sendOneTournamentForScoresEdit(cookie, getTournamentDataById(tournamentId));
    } else {
	framework.servicelog("User " + cookie.user.username + " does not have priviliges to edit tournament scores");
    }
}


// All tournaments main edit UI panel

function processGetTournamentsDataForEdit(cookie, data) {
    framework.servicelog("Client #" + cookie.count + " requests tournament data for edit.");
    if(framework.userHasPrivilige("tournament-edit", cookie.user)) {
	var sendable;
	var topButtonList = framework.createTopButtons(cookie, [ { button: { text: "Help",
									     callbackMessage: "getAllTournamentsEditHelp" } } ]);

	var items = [];
	getAllTournamentData().forEach(function(t) {
	    items.push([ [ framework.createUiTextNode("id", t.id) ],
			 [ framework.createUiInputField("name", t.name, 20, false) ],
			 [ framework.createUiInputField("outputfile", t.outputFile, 30, false) ],
			 [ framework.createUiCheckBox("locked", t.locked, "locked") ], 
			 [ framework.createUiMessageButton("Muokkaa", "getSingleTournamentForEdit", t.id) ] ]);
	});

	var itemList = { title: "Tournaments",
			 frameId: 0,
			 header: [ [ [ framework.createUiHtmlCell("", "") ],
				     [ framework.createUiHtmlCell("", "<b>Id</b>") ],
				     [ framework.createUiHtmlCell("", "<b>Name</b>") ],
				     [ framework.createUiHtmlCell("", "<b>OutputFile</b>") ],
				     [ framework.createUiHtmlCell("", "<b>Locked</b>") ],
				     [ framework.createUiHtmlCell("", "<b>Edit</b>") ] ] ],
			 items: items,
			 newItem: [ [ framework.createUiTextNode("id", "") ],
				    [ framework.createUiInputField("name", "<name>", 20, false) ],
				    [ framework.createUiInputField("outputfile", "<outputfile>", 30, false) ],
				    [ framework.createUiCheckBox("locked", false, "locked") ],
				    [ framework.createUiTextNode("", "") ] ] };

	var frameList = [ { frameType: "editListFrame", frame: itemList } ];

	sendable = { type: "createUiPage",
		     content: { topButtonList: topButtonList,
				frameList: frameList,
				buttonList: [ { id: 501, text: "OK", callbackMessage: "saveAllTournamentsData" },
					      { id: 502, text: "Cancel",  callbackMessage: "resetToMain" } ] } };

	framework.sendCipherTextToClient(cookie, sendable);
	framework.servicelog("Sent NEW tournamentData to client #" + cookie.count);
    } else {
	framework.servicelog("User " + cookie.user.username + " does not have priviliges to edit tournaments.");
	sendTournamentMainData(cookie);
    }
}

function processSaveAllTournamentsData(cookie, data) {
    framework.servicelog("Client #" + cookie.count + " requests tournament data saving.");
    if(framework.userHasPrivilige("tournament-edit", cookie.user)) {
	var newTournaments = [];
	var oldTournaments = getAllTournamentData();
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
					  roundLength: u.roundLength,
					  date: u.date,
					  venue: u.venue,
					  spectators: u.spectators,
					  games: u.games });
		}
	    });
	    if(flag) {
		newTournaments.push({ name: t.name,
				      id: nextId++,
				      outputFile: t.outputFile,
				      locked: t.locked,
				      roundLength: 20,
				      date: "",
				      venue: "",
				      spectators: "Vapaa pääsy",
				      games: [] });
	    }
	});
	var deletableTournaments = [];
	oldTournaments.forEach(function(t) {
	    var flag = true;
	    tournamentData.forEach(function(u) {
		if(t.id === u.id) {
		    flag = false;
		}
	    });
	    if(flag) { deletableTournaments.push("tournament_" + t.id); }
	});
	var tournamentsList = [];
	newTournaments.forEach(function(t) {
	    tournamentsList.push("tournament_" + t.id);
	    if(datastorage.isInitialized("tournament_" + t.id)) {
		datastorage.write("tournament_" + t.id, { tournament: t });
	    } else {
		datastorage.initialize("tournament_" + t.id, { tournament: t }, true);
	    }
	});
	if(datastorage.write("tournaments", { nextId: nextId, tournaments: tournamentsList }) === false) {
	    framework.servicelog("Updating all tournaments database failed");
	} else {
	    framework.servicelog("Updated all tournaments database");
	    deletableTournaments.forEach(function(t) {
		datastorage.deleteStorage(t);
		framework.servicelog("Deleted datastorage " + t);
	    });
	}
    } else {
	framework.servicelog("User " + cookie.user.username + " does not have priviliges to edit tournament data");
    }
    sendTournamentMainData(cookie);
}


// Single tournament edit UI

function processGetSingleTournamentForEdit(cookie, data) {
    framework.servicelog("Client #" + cookie.count + " requests single tournament data for edit.");
    if(framework.userHasPrivilige("tournament-edit", cookie.user)) {
	var tournament = getTournamentDataById(data.buttonData);
	var sendable;
	var topButtonList = framework.createTopButtons(cookie);
	var items = [];
	tournament.games.forEach(function(t) {
	    items.push([ [ framework.createUiInputField("time", t.time, 5, false) ],
			 [ framework.createUiSelectionList("home", getAllTeamsTagList(), getTeamTagById(t.home)) ],
			 [ framework.createUiSelectionList("guest", getAllTeamsTagList(), getTeamTagById(t.guest)) ],
			 [ framework.createUiCheckBox("final", t.isFinalGame, "final") ] ]);
	});
	var tournamentProperties = { title: "Properties",
				     frameId: 0,
				     header: [ [] ],

				     items: [ [ [ framework.createUiTextNode("tournament_date", "Tournament date") ],
						[ framework.createUiInputField("tdate", tournament.date, 5, false) ] ],
					      [ [ framework.createUiTextNode("tournament_venue", "Tournament venue") ],
						[ framework.createUiInputField("tvenue", tournament.venue, 20, false) ] ],
					      [ [ framework.createUiTextNode("round_length", "round length") ],
						[ framework.createUiSelectionList("rlength", [ 15, 20 ], tournament.roundLength) ] ] ] };
	var itemList = { title: tournament.name,
			 frameId: 1,
			 header: [ [ [ framework.createUiHtmlCell("", "") ],
				     [ framework.createUiHtmlCell("", "<b>Time</b>") ],
				     [ framework.createUiHtmlCell("", "<b>Home</b>") ],
				     [ framework.createUiHtmlCell("", "<b>Guest</b>") ],
				     [ framework.createUiHtmlCell("", "<b>Final</b>") ] ] ],
			 items: items,
			 newItem: [ [ framework.createUiInputField("time", "<time>", 5, false) ],
				    [ framework.createUiSelectionList("home", getAllTeamsTagList(), "") ],
				    [ framework.createUiSelectionList("guest", getAllTeamsTagList(), "") ],
				    [ framework.createUiCheckBox("final", false, "final") ] ] };
	var frameList = [ { frameType: "fixedListFrame", frame: tournamentProperties },
			  { frameType: "editListFrame", frame: itemList } ];

	sendable = { type: "createUiPage",
		     content: { topButtonList: topButtonList,
				frameList: frameList,
				buttonList: [ { id: 501, text: "OK", callbackMessage: "saveTournamentGameData", data: tournament.id },
					      { id: 502, text: "Cancel",  callbackMessage: "resetToMain" } ] } };

	framework.sendCipherTextToClient(cookie, sendable);
	framework.servicelog("Sent NEW gameData to client #" + cookie.count);
    } else {
	framework.servicelog("User " + cookie.user.username + " does not have priviliges to edit tournament data");
	sendTournamentMainData(cookie);
    }
}

function processSaveTournamentGameData(cookie, data) {
    framework.servicelog("Client #" + cookie.count + " requests saving single tournament game data.");
    if(framework.userHasPrivilige("tournament-edit", cookie.user)) {
	var tournamentData = extractGamesDataFromInputData(data);
	if(tournamentData === null) {
	    sendTournamentMainData(cookie);
	    return;
	}
	var id = data.buttonList.map(function(b) {
	    if(b.text === "OK") { return b.data; }
	}).filter(function(f){return f;})[0];
	var tournament = getTournamentDataById(id);
	tournament.date = tournamentData.configuration.date;
	tournament.venue = tournamentData.configuration.venue;
	tournament.roundLength = tournamentData.configuration.roundLength;
	var newGameData = [];
	tournamentData.games.forEach(function(r) {
	    var flag = true;
	    tournament.games.forEach(function(s) {
		if(r.round === s.round) {
		    flag = false;
		    newGameData.push({ round: r.round,
				       home: r.home,
				       guest: r.guest,
				       result: s.result,
				       officials: [],
				       referees: [],
				       timeOut: [],
				       start: r.start,
				       end: r.end,
				       scores: s.scores,
				       penalties: s.penalties,
				       time: r.time,
				       isFinalGame: r.isFinalGame });
		}
	    });
	    if(flag) {
		newGameData.push({ round: r.round,
				   home: r.home,
				   guest: r.guest,
				   result: "-",
				   officials: [],
				   referees: [],
				   timeOut: [],
				   start: r.start,
				   end: r.end,
				   scores: [],
				   penalties: [],
				   time: r.time,
				   isFinalGame: r.isFinalGame });
	    }
	});
	if(datastorage.write("tournament_" + tournament.id, { tournament: { name: tournament.name,
									    id: tournament.id,
									    outputFile: tournament.outputFile,
									    locked: tournament.locked,
									    roundLength: tournament.roundLength,
									    date: tournament.date,
									    venue: tournament.venue,
									    spectators: tournament.spectators,
									    games: newGameData } }) === false) {
	    framework.servicelog("Updating all tournament database failed");
	} else {
	    framework.servicelog("Updated tournament database");
	}
    } else {
	framework.servicelog("User " + cookie.user.username + " does not have priviliges to edit tournament data");
    }
    sendTournamentMainData(cookie);
}


// Main player edit UI, list of players

function processGetPlayersDataForEdit(cookie, content) {
    framework.servicelog("Client #" + cookie.count + " requests players edit");
    if(framework.userHasPrivilige("player-view", cookie.user) ||
       framework.userHasPrivilige("player-edit", cookie.user) ||
       framework.userHasPrivilige("player-delete", cookie.user)) {
	var topButtonList = framework.createTopButtons(cookie);
	var items = [];
	var players = datastorage.read("players").players;
	if(content.buttonData === undefined) { content.buttonData = "name"; }
	players = sortPlayersView(players, content.buttonData);
	if(framework.userHasPrivilige("player-edit", cookie.user) ||
	   framework.userHasPrivilige("player-delete", cookie.user)) {
	    players.forEach(function(p) {
		items.push([ [ framework.createUiInputField(p.id, p.name, 15, false) ],
			     [ framework.createUiInputField("number", p.number, 2, false) ],
			     [ framework.createUiInputField("role", p.role, 2, false) ],
			     [ framework.createUiInputField("team", p.team, 10, false) ] ]);
	    });
	} else {
	    players.forEach(function(p) {
		items.push([ [ framework.createUiTextNode("name", p.name) ],
			     [ framework.createUiTextNode("number", p.number) ],
			     [ framework.createUiTextNode("role", p.role) ],
			     [ framework.createUiTextNode("team", p.team) ] ]);
	    });
	}
	var header1 = [ [ [ framework.createUiHtmlCell("", "") ],
			  [ framework.createUiMessageButton("Sort by Name", "getPlayersDataForEdit", "name", true) ],
			  [ framework.createUiMessageButton("Sort by Number", "getPlayersDataForEdit", "number", true) ],
			  [ framework.createUiMessageButton("Sort by Role", "getPlayersDataForEdit", "role", true) ],
			  [ framework.createUiMessageButton("Sort by Team", "getPlayersDataForEdit", "team", true) ] ] ];
	var header2 = [ [ [ framework.createUiMessageButton("Sort by Name", "getPlayersDataForEdit", "name", true) ],
			  [ framework.createUiMessageButton("Sort by Number", "getPlayersDataForEdit", "number", true) ],
			  [ framework.createUiMessageButton("Sort by Role", "getPlayersDataForEdit", "role", true) ],
			  [ framework.createUiMessageButton("Sort by Team", "getPlayersDataForEdit", "team", true) ] ] ];
	if(framework.userHasPrivilige("player-delete", cookie.user)) {
	    var itemList = { title: "Players",
			     frameId: 0,
			     header: header1,
			     items: items,
			     newItem: [ [ framework.createUiInputField("name", "<name>", 15, false) ],
					[ framework.createUiInputField("number", "<x>", 2, false) ],
					[ framework.createUiInputField("role", "", 2, false) ],
					[ framework.createUiInputField("team", "", 10, false) ] ] };
	    var frameList = [ { frameType: "editListFrame", frame: itemList } ];
	    var buttonList = [ { id: 501, text: "OK", callbackMessage: "saveAllPlayersData" },
			       { id: 502, text: "Cancel",  callbackMessage: "resetToMain" } ];
	} else if(framework.userHasPrivilige("player-edit", cookie.user)) {
	    var itemList = { title: "Players",
			     frameId: 0,
			     header: header2,
			     items: items };
	    var newItemList = { title: "New Players",
				frameId: 1,
				header: [ [ [ framework.createUiHtmlCell("", "") ],
					    [ framework.createUiHtmlCell("", "<b>Name</b>") ],
					    [ framework.createUiHtmlCell("", "<b>Number</b>") ],
					    [ framework.createUiHtmlCell("", "<b>Role</b>") ],
					    [ framework.createUiHtmlCell("", "<b>Team</b>") ] ] ],
				items: [],
			     newItem: [ [ framework.createUiInputField("name", "<name>", 15, false) ],
					[ framework.createUiInputField("number", "<x>", 2, false) ],
					[ framework.createUiInputField("role", "", 2, false) ],
					[ framework.createUiInputField("team", "", 10, false) ] ] };
	    var frameList = [ { frameType: "fixedListFrame", frame: itemList },
			      { frameType: "editListFrame", frame: newItemList } ];
	    var buttonList = [ { id: 501, text: "OK", callbackMessage: "saveAllPlayersData" },
			       { id: 502, text: "Cancel",  callbackMessage: "resetToMain" } ];
	} else {
	    var itemList = { title: "Players",
			     frameId: 0,
			     header: header2,
			     items: items };
	    var frameList = [ { frameType: "fixedListFrame", frame: itemList } ];
	    var buttonList = [ { id: 502, text: "Cancel",  callbackMessage: "resetToMain" } ];
	}
	var sendable = { type: "createUiPage",
			 content: { topButtonList: topButtonList,
				    frameList: frameList,
				    buttonList: buttonList } };
	framework.sendCipherTextToClient(cookie, sendable);
	framework.servicelog("Sent NEW playersData to client #" + cookie.count);
    } else {
	framework.servicelog("User " + cookie.user.username + " does not have priviliges to edit players");
	sendTournamentMainData(cookie);
    }
}

function sortPlayersView(players, key) {
    if(key === "name") {
	sortAscending("name", players);
    }
    if(key === "number") {
	sortAscendingNumber("number", players);
    }
    if(key === "role") {
	sortAscending("role", players);
   }
    if(key === "team") {
	var teams = [];
	players.forEach(function(p) {
	    if(teams.filter(function(t) {
		return t.name === p.team;
	    }).length === 0) {
		teams.push({ name: p.team,
			     players: [ { id: p.id,
					  name: p.name,
					  number: p.number,
					  role: p.role,
					  team: p.team } ] });
	    } else {
		var team = teams.filter(function(t) {
		    return t.name === p.team;
		})[0];
		team.players.push({ id: p.id,
				    name: p.name,
				    number: p.number,
				    role: p.role,
				    team: p.team });
	    }
	});
	sortAscending("name", teams);
	var newPlayers = [];
	teams.forEach(function(t) {
	    sortAscending("name", t.players);
	    newPlayers = newPlayers.concat(t.players);
	});
	return newPlayers;
    }
    return players;
}

function processSaveAllPlayersData(cookie, content) {
    var newPlayers = [];
    var nextId = datastorage.read("players").nextId;
    if(framework.userHasPrivilige("player-delete", cookie.user)) {
	// If user has "player-delete" privilige, all player data is in frame 0 and it is
	// valid to replace current player list with the incoming list.
	// Newly added players are recognized by having keyword "name" in the playerId key.
	content.items[0].frame.forEach(function(p) {
	    var id = p[0][0].key;
	    if(id === "name") { id = nextId++; }
	    newPlayers.push({ id: id,
			      name: p[0][0].value,
			      number: p[1][0].value,
			      role: p[2][0].value,
			      team: p[3][0].value });
	});
	sortAscendingNumber("id", newPlayers);
	if(datastorage.write("players", { nextId: nextId, players: newPlayers }) === false) {
	    framework.servicelog("Players database write failed");
	} else {
	    framework.servicelog("Updated players database");
	}
    } else if(framework.userHasPrivilige("player-edit", cookie.user)) {
	// If the user has "player-edit" privilige but no "player-delete" privilige, the static
	// player list that can be modified but must not be deleted is in frame 0.
	// The newly added players are in frame 1, no recognition tricks needed here.
	datastorage.read("players").players.forEach(function(o) {
	    var flag = true;
	    content.items[0].frame.forEach(function(p) {
		if(o.id === p[0][0].key) {
		    flag = false;
		    newPlayers.push({ id: o.id,
				      name: p[0][0].value,
				      number: p[1][0].value,
				      role: p[2][0].value,
				      team: p[3][0].value });
		}
	    });
	    if(flag) {
		newPlayers.push({ id: o.id,
				  name: o.name,
				  number: o.number,
				  role: o.role,
				  team: o.team });
	    }
	});
	content.items[1].frame.forEach(function(p) {
	    newPlayers.push({ id: nextId++,
			      name: p[0][0].value,
			      number: p[1][0].value,
			      role: p[2][0].value,
			      team: p[3][0].value });
	});
	sortAscendingNumber("id", newPlayers);
	if(datastorage.write("players", { nextId: nextId, players: newPlayers }) === false) {
	    framework.servicelog("Players database write failed");
	} else {
	    framework.servicelog("Updated players database");
	}
    } else {
	framework.servicelog("User " + cookie.user.username + " does not have priviliges to save player data");
	sendTournamentMainData(cookie);
    }
    sendTournamentMainData(cookie);
}


// Main team edit UI, list of teams

function processGetTeamsDataForEdit(cookie, content) {
    framework.servicelog("Client #" + cookie.count + " requests teams edit");
    if(framework.userHasPrivilige("team-view", cookie.user) ||
       framework.userHasPrivilige("team-edit", cookie.user) ||
       framework.userHasPrivilige("team-delete", cookie.user)) {
	var topButtonList = framework.createTopButtons(cookie);
	var items = [];
	var frameList;
	var buttonList;
	datastorage.read("teams").teams.forEach(function(t) {
	    var tagNode = framework.createUiTextNode(t.id, t.tag);
	    var nameNode = framework.createUiTextNode("name", t.name);
	    var buttonNode = framework.createUiMessageButton("Muokkaa", "getSingleTeamForEdit", t.id, false);
	    if( framework.userHasPrivilige("team-edit", cookie.user))	{
		tagNode = framework.createUiInputField(t.id, t.tag, 15, false);
		nameNode = framework.createUiInputField("name", t.name, 15, false);
		buttonNode = framework.createUiMessageButton("Muokkaa", "getSingleTeamForEdit", t.id, true);
	    }
	    items.push([ [ tagNode ],
			 [ nameNode ],
			 [ buttonNode ] ]);
	});
	if(framework.userHasPrivilige("team-delete", cookie.user)) {
	    var itemList = { title: "Teams",
			     frameId: 0,
			     header: [ [ [ framework.createUiHtmlCell("", "") ],
					 [ framework.createUiHtmlCell("", "<b>Team ID</b>") ],
					 [ framework.createUiHtmlCell("", "<b>Team Name</b>") ],
					 [ framework.createUiHtmlCell("", "") ] ] ],
			     items: items,
			     newItem: [	[ framework.createUiInputField("tag", "<name>", 15, false) ],
					[ framework.createUiInputField("name", "<name>", 15, false) ],
					[ framework.createUiTextNode("", "") ] ] };
	    frameList = [ { frameType: "editListFrame", frame: itemList } ];
	    buttonList = [ { id: 501, text: "OK", callbackMessage: "saveAllTeamsData" },
			   { id: 502, text: "Cancel",  callbackMessage: "resetToMain" } ];
	} else if(framework.userHasPrivilige("team-edit", cookie.user)) {
	    var itemList = { title: "Teams",
			     frameId: 0,
			     header: [ [ [ framework.createUiHtmlCell("", "<b>Team ID</b>") ],
					 [ framework.createUiHtmlCell("", "<b>Team Name</b>") ],
					 [ framework.createUiHtmlCell("", "") ] ] ],
			     items: items };
	    var newItemList = { title: "New Teams",
				frameId: 1,
				header: [ [ [ framework.createUiHtmlCell("", "<b>Team ID</b>") ],
					    [ framework.createUiHtmlCell("", "<b>Team Name</b>") ],
					    [ framework.createUiHtmlCell("", "") ] ] ],
				items: [],
				newItem: [ [ framework.createUiInputField("tag", "<name>", 15, false) ],
					   [ framework.createUiInputField("name", "<x>", 15, false) ],
					   [ framework.createUiTextNode("", "") ] ] };

	    var frameList = [ { frameType: "fixedListFrame", frame: itemList },
			      { frameType: "editListFrame", frame: newItemList } ];
	    var buttonList = [ { id: 501, text: "OK", callbackMessage: "saveAllTeamsData" },
			       { id: 502, text: "Cancel",  callbackMessage: "resetToMain" } ];
	} else {
	    var itemList = { title: "Teams",
			     frameId: 0,
			     header: [ [ [ framework.createUiHtmlCell("", "<b>Team ID</b>") ],
					 [ framework.createUiHtmlCell("", "<b>Team Name</b>") ],
					 [ framework.createUiHtmlCell("", "") ] ] ],
			     items: items };
	    var frameList = [ { frameType: "fixedListFrame", frame: itemList } ];
	    var buttonList = [ { id: 502, text: "Cancel",  callbackMessage: "resetToMain" } ];
	}
	var sendable = { type: "createUiPage",
			 content: { topButtonList: topButtonList,
				    frameList: frameList,
				    buttonList: buttonList } };
	framework.sendCipherTextToClient(cookie, sendable);
	framework.servicelog("Sent NEW teamsData to client #" + cookie.count);
    } else {
	framework.servicelog("User " + cookie.user.username + " does not have priviliges to edit teams");
	sendTournamentMainData(cookie);
    }
}

function processSaveAllTeamsData(cookie, data) {
    framework.servicelog("Client #" + cookie.count + " requests teams data saving.");
    if(framework.userHasPrivilige("team-edit", cookie.user)) {
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
		    newTeams.push({ id: t.id,
				    name: t.name,
				    tag: t.tag,
				    players: u.players });
		}
	    });
	    if(flag) {
		newTeams.push({ id: nextId++,
				name: t.name,
				tag: t.tag,
				players: [] });
	    }
	});
	if(datastorage.write("teams", { nextId: nextId, teams: newTeams }) === false) {
	    framework.servicelog("Teams database write failed");
	} else {
	    framework.servicelog("Updated teams database");
	}
    } else {
	framework.servicelog("User " + cookie.user.username + " does not have priviliges to edit teams");
    }
    sendTournamentMainData(cookie);
}


// Team member edit UI panel

function processGetSingleTeamForEdit(cookie, data) {
    framework.servicelog("Client #" + cookie.count + " requests team data for editing.");
    if(framework.userHasPrivilige("team-view", cookie.user) ||
       framework.userHasPrivilige("team-edit", cookie.user)) {
	var topButtonList = framework.createTopButtons(cookie);
	var items = [];
	datastorage.read("teams").teams.forEach(function(t) {
	    if(t.id === data.buttonData) {
		t.players.forEach(function(p) {
		    items.push([ [ createAllPlayersSelector(p) ] ]);
		});
	    }
	});
	if(framework.userHasPrivilige("team-edit", cookie.user)) {
	    var itemList = { title: getTeamTagById(data.buttonData),
			     frameId: 0,
			     header: [ [ [ framework.createUiHtmlCell("", "<b>Player</b>") ] ] ],
			     items: items,
			     newItem: [ [ createAllPlayersSelector("") ] ] };
	    var frameList = [ { frameType: "editListFrame", frame: itemList } ];
	    var buttonList = [ { id: 501, text: "OK", callbackMessage: "saveSingleTeamData", data: data.buttonData },
			       { id: 502, text: "Cancel",  callbackMessage: "resetToMain" } ]
	} else {
	    var itemList = { title: getTeamTagById(data.buttonData),
			     frameId: 0,
			     header: [ [ [ framework.createUiHtmlCell("", "<b>Player</b>") ] ] ],
			     items: items }
	    var frameList = [ { frameType: "fixedListFrame", frame: itemList } ];
	    var buttonList = [ { id: 502, text: "Cancel",  callbackMessage: "resetToMain" } ];
	}
	var sendable = { type: "createUiPage",
			 content: { topButtonList: topButtonList,
				    frameList: frameList,
				    buttonList: buttonList } };
	framework.sendCipherTextToClient(cookie, sendable);
	framework.servicelog("Sent NEW teamData to client #" + cookie.count);
    } else {
	framework.servicelog("User " + cookie.user.username + " does not have priviliges to edit team players");
	sendTournamentMainData(cookie);
    }
}

function createAllPlayersSelector(id) {
    var players = [];
    var defaultPlayer = "";
    datastorage.read("players").players.forEach(function(p) {
	if(p.id === id) { defaultPlayer = p.team + " / " + p.name + " / " + p.number; }
	players.push(p.team + " / " + p.name + " / " + p.number);
    });
    return framework.createUiSelectionList("player", players, defaultPlayer);
}

function processSaveSingleTeamData(cookie, data) {
    framework.servicelog("Client #" + cookie.count + " requests single team saving.");
    if(framework.userHasPrivilige("team-edit", cookie.user)) {
	data.buttonList.forEach(function(b) {
	    if(b.text === "OK") { updateSingleTeamFromClient(cookie, b.data, data); }
	});
    } else {
	framework.servicelog("User " + cookie.user.username + " does not have priviliges to edit players");
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
	    newTeams.push({ id: teamId,
			    name: t.name,
			    tag: t.tag,
			    players: players });
	}
    });
    if(datastorage.write("teams", { nextId: nextId, teams: newTeams }) === false) {
	framework.servicelog("Teams database write failed");
    } else {
	framework.servicelog("Updated teams database");
    }
}


// UI panel for selecting the game for statistics edit

function sendOneTournamentForScoresEdit(cookie, tournament) {
    var sendable;
    var topButtonList = framework.createTopButtons(cookie);
    var games = [];
    var finals = [];
    var finalsFlag = false;
    var count = 1;
    tournament.games.forEach(function(t) {
	if(t.isFinalGame) {
	    finalsFlag = true;
	    finals.push( [ [ framework.createUiTextNode("time", t.time) ],
			   [ framework.createUiTextNode("home", getTeamNameById(t.home)) ],
			   [ framework.createUiTextNode("guest", getTeamNameById(t.guest)) ],
			   [ framework.createUiTextNode("result", t.result) ],
			   [ framework.createUiMessageButton("Muokkaa", "getOneMatchScoresForEdit", 
							     { id: tournament.id, round: count++ }) ] ] );
	} else {
	    games.push( [ [ framework.createUiTextNode("time", t.time) ],
			  [ framework.createUiTextNode("home", getTeamNameById(t.home)) ],
			  [ framework.createUiTextNode("guest", getTeamNameById(t.guest)) ],
			  [ framework.createUiTextNode("result", t.result) ],
			  [ framework.createUiMessageButton("Muokkaa", "getOneMatchScoresForEdit", 
							    { id: tournament.id, round: count++ }) ] ] );
	}
    });
    var gamesList = { title: tournament.name,
		      frameId: 0,
		      header: [ [ [ framework.createUiHtmlCell("", "<b>Aika</b>") ],
				  [ framework.createUiHtmlCell("", "<b>Koti</b>") ],
				  [ framework.createUiHtmlCell("", "<b>Vieras</b>") ],
				  [ framework.createUiHtmlCell("", "<b>Tulos</b>") ],
				  [ framework.createUiHtmlCell("", "") ] ] ],
		      items: games };
    if(finalsFlag) {
	var finalsList = { title: "Finaali",
			   frameId: 1,
			   header: [ [ [ framework.createUiHtmlCell("", "<b>Aika</b>") ],
				       [ framework.createUiHtmlCell("", "<b>Koti</b>") ],
				       [ framework.createUiHtmlCell("", "<b>Vieras</b>") ],
				       [ framework.createUiHtmlCell("", "<b>Tulos</b>") ],
				       [ framework.createUiHtmlCell("", "") ] ] ],
			   items: finals };
	var frameList = [ { frameType: "fixedListFrame", frame: gamesList },
			  { frameType: "fixedListFrame", frame: finalsList } ];
    } else {
	var frameList = [ { frameType: "fixedListFrame", frame: gamesList } ];
    }
    var buttonList =  [ { id: 501, text: "OK", callbackMessage: "resetToMain" } ];
    sendable = { type: "createUiPage",
		 content: { topButtonList: topButtonList,
			    frameList: frameList,
			    buttonList: buttonList } };

    framework.sendCipherTextToClient(cookie, sendable);
    framework.servicelog("Sent NEW editTournamentScores to client #" + cookie.count);
}

function processGetOneMatchScoresForEdit(cookie, data) {
    try {
	var tournamentId = data.buttonData.id;
	var tournamentRound = data.buttonData.round;
    } catch(err) {
	framework.servicelog("Cannot parse either tournament name or round: " + err);
	return;
    }
    framework.servicelog("Client #" + cookie.count + " requests match scores edit.");
    if(framework.userHasPrivilige("score-edit", cookie.user)) {
	sendOneMatchForScoresEdit(cookie, getMatchDataById(tournamentId, tournamentRound));
    } else {
	framework.servicelog("User " + cookie.user.username + " does not have priviliges to edit match scores");
    }
}


// UI panel for editing the statistics of a single game

function sendOneMatchForScoresEdit(cookie, match) {
    var sendable;
    var topButtonList = framework.createTopButtons(cookie);
    var scoreItems = [];
    var penaltyItems = [];
    var frameNumber = 0;
    cookie.editingMatch =  match.id;
    if(match.isFinalGame) {
	var teamItems = [ [ [ framework.createUiSelectionList("home", getTournamentTeamList(match.id.id), getTeamNameById(match.home)) ],
			    [ framework.createUiSelectionList("guest", getTournamentTeamList(match.id.id), getTeamNameById(match.guest)) ],
			    [ framework.createUiMessageButton("Päivitä", "updateFinalistTeams", { id: match }) ] ] ];
	var teamItemList = { title: "Finalistit",
			     frameId: frameNumber++,
			     header: [ [ [ framework.createUiHtmlCell("", "<b>Kotijoukkue</b>") ],
					 [ framework.createUiHtmlCell("", "<b>Vierasjoukkue</b>") ],
					 [ framework.createUiHtmlCell("", "<b>Päivitä joukkueet</b>") ] ] ],
			     items: teamItems };
    }
    match.scores.forEach(function(s) {
	scoreItems.push([ [ framework.createUiSelectionList("piste", [ getTeamNameById(match.home), getTeamNameById(match.guest) ],
							    getTeamNameById(s.point)) ],
			  [ framework.createUiSelectionList("tyyppi", createScoreTypes(), s.type) ],
			  [ framework.createUiInputField("aika", s.time, 5, false) ],
			  [ framework.createUiSelectionList("tekijä", createPlayerList(match), createMatchPlayer(match, s.scorer)) ],
			  [ framework.createUiSelectionList("syöttäjä", createPlayerList(match), createMatchPlayer(match, s.passer)) ] ]);
    });
    match.penalties.forEach(function(p) {
	penaltyItems.push([ [ framework.createUiSelectionList("rangaistus", [ getTeamNameById(match.home), getTeamNameById(match.guest) ],
							      getTeamNameById(p.penalty)) ],
			    [ framework.createUiInputField("aloitusaika", p.starttime, 5, false) ],
			    [ framework.createUiInputField("lopetusaika", p.endtime, 5, false) ],
			    [ framework.createUiSelectionList("koodi", createPenaltyCodes(), p.code) ],
			    [ framework.createUiSelectionList("pituus", createPenaltyTimes(), p.length) ],
			    [ framework.createUiSelectionList("pelaaja", createPlayerList(match), createMatchPlayer(match, p.player)) ] ]);
    });
    var scoresItemList = { title: "Pisteet: " + getTeamNameById(match.home) + " - " + getTeamNameById(match.guest) + " [ " + match.result + " ]",
			   frameId: frameNumber++,
			   header: [ [ [ framework.createUiHtmlCell("", "") ],
				       [ framework.createUiHtmlCell("", "<b>piste</b>") ],
				       [ framework.createUiHtmlCell("", "<b>tyyppi</b>") ],
				       [ framework.createUiHtmlCell("", "<b>aika</b>") ],
				       [ framework.createUiHtmlCell("", "<b>tekijä</b>") ],
				       [ framework.createUiHtmlCell("", "<b>syöttäjä</b>") ] ] ],
			   items: scoreItems,
			   newItem: [ [ framework.createUiSelectionList("piste", [ getTeamNameById(match.home),
										   getTeamNameById(match.guest) ], "") ],
				      [ framework.createUiSelectionList("tyyppi", createScoreTypes(), "") ],
				      [ framework.createUiInputField("aika", "", 5, false) ],
				      [ framework.createUiSelectionList("tekijä", createPlayerList(match), "") ],
				      [ framework.createUiSelectionList("syöttäjä", createPlayerList(match), "") ] ] };

    var penaltiesItemList = { title: "Rangaistukset: " + getTeamNameById(match.home) + " - " + getTeamNameById(match.guest),
			      frameId: frameNumber++,
			      header: [ [ [ framework.createUiHtmlCell("", "") ],
					  [ framework.createUiHtmlCell("", "<b>rangaistus</b>") ],
					  [ framework.createUiHtmlCell("", "<b>alkoi</b>") ],
					  [ framework.createUiHtmlCell("", "<b>päättyi</b>") ],
					  [ framework.createUiHtmlCell("", "<b>koodi</b>") ],
					  [ framework.createUiHtmlCell("", "<b>pituus</b>") ],
					  [ framework.createUiHtmlCell("", "<b>pelaaja</b>") ] ] ],
			      items: penaltyItems,
			      newItem: [ [ framework.createUiSelectionList("rangaistus", [ getTeamNameById(match.home),
											   getTeamNameById(match.guest) ], "" ) ],
					 [ framework.createUiInputField("aloitusaika", "", 5, false) ],
					 [ framework.createUiInputField("lopetusaika", "", 5, false) ],
					 [ framework.createUiSelectionList("koodi", createPenaltyCodes(), "") ],
					 [ framework.createUiSelectionList("pituus", createPenaltyTimes(), "") ],
					 [ framework.createUiSelectionList("pelaaja", createPlayerList(match), "") ] ] };

    if(match.isFinalGame) {
	var frameList = [ { frameType: "fixedListFrame", frame: teamItemList },
			  { frameType: "editListFrame", frame: scoresItemList },
			  { frameType: "editListFrame", frame: penaltiesItemList } ];
    } else {
	var frameList = [ { frameType: "editListFrame", frame: scoresItemList },
			  { frameType: "editListFrame", frame: penaltiesItemList } ];
    }

    sendable = { type: "createUiPage",
		 content: { topButtonList: topButtonList,
			    frameList: frameList,
			    buttonList: [ { id: 501, text: "Apply", callbackMessage: "saveMatchScores", data: match.id },
					  { id: 502, text: "OK",  callbackMessage: "saveMatchScoresAndReturn", data: match.id },
					  { id: 503, text: "Cancel",  callbackMessage: "resetToMain" } ] } };

    framework.sendCipherTextToClient(cookie, sendable);
    framework.servicelog("Sent NEW editMatchScores to client #" + cookie.count);
}

function processUpdateFinalistTeams(cookie, data) {
    framework.servicelog("Client #" + cookie.count + " requests updating finalist data.");
    if(framework.userHasPrivilige("score-edit", cookie.user)) {
	var tournamentId = data.buttonData.id.id.id;
	var tournamentRound = data.buttonData.id.id.round;
	var tournament = getTournamentDataById(tournamentId);
	var teams = [];
	tournament.games.forEach(function(g) {
	    teams.push(g.home);
	});
	var filteredTeams = teams.filter(function(item, pos, self) {
	    return self.indexOf(item) === pos;
	});
	var newGames = [];
	tournament.games.forEach(function(g) {
	    if(g.round !== tournamentRound) {
		newGames.push(g);
	    } else {
		newGames.push({ round: tournamentRound,
				home: getTeamIdFromNameInIdList(data.items[0].frame[0][0][0].selected, filteredTeams),
				guest: getTeamIdFromNameInIdList(data.items[0].frame[0][1][0].selected, filteredTeams),
				result: g.result,
				officials: g.officials,
				referees: g.referees,
				timeOut: g.timeOut,
				start: g.start,
				end: g.end,
				scores: g.scores,
				penalties: g.penalties,
				time: g.time,
				isFinalGame: g.isFinalGame });
	    }
	});
	if(datastorage.write("tournament_" + tournament.id, { tournament: { name: tournament.name,
									    id: tournament.id,
									    outputFile: tournament.outputFile,
									    locked: tournament.locked,
									    roundLength: tournament.roundLength,
									    date: tournament.date,
									    venue: tournament.venue,
									    spectators: tournament.spectators,
									    games: newGames } }) === false) {
	    framework.servicelog("Updating tournament database failed");
	} else {
	    createTournamentHtmlPages(getTournamentDataById(tournamentId));
	    framework.servicelog("Updated tournament database");
	}
	sendOneMatchForScoresEdit(cookie, getMatchDataById(tournamentId, tournamentRound));
    } else {
	framework.servicelog("User " + cookie.user.username + " does not have priviliges to update finalist data");
	sendTournamentMainData(cookie);
    }
}

function createPlayerList(match) {
    var players = datastorage.read("players").players;
    var homePlayers = [];
    var guestPlayers = [];
    var homeTeam = "";
    var guestTeam = "";
    datastorage.read("teams").teams.forEach(function(t) {
	if(t.id === match.home) {
	    homeTeam = t.name;
	    t.players.forEach(function(id) {
		players.forEach(function(p) {
		    if(id === p.id) { homePlayers.push(p); }
		});
	    });
	}
	if(t.id === match.guest) {
	    guestTeam = t.name;
	    t.players.forEach(function(id) {
		players.forEach(function(p) {
		    if(id === p.id) { guestPlayers.push(p); }
		});
	    });
	}
    });
    sortAscending("name", homePlayers);
    sortAscending("name", guestPlayers);
    var teamPlayers = [];
    homePlayers.forEach(function(p) {
	teamPlayers.push(homeTeam + " | " + p.name + " (" + p.number + ")");
    });
    guestPlayers.forEach(function(p) {
	teamPlayers.push(guestTeam + " | " + p.name + " (" + p.number + ")");
    });
    return teamPlayers;
}

function createMatchPlayer(match, id) {
    var matchPlayer = "";
    var team = "";
    datastorage.read("teams").teams.forEach(function(t) {
	if((t.id === match.home) || (t.id === match.guest)) {
	    t.players.forEach(function(p) {
		if(p === id) { team = t.name; }		
	    });
	}
    });
    datastorage.read("players").players.forEach(function(p) {
	if(id === p.id) { matchPlayer = team + " | " + p.name + " (" + p.number + ")"; }	
    });
    return matchPlayer;
}

function createScoreTypes() {
    return [ "M",
	     "YV",
	     "AV",
	     "TV",
	     "RL OK",
	     "RL -",
	     "SR",
	     "OM",
	     "TM" ];
}

function createPenaltyTimes() {
    return [ "2min",
	     "5min",
	     "10min",
	     "2+10min",
	     "PR1",
	     "PR2",
	     "PR3" ];
}

function createPenaltyCodes() {
    return [ "52 EPÄURHEILIJAMAINEN KÄYTÖS",
	     "71 ESTÄMINEN",
	     "93 HUITOMINEN",
	     "54 HÄIRITSEVÄ VALMENTAMINEN",
	     "50 KIELTÄYTYMINEN LÄHTEMÄSTÄ RANGAISTUSPENKILTÄ",
	     "72 KIINNIPITÄMINEN",
	     "82 KORKEA JALKA",
	     "81 KORKEA MAILA",
	     "92 KOUKKAAMINEN",
	     "86 KÄDELLÄ TAI KÄSIVARRELLA PELAAMINEN",
	     "35 LIIAN KÄYRÄ MAILAN LAPA",
	     "42 LIIAN MONTA PELAAJAA KAUKALOSSA",
	     "49 LÄHTEMINEN RANGAISTUSPENKILTÄ ETUAJASSA",
	     "70 MAALINPAIKAN KORJAAMATTA JÄTTÄMINEN",
	     "85 MAASTA PELAAMINEN",
	     "31 MAILAN HAKEMINEN MUUALTA KUIN AITIOSTA",
	     "94 MAILAAN LYÖMINEN TAI POTKAISEMINEN",
	     "96 MAILAN NOSTAMINEN",
	     "95 MAILAN PAINAMINEN TAI SITOMINEN",
	     "97 MAILAN TAI VARUSTEEN HEITTÄMINEN",
	     "64 MAILAN TAI VARUSTEEN RIKKOMINEN",
	     "36 PELAAMINEN ILMAN MAILAA",
	     "39 PELAAMINEN LAITTOMALLA MAILALLA",
	     "38 PELAAMINEN VIALLISELLA MAILALLA",
	     "53 PELIN SABOTOIMINEN",
	     "62 PELIN VIIVYTTÄMINEN",
	     "47 PÖYTÄKIRJAAN MERKITSEMÄTÖN PELAAJA",
	     "51 PROTESTOIMINEN",
	     "87 PÄÄLLÄ PELAAMINEN",
	     "40 RIKE MAALINTEKOTILANTEESSA",
	     "37 PUDONNEEN MAILAN JÄTTÄMINEN PELIKENTÄLLE",
	     "65 SYSTEMAATTISESTI TOISTUVA RIKKOMINEN (JOUKKUE)",
	     "32 SÄÄNTÖJEN VASTAINEN VARUSTE TAI VAATETUS",
	     "83 TAKLAAMINEN, KAATAMINEN TAI KAMPPAAMINEN",
	     "33 TARPEETON MAILAN TARKISTUSPYYNTÖ",
	     "73 TYÖNTÄMINEN",
	     "67 VAARALLINEN PELI",
	     "91 VÄKIVALTAISUUS",
	     "61 VÄÄRÄ ETÄISYYS",
	     "41 VÄÄRÄ VAIHTO" ];
}

function processSaveMatchScores(cookie, data) {
    framework.servicelog("Client #" + cookie.count + " requests match scores saving.");
    if(framework.userHasPrivilige("score-edit", cookie.user)) {
	data.buttonList.forEach(function(b) {
	    if(b.text === "OK") {
		updateMatchStatisticsFromClient(cookie, b.data, data);
		sendOneMatchForScoresEdit(cookie, getMatchDataById(b.data.id, b.data.round));
		signalEditingClientsForScoresChange(cookie, b.data.id, b.data.round);
		return;
	    }
	});
    } else {
	framework.servicelog("User " + cookie.user.username + " does not have priviliges to edit match scores");
	sendTournamentMainData(cookie);
    }
}

function processSaveMatchScoresAndReturn(cookie, data) {
    framework.servicelog("Client #" + cookie.count + " requests match scores saving and return to main screen.");
    if(framework.userHasPrivilige("score-edit", cookie.user)) {
	data.buttonList.forEach(function(b) {
	    if(b.text === "OK") {
		updateMatchStatisticsFromClient(cookie, b.data, data);
		signalEditingClientsForScoresChange(cookie, b.data.id, b.data.round);
		cookie.editingMatch = {};
		sendTournamentMainData(cookie);
		return;
	    }
	});
    } else {
	framework.servicelog("User " + cookie.user.username + " does not have priviliges to edit match scores");
    }
    sendTournamentMainData(cookie);
}

function updateMatchStatisticsFromClient(cookie, match, matchData) {
    var tournament = getTournamentDataById(match.id);
    var newGames = [];
    tournament.games.forEach(function(g) {
	if(g.round !== match.round) {
	    newGames.push(g);
	} else {
	    var newStatistics = extractMatchStatisticsFromInputData(g.isFinalGame, [g.home, g.guest], matchData);
	    if(newStatistics === null) {
		sendTournamentMainData(cookie);
		return;
	    }
	    newGames.push({ round: match.round,
			    home: g.home,
			    guest: g.guest,
			    result: calculateResultFromScores(newStatistics.scores, { home: g.home, guest:g.guest }),
			    officials: g.officials,
			    referees: g.referees,
			    timeOut: g.timeOut,
			    start: g.start,
			    end: g.end,
			    scores: newStatistics.scores,
			    penalties: newStatistics.penalties,
			    time: g.time,
			    isFinalGame: g.isFinalGame  });
	}
    });
    tournament.games = newGames;
    if(datastorage.write("tournament_" + tournament.id, { tournament: { name: tournament.name,
									id: tournament.id,
									outputFile: tournament.outputFile,
									locked: tournament.locked,
									roundLength: tournament.roundLength,
									date: tournament.date,
									venue: tournament.venue,
									spectators: tournament.spectators,
									games: newGames } }) === false) {
	framework.servicelog("Updating tournament database failed");
    } else {
	createTournamentHtmlPages(getTournamentDataById(tournament.id));
	framework.servicelog("Updated tournament database");
    }
}

function signalEditingClientsForScoresChange(cookie, id, round) {
    framework.getConnectionList().forEach(function(c) {
	if(c.editingMatch !== undefined) {
	    if((c.count !== cookie.count) &&
	       (c.editingMatch.id === id ) &&
	       (c.editingMatch.round === round)) {
		framework.servicelog("Sending refresh message to client #" + c.count);
		sendOneMatchForScoresEdit(c, getMatchDataById(id, round));
	    }
	}
    });
}


// Create the tournament result html and pdf pages

function createTournamentHtmlPages(myTournament) {
    fs.writeFileSync(myTournament.outputFile + ".html", createHtmlMainResultsPage(myTournament));
    myTournament.games.forEach(function(g) {
	if(g.result !== "-") {
	    createPdfResultsPage(myTournament.outputFile + "_" + g.round + ".pdf", g, myTournament);
	}
    });
    fs.writeFileSync(myTournament.outputFile + "_toplist" + ".html", createHtmlTopListPage(myTournament));
    fs.writeFileSync(myTournament.outputFile + "_penaltylist" + ".html", createHtmlPenaltyListPage(myTournament));
    fs.writeFileSync(myTournament.outputFile + "_positions" + ".html", createHtmlPositionsPage(myTournament));
}

function createPreviewHtmlPage(tournament) {
    createTournamentHtmlPages(tournament);
    var header = "<!DOCTYPE html><meta charset=\"UTF-8\"><style>table { font-family: arial, sans-serif; border-collapse: collapse; width: 100%; } td, th { border: 1px solid #dddddd; text-align: left; padding: 8px; } </style><table><tr><th>Ottelu</th><th>Kotijoukkue</th><th>Vierasjoukkue</th><th>Aika</th><th>Tulos</th></tr>";
    var mainBody = createMainResultBody(tournament) + "</table>";
    var resultsBody = createTournamentPositionResults(tournament);
    var tableBody = [];
    tournament.games.forEach(function(g) {
	var finalGame = "";
	if(g.isFinalGame) {
	    finalGame = " [Finaali]";
	}
	tableBody.push("<br><table><tr><th colspan=5>" + getTeamNameById(g.home) + " - " + getTeamNameById(g.guest) + finalGame + "</th></tr><tr><th>Aika</th><th>Piste</th><th>Tyyppi</th><th>Maalintekijä</th><th>Syöttäjä</th></tr><tr><td></td><td></td><td></td><td></td><td></td></tr>");
	tableBody.push(createSubResultBody(g));
	tableBody.push("</table>");
    });
    var topListHeader = "<br><table><tr><th colspan=2>Toplist</th></tr><tr><th>Pelaaja</th><th>Tehopisteet</th></tr><tr><td></td><td></td></tr>";
    var penaltyListHeader = "<br><table><tr><th colspan=2>Penaltylist</th></tr><tr><th>Pelaaja</th><th>Rangaistus</th></tr><tr><td></td><td></td></tr>";
    return header + mainBody + resultsBody + tableBody.join().replace(/,/g, '') + topListHeader + createHtmlTopListBody(tournament) + penaltyListHeader + createHtmlPenaltyListBody(tournament) + "</html>"
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

function createPdfResultsPage(filename, game, tournament) {
    var teams = { home:
		  { name: getTeamNameById(game.home),
		    players: getPlayerListWithScoresAndPenalties(game.home, game) },
		  guest:
		  { name: getTeamNameById(game.guest),
		    players: getPlayerListWithScoresAndPenalties(game.guest, game) } };
				    
    var results = { home: getTeamScoresAndPenalties(game.home, game),
		    guest: getTeamScoresAndPenalties(game.guest, game) };

    var scoreSet = [ {home:0, guest: 0},
		     {home:0, guest: 0},
		     {home:0, guest: 0},
		     {home:0, guest: 0},
		     {home:0, guest: 0} ];
    results.home.scores.forEach(function(s) {
	if(s.code === "RL -") { // no score for failed penalty shot
	} else {
	    if(gameSecondsFromTime(s.time) < gameSecondsFromTime(tournament.roundLength + ":00")) {
		scoreSet[0].home++;
	    }
	    if((gameSecondsFromTime(s.time) >= gameSecondsFromTime(tournament.roundLength + ":00")) &&
	       (gameSecondsFromTime(s.time) < gameSecondsFromTime(tournament.roundLength + ":00")*2)) {
		scoreSet[1].home++;
	    }
	    if((gameSecondsFromTime(s.time) >= gameSecondsFromTime(tournament.roundLength + ":00")*2) &&
	       (gameSecondsFromTime(s.time) < gameSecondsFromTime(tournament.roundLength + ":00")*3)) {
		scoreSet[2].home++;
	    }
	}
    });
    results.guest.scores.forEach(function(s) {
	if(s.code === "RL -") { // no score for failed penalty shot
	} else {
	    if(gameSecondsFromTime(s.time) < gameSecondsFromTime(tournament.roundLength + ":00")) {
		scoreSet[0].guest++;
	    }
	    if((gameSecondsFromTime(s.time) >= gameSecondsFromTime(tournament.roundLength + ":00")) &&
	       (gameSecondsFromTime(s.time) < gameSecondsFromTime(tournament.roundLength + ":00")*2)) {
		scoreSet[1].guest++;
	    }
	    if((gameSecondsFromTime(s.time) >= gameSecondsFromTime(tournament.roundLength + ":00")*2) &&
	       (gameSecondsFromTime(s.time) < gameSecondsFromTime(tournament.roundLength + ":00")*3)) {
		scoreSet[2].guest++;
	    }
	}
    });

    var match = { series: tournament.name,
		  number: game.round,
		  scores: scoreSet,
		  officials: game.officials,
		  referees: game.referees,
		  timeOut: game.timeOut,
		  spectators: tournament.spectators,
		  date: tournament.date,
		  start: game.start,
		  end: game.end,
		  venue: tournament.venue };


    pdfprinter.printSheet(filename, teams, results, match);
}

function gameSecondsFromTime(time) {
    return  (parseInt(time.split(":")[0]) * 60) + parseInt(time.split(":")[1]);
}

function getPlayerListWithScoresAndPenalties(teamId, game) {
    var team = getTeamPlayers(teamId);
    sortAscendingNumber("number", team);
    var players = [];
    team.forEach(function(p) {
	var goal = 0;
	var pass = 0;
	var penalty = 0;
	game.scores.forEach(function(s) {
	    if(s.type !== "RL -") {
		if(p.id === s.scorer) { goal++; }
		if(p.id === s.passer) { pass++; }
	    }
	});
	game.penalties.forEach(function(t) {
	    if(p.id === t.player) { penalty++; }
	});
	if(goal === 0) { goal = ""; }
	if(pass === 0) { pass = ""; }
	if(penalty === 0) { penalty = ""; }
	players.push({ name: p.name,
		       number: p.number,
		       role: p.role,
		       goal: goal,
		       pass: pass,
		       penalty: penalty });
    });
    return players;
}

function getTeamScoresAndPenalties(teamId, game) {
    var scores = [];
    var penalties = [];
    game.scores.forEach(function(s) {
	if(s.point === teamId) {
	    scores.push( { time: s.time,
			   goal: getPlayerNumberById(s.scorer),
			   pass: getPlayerNumberById(s.passer),
			   code: s.type } );
	}
    });
    game.penalties.forEach(function(p) {
	if(p.penalty === teamId) {
	    penalties.push( { player: getPlayerNumberById(p.player),
			      length: parseInt(p.length),
			      code: p.code.split(" ")[0],
			      start: p.starttime,
			      end: p.endtime } );
	}
    });
    return { scores: scores,
	     penalties: penalties };
}

function createMainResultBody(tournament) {
    var tableBody = [];
    tournament.games.forEach(function(g) {
	var finalGame = "";
	if(g.isFinalGame) {
	    finalGame = " [Finaali]";
	}
	var resultPageLink = "-"
	if(g.result !== "-") {
	    resultPageLink = "<a href=\"" + tournament.outputFile.substring(tournament.outputFile.lastIndexOf("/")+1) + "_" + g.round + ".pdf\">" +  g.result + "</a>";
	}
	tableBody.push("<tr><td>" + g.round + finalGame + "</td><td>" + getTeamNameById(g.home) +
		       "</td><td>" + getTeamNameById(g.guest) + "</td><td>" + g.time +
		       "</td><td " + getGameScoresAsTooltip(g.scores) + " >" + resultPageLink + "</td></tr>")
    });
    return tableBody.join().replace(/,/g, '');
}

function createTournamentPositionResults(tournament) {
    var positions = [];
    tournament.games.forEach(function(g) {
	var flag = true;
	positions.forEach(function(p) { if((p.name === g.home) || g.isFinalGame) { flag = false; }});
	if(flag) {
	    positions.push( { name: g.home, wins: 0, evens: 0, loses: 0, scoresMade: 0, scoresLost: 0 } );
	}
    });
    positions.forEach(function(t) {
	tournament.games.forEach(function(g) {
	    if((t.name === g.home) && !g.isFinalGame) {
		if((getScores(g.scores, g.home) !== 0) || (getScores(g.scores, g.guest) !== 0)) {
		    t.scoresMade += getScores(g.scores, g.home);
		    t.scoresLost += getScores(g.scores, g.guest);
		    if(getScores(g.scores, g.home) > getScores(g.scores, g.guest)) { t.wins++; }
		    if(getScores(g.scores, g.home) === getScores(g.scores, g.guest)) { t.evens++; }
		    if(getScores(g.scores, g.home) < getScores(g.scores, g.guest)) { t.loses++; }
		}
	    }
	    if((t.name === g.guest) && !g.isFinalGame) {
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
	t.points = t.wins * 2 + t.evens;
	t.order = t.points * 100 + t.difference;
    });
    sortDescending("order", positions);
    var tableHeader = "<br><table><tr><th colspan=8>SIJOITUS</th></tr><tr><th>Joukkue</th><th>V</th><th>H</th><th>T</th><th>TM</th><th>PM</th><th>ME</th><th>Pisteet</th></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>";
    var tableBody = [];
    positions.forEach(function(t) {
	tableBody.push("<tr><td>" + getTeamNameById(t.name) + "</td><td>" + t.wins + "</td><td>" + t.loses + "</td><td>" + t.evens +
		       "</td><td>" + t.scoresMade + "</td><td>" + t.scoresLost + "</td><td>" + t.difference + "</td><td>" + t.points + "</td></tr>");
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
	if((s.type === "M") || (s.type === "YV") || (s.type === "AV") ||
	   (s.type === "TV") || (s.type === "SR") || (s.type === "TM")) {
	    scorer = getPlayerNameById(s.scorer);
	    passer = getPlayerNameById(s.passer);
	    row = "Maali</td><td>" + scorer + "</td><td>" + passer;
	}
	if(s.type === "RL OK") {
	    scorer = getPlayerNameById(s.scorer);
	    row = "Rangaistuslaukaus</td><td>" + scorer + "</td><td>";
	}
	if(s.type === "RL -") {
	    scorer = getPlayerNameById(s.scorer);
	    row = "Epäonnistunut Rangaistuslaukaus</td><td>" + scorer + "</td><td>";
	}
	if(s.type === "OM") {
	    row = "Oma Maali" + "</td><td>" + "</td><td>";
	}
	tableBody.push("<tr><td>" + s.time + "</td><td>" + getTeamNameById(s.point) + "</td><td>" + row + "</td></tr>");
    });
    return tableBody.join().replace(/,/g, '');
}

function getGameScoresAsTooltip(scores) {
    return  "title = \"&#013;" + scores.map(function(s) {
	if(s.type === "maali") {
	    return s.time + " -- Maali: " + getTeamNameById(s.point) + "; score: " + s.scorer.name + "; pass: " + s.passer.name + "&#013;&#013;";
	}
	if(s.type === "RL OK") {
	    return s.time + " -- Rangaistuslaukaus: " + getTeamNameById(s.point) + "; score: " + s.scorer.name + "&#013;&#013;";
	}
	if(s.type === "RL -") {
	    return s.time + " -- Epäonnistunut Rangaistuslaukaus: " + getTeamNameById(s.point) + "; score: " + s.scorer.name + "&#013;&#013;";
	}
	if(s.type === "OM") {
	    return s.time + " -- Oma Maali: " + getTeamNameById(s.point) + "&#013;&#013;";
	}
    }).filter(function(f) { return f; }).toString().replace(/,/g, '') + "&#013;\"";
}

function createHtmlTopListPage(tournament) {
    var header = "<!DOCTYPE html><meta charset=\"UTF-8\"><style>table { font-family: arial, sans-serif; border-collapse: collapse; width: 100%; } td, th { border: 1px solid #dddddd; text-align: left; padding: 8px; } </style><table><tr><th>Pelaaja</th><th>Tehopisteet</th></tr><tr><td></td><td></td></tr>";
    return header + createHtmlTopListBody(tournament) + "</html>";
}

function createHtmlTopListBody(tournament) {
    var allPlayers = [];
    datastorage.read("players").players.forEach(function(p) {
	allPlayers.push({ id: p.id, name: p.name, number: p.number, scores: 0, passes: 0, key: 0 });
    });
    allPlayers.forEach(function(p) {
	tournament.games.forEach(function(g) {
	    g.scores.forEach(function(s) {
		if(p.id === s.scorer) { p.scores++; p.key = p.key + 101; }
		if(p.id === s.passer) { p.passes++; p.key = p.key + 100; }
	    });
	});
    });
    var topPlayers = allPlayers.filter(function(p) {
	if(p.key > 0) { return p; }
    });
    sortDescending("key", topPlayers);
    var tableBody = [];
    topPlayers.forEach(function(p) {
	tableBody.push("<tr><td>" + p.name + "</td><td>" + p.scores + " + " + p.passes + "</td></tr>");
    });
    return tableBody.join().replace(/,/g, '') + "</table>";
}

function createHtmlPenaltyListPage(tournament) {
    var header = "<!DOCTYPE html><meta charset=\"UTF-8\"><style>table { font-family: arial, sans-serif; border-collapse: collapse; width: 100%; } td, th { border: 1px solid #dddddd; text-align: left; padding: 8px; } </style><table><tr><th>Pelaaja</th><th>Rangaistus</th></tr><tr><td></td><td></td></tr>";
    return header + createHtmlPenaltyListBody(tournament) + "</html>";
}

function createHtmlPenaltyListBody(tournament) {
    var tableBody = [];
    tournament.games.forEach(function(g) {
	g.penalties.forEach(function(p) {
	    tableBody.push("<tr><td>" + getPlayerNameById(p.player) + "</td><td>" + p.code + "</td></tr>");
	});
    });
    return tableBody.join().replace(/,/g, '') + "</table>";
}

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

var sortDescending = function(prop, arr) {
    arr.sort(function(a, b) {
        if(a[prop] > b[prop]) {
            return -1;
        } else if(a[prop] < b[prop]) {
            return 1;
        } else {
            return 0;
        }
    });
};

function calculateResultFromScores(scores, teams) {
    var home = 0;
    var guest = 0;
    scores.forEach(function(s) {
	if(s.point === teams.home) { home++; }
	if(s.point === teams.guest) { guest++; }
    });
    return home + " - " + guest;
}


// input data verification and formatters

function inputItemsFailVerification(inputData) {
    if(inputData.items === undefined) {
	framework.servicelog("inputData does not contain items");
	return true;
    }
    if(inputData.buttonList === undefined) {
	framework.servicelog("inputData does not contain buttonList");
	return true;
    }
    return false;
}

function extractGamesDataFromInputData(data) {
    if(inputItemsFailVerification(data)) {
	return null;
    }
    var configuration = {};
    var games = [];
    var round = 1;
    data.items.forEach(function(i) {
	if(i.frameId === 0) {
	    configuration.date = i.frame[0][1][0].value;
	    configuration.venue = i.frame[1][1][0].value;
	    configuration.roundLength = i.frame[2][1][0].selected;
	}
	if(i.frameId === 1) {
	    i.frame.forEach(function(g) {
		games.push({ round: round++,
			     time: g[0][0].value,
			     home: getTeamIdFromTag(g[1][0].selected),
			     guest: getTeamIdFromTag(g[2][0].selected),
			     result: "-",
			     scores: [],
			     penalties: [],
			     isFinalGame: g[3][0].checked });
	    });
	}
    });
    return { configuration: configuration,
	     games: games };
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
	    teams.push({ id: t[0][0].key,
			 tag:  t[0][0].value,
			 name: t[1][0].value });
	});
    });
    return teams;
}

function extractSingleTeamDataFromInputData(data) {
    if(inputItemsFailVerification(data)) {
	return null;
    }
    var inputList = [];
    data.items.forEach(function(i) {
	i.frame.forEach(function(p) {
	    inputList.push(p[0][0].selected);
	});
    });
    var players = [];
    inputList.forEach(function(i) {
	datastorage.read("players").players.forEach(function(p) {
	    if(p.team + " / " + p.name + " / " + p.number === i) {
		players.push(p.id);
	    }
	});
    });
    return players;
}

function extractMatchStatisticsFromInputData(isFinalGame, teams, data) {
    if(inputItemsFailVerification(data)) {
	return null;
    }
    var scoreFrameNumber = 0;
    var penaltyFrameNumber = 1;
    if(isFinalGame) {
	scoreFrameNumber = 1;
	penaltyFrameNumber = 2;
    }
    var scores = [];
    var penalties = [];
    data.items.forEach(function(i) {
	if(i.frameId === scoreFrameNumber) {
	    i.frame.forEach(function(m) {
		var scorer = getPlayerIdByNameAndNumber(m[3][0].selected.slice(m[3][0].selected.indexOf(' | ') + 3, m[3][0].selected.indexOf(' (')),
							m[3][0].selected.slice(m[3][0].selected.indexOf(' (') + 2, m[3][0].selected.indexOf(')')));
		var passer = getPlayerIdByNameAndNumber(m[4][0].selected.slice(m[4][0].selected.indexOf(' | ') + 3, m[4][0].selected.indexOf(' (')),
							m[4][0].selected.slice(m[4][0].selected.indexOf(' (') + 2, m[4][0].selected.indexOf(')')));
		scores.push({ point: getTeamIdFromNameInIdList(m[0][0].selected, teams),
			      type: m[1][0].selected,
			      time: m[2][0].value,
			      scorer: scorer,
			      passer: passer });
	    });
	}
	if(i.frameId === penaltyFrameNumber) {
	    i.frame.forEach(function(m) {
		var person = getPlayerIdByNameAndNumber(m[5][0].selected.slice(m[5][0].selected.indexOf(' | ') + 3, m[5][0].selected.indexOf(' (')),
							m[5][0].selected.slice(m[5][0].selected.indexOf(' (') + 2, m[5][0].selected.indexOf(')')));
		penalties.push({ penalty: getTeamIdFromNameInIdList(m[0][0].selected, teams),
				 starttime: m[1][0].value,
				 endtime: m[2][0].value,
				 code: m[3][0].selected,
				 length: m[4][0].selected,
				 player: person });
	    });
	}
    });
    return { scores: scores, penalties: penalties };
}


// help screens for panels

function processGetTournamentMainHelp(cookie, data) {
    framework.servicelog("Client #" + cookie.count + " requests main tournament help page");
    var helpWebPage = fs.readFileSync("htmlpages/TournamentMainHelp.html");

    sendable = { type: "showHtmlPage",
		 content: helpWebPage.toString("utf8") };
    framework.sendCipherTextToClient(cookie, sendable);
    framework.servicelog("Sent html page to client");
}

function processGetAllTournamentsEditHelp(cookie, data) {
    framework.servicelog("Client #" + cookie.count + " requests tournament data edit help page");
    var helpWebPage = fs.readFileSync("htmlpages/AllTournamentsEditHelp.html");

    sendable = { type: "showHtmlPage",
		 content: helpWebPage.toString("utf8") };
    framework.sendCipherTextToClient(cookie, sendable);
    framework.servicelog("Sent html page to client");
}


// console commands operate on raw data

function sendConsoleAcknowledge(cookie) {
    var sendable = { type: "rawDataMessage",
		     content: { type: "commandAcknowledge",
				data: { status: true } } };
    framework.sendCipherTextToClient(cookie, sendable);
}

function sendConsoleError(cookie, error) {
    var sendable = { type: "rawDataMessage",
		     content: { type: "commandAcknowledge",
				data: { status: false,
					error: error } } };
    framework.sendCipherTextToClient(cookie, sendable);
}

function processCommandGetPlayerList(cookie, data) {
    framework.servicelog("Console client #" + cookie.count + " requests player list");
    if(framework.userHasPrivilige("player-view", cookie.user)) {
	var playerList = [];
	datastorage.read("players").players.forEach(function(p) {
	    playerList.push(p);
	});
	var sendable = { type: "rawDataMessage",
			 content: { type: "playerList", data: playerList } };
	framework.sendCipherTextToClient(cookie, sendable);
	framework.servicelog("Sent player list to console client");
    } else {
	framework.servicelog("Console user " + cookie.user.username + " does not have priviliges to list players");
	sendConsoleError(cookie, "No permission to list players");
    }
}

function processCommandAddPlayerToList(cookie, data) {
    framework.servicelog("Console client #" + cookie.count + " requests adding a player to list");
    if(framework.userHasPrivilige("player-edit", cookie.user)) {
	newPlayer = data.player.split(",");
	if(newPlayer.length !== 4) {
	    framework.servicelog("Malformed player add request: " + JSON.stringify(data.player.split(",")));
	    sendConsoleError(cookie, "Malformed player add request");
	    return;
	}
	var players = datastorage.read("players");
	players.players.push( { id: players.nextId,
				name: newPlayer[0],
				number: newPlayer[1],
				role: newPlayer[2],
				team: newPlayer[3] } );
	players.nextId++;
	if(datastorage.write("players", players) === false) {
	    framework.servicelog("Updating players database failed");
	    sendConsoleError(cookie, "Database update failed");
	} else {
	    framework.servicelog("added new player " + JSON.stringify(newPlayer));
	    sendConsoleAcknowledge(cookie);
	}
    } else {
	framework.servicelog("Console user " + cookie.user.username + " does not have priviliges to add players");
	sendConsoleError(cookie, "No permission to add players");
    }
}

function processCommandDeletePlayerFromList(cookie, data) {
    framework.servicelog("Console client #" + cookie.count + " requests deleting a player from list");
    if(framework.userHasPrivilige("player-delete", cookie.user)) {
	var id = parseInt(data.id) || 0;
	if(getPlayerNameById(id).length === 0) {
	    framework.servicelog("Player #" + id + " not found in database");
	    sendConsoleError(cookie, "Player does not exist");
	    return;
	}
	var newPlayers = [];
	var deletedPlayer = [];
	var oldPlayers = datastorage.read("players");
	var nextId = oldPlayers.nextId;
	oldPlayers.players.forEach(function(p) {
	    if(p.id !== id) { newPlayers.push(p); }
	    else { deletedPlayer.push(p) }
	});
	if(datastorage.write("players", { nextId: nextId, players: newPlayers }) === false) {
	    framework.servicelog("Updating players database failed");
	    sendConsoleError(cookie, "Database update failed");
	} else {
	    sendConsoleAcknowledge(cookie);
	    framework.servicelog("Deleted player " + JSON.stringify(deletedPlayer));
	}
    } else {
	framework.servicelog("Console user " + cookie.user.username + " does not have priviliges to delete players");
	sendConsoleError(cookie, "No permission to delete players");
    }
}

function processCommandModifyPlayerInList(cookie, data) {
    framework.servicelog("Console client #" + cookie.count + " requests editing a player");
    if(framework.userHasPrivilige("player-edit", cookie.user)) {
	var id = parseInt(data.id) || 0;
	if(getPlayerNameById(id).length === 0) {
	    framework.servicelog("Player #" + id + " not found in database");
	    sendConsoleError(cookie, "Player does not exist");
	    return;
	}
	newPlayerDetails = data.player.split(",");
	if(newPlayerDetails.length !== 4) {
	    framework.servicelog("Malformed player modify request: " + JSON.stringify(data.player.split(",")));
	    sendConsoleError(cookie, "Malformed player modify request");
	    return;
	}
	var newPlayers = [];
	var replacedPlayer = [];
	var replacingPlayer = { id: id,
				name: newPlayerDetails[0],
				number: newPlayerDetails[1],
				role: newPlayerDetails[2],
				team: newPlayerDetails[3] };
	var oldPlayers = datastorage.read("players");
	var nextId = oldPlayers.nextId;
	oldPlayers.players.forEach(function(p) {
	    if(p.id !== id) { newPlayers.push(p); }
	    else {
		replacedPlayer.push(p);
		newPlayers.push(replacingPlayer);
	    }
	});
	if(datastorage.write("players", { nextId: nextId, players: newPlayers }) === false) {
	    framework.servicelog("Updating players database failed");
	    sendConsoleError(cookie, "Database update failed");
	} else {
	    sendConsoleAcknowledge(cookie);
	    framework.servicelog("Changed player " + JSON.stringify(replacedPlayer) +
				 " --> " + JSON.stringify(replacingPlayer));
	}
    } else {
	framework.servicelog("Console user " + cookie.user.username + " does not have priviliges to modify players");
	sendConsoleError(cookie, "No permission to modify players");
    }
}

function processCommandGetTeamList(cookie, data) {
    framework.servicelog("Console client #" + cookie.count + " requests team list");
    if(framework.userHasPrivilige("team-view", cookie.user)) {
	var teamList = [];
	datastorage.read("teams").teams.forEach(function(t) {
	    teamList.push(t);
	});
	var sendable = { type: "rawDataMessage",
			 content: { type: "teamList", data: teamList } };
	framework.sendCipherTextToClient(cookie, sendable);
	framework.servicelog("Sent team list to console client");
    } else {
	framework.servicelog("Console user " + cookie.user.username + " does not have priviliges to list teams");
	sendConsoleError(cookie, "No permission to list teams");
    }
}

function processCommandListSingleTeam(cookie, data) {
    framework.servicelog("Console client #" + cookie.count + " requests single team");
    if(framework.userHasPrivilige("team-view", cookie.user) &&
       framework.userHasPrivilige("player-view", cookie.user)) {
	var id = parseInt(data.id) || 0;
	if(getTeamById(id) === null) {
	    framework.servicelog("Team #" + id + " not found in database");
	    sendConsoleError(cookie, "Team does not exist");
	    return;
	}
	var teamFlag = false;
	var teamPlayers = [];
	var players = datastorage.read("players").players;
	datastorage.read("teams").teams.forEach(function(t) {
	    if(id === t.id) {
		teamFlag = true;
		t.players.forEach(function(p) {
		    players.forEach(function(q) {
			if(p === q.id) {
			    teamPlayers.push(q);
			}
		    });
		});
	    }
	});
	if(!teamFlag) {
	    framework.servicelog("Team #" + id + " not found in database");
	    sendConsoleError(cookie, "Team does not exist");
	} else {
	    var sendable = { type: "rawDataMessage",
			     content: { type: "teamPlayerList", data: teamPlayers } };
	    framework.sendCipherTextToClient(cookie, sendable);
	    framework.servicelog("Sent single team players to console client");
	}
    } else {
	framework.servicelog("Console user " + cookie.user.username + " does not have priviliges to list team players");
	sendConsoleError(cookie, "No permission to list teams");
    }
}

function processCommandAddTeamPlayer(cookie, data) {
    framework.servicelog("Console client #" + cookie.count + " requests adding player to team");
    if(framework.userHasPrivilige("team-edit", cookie.user) &&
       framework.userHasPrivilige("player-view", cookie.user)) {
	var teamId = parseInt(data.teamId) || 0;
	if(getTeamById(teamId) === null) {
	    framework.servicelog("Team #" + teamId + " not found in database");
	    sendConsoleError(cookie, "Team does not exist");
	    return;
	}
	var playerId = parseInt(data.playerId) || 0;
	if(getPlayerNameById(playerId).length === 0) {
	    framework.servicelog("Player #" + playerId + " not found in database");
	    sendConsoleError(cookie, "Player does not exist");
	    return;
	}
	var teamFlag = false;
	var extraPlayerFlag = false;
	var newTeams = [];
	var newPlayers = [];
	var nextId = datastorage.read("teams").nextId;
	datastorage.read("teams").teams.forEach(function(t) {
	    if(t.id === teamId) {
		teamFlag = true;
		t.players.forEach(function(p) {
		    newPlayers.push(p);
		    if(p === playerId) { extraPlayerFlag = true; }
		});
		if(!extraPlayerFlag) { newPlayers.push(playerId); }
		newTeams.push( { id: teamId,
				 name: t.name,
				 tag: t.tag,
				 players: newPlayers } );
	    } else { newTeams.push(t); }
	});
	if(extraPlayerFlag) {
	    framework.servicelog("Player #" + playerId + " is already in team #" + teamId);
	    sendConsoleError(cookie, "Player is already in team");
	    return;
	} else {
	    if(datastorage.write("teams", { nextId: nextId, teams: newTeams }) === false) {
		framework.servicelog("Updating players database failed");
		sendConsoleError(cookie, "Database update failed");
	    } else {
		sendConsoleAcknowledge(cookie);
		framework.servicelog("Added player #" + playerId + " to team #" + teamId);
		return;
	    }
	}
    } else {
	framework.servicelog("Console user " + cookie.user.username + " does not have priviliges to edit teams");
	sendConsoleError(cookie, "No permission to edit teams");
    }
}

function processCommandDeleteTeamPlayer(cookie, data) {
    framework.servicelog("Console client #" + cookie.count + " requests deleting player from team");
    if(framework.userHasPrivilige("team-edit", cookie.user) &&
       framework.userHasPrivilige("player-view", cookie.user)) {
	var teamId = parseInt(data.teamId) || 0;
	if(getTeamById(teamId) === null) {
	    framework.servicelog("Team #" + teamId + " not found in database");
	    sendConsoleError(cookie, "Team does not exist");
	    return;
	}
	var playerId = parseInt(data.playerId) || 0;
	if(getPlayerNameById(playerId).length === 0) {
	    framework.servicelog("Player #" + playerId + " not found in database");
	    sendConsoleError(cookie, "Player does not exist");
	    return;
	}
	var playerFlag = false;
	getTeamPlayers(teamId).forEach(function(p) {
	    if(p.id === playerId) { playerFlag = true; }
	});
	if(!playerFlag) {
	    framework.servicelog("Player #" + playerId + " not found in team #" + teamId);
	    sendConsoleError(cookie, "Player is not in team");
	    return;
	}
	var newTeams = [];
	var newPlayers = [];
	var nextId = datastorage.read("teams").nextId;
	datastorage.read("teams").teams.forEach(function(t) {
	    if(t.id === teamId) {
		t.players.forEach(function(p) {
		    if(p !== playerId) { newPlayers.push(p); }
		});
		newTeams.push( { id: teamId,
				 name: t.name,
				 tag: t.tag,
				 players: newPlayers } );
	    } else { newTeams.push(t); }
	});
	if(datastorage.write("teams", { nextId: nextId, teams: newTeams }) === false) {
	    framework.servicelog("Updating players database failed");
	    sendConsoleError(cookie, "Database update failed");
	} else {
	    sendConsoleAcknowledge(cookie);
	    framework.servicelog("deleted player #" + playerId + " from team #" + teamId);
	    return;
	}
    } else {
	framework.servicelog("Console user " + cookie.user.username + " does not have priviliges to edit teams");
	sendConsoleError(cookie, "No permission to edit teams");
    }
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
	framework.servicelog("Updated teams database write failed");
	process.exit(1);
    } else {
	framework.servicelog("Updated teams database to v.1");
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
	framework.servicelog("Updating tournaments database failed");
	process.exit(1);
    } else {
	framework.servicelog("Updated tournaments database to v.1");
    }
    var mainConfig = datastorage.read("main").main;
    mainConfig.version = 1;
    if(datastorage.write("main", { main: mainConfig }) === false) {
	framework.servicelog("Updating main database failed");
	process.exit(1);
    } else {
	framework.servicelog("Updated main database to v.1");
    }
}

function updateDatabaseVersionTo_2() {
    var newTournaments = [];
    var nextId = 1;
    datastorage.read("tournaments").tournaments.forEach(function(t) {
	var newGames = [];
	t.games.forEach(function(g) {
	    newGames.push({ round: g.round,
			    home: g.home,
			    guest: g.guest,
			    result: g.result,
			    time: g.time,
			    scores: g.scores,
			    penalties: [] });
	});
	newTournaments.push({ id: nextId++,
			      name: t.name,
			      locked: t.locked,
			      outputFile: t.outputFile,
			      games: newGames });
    });
    if(datastorage.write("tournaments", { nextId: nextId, tournaments: newTournaments }) === false) {
	framework.servicelog("Updating tournaments database failed");
	process.exit(1);
    } else {
	framework.servicelog("Updated tournaments database to v.2");
    }
    var mainConfig = datastorage.read("main").main;
    mainConfig.version = 2;
    if(datastorage.write("main", { main: mainConfig }) === false) {
	framework.servicelog("Updating main database failed");
	process.exit(1);
    } else {
	framework.servicelog("Updated main database to v.2");
    }
}

function updateDatabaseVersionTo_3() {
    var newTournaments = [];
    var nextId = 1;
    datastorage.read("tournaments").tournaments.forEach(function(t) {
	var newGames = [];
	t.games.forEach(function(g) {
	    var newScores = [];
	    g.scores.forEach(function(s) {
		var scoreType = "";
		if(s.type === "maali") { scoreType = "M"; }
		if(s.type === "rankkari") { scoreType = "RL"; }
		if(s.type === "omari") { scoreType = "OM"; }
		newScores.push({ point: s.point,
				 type: scoreType,
				 time: s.time,
				 scorer: s.scorer,
				 passer: s.passer });
	    });
	    var newPenalties = [];
	    g.penalties.forEach(function(p) {
		newPenalties.push({ penalty: p.penalty,
				    starttime: p.time,
				    endtime: "",
				    code: p.code,
				    length: p.length,
				    player: p.player });
	    });
	    newGames.push({ round: g.round,
			    home: g.home,
			    guest: g.guest,
			    result: g.result,
			    time: g.time,
			    scores: newScores,
			    penalties: newPenalties });
	});
	newTournaments.push({ id: nextId++,
			      name: t.name,
			      locked: t.locked,
			      outputFile: t.outputFile,
			      games: newGames });
    });
    if(datastorage.write("tournaments", { nextId: nextId, tournaments: newTournaments }) === false) {
	framework.servicelog("Updating tournaments database failed");
	process.exit(1);
    } else {
	framework.servicelog("Updated tournaments database to v.3");
    }
    var mainConfig = datastorage.read("main").main;
    mainConfig.version = 3;
    if(datastorage.write("main", { main: mainConfig }) === false) {
	framework.servicelog("Updating main database failed");
	process.exit(1);
    } else {
	framework.servicelog("Updated main database to v.3");
    }
}

function updateDatabaseVersionTo_4() {
    var newTournaments = [];
    var nextId = 1;
    datastorage.read("tournaments").tournaments.forEach(function(t) {
	var newGames = [];
	t.games.forEach(function(g) {
	    var newScores = [];
	    newGames.push({ round: g.round,
			    home: g.home,
			    guest: g.guest,
			    result: g.result,
			    time: g.time,
			    scores: g.scores,
			    penalties: g.penalties,
			    isFinalGame: false });
	});
	newTournaments.push({ id: nextId++,
			      name: t.name,
			      locked: t.locked,
			      outputFile: t.outputFile,
			      games: newGames });
    });
    if(datastorage.write("tournaments", { nextId: nextId, tournaments: newTournaments }) === false) {
	framework.servicelog("Updating tournaments database failed");
	process.exit(1);
    } else {
	framework.servicelog("Updated tournaments database to v.4");
    }
    var mainConfig = datastorage.read("main").main;
    mainConfig.version = 4;
    if(datastorage.write("main", { main: mainConfig }) === false) {
	framework.servicelog("Updating main database failed");
	process.exit(1);
    } else {
	framework.servicelog("Updated main database to v.4");
    }
}

function updateDatabaseVersionTo_5() {
    var allPlayers = [];
    datastorage.read("teams").teams.forEach(function(t) {
	t.players.forEach(function(p) {
	    allPlayers.push({ name: p.name,
			      number: p.number,
			      team: t.name });
	});
    });
    sortAscending("name", allPlayers);
    var newPlayers = [];
    var playersNextId = 1;
    allPlayers.filter(function(item, pos, ary) {
        return !pos || item.name != ary[pos - 1].name;
    }).forEach(function(p) {
	newPlayers.push({ id: playersNextId++,
			  name: p.name,
			  number: p.number,
			  team: p.team,
			  role: "" });
    });
    if(datastorage.write("players", { nextId: playersNextId, players: newPlayers }) === false) {
	framework.servicelog("Updating players database failed");
	process.exit(1);
    } else {
	framework.servicelog("Updated players database to v.5");
    }
    var newTeams = [];
    var teamsNextId = 1;
    var teamsTranslationTable = [];
    datastorage.read("teams").teams.forEach(function(t) {
	var teamPlayers = [];
	teamsTranslationTable.push({ oldId: t.id, newId: teamsNextId });
	t.players.forEach(function(p) {
	    newPlayers.forEach(function(n) {
		if(p.name === n.name) { teamPlayers.push(n.id); }
		});
	});
	newTeams.push({ id: teamsNextId++,
			name: t.name,
			tag: t.name,
			players: teamPlayers });
    });
    if(datastorage.write("teams", { nextId: teamsNextId, teams: newTeams }) === false) {
	framework.servicelog("Updating teams database failed");
	process.exit(1);
    } else {
	framework.servicelog("Updated teams database to v.5");
    }
    var newTournaments = [];
    var tournamentsNextId = 1;
    datastorage.read("tournaments").tournaments.forEach(function(t) {
	var newGames = [];
	t.games.forEach(function(g) {
	    var newScores = [];
	    g.scores.forEach(function(s) {
		newScores.push({ point: s.point,
				 type: s.type,
				 time: s.time,
				 scorer: getPlayerIdByName(s.scorer.name),
				 passer: getPlayerIdByName(s.passer.name) });
	    });
	    var newPenalties = [];
	    g.penalties.forEach(function(p) {
		newPenalties.push({ penalty: p.penalty,
				    starttime: p.starttime,
				    endtime: p.endtime,
				    code: p.code,
				    length: p.length,
				    player: getPlayerIdByName(p.player.name) });
	    });
	    var home = teamsTranslationTable.map(function(a) {
		if(a.oldId === g.home) { return a.newId; }
	    }).filter(function(f) { return f; })[0];
	    newGames.push({ round: g.round,
			    home: teamsTranslationTable.map(function(a) {
				if(a.oldId === g.home) { return a.newId; }
			    }).filter(function(f) { return f; })[0],
			    guest: teamsTranslationTable.map(function(a) {
				if(a.oldId === g.guest) { return a.newId; }
			    }).filter(function(f) { return f; })[0],
			    result: g.result,
			    time: g.time,
			    scores: newScores,
			    penalties: newPenalties,
			    isFinalGame: g.isFinalGame });
	});
	newTournaments.push({ id: tournamentsNextId++,
			      name: t.name,
			      locked: t.locked,
			      outputFile: t.outputFile,
			      games: newGames });
    });
    if(datastorage.write("tournaments", { nextId: tournamentsNextId, tournaments: newTournaments }) === false) {
	framework.servicelog("Updating tournaments database failed");
	process.exit(1);
    } else {
	framework.servicelog("Updated tournaments database to v.5");
    }
    var mainConfig = datastorage.read("main").main;
    mainConfig.version = 5;
    if(datastorage.write("main", { main: mainConfig }) === false) {
	framework.servicelog("Updating main database failed");
	process.exit(1);
    } else {
	framework.servicelog("Updated main database to v.5");
    }
}

function updateDatabaseVersionTo_6() {
    var tournaments = [];
    var nextId = datastorage.read("tournaments").nextId;
    datastorage.read("tournaments").tournaments.forEach(function(t) {
	tournaments.push("tournament_" + t.id);
	datastorage.initialize("tournament_" + t.id, { tournament: t }, true);
    });
    if(datastorage.write("tournaments", { nextId: nextId, tournaments: tournaments }) === false) {
	framework.servicelog("Updating tournament database failed");
	process.exit(1);
    } else {
	framework.servicelog("Updated tournaments database to v.6");
    }
    var mainConfig = datastorage.read("main").main;
    mainConfig.version = 6;
    if(datastorage.write("main", { main: mainConfig }) === false) {
	framework.servicelog("Updating main database failed");
	process.exit(1);
    } else {
	framework.servicelog("Updated main database to v.6");
    }
}

function updateDatabaseVersionTo_7() {
    datastorage.read("tournaments").tournaments.forEach(function(t) {
	datastorage.initialize(t, {});
	var tournament = datastorage.read(t).tournament;
	tournament.roundLength = 20;
	tournament.date = "";
	tournament.venue = "";
	tournament.spectators = "Vapaa pääsy";
	tournament.games.forEach(function(g) {
	    g.officials = [];
	    g.referees = [];
	    g.timeOut = [];
	    g.start = "";
	    g.end = "";
	});
	if(datastorage.write(t, { tournament: tournament } ) === false) {
	    framework.servicelog("Updating tournament database " + t + " failed");
	    process.exit(1);
	} else {
	    framework.servicelog("Updated tournament database " + t + "to v.7");
	}
    });
    var mainConfig = datastorage.read("main").main;
    mainConfig.version = 7;
    if(datastorage.write("main", { main: mainConfig }) === false) {
	framework.servicelog("Updating main database failed");
	process.exit(1);
    } else {
	framework.servicelog("Updated main database to v.7");
    }
}


// Initialize application-specific datastorages

function initializeDataStorages() {
    framework.initializeDataStorages();
    datastorage.initialize("tournaments", { nextId: 1,
					    tournaments: [ ] }, true);
    datastorage.initialize("teams", { nextId: 1,
				      teams: [ ] }, true);
    datastorage.initialize("players", { nextId: 1,
					players: [ ] }, true);

    var mainConfig = datastorage.read("main").main;

    if(mainConfig.version === undefined) { mainConfig.version = 0; }
    if(mainConfig.version > databaseVersion) {
	framework.servicelog("Database version is too high for this program release, please update program.");
	process.exit(1);
    }
    if(mainConfig.version < databaseVersion) {
	framework.servicelog("Updating database version to most recent supported by this program release.");
	if(mainConfig.version === 0) {
	    // update database version from 0 to 1
	    updateDatabaseVersionTo_1();
	}
	if(mainConfig.version === 1) {
	    // update database version from 1 to 2
	    updateDatabaseVersionTo_2();
	}
	if(mainConfig.version === 2) {
	    // update database version from 2 to 3
	    updateDatabaseVersionTo_3();
	}
	if(mainConfig.version === 3) {
	    // update database version from 3 to 4
	    updateDatabaseVersionTo_4();
	}
	if(mainConfig.version === 4) {
	    // update database version from 4 to 5
	    updateDatabaseVersionTo_5();
	}
	if(mainConfig.version === 5) {
	    // update database version from 5 to 6
	    updateDatabaseVersionTo_6();
	}
	if(mainConfig.version === 6) {
	    // update database version from 6 to 7
	    updateDatabaseVersionTo_7();
	}
    } else {
	datastorage.read("tournaments").tournaments.forEach(function(t) {
	    datastorage.initialize(t, []);
	});	
    }
}


// Push callbacks to framework

framework.setCallback("datastorageRead", datastorage.read);
framework.setCallback("datastorageWrite", datastorage.write);
framework.setCallback("datastorageInitialize", datastorage.initialize);
framework.setCallback("handleApplicationMessage", handleApplicationMessage);
framework.setCallback("processResetToMainState", processResetToMainState);
framework.setCallback("createAdminPanelUserPriviliges", createAdminPanelUserPriviliges);
framework.setCallback("createDefaultPriviliges", createDefaultPriviliges);
framework.setCallback("createTopButtonList", createTopButtonList);


// Start the web interface

initializeDataStorages();
framework.setApplicationName("Example Application");
framework.startUiLoop();
