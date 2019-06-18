var PDFDocument = require("pdfkit");
var fs = require("fs");

function printSheet(filename, teams, results, match)
{
    // Create the document
    var doc = new PDFDocument({	size: "a4",
				layout: "landscape",
				margins: { top: 0, left: 0, bottom: 0, right: 0 } });

    // Pipe document output to a file
    var writeStream = fs.createWriteStream(filename);
    doc.pipe(writeStream);

    drawPanels(doc);

    drawPlayers(doc, "home", teams.home);
    drawPlayers(doc, "guest", teams.guest);
    drawScores(doc, "home", results.home.scores);
    drawScores(doc, "guest", results.guest.scores);
    drawPenalties(doc, "home", results.home.penalties);
    drawPenalties(doc, "guest", results.guest.penalties);
    drawMatchTotals(doc, match, teams);

    doc.end();
}

function drawPlayers(doc, place, team)
{
    var offset = 57;
    if(place === "guest") {
	offset = 312;
    }

    var removePlayers = 0;
    var players = [];
    if(team.players.length > 20) {
	removePlayers = team.players.length - 20;
    }
    team.players.forEach(function(p) {
	if((removePlayers > 0) && (p.goal === "") &&
	   (p.pass === "") && (p.penalty === "")) {
	    // player with no scores or penalties may be discarded
	    removePlayers--;
	} else {
	    players.push(p);
	}
    });
    text(doc, team.name, 10, 160, offset);
    offset = offset + 22;
    var i = 0;
    players.forEach(function(p) {
	if(i < 20) {
	    text(doc, p.number, 7, 87, offset + i * 10);
	    text(doc, p.role, 7, 106, offset + i * 10);
	    text(doc, p.name, 7, 130, offset + i * 10);
	    text(doc, p.goal, 7, 309, offset + i * 10);
	    text(doc, p.pass, 7, 326, offset + i * 10);
	}
	i++;
    });
}

function drawScores(doc, place, scores)
{
    var offset = 69;
    if(place === "guest") {
	offset = 324;
    }

    var i = 1;
    var j = 1;
    scores.forEach(function(s) {
	if(s.code === "RL -") {
	    text(doc, "-", 7, 341, offset + j * 10);
	    i--;
	} else {
	    text(doc, i, 7, 341, offset + j * 10);
	}
	text(doc, s.time, 7, 360, offset + j * 10);
	text(doc, s.goal, 7, 386, offset + j * 10);
	text(doc, s.pass, 7, 402, offset + j * 10);
	if((s.code === "RL -") || (s.code === "RL OK")) {
	    text(doc, "RL", 7, 418, offset + j * 10);
	} else {
	    text(doc, s.code, 7, 418, offset + j * 10);
	}
	i++;
	j++;
    });
}

function drawPenalties(doc, place, penalties)
{
    var offset = 69;
    if(place === "guest") {
	offset = 324;
    }

    var i = 1;
    penalties.forEach(function(p) {
	text(doc, p.player, 7, 435, offset + i * 10);
	text(doc, p.length, 7, 451, offset + i * 10);
	text(doc, p.code, 7, 468, offset + i * 10);
	text(doc, p.start, 7, 486, offset + i * 10);
	text(doc, p.end, 7, 516, offset + i * 10);
	i++;
    });

    text(doc, penalties.length, 8, 460, offset + 212);
    var seconds = 0;
    penalties.forEach(function(p) {
	seconds = seconds + (parseInt(p.end.split(":")[0]) * 60 +  parseInt(p.end.split(":")[1])) -
	    (parseInt(p.start.split(":")[0]) * 60 +  parseInt(p.start.split(":")[1]));
    });
    text(doc, ("00" + ((seconds-(seconds%60))/60)).slice(-2) + ":" + ("00" + (seconds%60)).slice(-2),
	 8, 510,  offset + 212);
}

