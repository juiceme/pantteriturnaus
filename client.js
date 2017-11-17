var site = window.location.hostname;
var mySocket = new WebSocket("ws://" + site + ":" + WEBSOCK_PORT + "/");
var sessionPassword;
var connectionTimerId;

mySocket.onopen = function (event) {
    var sendable = {type:"clientStarted", content:"none"};
    mySocket.send(JSON.stringify(sendable));
    document.getElementById("myStatusField").value = "started";
    connectionTimerId = setTimeout(function() { 
	document.getElementById("myStatusField").value = "No connection to server";
    }, 2000);
};

mySocket.onmessage = function (event) {
    var receivable = JSON.parse(event.data);

//    console.log("Received message: " + JSON.stringify(receivable));

    if(receivable.type == "statusData") {
        document.getElementById("myStatusField").value = receivable.content;
    }

    if(receivable.type == "loginView") {
	document.body.replaceChild(createLoginView(), document.getElementById("myDiv2"));
	clearTimeout(connectionTimerId);
    }

    if(receivable.type == "loginChallenge") {
	var challenge = Aes.Ctr.decrypt(receivable.content, sessionPassword, 128);
	var cipheredResponce = Aes.Ctr.encrypt(challenge, sessionPassword, 128);
	sendToServer("loginResponse", cipheredResponce);
    }

    if(receivable.type == "unpriviligedLogin") {
	var loginData = JSON.parse(Aes.Ctr.decrypt(receivable.content, sessionPassword, 128));
	document.body.replaceChild(createTopButtons({type: "unpriviliged"}, false),
				   document.getElementById("myDiv1"));
    }

    if(receivable.type == "tournamentMainData") {
	var tournamentMainData = JSON.parse(Aes.Ctr.decrypt(receivable.content, sessionPassword, 128));
	document.body.replaceChild(createTopButtons({type: "user"}, tournamentMainData),
				   document.getElementById("myDiv1"));
	document.body.replaceChild(createTournamentListView(tournamentMainData),
				   document.getElementById("myDiv2"));
   }

    if(receivable.type == "showTournament") {
	var previewData = atob(JSON.parse(Aes.Ctr.decrypt(receivable.content, sessionPassword, 128)));
	var wnd = window.document.open("about:blank", "", "scrollbars=yes");
	wnd.document.write(decodeURIComponent(escape(previewData)));
	wnd.document.close();
    }

    if(receivable.type == "editAllTournaments") {
	var tournamentMainData = JSON.parse(Aes.Ctr.decrypt(receivable.content, sessionPassword, 128));
	document.body.replaceChild(createTopButtons({type: "user"}, tournamentMainData),
				   document.getElementById("myDiv1"));
	document.body.replaceChild(createEditTournamentsView(tournamentMainData.tournaments),
				   document.getElementById("myDiv2"));
    }

    if(receivable.type == "editOneTournamentScores") {
	var tournamentData = JSON.parse(Aes.Ctr.decrypt(receivable.content, sessionPassword, 128));
	document.body.replaceChild(createTopButtons({type: "user"}, tournamentData),
				   document.getElementById("myDiv1"));
	document.body.replaceChild(createTournamentScoresView(tournamentData),
				   document.getElementById("myDiv2"));
   }

    if(receivable.type == "editOneTournamentData") {
	var tournamentData = JSON.parse(Aes.Ctr.decrypt(receivable.content, sessionPassword, 128));
	document.body.replaceChild(createTopButtons({type: "user"}, tournamentData),
				   document.getElementById("myDiv1"));
	document.body.replaceChild(createTournamentEditView(tournamentData),
				   document.getElementById("myDiv2"));
   }

    if(receivable.type == "editTeams") {
	var teamData = JSON.parse(Aes.Ctr.decrypt(receivable.content, sessionPassword, 128));
	document.body.replaceChild(createTopButtons({type: "logout"}, false),
				   document.getElementById("myDiv1"));
	document.body.replaceChild(createEditTeamsView(teamData),
				   document.getElementById("myDiv2"));
    }

    if(receivable.type == "adminData") {
	var adminData = JSON.parse(Aes.Ctr.decrypt(receivable.content, sessionPassword, 128));
	document.body.replaceChild(createTopButtons({type: "admin"}, false),
				   document.getElementById("myDiv1"));
	document.body.replaceChild(createAdminView(adminData),
				   document.getElementById("myDiv2"));
    }


    // the new main method callpoint 

    if(receivable.type == "createGenericEditFrame" {
	
	var inputData = JSON.parse(Aes.Ctr.decrypt(receivable.content, sessionPassword, 128));
	document.body.replaceChild(createTopButtons({type: "user"}, inputData),
				   document.getElementById("myDiv1"));
	document.body.replaceChild(createListFrame(inputData),
				   document.getElementById("myDiv2"));
    }

}


// ---------- Parse out UI elements from incoming message

function createListFrame(inputData) {
    var fieldset = document.createElement('fieldsetset');

    fieldset.appendChild(document.createElement('br'));
    fieldset.appendChild(createEditableItemlist(inputData.itemList));
    fieldset.appendChild(document.createElement('br'));
    fieldset.appendChild(createAcceptButtons(inputData));
    fieldset.appendChild(document.createElement('br'));
    fieldset.id= "myDiv2";
    return fieldset;
}

function createEditableItemlist(inputData) {
    var table = document.createElement('table');
    var tableHeader = document.createElement('thead');
    var tableBody = document.createElement('tbody');

    // itemList = { header: [ { text: text } ],
    //              items: [ {} ] },
    //              newItem;

    var headerRow = tableHeader.insertRow();    
    inputData.itemList.header.forEach(function(h) {
	var cell= headerRow.insertCell();
	cell.innerHTML = "<b>" + uiText(h.text) + "</b>";
	headerRow.appendChild(cell);
    });
    var count = 1;
    inputData.itemList.items.forEach(function(i) {
	tablebody.appendChild(createEdittableItem(count, inputData, i, false));
	count++;
    });
    var newItem = inputData.itemList.newItem;
    tablebody.appendChild(createEdittableItem(count, inputData, newItem, true));
    table.appendChild(tableHeader);
    table.appendChild(tableBody);
    return table;
}

function createAcceptButtons(inputData) {
    var table = document.createElement('table');
    var tableBody = document.createElement('tbody');
    var tableRow = tableBody.insertRow();    

    // buttonlist = [ { id: buttonId, text: buttonText, callbackMessage: mesage } ];

    inputData.buttonList.forEach(function(b) {
	var cell = document.createElement('td');
	var button = document.createElement('button');
	button.appendChild(document.createTextNode(b.text));
	button.id = b.id;
	button.onclick = function() {
	    sendToServerEncrypted(b.callbackMessage, inputData.itemlist);
	    return false;
	};
	cell.appendChild(button);
	tableRow.appendChild(cell);
    });
    tableBody.appendChild(tableRow)
    return table;
}

function createEdittableItem(count, inputData, item, lastRow) {
    var tableRow = document.createElement('tr');

    // item = [ { type: type, data: data } ]:

    item.forEach(function(c) {
	var cell = document.createElement('td');
	cell.appendChild(createTypedObject(c));
	tableRow.appendChild(cell);
    });
    var lastCell = document.createElement('td');
    if(lastRow) {
	var addButton = document.createElement("button");
	addButton.appendChild(document.createTextNode("Luo uusi"));
	addButton.id = count;
	addButton.onclick = function() { createNewItemToList(inputData, id, this); }
	lastCell.appendChild(addButton);
    } else {
	var deleteButton = document.createElement("button");
	deleteButton.appendChild(document.createTextNode("Poista"));
	deleteButton.id = count;
	deleteButton.onclick = function() { deleteItemFromList(inputData, id, this); }
	lastCell.appendChild(deleteButton);
    }
    tableRow.appendChild(lastCell);

    return tableRow;
}

function createNewItemToList(inputData, id, button) {
    return false;
}

function deleteItemFromList(inputData, id, button) {
    var newlist = inputData.itemList.items.map(function(a,b) {
	if(b != (button.id - 1)) { return a; }
    }).filter(function(s){ return s; });
    inputData.itemList = newlist;

    document.body.replaceChild(createListFrame(inputData),
			       document.getElementById("myDiv2"));
    return false;
)





// ---------- Main tournament list view

function createTournamentListView(tournamentMainData) {
    var fieldset = document.createElement('fieldsetset');
    fieldset.appendChild(document.createElement('br'));
    fieldset.appendChild(createTournamentListTable(tournamentMainData));
    fieldset.appendChild(document.createElement('br'));
    fieldset.id= "myDiv2";
    return fieldset;
}

function createTournamentListTable(tournamentMainData) {
    var table = document.createElement('table');
    var tableHeader = document.createElement('thead');
    var tableBody = document.createElement('tbody');
    var hRow0 = tableHeader.insertRow(0);    
    var hCell0 = hRow0.insertCell();

    hCell0.innerHTML = "<b>" + "Tournament" + "</b>";
    
    tournamentMainData.tournaments.forEach(function(t) {
	var row = document.createElement('tr');
	var cell0 = document.createElement('td');
	cell0.appendChild(document.createTextNode(t.name));
	var cell1 = document.createElement('td');
	var showButton = document.createElement('button');
	showButton.appendChild(document.createTextNode("Tulokset"));
	showButton.id = t.name;
	showButton.onclick = function() { showTournament(tournamentMainData, this); }
	cell1.appendChild(showButton);
	var cell2 = document.createElement('td');
	var editButton = document.createElement('button');
	editButton.appendChild(document.createTextNode("Muokkaa"));
	editButton.id = t.name;
	editButton.onclick = function() { editTournament(tournamentMainData, this); }
	if(t.locked) { editButton.disabled = true; }
	cell2.appendChild(editButton);
	row.appendChild(cell0);
	row.appendChild(cell1);
	row.appendChild(cell2);
	tableBody.appendChild(row);
    });
    table.appendChild(tableHeader);
    table.appendChild(tableBody);
    return table;
}

function showTournament(tournamentMainData, button) {
    sendToServerEncrypted("getTournamentDataForShow", button.id);
    return false;
}

function editTournament(tournamentMainData, button) {
    sendToServerEncrypted("getOneTournamentScoresForEdit", button.id);
    return false;
}


// ---------- Main user tournament view

function createTournamentScoresView(tournamentData) {

    var fieldset = document.createElement('fieldsetset');
    fieldset.appendChild(document.createElement('br'));
    fieldset.appendChild(createTournamentTable(tournamentData));
    fieldset.appendChild(document.createElement('br'));
    fieldset.id= "myDiv2";
    return fieldset;
}

function createTournamentTable(tournamentData) {
    var table = document.createElement('table');
    var tableHeader = document.createElement('thead');
    var tableBody = document.createElement('tbody');
    var hRow0 = tableHeader.insertRow();    
    var h0Cell0 = hRow0.insertCell();
    var hRow1 = tableHeader.insertRow();
    var h1Cell0 = hRow1.insertCell();
    var h1Cell1 = hRow1.insertCell();
    var h1Cell2 = hRow1.insertCell();
    var h1Cell3 = hRow1.insertCell();

    h0Cell0.innerHTML = "<b>" + tournamentData.tournament.name + "</b>";
    h1Cell0.innerHTML = "<b>" + "Ottelu" + "</b>";
    h1Cell1.innerHTML = "<b>" + "Koti" + "</b>";
    h1Cell2.innerHTML = "<b>" + "Vieras" + "</b>";
    h1Cell3.innerHTML = "<b>" + "Tulos" + "</b>";

    tournamentData.tournament.games.forEach(function(s) {
	var row = document.createElement('tr');
	var cell0 = document.createElement('td');
	cell0.appendChild(document.createTextNode(s.round));
	var cell1 = document.createElement('td');
	cell1.appendChild(document.createTextNode(s.home));
	var cell2 = document.createElement('td');
	cell2.appendChild(document.createTextNode(s.guest));
	var cell3 = document.createElement('td');
	cell3.appendChild(document.createTextNode(s.result));
	var cell4 = document.createElement('td');
	var editButton = document.createElement('button');
	editButton.appendChild(document.createTextNode("Muokkaa"));
	editButton.id = s.round;
	editButton.onclick = function() { editMatchStatistics(tournamentData, this); }
	cell4.appendChild(editButton);
	row.appendChild(cell0);
	row.appendChild(cell1);
	row.appendChild(cell2);
	row.appendChild(cell3);
	row.appendChild(cell4);
	tableBody.appendChild(row);
    });
    table.appendChild(tableHeader);
    table.appendChild(tableBody);
    return table;
}

function editMatchStatistics(tournamentData, button) {
    document.body.replaceChild(createMatchStatisticsView(tournamentData, button.id),
			       document.getElementById("myDiv2"));
    return false;
}


// ---------- Match statistics edit panel

function createMatchStatisticsView(tournamentData, id) {
    var fieldset = document.createElement('fieldsetset');
    fieldset.appendChild(document.createElement('br'));
    fieldset.appendChild(createMatchStatisticsTable(tournamentData, id));
    fieldset.appendChild(document.createElement('br'));
    fieldset.appendChild(createMatchStatisticsButtons(tournamentData, id));
    fieldset.appendChild(document.createElement('br'));
    fieldset.id= "myDiv2";
    return fieldset;
}

function createMatchStatisticsTable(tournamentData, id) {
    var match = tournamentData.tournament.games.map(function(a) {
	    if(a.round == id) { return a; }
	}).filter(function(s){ return s; })[0];
    var table = document.createElement('table');
    var tableHeader = document.createElement('thead');
    var tableBody = document.createElement('tbody');
    var hRow0 = tableHeader.insertRow(0);    
    var hCell0 = hRow0.insertCell();
    hCell0.innerHTML = "<b>" + match.home + " vs. " + match.guest + "</b>";
    var hCell1 = hRow0.insertCell();
    hCell1.innerHTML = "<b>Piste</b>";
    var hCell2 = hRow0.insertCell();
    hCell2.innerHTML = "<b>Tyyppi</b>";
    var hCell3 = hRow0.insertCell();
    hCell3.innerHTML = "<b>Aika</b>";
    var hCell4 = hRow0.insertCell();
    hCell4.innerHTML = "<b>Laukoja</b>";
    var hCell5 = hRow0.insertCell();
    hCell5.innerHTML = "<b>Syöttäjä</b>";

    var newRow = { point: "", type: "maali", time: "00:00", scorer: "", passer: ""};
    if(match === []) {
	tableBody.appendChild(createMatchEditTableRow(tournamentData, id, 1, match, newRow, true));
    } else {
	count=1;
	match.scores.forEach(function(u) {
	    tableBody.appendChild(createMatchEditTableRow(tournamentData, id, count++, match, u, false));
	});
	tableBody.appendChild(createMatchEditTableRow(tournamentData, id, count, match, newRow, true));
    }

    table.appendChild(tableHeader);
    table.appendChild(tableBody);
    return table;
}

function createMatchStatisticsButtons(tournamentData, id) {
    var match = tournamentData.tournament.games.map(function(a) {
	    if(a.round == id) { return a; }
	}).filter(function(s){ return s; })[0];
    var fieldset = document.createElement('fieldsetset');
    var acceptButton = document.createElement('button');
    var cancelButton = document.createElement('button');
    acceptButton.appendChild(document.createTextNode("OK"));
    acceptButton.onclick = function() { saveMatchStatisticsEdit(tournamentData, match); }
    cancelButton.appendChild(document.createTextNode("Peruuta"));
    cancelButton.onclick = function() { cancelMatchStatisticsEdit(); }
    fieldset.appendChild(acceptButton);
    fieldset.appendChild(cancelButton);
    return fieldset;
}

function saveMatchStatisticsEdit(tournamentData, match) {
    if(!havePrivilige(tournamentData.priviliges, "score-edit")) {
	alert("You are not allowed to save tournament scores!");
	return false;
    }

    var count = 1;
    var newScores = [];
    match.scores.forEach(function(s) {
	var pointSelection = document.getElementById("sel_" + count + "_point");
	var typeSelection = document.getElementById("sel_" + count + "_pointType");
	var scoreSelection = document.getElementById("sel_" + count + "_score");
	var passSelection = document.getElementById("sel_" + count + "_pass");

	var newItem = { point: pointSelection.options[pointSelection.selectedIndex].item,
			type: typeSelection.options[typeSelection.selectedIndex].item,
			time: document.getElementById("sel_" + count + "_time").value,
			scorer: scoreSelection.options[scoreSelection.selectedIndex].item,
			passer: passSelection.options[passSelection.selectedIndex].item };
	newScores.push(newItem);
	count++;
    });

    match.scores = newScores;
    match.result = calculateMatchScore(match);
    sendToServerEncrypted("saveTournamentData", tournamentData.tournament);
    return false;
}

function cancelMatchStatisticsEdit() {
    sendToServerEncrypted("resetToMain", {});
    return false;
}

function createMatchEditTableRow(tournamentData, id , count, match, item, lastRow) {
    var pointSelector = createSelectionList([{text: match.home, item: match.home},
					     {text: match.guest, item: match.guest}],
					    "sel_" + count + "_point");
    var pointTypeSelector = createSelectionList([{text: "maali", item: "maali"},
						 {text: "rankkari", item: "rankkari"},
						 {text: "omari", item: "omari"}],
						"sel_" + count + "_pointType");
    var allPlayers = [];
    getTeamPlayers(tournamentData, match.home).map(function(a) {
	return { text: "[" + match.home + "] - " + a.name + ", #" + a.number, item: a };
    }).forEach(function(b) {
	allPlayers.push(b);
    });
    getTeamPlayers(tournamentData, match.guest).map(function(a) {
	return { text: "[" + match.guest + "] - " + a.name + ", #" + a.number, item: a };
    }).forEach(function(b) {
	allPlayers.push(b);
    });

    var scoreSelector = createSelectionList(allPlayers, "sel_" + count + "_score");
    var passSelector = createSelectionList(allPlayers, "sel_" + count + "_pass");

    var row = document.createElement('tr');
    var cell0 = document.createElement('td');
    cell0.appendChild(document.createTextNode(count));
    row.appendChild(cell0);

    var cell1 = document.createElement('td');
    cell1.appendChild(pointSelector);
    setSelectedItemInList(pointSelector, item.point);
    row.appendChild(cell1);

    var cell2 = document.createElement('td');
    cell2.appendChild(pointTypeSelector);
    setSelectedItemInList(pointTypeSelector, item.type)
    row.appendChild(cell2);

    var cell3 = document.createElement('td');
    var txtA3 = document.createElement("textarea");
    txtA3.id = "sel_" + count + "_time";
    txtA3.setAttribute('cols', 10);
    txtA3.setAttribute('rows', 1);
    txtA3.value = item.time;
    cell3.appendChild(txtA3);
    row.appendChild(cell3);

    var cell4 = document.createElement('td');
    cell4.appendChild(scoreSelector);
    setSelectedItemInList(scoreSelector, item.scorer);
    row.appendChild(cell4);

    var cell5 = document.createElement('td');
    cell5.appendChild(passSelector);
    setSelectedItemInList(passSelector, item.passer);
    row.appendChild(cell5);

    var cell6 = document.createElement('td');
    if(lastRow) {
	var addButton = document.createElement("button");
	addButton.appendChild(document.createTextNode("Luo uusi"));
	addButton.id = count;
	addButton.onclick = function() { createMatchItemToList(tournamentData, id, match, this); }
	cell6.appendChild(addButton);
    } else {
	var deleteButton = document.createElement("button");
	deleteButton.appendChild(document.createTextNode("Poista"));
	deleteButton.id = count;
	deleteButton.onclick = function() { deleteMatchItemFromList(tournamentData, id, match, this); }
	cell6.appendChild(deleteButton);
    }
    row.appendChild(cell6);
    return row;
}

function createMatchItemToList(tournamentData, id, match, button) {
    var pointSelection = document.getElementById("sel_" + button.id + "_point");
    var typeSelection = document.getElementById("sel_" + button.id + "_pointType");
    var scoreSelection = document.getElementById("sel_" + button.id + "_score");
    var passSelection = document.getElementById("sel_" + button.id + "_pass");

    var newItem = { point: pointSelection.options[pointSelection.selectedIndex].item,
		    type: typeSelection.options[typeSelection.selectedIndex].item,
		    time: document.getElementById("sel_" + count + "_time").value,
		    scorer: scoreSelection.options[scoreSelection.selectedIndex].item,
		    passer: passSelection.options[passSelection.selectedIndex].item };
		  
    match.scores.push(newItem);

    document.body.replaceChild(createMatchStatisticsView(tournamentData, id),
			       document.getElementById("myDiv2"));
    return false;
}

function deleteMatchItemFromList(tournamentData, id, match, button) {
    var newScores = match.scores.map(function(a,b) {
	if(b != (button.id - 1)) { return a; }
    }).filter(function(s){ return s; });
    match.scores = newScores;

    document.body.replaceChild(createMatchStatisticsView(tournamentData, id),
			       document.getElementById("myDiv2"));
    return false;
}

function getTeamPlayers(tournamentData, team) {
    var index = tournamentData.teams.map(function(e){return e.name}).indexOf(team);
    if(index < 0) {
	console.log("illegal value in teams!");
	return [];
    } else { 
	return tournamentData.teams[index].players;
    }
}


// ---------- Team edit panel handling

function createEditTeamsView(teamData) {
    var fieldset = document.createElement("fieldset");
    var acceptButton = document.createElement('button');
    var cancelButton = document.createElement('button');
    fieldset.appendChild(document.createElement("br"));

    teamData.teams.forEach(function(t) {
	var table = document.createElement('table');
	var tableHeader = document.createElement('thead');
	var tableBody = document.createElement('tbody');
	var hRow = tableHeader.insertRow();    
	var hCell0 = hRow.insertCell();
	hCell0.innerHTML = "<b>" + t.name + "</b>";
	var count=1;
	t.players.forEach(function(p) {
	    tableBody.appendChild(createPlayerEditTableRow(count, teamData, t.name, p, false));
	    count++;
	});
	var newPlayer = { name: "<name>", number: "<1>" };
	tableBody.appendChild(createPlayerEditTableRow(count, teamData, t.name, newPlayer, true));
	table.appendChild(tableHeader);
	table.appendChild(tableBody);
	fieldset.appendChild(table);
	fieldset.appendChild(document.createElement("br"));
    });

    fieldset.appendChild(createNewTeamTable(teamData));
    fieldset.appendChild(document.createElement('br'));
    acceptButton.appendChild(document.createTextNode("OK"));
    acceptButton.onclick = function() { saveTeamsEdit(teamData); }
    cancelButton.appendChild(document.createTextNode("Peruuta"));
    cancelButton.onclick = function() { cancelTeamsEdit(); }
    fieldset.appendChild(acceptButton);
    fieldset.appendChild(cancelButton);
    fieldset.appendChild(document.createElement('br'));
    fieldset.id = "myDiv2";
    return fieldset;
}

function createNewTeamTable(teamData) {
    var table = document.createElement('table');
    var tableHeader = document.createElement('thead');
    var tableBody = document.createElement('tbody');
    var hRow = tableHeader.insertRow();    
    var bRow = tableBody.insertRow();    
    var hCell0 = hRow.insertCell();
    var hCell1 = hRow.insertCell();
    hCell1.innerHTML = "<b>" + "Create New Team" + "</b>";
    var bCell0 = bRow.insertCell();
    var bCell1 = bRow.insertCell();
    var bCell2 = bRow.insertCell();
    
    var tArea = document.createElement("textarea");
    tArea.id = "new_team_name";
    tArea.setAttribute('cols', 30);
    tArea.setAttribute('rows', 1);
    tArea.value = "<new team>";
    bCell1.appendChild(tArea);

    var createNewButton = document.createElement('button');
    createNewButton.appendChild(document.createTextNode("Add New"));
    createNewButton.onclick = function() { createNewTeam(teamData); }
    bCell2.appendChild(createNewButton);

    table.appendChild(tableHeader);
    table.appendChild(tableBody);
    
    return table;
}

function createNewTeam(teamData) {
    var newTeam = { name: document.getElementById("new_team_name").value,
		    id: teamData.teams.length + 1,
		    players: [] };
    teamData.teams.push(newTeam);

    document.body.replaceChild(createEditTeamsView(teamData),
			       document.getElementById("myDiv2"));
    return false;
}

function saveTeamsEdit(teamData) {
    var tCount = 1;
    var newTeams = [];
    teamData.teams.forEach(function(t) {
	var team = { name: t.name, id: t.id, players: [] };
	var pCount = 1;
	t.players.forEach(function(p) {
	    var player = { name: document.getElementById("tt_" + pCount + "_" + t.name + "_name").value,
			   number: document.getElementById("tt_" + pCount + "_" + t.name + "_number").value };
	    team.players.push(player);
	    pCount++;
	});
	newTeams.push(team);
	tCount++;
    });

    teamData.teams = newTeams;
    sendToServerEncrypted("saveTeamData", teamData);
    return false;
}

function cancelTeamsEdit() {
    sendToServerEncrypted("resetToMain", {});
    return false;
}

function createPlayerEditTableRow(count, teamData, team, player, lastRow) {
    var row = document.createElement('tr');

    var cell0 = document.createElement('td');
    cell0.appendChild(document.createTextNode(count));
    row.appendChild(cell0);

    var cell1 = document.createElement('td');
    var txtA1 = document.createElement("textarea");
    txtA1.id = "tt_" + count + "_" + team + "_name";
    txtA1.setAttribute('cols', 30);
    txtA1.setAttribute('rows', 1);
    txtA1.value = player.name;
    cell1.appendChild(txtA1);
    row.appendChild(cell1);

    var cell2 = document.createElement('td');
    var txtA2 = document.createElement("textarea");
    txtA2.id = "tt_" + count + "_" + team + "_number";
    txtA2.setAttribute('cols', 30);
    txtA2.setAttribute('rows', 1);
    txtA2.value = player.number;
    cell2.appendChild(txtA2);
    row.appendChild(cell2);

    var cell3 = document.createElement('td');
    if(lastRow) {
	var addButton = document.createElement("button");
	addButton.appendChild(document.createTextNode("Add new"));
	addButton.id = count;
	addButton.teamName = team;
	addButton.onclick = function() { createPlayerToList(teamData, this); }
	cell3.appendChild(addButton);
    } else {
	var deleteButton = document.createElement("button");
	deleteButton.appendChild(document.createTextNode("Delete"));
	deleteButton.id = count;
	deleteButton.teamName = team;
	deleteButton.onclick = function() { deletePlayerFromList(teamData, this); }
	cell3.appendChild(deleteButton);
    }
    row.appendChild(cell3);
    return row;
}

function createPlayerToList(teamData, button) {
    var newPlayer = { name: document.getElementById("tt_" + button.id + "_" + button.teamName + "_name").value,
		      number: document.getElementById("tt_" + button.id + "_" + button.teamName + "_number").value };
    var index = teamData.teams.map(function(e){return e.name}).indexOf(button.teamName);
    if(index < 0) { console.log("illegal value in teams!"); }
    else { teamData.teams[index].players.push(newPlayer); }
    
    document.body.replaceChild(createEditTeamsView(teamData),
			       document.getElementById("myDiv2"));
    return false;
}

function deletePlayerFromList(teamData, button) {
    var index = teamData.teams.map(function(e){return e.name}).indexOf(button.teamName);
    var newPlayers = teamData.teams[index].players.map(function(a,b){
	if(b != (button.id - 1)) { return a; }
    }).filter(function(s){ return s; });
    teamData.teams[index].players = newPlayers;

    document.body.replaceChild(createEditTeamsView(teamData),
			       document.getElementById("myDiv2"));
    return false;
}


// ---------- Tournament editing

function createEditTournamentsView(tournaments) {
    var fieldset = document.createElement("fieldset");
    fieldset.appendChild(document.createElement("br"));
    var acceptButton = document.createElement('button');
    var cancelButton = document.createElement('button');
    var table = document.createElement('table');
    var tableHeader = document.createElement('thead');
    var tableBody = document.createElement('tbody');
    var hRow = tableHeader.insertRow();    
    var hCell0 = hRow.insertCell();
    var hCell1 = hRow.insertCell();
    var hCell2 = hRow.insertCell();
    var hCell3 = hRow.insertCell();
    hCell1.innerHTML = "<b>" + "Tournament" + "</b>";
    hCell2.innerHTML = "<b>" + "Locked" + "</b>";
    hCell3.innerHTML = "<b>" + "Output file" + "</b>";
    var count=1;

    tournaments.forEach(function(t) {
	tableBody.appendChild(createTournamentsEditTableRow(count, tournaments, t, false));
	count++;
    });

    var newTournament = { name: "<name>", locked: false, outputFile: "./outputfile" };
    tableBody.appendChild(createTournamentsEditTableRow(count, tournaments, newTournament, true));
    table.appendChild(tableHeader);
    table.appendChild(tableBody);
    fieldset.appendChild(table);
    fieldset.appendChild(document.createElement('br'));
    acceptButton.appendChild(document.createTextNode("OK"));
    acceptButton.onclick = function() { saveTournamentsEdit(tournaments); }
    cancelButton.appendChild(document.createTextNode("Peruuta"));
    cancelButton.onclick = function() { cancelTournamentsEdit(); }
    fieldset.appendChild(acceptButton);
    fieldset.appendChild(cancelButton);
    fieldset.appendChild(document.createElement('br'));
    fieldset.id = "myDiv2";
    return fieldset;
}

function saveTournamentsEdit(tournaments) {
    var count = 1;
    var newTournaments = [];

    tournaments.forEach(function(t) {
	var tournament = { name: document.getElementById("to_" + count + "_name").value,
			   locked: document.getElementById("to_" + count + "_locked").checked,
			   outputFile: document.getElementById("to_" + count + "_outputFile").value };
	newTournaments.push(tournament);
	count++;
    });

    sendToServerEncrypted("saveAllTournamentsData", newTournaments);
    return false;
}

function cancelTournamentsEdit() {
    sendToServerEncrypted("resetToMain", {});
    return false;
}

function createTournamentsEditTableRow(count, tournaments, t, lastRow) {
    var row = document.createElement('tr');
    var cell0 = document.createElement('td');
    cell0.appendChild(document.createTextNode(count));
    row.appendChild(cell0);

    var cell1 = document.createElement('td');
    var txtA1 = document.createElement("textarea");
    txtA1.id = "to_" + count + "_name";
    txtA1.setAttribute('cols', 30);
    txtA1.setAttribute('rows', 1);
    txtA1.value = t.name;
    cell1.appendChild(txtA1);
    row.appendChild(cell1);

    var cell2 = document.createElement('td');
    var checkBox = document.createElement('input');
    checkBox.type = "checkbox";
    checkBox.id = "to_" + count + "_locked";
    checkBox.checked = t.locked
    checkBox.title = "locked";
    cell2.appendChild(checkBox);
    row.appendChild(cell2);

    var cell3 = document.createElement('td');
    var txtA2 = document.createElement("textarea");
    txtA2.id = "to_" + count + "_outputFile";
    txtA2.setAttribute('cols', 30);
    txtA2.setAttribute('rows', 1);
    txtA2.value = t.outputFile;
    cell3.appendChild(txtA2);
    row.appendChild(cell3);

    var cell4 = document.createElement('td');
    if(lastRow) {
	var addButton = document.createElement("button");
	addButton.appendChild(document.createTextNode("Add new"));
	addButton.id = count;
	addButton.onclick = function() { createTournamentToList(tournaments, this); }
	cell4.appendChild(addButton);
	row.appendChild(cell4);
    } else {
	var deleteButton = document.createElement("button");
	deleteButton.appendChild(document.createTextNode("Delete"));
	deleteButton.id = count;
	deleteButton.onclick = function() { deleteTournamentFromList(tournaments, this); }
	cell4.appendChild(deleteButton);
	row.appendChild(cell4);
	var cell5 = document.createElement('td');
	var editButton = document.createElement("button");
	editButton.appendChild(document.createTextNode("Edit"));
	editButton.id = count;
	editButton.onclick = function() { editTournamentData(tournaments, this); }
	cell5.appendChild(editButton);
	row.appendChild(cell5);
    }
    return row;
}

function createTournamentToList(tournaments, button) {
    var newTournament = { name: document.getElementById("to_" + button.id + "_name").value,
			  locked: document.getElementById("to_" + button.id + "_locked").checked };
    tournaments.push(newTournament);

    document.body.replaceChild(createEditTournamentsView(tournaments),
			       document.getElementById("myDiv2"));
    return false;
}

function deleteTournamentFromList(tournaments, button) {
    var newTournaments = tournaments.map(function(a,b){
	if(b != (button.id - 1)) { return a; }
    }).filter(function(s){ return s; });

    document.body.replaceChild(createEditTournamentsView(newTournaments),
			       document.getElementById("myDiv2"));
    return false;
}

function editTournaments(tournamentData) {
    sendToServerEncrypted("getAllTournamentsDataForEdit", "none");
    return false;
}

function editTournamentData(tournaments, button) {
    var tournamentName = tournaments.map(function(a,b){
	if(b === (button.id - 1)) { return a; }
    }).filter(function(s){ return s; })[0].name;

    sendToServerEncrypted("getTournamentDataForEditByName", { name : tournamentName });
    return false;
}


// ---------- Tournament data editing

function createTournamentEditView(tournamentData) {
    var fieldset = document.createElement("fieldset");
    fieldset.appendChild(document.createElement("br"));
    var acceptButton = document.createElement('button');
    var cancelButton = document.createElement('button');
    var table = document.createElement('table');
    var tableHeader = document.createElement('thead');
    var tableBody = document.createElement('tbody');
    var hRow0 = tableHeader.insertRow();    
    var hRow1 = tableHeader.insertRow();    
    var h0Cell0 = hRow0.insertCell();
    var h0Cell1 = hRow0.insertCell();
    h0Cell1.innerHTML = "<b>" + tournamentData.tournament.name + "</b>";
    var h1Cell0 = hRow1.insertCell();
    var h1Cell1 = hRow1.insertCell();
    var h1Cell2 = hRow1.insertCell();
    var h1Cell3 = hRow1.insertCell();
    h1Cell1.innerHTML = "time";
    h1Cell2.innerHTML = "home";
    h1Cell3.innerHTML = "guest";
    var count=1;

    tournamentData.tournament.games.forEach(function(g) {
	tableBody.appendChild(createTournamentGameEditTableRow(count, tournamentData, g, false));
	count++;
    });

    var newGame = { time: "09:00 - 09:45",
		    home: "<home>",
		    guest: "<guest>",
		    result: "",
		    round: tournamentData.tournament.games.length + 1,
		    scores: [] };
    tableBody.appendChild(createTournamentGameEditTableRow(count, tournamentData, newGame, true));
    table.appendChild(tableHeader);
    table.appendChild(tableBody);
    fieldset.appendChild(table);
    fieldset.appendChild(document.createElement('br'));
    acceptButton.appendChild(document.createTextNode("OK"));
    acceptButton.onclick = function() { saveTournamentGameEdit(tournamentData); }
    cancelButton.appendChild(document.createTextNode("Peruuta"));
    cancelButton.onclick = function() { cancelTournamentGameEdit(); }
    fieldset.appendChild(acceptButton);
    fieldset.appendChild(cancelButton);
    fieldset.appendChild(document.createElement('br'));
    fieldset.id = "myDiv2";
    return fieldset;
}

function createTournamentGameEditTableRow(count, tournamentData, game, lastRow) {
    var homeSelector = createSelectionList(tournamentData.teams.map(function(t) {
	return { text: t.name, item: t.name };
    }), "sel_" + count + "_home");
    var guestSelector = createSelectionList(tournamentData.teams.map(function(t) {
	return { text: t.name, item: t.name };
    }), "sel_" + count + "_guest");

    row = document.createElement('tr');
    var cell0 = document.createElement('td');
    cell0.appendChild(document.createTextNode(count));
    row.appendChild(cell0);

    var cell1 = document.createElement('td');
    var txtA1 = document.createElement("textarea");
    txtA1.id = "sel_" + count + "_time";
    txtA1.setAttribute('cols', 30);
    txtA1.setAttribute('rows', 1);
    txtA1.value = game.time;
    cell1.appendChild(txtA1);
    row.appendChild(cell1);

    var cell2 = document.createElement('td');
    cell2.appendChild(homeSelector);
    setSelectedItemInList(homeSelector, game.home);
    row.appendChild(cell2);

    var cell3 = document.createElement('td');
    cell3.appendChild(guestSelector);
    setSelectedItemInList(guestSelector, game.guest);
    row.appendChild(cell3);

    var cell4 = document.createElement('td');
    if(lastRow) {
	var addButton = document.createElement("button");
	addButton.appendChild(document.createTextNode("Luo uusi"));
	addButton.id = count;
	addButton.onclick = function() { createGameToList(tournamentData, this); }
	cell4.appendChild(addButton);
    } else {
	var deleteButton = document.createElement("button");
	deleteButton.appendChild(document.createTextNode("poista"));
	deleteButton.id = count;
	deleteButton.onclick = function() { deleteGameFromList(tournamentData, this); }
	cell4.appendChild(deleteButton);
    }
    row.appendChild(cell4);
    return row;
}

function saveTournamentGameEdit(tournamentData) {
    var count = 1;
    var newGames = [];

    tournamentData.tournament.games.forEach(function(t) {
	var homeSelection = document.getElementById("sel_" + count + "_home");
	var guestSelection = document.getElementById("sel_" + count + "_guest");
	var game = { time: document.getElementById("sel_" + count + "_time").value,
		     home: homeSelection.options[homeSelection.selectedIndex].item,
		     guest: guestSelection.options[guestSelection.selectedIndex].item,
		     result: "-",
		     round: count,
		     scores: [] };
	newGames.push(game);
	count++;
    });
    tournamentData.tournament.games = newGames;

    sendToServerEncrypted("saveTournamentGameData", tournamentData.tournament);
    return false;
}

function cancelTournamentGameEdit() {
    sendToServerEncrypted("resetToMain", {});
    return false;
}

function createGameToList(tournamentData, button) {
    var homeSelection = document.getElementById("sel_" + button.id + "_home");
    var guestSelection = document.getElementById("sel_" + button.id + "_guest");
    var newGame = { time: document.getElementById("sel_" + button.id + "_time").value,
		    home: homeSelection.options[homeSelection.selectedIndex].item,
		    guest: guestSelection.options[guestSelection.selectedIndex].item };
    tournamentData.tournament.games.push(newGame);

    document.body.replaceChild(createTournamentEditView(tournamentData),
			       document.getElementById("myDiv2"));
    return false;
}

function deleteGameFromList(tournamentData, button) {
    var newGames = tournamentData.tournament.games.map(function(a,b){
	if(b != (button.id - 1)) { return a; }
    }).filter(function(s){ return s; });
    tournamentData.tournament.games = newGames;

    document.body.replaceChild(createTournamentEditView(tournamentData),
			       document.getElementById("myDiv2"));
    return false;
}


// ---------- Sysadmin panel handling

function createAdminView(adminData) {
    var fieldset = document.createElement('fieldsetset');
    var acceptButton = document.createElement('button');
    var cancelButton = document.createElement('button');
    fieldset.appendChild(createUserTable(adminData));
    fieldset.appendChild(document.createElement('br'));
    acceptButton.appendChild(document.createTextNode("OK"));
    acceptButton.onclick = function() { saveAdminEdit(adminData); }
    cancelButton.appendChild(document.createTextNode("Peruuta"));
    cancelButton.onclick = function() { cancelAdminEdit(); }
    fieldset.appendChild(acceptButton);
    fieldset.appendChild(cancelButton);
    fieldset.appendChild(document.createElement('br'));
    fieldset.id= "myDiv2";
    return fieldset;
}

function saveAdminEdit(adminData) {
    var count = 1;
    adminData.users.forEach(function(u) {
	var priviliges = [];
	if(document.getElementById("cbu_" + count + "_view").checked) { priviliges.push("view"); }
	if(document.getElementById("cbu_" + count + "_score-edit").checked) { priviliges.push("score-edit"); }
	if(document.getElementById("cbu_" + count + "_team-edit").checked) { priviliges.push("team-edit"); }
	if(document.getElementById("cbu_" + count + "_tournament-edit").checked) { priviliges.push("tournament-edit"); }
	if(document.getElementById("cbu_" + count + "_system-admin").checked) { priviliges.push("system-admin"); }

	u.realname = document.getElementById("tu_" + count + "_realname").value;
	u.email = document.getElementById("tu_" + count + "_email").value;
	u.phone = document.getElementById("tu_" + count + "_phone").value;
	u.applicationData.priviliges = priviliges;
	count++;
    });

    sendToServerEncrypted("saveAdminData", adminData);
    return false;
}

function cancelAdminEdit() {
    sendToServerEncrypted("resetToMain", {});
    return false;
}

function createUserTable(adminData) {
    var table = document.createElement('table');
    var tableHeader = document.createElement('thead');
    var tableBody = document.createElement('tbody');

    var hRow = tableHeader.insertRow(0);    
    var hCell0 = hRow.insertCell(0);
    var hCell1 = hRow.insertCell(1);
    var hCell2 = hRow.insertCell(2);
    var hCell3 = hRow.insertCell(3);
    var hCell4 = hRow.insertCell(4);
    hCell0.innerHTML = "<b>username</b>";
    hCell1.innerHTML = "<b>realname</b>";
    hCell2.innerHTML = "<b>email</b>";
    hCell3.innerHTML = "<b>phone</b>";
    hCell4.innerHTML = "<b>V / S / Te / To / A</b>";
    count=1;
    adminData.users.forEach(function(u) {
	tableBody.appendChild(createUserEditTableRow(count++, adminData, u, false));
    });
    var newUser = { username: "<username>",
		    realname: "<name>",
		    email: "<user@host>",
		    phone: "<phone>",
		    applicationData: { priviliges: [] } };
    tableBody.appendChild(createUserEditTableRow(count, adminData, newUser, true));
    table.appendChild(tableHeader);
    table.appendChild(tableBody);
    return table;
}

function createUserEditTableRow(count, adminData, user, lastRow) {
    row = document.createElement('tr');

    if(lastRow) {
	var cell0 = document.createElement('td');
	var txtA0 = document.createElement("textarea");
	txtA0.id = "tu_" + count + "_username";
	txtA0.setAttribute('cols', 10);
	txtA0.setAttribute('rows', 1);
	txtA0.value = user.username;
	cell0.appendChild(txtA0);
	row.appendChild(cell0);
    } else {
	var cell0 = document.createElement('td');
	cell0.appendChild(document.createTextNode(user.username));
	row.appendChild(cell0);
    }

    var cell1 = document.createElement('td');
    var txtA1 = document.createElement("textarea");
    txtA1.id = "tu_" + count + "_realname";
    txtA1.setAttribute('cols', 20);
    txtA1.setAttribute('rows', 1);
    txtA1.value = user.realname;
    cell1.appendChild(txtA1);
    row.appendChild(cell1);

    var cell2 = document.createElement('td');
    var txtA2 = document.createElement("textarea");
    txtA2.id = "tu_" + count + "_email";
    txtA2.setAttribute('cols', 25);
    txtA2.setAttribute('rows', 1);
    txtA2.value = user.email;
    cell2.appendChild(txtA2);
    row.appendChild(cell2);

    var cell3 = document.createElement('td');
    var txtA3 = document.createElement("textarea");
    txtA3.id = "tu_" + count + "_phone";
    txtA3.setAttribute('cols', 12);
    txtA3.setAttribute('rows', 1);
    txtA3.value = user.phone;
    cell3.appendChild(txtA3);
    row.appendChild(cell3);

    var cell4 = document.createElement('td');
    var checkBox1 = document.createElement('input');
    checkBox1.type = "checkbox";
    checkBox1.id = "cbu_" + count + "_view";
    checkBox1.checked = havePrivilige(user.applicationData.priviliges, "view");
    checkBox1.title = "view";
    cell4.appendChild(checkBox1);
    var checkBox2 = document.createElement('input');
    checkBox2.type = "checkbox";
    checkBox2.id = "cbu_" + count + "_score-edit";
    checkBox2.checked = havePrivilige(user.applicationData.priviliges, "score-edit");
    checkBox2.title = "score-edit";
    cell4.appendChild(checkBox2);
    var checkBox3 = document.createElement('input');
    checkBox3.type = "checkbox";
    checkBox3.id = "cbu_" + count + "_team-edit";
    checkBox3.checked = havePrivilige(user.applicationData.priviliges, "team-edit");
    checkBox3.title = "team-edit";
    cell4.appendChild(checkBox3);
    var checkBox4 = document.createElement('input');
    checkBox4.type = "checkbox";
    checkBox4.id = "cbu_" + count + "_tournament-edit";
    checkBox4.checked = havePrivilige(user.applicationData.priviliges, "tournament-edit");
    checkBox4.title = "tournament-edit";
    cell4.appendChild(checkBox4);
    var checkBox5 = document.createElement('input');
    checkBox5.type = "checkbox";
    checkBox5.id = "cbu_" + count + "_system-admin";
    checkBox5.checked = havePrivilige(user.applicationData.priviliges, "system-admin");
    checkBox5.title = "system-admin";
    cell4.appendChild(checkBox5);
    row.appendChild(cell4);

    var cell5 = document.createElement('td');
    if(lastRow) {
	var addButton = document.createElement("button");
	addButton.appendChild(document.createTextNode("Luo uusi"));
	addButton.id = count;
	addButton.onclick = function() { createUserToList(adminData, this); }
	cell5.appendChild(addButton);
    } else {
	var deleteButton = document.createElement("button");
	deleteButton.appendChild(document.createTextNode("poista"));
	deleteButton.id = count;
	deleteButton.onclick = function() { deleteUserFromList(adminData, this); }
	cell5.appendChild(deleteButton);
    }
    row.appendChild(cell5);
    return row;
}

function createUserToList(adminData, button) {
    var priviliges = [];
    if(document.getElementById("cbu_" + button.id + "_view").checked) { priviliges.push("view"); }
    if(document.getElementById("cbu_" + button.id + "_score-edit").checked) { priviliges.push("score-edit"); }
    if(document.getElementById("cbu_" + button.id + "_team-edit").checked) { priviliges.push("team-edit"); }
    if(document.getElementById("cbu_" + button.id + "_tournament-edit").checked) { priviliges.push("tournament-edit"); }
    if(document.getElementById("cbu_" + button.id + "_system-admin").checked) { priviliges.push("system-admin"); }

    var newUser = { username: document.getElementById("tu_" + button.id + "_username").value,
		    realname: document.getElementById("tu_" + button.id + "_realname").value,
		    email: document.getElementById("tu_" + button.id + "_email").value,
		    phone: document.getElementById("tu_" + button.id + "_phone").value,
		    applicationData: { priviliges: priviliges }};

    adminData.users.push(newUser);
    document.body.replaceChild(createAdminView(adminData),
			       document.getElementById("myDiv2"));
    return false;
}

function deleteUserFromList(adminData, button) {
    var newUsers = adminData.users.map(function(a,b) {
	if(b != (button.id - 1)) { return a; }
    }).filter(function(s){ return s; });
    adminData.users = newUsers;
    document.body.replaceChild(createAdminView(adminData),
			       document.getElementById("myDiv2"));
    return false;
}


// ---------- Utility helper functions

function logout() {
    div1 = document.createElement("div");
    document.body.replaceChild(div1, document.getElementById("myDiv1"));
    div1.id = "myDiv1";
    div2 = document.createElement("div");
    document.body.replaceChild(div2, document.getElementById("myDiv2"));
    div2.id = "myDiv2";

    var sendable = {type:"clientStarted", content:"none"};
    mySocket.send(JSON.stringify(sendable));
    document.getElementById("myStatusField").value = "started";
}

function gainSysadminMode() {
    div1 = document.createElement("div");
    document.body.replaceChild(div1, document.getElementById("myDiv1"));
    div1.id = "myDiv1";
    div2 = document.createElement("div");
    document.body.replaceChild(div2, document.getElementById("myDiv2"));
    div2.id = "myDiv2";

    sendToServerEncrypted("adminMode", "none");
    document.getElementById("myStatusField").value = "started";
}

function gainUserMode() {
    sendToServerEncrypted("resetToMain", {});
}

function sendLogin(username, password) {
    div = document.createElement('div');
    div.id = "myDiv2";
    document.body.replaceChild(div, document.getElementById("myDiv2"));
    sessionPassword = Sha1.hash(password + Sha1.hash(username).slice(0,4));
    sendToServer("userLogin", { username: Sha1.hash(username) });
//    console.log("SessionPassword = " + sessionPassword);
}

function havePrivilige(priviligeList, privilige) {
    if(priviligeList.indexOf(privilige) < 0) { return false; }
    else { return true; }
}

function uiText(text) {
    return decodeURIComponent(escape(text));
}

function createSelectionList(myList, myId) {
    var mySelectioList = document.createElement('select');
    var myOption = document.createElement('option');
    myOption.text = "";
    myOption.item = "";
    myOption.value = 0;
    mySelectioList.add(myOption);

    var count = 1;
    myList.forEach(function(i) {
	var myOption = document.createElement('option');
	myOption.text = i.text;
	myOption.item = i.item;
	myOption.value = count++;
	mySelectioList.add(myOption);
    });
    mySelectioList.id = myId;
    return mySelectioList;
}

function setSelectedItemInList(myList, myItem) {
    myList.selectedIndex = Object.keys(myList).map(function(a) {
	if(JSON.stringify(myList[a].item) === JSON.stringify(myItem)) return a;
    }).filter(function(f) {
	return f;
    })[0];
}

function calculateMatchScore(match) {
    var newScore = {home: 0, guest: 0};
    match.scores.forEach(function(s) {
	if(s.point === match.home) newScore.home++;
	if(s.point === match.guest) newScore.guest++;
    });
    if(newScore.home === 0 && newScore.guest === 0)  { return "-"; }
    else { return newScore.home + " - " + newScore.guest; }
}

function setElementStyle(element) {
    element.style.border = "solid #ffffff";
    element.style.padding = "0";
}

function sendToServer(type, content) {
    var sendable = { type: type, content: content };
    mySocket.send(JSON.stringify(sendable));
}

function sendToServerEncrypted(type, content) {
    var sendable = { type: type,
		     content: Aes.Ctr.encrypt(JSON.stringify(content), sessionPassword, 128) };
    mySocket.send(JSON.stringify(sendable));
}


// ---------- Login panel handling

function createLoginView() {
    var table = document.createElement('table');
    var tHeader = document.createElement('thead');
    var tBody = document.createElement('tbody');
    var hRow = document.createElement('tr');
    var hCell = document.createElement('td');
    var bRow1 = document.createElement('tr');
    var bCell1a = document.createElement('td');
    var bCell1b = document.createElement('td');
    var bRow2 = document.createElement('tr');
    var bCell2a = document.createElement('td');
    var bCell2b = document.createElement('td');
    var bRow3 = document.createElement('tr');
    var bCell3a = document.createElement('td');
    var bCell3b = document.createElement('td');
    var bRow4 = document.createElement('tr');
    var bCell4a = document.createElement('td');
    var bCell4b = document.createElement('td');
    var bRow5 = document.createElement('tr');
    var bCell5a = document.createElement('td');
    var bCell5b = document.createElement('td');

    var usernameField = document.createElement("input");
    var passwordField = document.createElement("input");
    var loginButton = document.createElement("button");

    usernameField.name="username";
    usernameField.type="text"
    passwordField.name="password";
    passwordField.type="password";

    hCell.colSpan = "2";
    hCell.appendChild(document.createTextNode(uiText("Kirjaudu sisään turnaustilastooon")));
    hRow.appendChild(hCell);
    setElementStyle(hCell);
    tHeader.appendChild(hRow);
    table.appendChild(tHeader);

    bCell1a.style.border = "solid #ffffff";
    bCell1b.style.border = "solid #ffffff";
    setElementStyle(bCell2a);
    setElementStyle(bCell2b);
    setElementStyle(bCell3a);
    setElementStyle(bCell3b);
    bCell4a.style.border = "solid #ffffff";
    bCell4b.style.border = "solid #ffffff";
    setElementStyle(bCell5a);
    setElementStyle(bCell5b);

    bCell1a.appendChild(document.createTextNode(" "));
    bCell2a.appendChild(document.createTextNode(uiText("Käyttäjä") + ": "));
    bCell2b.appendChild(usernameField);
    bCell3a.appendChild(document.createTextNode("Salasana" + ": "));
    bCell3b.appendChild(passwordField);
    bCell4a.appendChild(document.createTextNode(" "));

    loginButton.appendChild(document.createTextNode("Kirjaudu"));
    loginButton.onclick = function() { sendLogin(usernameField.value, passwordField.value); }

    bCell5a.appendChild(loginButton);

    bRow1.appendChild(bCell1a);
    bRow1.appendChild(bCell1b);
    bRow2.appendChild(bCell2a);
    bRow2.appendChild(bCell2b);
    bRow3.appendChild(bCell3a);
    bRow3.appendChild(bCell3b);
    bRow4.appendChild(bCell4a);
    bRow4.appendChild(bCell4b);
    bRow5.appendChild(bCell5a);
    bRow5.appendChild(bCell5b);

    tBody.appendChild(bRow1);
    tBody.appendChild(bRow2);
    tBody.appendChild(bRow3);
    tBody.appendChild(bRow4);
    tBody.appendChild(bRow5);

    table.appendChild(tBody);
    table.id = "myDiv2";

    return table;
}


// ---------- main button panel, always visible

function createTopButtons(mode, tournamentData) {
    var buttonBox = document.createElement("fieldset");
    buttonBox.id = "myDiv1";
    var logoutButton = document.createElement("button");  
    logoutButton.onclick = function() { logout(); }
    var text1 = document.createTextNode("Kirjaudu ulos");
    logoutButton.appendChild(text1);
    buttonBox.appendChild(logoutButton);
    if(mode.type === "unpriviliged" || mode.type === "logout") {
	return buttonBox;
    }
    if(mode.type === "user") {
	if(havePrivilige(tournamentData.priviliges, "team-edit")) {
	    var teamButton = document.createElement("button");
	    teamButton.onclick = function() { editTeams(tournamentData); }
	    teamButton.appendChild(document.createTextNode("Muokkaa joukkueita"));
	    buttonBox.appendChild(teamButton);
	}
	if(havePrivilige(tournamentData.priviliges, "tournament-edit")) {
	    var tournamentButton = document.createElement("button");
	    tournamentButton.onclick = function() { editTournaments(tournamentData); }
	    tournamentButton.appendChild(document.createTextNode("Muokkaa turnauksia"));
	    buttonBox.appendChild(tournamentButton);
	}
	if(havePrivilige(tournamentData.priviliges, "system-admin")) {
	    var adminButton = document.createElement("button");
	    adminButton.onclick = function() { gainSysadminMode(); }
	    adminButton.appendChild(document.createTextNode("Admin mode"));
	    buttonBox.appendChild(adminButton);
	}
    }
    if(mode.type === "admin") {
	var adminButton = document.createElement("button");
	adminButton.onclick = function() { gainUserMode(); }
	var text2 = document.createTextNode("User mode");
	adminButton.appendChild(text2);
	buttonBox.appendChild(adminButton);
    }
    return buttonBox;
}

function editTeams() {
    sendToServerEncrypted("getTeamsDataForEdit", "none");
    return false;
}
