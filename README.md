thesis-book-filming
===================

Thesis for MMLab (UGent) about synchronization of books and their filming.

##Requirements

- Node.js

##Installation

###Configuration
Go to the server folder, rename config-example.json to config.json and fill the needed fields in the file.

###Dependencies
Go into your cloned folder trough a terminal and enter the following

``` bash
$ npm install
```

Node will automatically fetch all dependencies for the project.

###Upload folder and download folder

Make sure you have a folder called "tmp" in the server folder, the uploaded files will be stored here.
You will also need a folder called "download" to store files that are available for the user to download.

##Usage

In order to start the server application, use the following command in your main folder

``` bash
$ node server/server.js
```

This will start the server on port 4000.