function drawMatchTotals(doc, match, teams)
{
    text(doc, match.series, 7, 580, 98);
    text(doc, match.spectators, 7, 710, 98);
    text(doc, match.date, 7, 580, 118);
    text(doc, match.start, 7, 710, 118);
    text(doc, match.number, 7, 600, 138);
    text(doc, match.end, 7, 710, 138);
    text(doc, match.venue, 7, 580, 158);
    var i = 0;
    match.officials.forEach(function(o) {
	text(doc, o, 7, 650, 178 + 10*i);
	i++;
    });
    i = 0;
    match.referees.forEach(function(r) {
	text(doc, r, 7, 650, 238 + 10*i);
	i++;
    });
    i = 0;
    var homeScore = 0;
    var guestScore = 0;
    match.scores.forEach(function(s) {
	homeScore = homeScore + s.home;
	guestScore = guestScore + s.guest;
	if(s.home !== 0) {
	    text(doc, s.home, 7, 569, 209 + 10*i);
	} else {
	    if(s.guest !== 0) {
		text(doc, "-", 7, 569, 209 + 10*i);
	    }
	}
	if(s.guest !== 0) {
	    text(doc, s.guest, 7, 586, 209 + 10*i);
	} else {
	    if(s.home !== 0) {
		text(doc, "-", 7, 586, 209 + 10*i);
	    }
	}
	i++;
    });
    text(doc, homeScore, 7, 569, 262);
    text(doc, guestScore, 7, 586, 262);
    var winner = "";
    if(homeScore > guestScore) { winner = teams.home.name; }
    if(homeScore < guestScore) { winner = teams.guest.name; }
    text(doc, winner, 9, 630, 280);
    text(doc, match.timeOut.home, 7, 610, 464);
    text(doc, match.timeOut.guest, 7, 672, 464);
}

