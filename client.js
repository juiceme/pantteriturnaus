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
	var tournamentData = JSON.parse(Aes.Ctr.decrypt(receivable.content, sessionPassword, 128));
	document.body.replaceChild(createTopButtons({type: "user"}, tournamentData),
				   document.getElementById("myDiv1"));
	document.body.replaceChild(createUserView(tournamentData),
				   document.getElementById("myDiv2"));
   }

    if(receivable.type == "adminData") {
	var adminData = JSON.parse(Aes.Ctr.decrypt(receivable.content, sessionPassword, 128));
	document.body.replaceChild(createTopButtons({type: "admin"}, false),
				   document.getElementById("myDiv1"));
	document.body.replaceChild(createAdminView(adminData),
				   document.getElementById("myDiv2"));
    }

    if(receivable.type == "pdfUpload") {
	var pdfData = atob(JSON.parse(Aes.Ctr.decrypt(receivable.content, sessionPassword, 128)));
	window.open("data:application/pdf," + escape(pdfData));
    }

    if(receivable.type == "zipUpload") {
	var zipData = atob(JSON.parse(Aes.Ctr.decrypt(receivable.content, sessionPassword, 128)));
	window.open("data:application/zip," + escape(zipData));
    }

    if(receivable.type == "helpText") {
	var helpText = atob(JSON.parse(Aes.Ctr.decrypt(receivable.content, sessionPassword, 128)));
	var wnd = window.document.open("about:blank", "", "scrollbars=yes");
	wnd.document.write(decodeURIComponent(escape(helpText)));
	wnd.document.close();
    }
}


// ---------- Main user tournament view

function createUserView(tournamentData) {
    var fieldset = document.createElement('fieldsetset');
    fieldset.appendChild(document.createElement('br'));
    fieldset.appendChild(createTournamentTable(tournamentData));
    fieldset.appendChild(document.createElement('br'));
    fieldset.id= "myDiv2";
    return fieldset;
}

