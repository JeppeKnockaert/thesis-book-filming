/**
 * This is the script to be executed by a child process of the synchronisation function.
 * When it receives a message with the needed files, it sends them to the fileloader for processing.
 */
var fs = require('fs'); // Module for reading files

// Create an eventemitter to keep track of the progress
var events = require('events');
var updater = new events.EventEmitter();

// When a message is received from the master process, check if it contains the needed files
process.on('message', function(message) {
	if (message["name"] === "fileupload"){
		var bookfile = message["value"][0];
		var filmfile = message["value"][1];
		var subtitlefile = message["value"][2];
		var outputformat = message["value"][3];

		// Describe the files that need to be used in the processing chain
		var config = fs.readFileSync(__dirname + '/../config.json');
		var processingsequence = JSON.parse(config)["processingsequence"];
		processingsequence["formatter"] = outputformat;

		// Get the loader
		var loader = require(__dirname + '/loader.js');
		
		// Add a listeners to the updater
		updater.on('syncprogressupdate',function(progress){
			// Send the progress to the master process
			process.send({"name":"progressreport", "value":progress});
		});

		updater.on('result', function(filepath){
			// Send the result to the master process
			process.send({"name":"result", "value":filepath});
		});

		updater.on('message', function(message){
			// Send a message to the master process
			process.send({"name":"message", "value":message});
		});

		updater.on('websitecontent', function(content){
			// Send the website content to the master process
			process.send({"name":"websitecontent", "value":content});
		});

		loader.readFiles(bookfile,filmfile,subtitlefile,processingsequence,updater);
	}
});


