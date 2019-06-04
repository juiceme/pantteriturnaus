# pantteriturnaus

A multiuser node.js tournament bookkeeping utility handy for calculating scores and formatting tournament results as webpages.
Primary target audience is tournament officials of floorball teams that want to create on-the-fly statistics of matches during tournaments.
The name "Pantteriturnaus" comes from the floorball team "Järvenpään Pantterit" which was inspiration for the application.

## Description

Pantteriturnaus generates web-based statistics of played games in real time when the game statistics are keyed in.

All data is stored as JSON files. Web-interface enables adding items separately for each recipientquick input of game points via any device, for example from mobile phones.

Pantteriturnaus supports multiple concurrent users with different access rights.

## Installation

Pantteriturnaus requires websocket npm module You can install all depencencies by "npm install"
The repository also clones AES library and datastorage as submodules, You need to install those by "git submodule init; git submodule update"

## Features

* All data stored in JSON files
* Web frontend to manage tournaments, manage teams/users and input game scores.
* Uses AES-CTR encryption between server and client to defeat man-in-the-middle attacks.
* Automatic creation of game statistics and top-shooters as html tables
* Automatic creation of official game minutes in PDF format.
* Console frontend for batch mode editing etc. 

## Coming soon!

* Probably more enhancements as I think them up :)

## Documentation

None whatsoever :)

## License

Pantteriturnaus is available under the GPLv3 license.
