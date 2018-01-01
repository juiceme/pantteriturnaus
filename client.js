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

    console.log("Received message: " + JSON.stringify(receivable));

    if(receivable.type == "loginView") {
	var div1 = document.createElement("div");
	document.body.replaceChild(div1, document.getElementById("myDiv1"));
	div1.id = "myDiv1";
	document.body.replaceChild(createLoginView(), document.getElementById("myDiv2"));
	clearTimeout(connectionTimerId);
    }

    if(receivable.type == "payload") {
	// payload is always encrypted, if authentication is not successiful then JSON parsing
	// fails and client is restarted
	try {
	    var content = JSON.parse(Aes.Ctr.decrypt(receivable.content, sessionPassword, 128));
	    handleIncomingMessage(content);
	} catch(err) {
	    var sendable = {type:"clientStarted", content:"none"};
	    mySocket.send(JSON.stringify(sendable));
	}
    }
}

function handleIncomingMessage(decryptedMessage) {

    console.log("Decrypted incoming message: " + JSON.stringify(decryptedMessage));

    if(decryptedMessage.type == "statusData") {
        document.getElementById("myStatusField").value = decryptedMessage.content;
    }

    if(decryptedMessage.type == "loginChallenge") {
	var cipheredResponce = Aes.Ctr.encrypt(decryptedMessage.content, sessionPassword, 128);
	sendToServer("loginResponse", cipheredResponce);
    }

    if(decryptedMessage.type == "unpriviligedLogin") {
	document.body.replaceChild(createTopButtons(decryptedMessage.content), document.getElementById("myDiv1"));
	document.body.replaceChild(document.createElement("div"), document.getElementById("myDiv2"));
    }

    if(decryptedMessage.type == "showTournament") {
	var wnd = window.document.open("about:blank", "", "scrollbars=yes");
	wnd.document.write(decryptedMessage.content);
	wnd.document.close();
    }

    if(decryptedMessage.type == "createGenericEditFrame") {
	document.body.replaceChild(createTopButtons(decryptedMessage.content),
				   document.getElementById("myDiv1"));
	document.body.replaceChild(createEditListFrame(decryptedMessage.content),
				   document.getElementById("myDiv2"));
    }

    if(decryptedMessage.type == "createGenericListFrame") {
	document.body.replaceChild(createTopButtons(decryptedMessage.content),
				   document.getElementById("myDiv1"));
	document.body.replaceChild(createFixedListFrame(decryptedMessage.content),
				   document.getElementById("myDiv2"));
    }
}


// ---------- Parse out UI elements from incoming message

function createEditListFrame(inputData) {
    var fieldset = document.createElement('fieldsetset');

    fieldset.appendChild(document.createElement('br'));
    fieldset.appendChild(createEditableItemList(inputData));
    fieldset.appendChild(document.createElement('br'));
    fieldset.appendChild(createAcceptButtons(inputData));
    fieldset.appendChild(document.createElement('br'));
    fieldset.id= "myDiv2";
    return fieldset;
}

function createFixedListFrame(inputData) {
    var fieldset = document.createElement('fieldsetset');

    fieldset.appendChild(document.createElement('br'));
    fieldset.appendChild(createFixedItemList(inputData));
    fieldset.appendChild(document.createElement('br'));
    if(inputData.buttonList !== undefined) {
	fieldset.appendChild(createAcceptButtons(inputData));
	fieldset.appendChild(document.createElement('br'));
    }
    fieldset.id= "myDiv2";
    return fieldset;
}