function drawPanels(doc)
{
    // upper panel
    hline(doc, 83, 40, 539);
    hline(doc, 83, 54, 539);
    hline(doc, 83, 66, 773);
    hline(doc, 83, 75, 773);
    hline(doc, 83, 85, 539);
    hline(doc, 83, 95, 539);
    hline(doc, 83, 105, 539);
    hline(doc, 83, 115, 539);
    hline(doc, 83, 125, 539);
    hline(doc, 83, 135, 539);
    hline(doc, 83, 145, 539);
    hline(doc, 83, 155, 539);
    hline(doc, 83, 165, 539);
    hline(doc, 83, 175, 539);
    hline(doc, 83, 185, 539);
    hline(doc, 83, 195, 596);
    hline(doc, 83, 205, 596);
    hline(doc, 83, 215, 596);
    hline(doc, 83, 225, 596);
    hline(doc, 83, 235, 596);
    hline(doc, 83, 245, 596);
    hline(doc, 83, 255, 596);
    hline(doc, 83, 265, 539);
    hline(doc, 83, 275, 773);
    hline(doc, 83, 283, 430);
    hline(doc, 83, 292, 773);
    hline(doc, 83, 300, 254);
    hline(doc, 580, 105, 640);
    hline(doc, 702, 105, 773);
    hline(doc, 580, 125, 640);
    hline(doc, 702, 125, 773);
    hline(doc, 596, 145, 640);
    hline(doc, 702, 145, 773);
    hline(doc, 563, 165, 773);
    hline(doc, 640, 185, 773);
    hline(doc, 640, 195, 773);
    hline(doc, 640, 205, 773);
    hline(doc, 640, 215, 773);
    hline(doc, 640, 225, 773);
    hline(doc, 640, 245, 773);
    hline(doc, 640, 255, 773);

    vline(doc, 83, 40, 300);
    vline(doc, 100, 66, 275);
    vline(doc, 127, 66, 275);
    vline(doc, 253, 275, 300);
    vline(doc, 304, 66, 275);
    vline(doc, 320, 66, 275);
    vline(doc, 336, 54, 275);
    vline(doc, 353, 66, 275);
    vline(doc, 382, 66, 275);
    vline(doc, 398, 66, 275);
    vline(doc, 414, 66, 275);
    vline(doc, 430, 54, 292);
    vline(doc, 446, 66, 275);
    vline(doc, 463, 66, 275);
    vline(doc, 479, 66, 292);
    vline(doc, 509, 66, 275);
    vline(doc, 538, 40, 292);
    vline(doc, 563, 195, 275);
    vline(doc, 580, 195, 275);
    vline(doc, 596, 195, 292);
    vline(doc, 773, 66, 293);

    text(doc, "Salibandy - Peli Meille Kaikille", 12, 130, 43);
    text(doc, "SUOMEN SALIBANDYLIITTO RY", 12, 542, 43);
    text(doc, "JOUKKUE A", 10, 87, 57);
    text(doc, "OTTELUPÖYTÄKIRJA", 10, 542, 57);
    text(doc, "A:n maalimerkinnät", 9, 338, 57);
    text(doc, "A:n rangaistukset", 9, 432, 57);
    text(doc, "N:o", 7, 87, 69);
    text(doc, "C/MV", 7, 106, 69);
    text(doc, "Pelaajan suku- ja etunimi", 7, 130, 69);
    text(doc, "M", 7, 309, 69);
    text(doc, "S", 7, 326, 69);
    text(doc, "Maali", 5, 339, 70);
    text(doc, "Aika", 5, 363, 70);
    text(doc, "Tekijä", 5, 384, 70);
    text(doc, "Syött.", 5, 400, 70);
    text(doc, "Koodi", 5, 416, 70);
    text(doc, "N:o", 5, 435, 70);
    text(doc, "Min.", 5, 451, 70);
    text(doc, "Syy", 5, 468, 70);
    text(doc, "R. annettu", 5, 484, 70);
    text(doc, "R. päättyi", 5, 514, 70);
    text(doc, "Sarja", 7, 542, 100);
    text(doc, "Yleisömäärä", 7, 650, 100);
    text(doc, "Päiväys", 7, 542, 120);
    text(doc, "Ottelu alkoi klo.", 7, 650, 120);
    text(doc, "Ottelunumero", 7, 542, 140);
    text(doc, "Ottelu päättyi klo.", 7, 650, 140);
    text(doc, "Paikka", 7, 542, 160);
    text(doc, "Toimitsijat", 7, 606, 180);
    text(doc, "Erotuomarit", 7, 606, 240);
    text(doc, "Maalit", 7, 565, 189);
    text(doc, "Erät", 7, 540, 198);
    text(doc, "A", 7, 569, 198);
    text(doc, "B", 7, 586, 198);
    text(doc, "Erä 1", 5, 540, 209);
    text(doc, "Erä 2", 5, 540, 219);
    text(doc, "Erä 3", 5, 540, 229);
    text(doc, "Jatkoaika", 5, 540, 239);
    text(doc, "RL", 5, 540, 249);
    text(doc, "Yht.", 7, 540, 262);
    text(doc, "Voittaja", 7, 558, 284);
    text(doc, "Rang.", 5, 432, 278);
    text(doc, "yhteensä", 5, 432, 283);
    text(doc, "Rang. min.", 5, 482, 278);
    text(doc, "yhteensä", 5, 482, 283);
    text(doc, "TH1", 7, 87, 277);
    text(doc, "TH2", 7, 87, 285);
    text(doc, "TH3", 7, 87, 294);
    text(doc, "TH4", 7, 257, 277);
    text(doc, "TH5", 7, 257, 285);

    // lower panel
    hline(doc, 83, 309, 773);
    hline(doc, 83, 321, 773);
    hline(doc, 83, 330, 773);
    hline(doc, 83, 340, 773);
    hline(doc, 83, 350, 773);
    hline(doc, 83, 360, 773);
    hline(doc, 83, 370, 773);
    hline(doc, 83, 380, 773);
    hline(doc, 83, 390, 773);
    hline(doc, 83, 400, 773);
    hline(doc, 83, 410, 773);
    hline(doc, 83, 420, 773);
    hline(doc, 83, 430, 773);
    hline(doc, 83, 440, 773);
    hline(doc, 83, 450, 773);
    hline(doc, 83, 460, 580);
    hline(doc, 83, 470, 581);
    hline(doc, 595, 460, 640);
    hline(doc, 595, 470, 641);
    hline(doc, 658, 460, 702);
    hline(doc, 658, 470, 703);
    hline(doc, 83, 480, 538);
    hline(doc, 83, 490, 773);
    hline(doc, 83, 500, 538);
    hline(doc, 83, 510, 538);
    hline(doc, 83, 520, 538);
    hline(doc, 83, 530, 538);
    hline(doc, 83, 538, 430);
    hline(doc, 83, 546, 773);
    hline(doc, 580, 500, 773);
    hline(doc, 580, 509, 773);
    hline(doc, 580, 518, 773);
    hline(doc, 580, 527, 773);
    hline(doc, 580, 536, 773);
    hline(doc, 83, 554, 254);

    vline(doc, 83, 309, 554);
    vline(doc, 100, 321, 530);
    vline(doc, 127, 321, 530);
    vline(doc, 253, 530, 554);
    vline(doc, 304, 321, 530);
    vline(doc, 320, 321, 530);
    vline(doc, 336, 309, 530);
    vline(doc, 353, 321, 530);
    vline(doc, 382, 321, 530);
    vline(doc, 398, 321, 530);
    vline(doc, 414, 321, 530);
    vline(doc, 430, 309, 546);
    vline(doc, 446, 321, 530);
    vline(doc, 463, 321, 530);
    vline(doc, 479, 321, 546);
    vline(doc, 509, 321, 530);
    vline(doc, 538, 309, 546);
    vline(doc, 580, 460, 470);
    vline(doc, 595, 460, 470);
    vline(doc, 640, 460, 470);
    vline(doc, 658, 460, 470);
    vline(doc, 702, 460, 470);
    vline(doc, 773, 309, 547);

    text(doc, "JOUKKUE B", 10, 87, 312);
    text(doc, "B:n maalimerkinnät", 9, 338, 312);
    text(doc, "B:n rangaistukset", 9, 432, 312);
    text(doc, "HUOM.", 9, 542, 312);
    text(doc, "N:o", 7, 87, 324);
    text(doc, "C/MV", 7, 106, 324);
    text(doc, "Pelaajan suku- ja etunimi", 7, 130, 324);
    text(doc, "M", 7, 309, 324);
    text(doc, "S", 7, 326, 324);
    text(doc, "Maali", 5, 339, 325);
    text(doc, "Aika", 5, 363, 325);
    text(doc, "Tekijä", 5, 384, 325);
    text(doc, "Syött.", 5, 400, 325);
    text(doc, "Koodi", 5, 416, 325);
    text(doc, "N:o", 5, 435, 325);
    text(doc, "Min.", 5, 451, 325);
    text(doc, "Syy", 5, 468, 325);
    text(doc, "R. annettu", 5, 484, 325);
    text(doc, "R. päättyi", 5, 514, 325);
    text(doc, "Aikalisä", 7, 540, 464);
    text(doc, "A:", 7, 598, 464);
    text(doc, "B:", 7, 661, 464);
    text(doc, "Hyväksyntä ja allekirjoitukset", 7, 582, 483);
    text(doc, "JOUKKUE A", 6, 541, 495);
    text(doc, "JOUKKUE B", 6, 541, 504);
    text(doc, "PROTESTI", 6, 541, 513);
    text(doc, "ET RAPORTTI", 6, 541, 522);
    text(doc, "EROTUOMARI", 6, 541, 531);
    text(doc, "EROTUOMARI", 6, 541, 540);
    text(doc, "Rang.", 5, 432, 533);
    text(doc, "yhteensä", 5, 432, 538);
    text(doc, "Rang. min.", 5, 482, 533);
    text(doc, "yhteensä", 5, 482, 538);
    text(doc, "TH1", 7, 87, 532);
    text(doc, "TH2", 7, 87, 540); 
    text(doc, "TH3", 7, 87, 548);
    text(doc, "TH4", 7, 257, 532);
    text(doc, "TH5", 7, 257, 540);
}

function text(doc, text, size, x, y)
{
    doc.fontSize(size).font('Times-Roman').text(text, x, y);
}

function hline(doc, x1, y, x2)
{
    doc.moveTo(x1, y).lineTo(x2, y).lineTo(x2, y+1).lineTo(x1, y+1).fill("#000000");
}

function vline(doc, x, y1, y2)
{
    doc.moveTo(x, y1).lineTo(x, y2).lineTo(x+1, y2).lineTo(x+1, y1).fill("#000000");
}

module.exports.printSheet = printSheet;