function createTournamentTable(tournamentData) {
    var clientCount = 0
    var table = document.createElement('table');
    var tableHeader = document.createElement('thead');
    var tableBody = document.createElement('tbody');
    table.id = "myTournamentTable";
    var hRow0 = tableHeader.insertRow(0);    
    var hCell0 = hRow0.insertCell();
    var hCell1 = hRow0.insertCell();
    var hCell2 = hRow0.insertCell();
    var hCell3 = hRow0.insertCell();

    hCell0.innerHTML = "<b>" + uiText("Ottelu") + "</b>";
    hCell1.innerHTML = "<b>" + uiText("Koti") + "</b>";
    hCell2.innerHTML = "<b>" + uiText("Vieras") + "</b>";
    hCell3.innerHTML = "<b>" + uiText("Tulos") + "</b>";

    tournamentData.tournament.forEach(function(s) {
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
	editButton.appendChild(document.createTextNode(uiText("Muokkaa")));
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
    var match = tournamentData.tournament.map(function(a) {
	    if(a.round == id) { return a; }
	}).filter(function(s){ return s; })[0];
    var table = document.createElement('table');
    var tableHeader = document.createElement('thead');
    var tableBody = document.createElement('tbody');
    table.id = "myMatchTable";
    var hRow0 = tableHeader.insertRow(0);    
    var hCell0 = hRow0.insertCell();
    hCell0.innerHTML = uiText("<b>" + uiText(match.home + " vs. " + match.guest) + "</b>");
    var hCell1 = hRow0.insertCell();
    hCell1.innerHTML = uiText("<b>Piste</b>");
    var hCell2 = hRow0.insertCell();
    hCell2.innerHTML = uiText("<b>Tyyppi</b>");
    var hCell3 = hRow0.insertCell();
    hCell3.innerHTML = uiText("<b>Aika</b>");
    var hCell4 = hRow0.insertCell();
    hCell4.innerHTML = uiText("<b>Laukoja</b>");
    var hCell5 = hRow0.insertCell();
    hCell5.innerHTML = uiText("<b>Syöttäjä</b>");

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
    var match = tournamentData.tournament.map(function(a) {
	    if(a.round == id) { return a; }
	}).filter(function(s){ return s; })[0];
    var fieldset = document.createElement('fieldsetset');
    var acceptButton = document.createElement('button');
    var cancelButton = document.createElement('button');
    acceptButton.appendChild(document.createTextNode(uiText("OK")));
    acceptButton.onclick = function() { saveMatchStatisticsEdit(tournamentData, match); }
    cancelButton.appendChild(document.createTextNode(uiText("Peruuta")));
    cancelButton.onclick = function() { cancelMatchStatisticsEdit(); }
    fieldset.appendChild(acceptButton);
    fieldset.appendChild(cancelButton);
    return fieldset;
}

function saveMatchStatisticsEdit(tournamentData, match) {
    if(!havePrivilige(tournamentData.priviliges, "score-edit")) {
	alert(uiText("You are not allowed to save tournament scores!"));
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

    var clientSendable = { tournament: tournamentData };
    var encryptedSendable = Aes.Ctr.encrypt(JSON.stringify(clientSendable), sessionPassword, 128);
    var sendable = { type: "saveTournamentData",
		     content: encryptedSendable };
    mySocket.send(JSON.stringify(sendable));

    return false;
}

function cancelMatchStatisticsEdit() {
    sendToServerEncrypted("resetToMain", {});
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
	addButton.appendChild(document.createTextNode(uiText("Luo uusi")));
	addButton.id = count;
	addButton.onclick = function() { createMatchItemToList(tournamentData, id, match, this); }
	cell6.appendChild(addButton);
    } else {
	var deleteButton = document.createElement("button");
	deleteButton.appendChild(document.createTextNode(uiText("Poista")));
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

function editTeams(tournamentData) {
    document.body.replaceChild(createTopButtons({type: "logout"}, false),
			       document.getElementById("myDiv1"));
    document.body.replaceChild(createEditTeamsView(tournamentData),
			       document.getElementById("myDiv2"));
}

function createEditTeamsView(tournamentData) {
    var fieldset = document.createElement("fieldset");
    var acceptButton = document.createElement('button');
    var cancelButton = document.createElement('button');
    fieldset.appendChild(document.createElement("br"));

    tournamentData.teams.forEach(function(t) {
	var table = document.createElement('table');
	var tableHeader = document.createElement('thead');
	var tableBody = document.createElement('tbody');
	var hRow = tableHeader.insertRow();    
	var hCell0 = hRow.insertCell();
	hCell0.innerHTML = "<b>" + t.name + "</b>";
	var count=1;
	t.players.forEach(function(p) {
	    tableBody.appendChild(createPlayerEditTableRow(count, tournamentData, t.name, p, false));
	    count++;
	});
	var newPlayer = { name: "<name>", number: "<1>" };
	tableBody.appendChild(createPlayerEditTableRow(count, tournamentData, t.name, newPlayer, true));
	table.appendChild(tableHeader);
	table.appendChild(tableBody);
	fieldset.appendChild(table);
	fieldset.appendChild(document.createElement("br"));
    });

    fieldset.appendChild(document.createElement('br'));
    acceptButton.appendChild(document.createTextNode(uiText("OK")));
    acceptButton.onclick = function() { saveTeamsEdit(tournamentData); }
    cancelButton.appendChild(document.createTextNode(uiText("Peruuta")));
    cancelButton.onclick = function() { cancelTeamsEdit(tournamentData); }
    fieldset.appendChild(acceptButton);
    fieldset.appendChild(cancelButton);
    fieldset.appendChild(document.createElement('br'));
    fieldset.id = "myDiv2";
    return fieldset;
}

function saveTeamsEdit(tournamentData) {
    var tCount = 1;
    var newTeams = [];
    tournamentData.teams.forEach(function(t) {
	var team = {name:t.name, players:[]};
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

    tournamentData.teams = newTeams;
    sendToServerEncrypted("saveTeamData", tournamentData);
}

function cancelTeamsEdit(tournamentData) {
    sendToServerEncrypted("resetToMain", {});
}

function createPlayerEditTableRow(count, tournamentData, team, player, lastRow) {
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
	addButton.appendChild(document.createTextNode(uiText("Add new")));
	addButton.id = count;
	addButton.teamName = team;
	addButton.onclick = function() { createPlayerToList(tournamentData, this); }
	cell3.appendChild(addButton);
    } else {
	var deleteButton = document.createElement("button");
	deleteButton.appendChild(document.createTextNode(uiText("Delete")));
	deleteButton.id = count;
	deleteButton.teamName = team;
	deleteButton.onclick = function() { deletePlayerFromList(tournamentData, this); }
	cell3.appendChild(deleteButton);
    }
    row.appendChild(cell3);
    return row;
}

function createPlayerToList(tournamentData, button) {
    var newPlayer = { name: document.getElementById("tt_" + button.id + "_" + button.teamName + "_name").value,
		      number: document.getElementById("tt_" + button.id + "_" + button.teamName + "_number").value };
    var index = tournamentData.teams.map(function(e){return e.name}).indexOf(button.teamName);
    if(index < 0) { console.log("illegal value in teams!"); }
    else { tournamentData.teams[index].players.push(newPlayer); }
    
    document.body.replaceChild(createEditTeamsView(tournamentData),
			       document.getElementById("myDiv2"));

    return false;
}

function deletePlayerFromList(tournamentData, button) {
    var index = tournamentData.teams.map(function(e){return e.name}).indexOf(button.teamName);
    var newPlayers = tournamentData.teams[index].players.map(function(a,b){
	if(b != (button.id - 1)) { return a; }
    }).filter(function(s){ return s; });
    tournamentData.teams[index].players = newPlayers;

    document.body.replaceChild(createEditTeamsView(tournamentData),
			       document.getElementById("myDiv2"));
    return false;
}


// ---------- Tournament editing

function editTournaments(tournamentData) {
    console.log("function editTournaments() is not implemented yet")
}


// ---------- Sysadmin panel handling

function createAdminView(adminData) {
    var fieldset = document.createElement('fieldsetset');
    var acceptButton = document.createElement('button');
    var cancelButton = document.createElement('button');
    fieldset.appendChild(createUserTable(adminData));
    fieldset.appendChild(document.createElement('br'));
    acceptButton.appendChild(document.createTextNode(uiText("OK")));
    acceptButton.onclick = function() { saveAdminEdit(adminData); }
    cancelButton.appendChild(document.createTextNode(uiText("Peruuta")));
    cancelButton.onclick = function() { cancelAdminEdit(adminData); }
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
}

function cancelAdminEdit(adminData) {
    sendToServerEncrypted("resetToMain", {});
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
	addButton.appendChild(document.createTextNode(uiText("Luo uusi")));
	addButton.id = count;
	addButton.onclick = function() { createUserToList(adminData, this); }
	cell5.appendChild(addButton);
    } else {
	var deleteButton = document.createElement("button");
	deleteButton.appendChild(document.createTextNode(uiText("poista")));
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
    bCell3a.appendChild(document.createTextNode(uiText("Salasana") + ": "));
    bCell3b.appendChild(passwordField);
    bCell4a.appendChild(document.createTextNode(" "));

    loginButton.appendChild(document.createTextNode(uiText("Kirjaudu")));
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
    var text1 = document.createTextNode(uiText("Kirjaudu ulos"));
    logoutButton.appendChild(text1);
    buttonBox.appendChild(logoutButton);
    if(mode.type === "unpriviliged" || mode.type === "logout") {
	return buttonBox;
    }
    if(mode.type === "user") {
	if(havePrivilige(tournamentData.priviliges, "team-edit")) {
	    var teamButton = document.createElement("button");
	    teamButton.onclick = function() { editTeams(tournamentData); }
	    teamButton.appendChild(document.createTextNode(uiText("Muokkaa joukkueita")));
	    buttonBox.appendChild(teamButton);
	}
	if(havePrivilige(tournamentData.priviliges, "tournament-edit")) {
	    var tournamentButton = document.createElement("button");
	    tournamentButton.onclick = function() { editTournaments(tournamentData); }
	    tournamentButton.appendChild(document.createTextNode(uiText("Muokkaa turnausta")));
	    buttonBox.appendChild(tournamentButton);
	}
	if(havePrivilige(tournamentData.priviliges, "system-admin")) {
	    var adminButton = document.createElement("button");
	    adminButton.onclick = function() { gainSysadminMode(); }
	    adminButton.appendChild(document.createTextNode(uiText("Admin mode")));
	    buttonBox.appendChild(adminButton);
	}
    }
    if(mode.type === "admin") {
	var adminButton = document.createElement("button");
	adminButton.onclick = function() { gainUserMode(); }
	var text2 = document.createTextNode(uiText("User mode"));
	adminButton.appendChild(text2);
	buttonBox.appendChild(adminButton);
    }
    return buttonBox;
}