function createFixedItemList(inputData) {
    var table = document.createElement('table');
    var tableHeader = document.createElement('thead');
    var tableBody = document.createElement('tbody');

    var hRow0 = tableHeader.insertRow();
    var cell = hRow0.insertCell();
    cell.colSpan = inputData.itemList.header.length + 2;
    cell.innerHTML = "<b>" + inputData.itemList.title + "</b>";
    var hRow1 = tableHeader.insertRow();
    hRow1.appendChild(document.createElement('td'));
    inputData.itemList.header.forEach(function(h) {
	var cell= hRow1.insertCell();
	cell.innerHTML = "<b>" + h.text + "</b>";
	hRow1.appendChild(cell);
    });
    var count = 1;
    var id = 1001;
    inputData.itemList.items.forEach(function(i) {
	var newTableItem = createTableItem(id, count, inputData, i);
	id = newTableItem.id;
	tableBody.appendChild(newTableItem.tableRow);
	count++;
    });
    table.appendChild(tableHeader);
    table.appendChild(tableBody);
    return table;
}

function createEditableItemList(inputData) {
  var table = document.createElement('table');
    var tableHeader = document.createElement('thead');
    var tableBody = document.createElement('tbody');

    var hRow0 = tableHeader.insertRow();
    var cell = hRow0.insertCell();
    cell.colSpan = inputData.itemList.header.length + 2;
    cell.innerHTML = "<b>" + inputData.itemList.title + "</b>";
    var hRow1 = tableHeader.insertRow();
    hRow1.appendChild(document.createElement('td'));
    inputData.itemList.header.forEach(function(h) {
	var cell= hRow1.insertCell();
	cell.innerHTML = "<b>" + h.text + "</b>";
	hRow1.appendChild(cell);
    });
    var count = 1;
    var id = 2001;
    inputData.itemList.items.forEach(function(i) {
	var newTableItem = createEditTableItem(id, count, inputData, i, false);
	id = newTableItem.id;
	tableBody.appendChild(newTableItem.tableRow);
	count++;
    });
    var newItem = inputData.itemList.newItem;
    tableBody.appendChild(createEditTableItem(id, count, inputData, newItem, true).tableRow);
    table.appendChild(tableHeader);
    table.appendChild(tableBody);

    return table;
}

function createTopButtons(inputData) {
    var table = document.createElement('table');
    var tableBody = document.createElement('tbody');
    var tableRow = tableBody.insertRow();    

    inputData.topButtonList.forEach(function(b) {
//	var cell = document.createElement('td');
	var button = document.createElement('button');
	button.appendChild(document.createTextNode(b.text));
	button.id = b.id;
	button.onclick = function() {
	    sendToServerEncrypted(b.callbackMessage, inputData);
	    return false;
	};
//	cell.appendChild(button);
	tableRow.appendChild(button);
    });
    table.appendChild(tableBody);
    table.id = "myDiv1";

    return table;
}

function createAcceptButtons(inputData) {
    var table = document.createElement('table');
    var tableBody = document.createElement('tbody');
    var tableRow = tableBody.insertRow();    

    inputData.buttonList.forEach(function(b) {
//	var cell = document.createElement('td');
	var button = document.createElement('button');
	button.appendChild(document.createTextNode(b.text));
	button.id = b.id;
	button.onclick = function() {
	    var freshData = { user: inputData.user, priviliges: inputData.priviliges,
			      itemList: { title: inputData.itemList.title,
					  header: inputData.itemList.header,
					  items: refreshInputDataItems(inputData, false),
					  newItem: inputData.itemList.newItem },
			      buttonList: inputData.buttonList };
	    sendToServerEncrypted(b.callbackMessage, freshData);
	    return false;
	};
//	cell.appendChild(button);
	tableRow.appendChild(button);
    });
    table.appendChild(tableBody);
    return table;
}

function createTableItem(id, count, inputData, item) {
    var tableRow = document.createElement('tr');
    var cell = document.createElement('td');
    cell.appendChild(document.createTextNode(count));
    tableRow.appendChild(cell);
    item.forEach(function(c) {
	var cell = document.createElement('td');
	var newTypedObject = createTypedObject(id, c, inputData);
	id = newTypedObject.id;
	cell.appendChild(newTypedObject.item);
	tableRow.appendChild(cell);
    });
    return { id: id, tableRow: tableRow };
}

function createEditTableItem(id, count, inputData, item, lastRow) {
    var tableRow = document.createElement('tr');
    var cell = document.createElement('td');

    cell.appendChild(document.createTextNode(count));
    tableRow.appendChild(cell);
    item.forEach(function(c) {
	var cell = document.createElement('td');
	var newTypedObject = createTypedObject(id, c, inputData);
	id = newTypedObject.id;
	cell.appendChild(newTypedObject.item);
	tableRow.appendChild(cell);
    });
    var lastCell = document.createElement('td');
    if(lastRow) {
	var addButton = document.createElement("button");
	addButton.appendChild(document.createTextNode("Luo uusi"));
	addButton.id = count;
	addButton.onclick = function() { createNewItemToList(inputData, this); }
	lastCell.appendChild(addButton);
    } else {
	var deleteButton = document.createElement("button");
	deleteButton.appendChild(document.createTextNode("Poista"));
	deleteButton.id = count;
	deleteButton.onclick = function() { deleteItemFromList(inputData, this); }
	lastCell.appendChild(deleteButton);
    }
    tableRow.appendChild(lastCell);
    return { id: id, tableRow: tableRow };
}

function createNewItemToList(inputData, button) {
    var newItemList = refreshInputDataItems(inputData, true);
    var bottomItem = [];    
    inputData.itemList.newItem.forEach(function(i) {
	bottomItem.push(getTypedObjectTemplateById(i, true));
    });
    newItemList.push(bottomItem);
    
    var newData = { user: inputData.user, priviliges: inputData.priviliges,
	       itemList: { title: inputData.itemList.title, header: inputData.itemList.header,
			   items: newItemList, newItem: inputData.itemList.newItem },
	       buttonList: inputData.buttonList };

    document.body.replaceChild(createEditListFrame(newData),
			       document.getElementById("myDiv2"));
    return false;
}

function deleteItemFromList(inputData, button) {
    var newList = inputData.itemList.items.map(function(a,b) {
	if(b != (button.id -1)) { return a; }
    }).filter(function(s){ return s; });
    inputData.itemList.items = newList;

    document.body.replaceChild(createEditListFrame(inputData),
			       document.getElementById("myDiv2"));
    return false;
}

function refreshInputDataItems(inputData, fullData) {
    var newItemList = [];

    inputData.itemList.items.forEach(function(l) {
	var newitemRow = [];
	l.forEach(function(i) {
	    newitemRow.push(getTypedObjectTemplateById(i, fullData));
	});
	newItemList.push(newitemRow);
    });
    return newItemList;
}

function createTypedObject(id, item, inputData) {
    var newItemContainer = document.createElement('div');

    item.forEach(function(i) {
	if(i.itemType === "textnode") {
	    var newItem = document.createElement('div');
	    newItem.itemType = "textnode";
	    newItem.key = i.key;
	    newItem.id = id++;
	    i.itemId = newItem.id;
	    newItem.itemText = i.text;
	    newItem.appendChild(document.createTextNode(i.text));
	    newItemContainer.appendChild(newItem);
	}

	if(i.itemType === "textarea") {
	    var newItem = document.createElement("textarea");
	    newItem.itemType = "textarea";
	    newItem.key = i.key;
	    newItem.id = id++;
	    i.itemId = newItem.id;
	    newItem.setAttribute('cols', i.cols);
	    newItem.setAttribute('rows', i.rows);
	    newItem.value = i.value;
	    newItemContainer.appendChild(newItem);
	}

	if(i.itemType === "checkbox") {
	    var newItem = document.createElement('input');
	    newItem.itemType = "checkbox";
	    newItem.key = i.key;
	    newItem.type = "checkbox";
	    if(!i.active) {
		newItem.disabled = "disabled";
	    }
	    newItem.id = id++;
	    i.itemId = newItem.id;
	    newItem.checked = i.checked;
	    newItem.title = i.title;
	    newItemContainer.appendChild(newItem);
	}

	if(i.itemType === "selection") {
	    var newItem = document.createElement('select');
	    var myOption = document.createElement('option');
	    var literalList = [];
	    var zeroOption = { text: "", item: "", value: 0 };
	    myOption.text = "";
	    myOption.item = "";
	    myOption.value = 0;
	    if(!i.active) {
		newItem.disabled = true;
	    }
	    literalList.push(zeroOption);
	    newItem.add(myOption);
	    var count = 1;
	    i.list.forEach(function(j) {
		var myOption = document.createElement('option');
		var nOption = { text: j.text, item: j.item, value: count };
		myOption.text = j.text;
		myOption.item = j.item;
		myOption.value = count;
		literalList.push(nOption);
		newItem.add(myOption);
		count++;
	    });
	    newItem.itemType = "selection";
	    newItem.key = i.key;
	    newItem.id = id++;
	    i.itemId = newItem.id;
	    newItem.literalList = literalList;
	    setSelectedItemInList(newItem, i.selected);
	    newItemContainer.appendChild(newItem);
	}

	if(i.itemType === "button") {
	    var newItem = document.createElement('div');
	    newItem.itemType = "button";
	    newItem.id = id++;
	    i.itemId = newItem.id;
	    newItem.text = i.text;
	    newItem.callbackMessage = i.callbackMessage;
	    var button = document.createElement('button');
	    if(!i.active) {
		button.disabled = true;
	    }
	    button.appendChild(document.createTextNode(i.text));
	    button.onclick = function() { sendToServerEncrypted(i.callbackMessage,
								{ buttonId: i.itemId,
								  buttonData: i.data,
								  inputData: inputData });
					  return false;
					};
	    newItem.appendChild(button);
	    newItemContainer.appendChild(newItem);
	}
    });

    return { id: id, item: newItemContainer };
}

function setSelectedItemInList(myList, myItem) {
    myList.selectedIndex = Object.keys(myList).map(function(a) {
       if(JSON.stringify(myList[a].item) === JSON.stringify(myItem)) return a;
    }).filter(function(f) {
       return f;
    })[0];
}

function getSelectedItemInList(selectionList) {
    return  selectionList.options[selectionList.selectedIndex].item;
}

function getTypedObjectTemplateById(item, fullData) {
    var itemList = [];

    item.forEach(function(i) {
	var uiItem = document.getElementById(i.itemId);

	if(i.itemType === "textnode") {
	    itemList.push( { itemType: "textnode",
			     key: i.key,
			     text: uiItem.itemText } );
	}
	if(i.itemType === "textarea") {
	    itemList.push( { itemType: "textarea",
			     key: i.key,
			     value: uiItem.value,
			     cols: i.cols,
			     rows: i.rows } );
	}
	if(i.itemType === "checkbox") {
	    itemList.push( { itemType: "checkbox",
			     key: i.key,
			     checked: uiItem.checked,
			     title: i.title,
			     active: i.active } );
	}
	if(i.itemType === "selection") {
	    var newSelector = { itemType: "selection",
				key: i.key,
				selected: getSelectedItemInList(uiItem),
				active: i.active };
	    if(fullData) { newSelector.list = i.list; }
	    itemList.push(newSelector);
	}
	if(i.itemType === "button") {
	    itemList.push( { itemType: "button",
			     text: i.text,
			     itemId: i.itemId,
			     data: i.data,
			     callbackMessage: i.callbackMessage,
			     active: i.active } );
	}
    });

    return itemList;
}



// ---------- Utility helper functions



function sendLogin(username, password) {
    div = document.createElement('div');
    div.id = "myDiv2";
    document.body.replaceChild(div, document.getElementById("myDiv2"));
    sessionPassword = Sha1.hash(password + Sha1.hash(username).slice(0,4));
    sendToServer("userLogin", { username: Sha1.hash(username) });
//    console.log("SessionPassword = " + sessionPassword);
}

function uiText(text) {
    return decodeURIComponent(escape(text));
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
    var sendable = { type: "payload",
		     content: Aes.Ctr.encrypt(JSON.stringify({ type: type, content: content }),
					      sessionPassword, 128) };
    mySocket.send(JSON.stringify(sendable));
    console.log("Sent " + JSON.stringify(sendable).length + " encrypted bytes to server");
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

