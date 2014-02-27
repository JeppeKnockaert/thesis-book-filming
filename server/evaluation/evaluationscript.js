/**
 * This is the script to be executed by a child process of the evaluation function.
 * When it receives a message with the needed files, it sends them to the fileloader for processing.
 */

// Create an eventemitter to keep track of the progress
var events = require('events');
var updater = new events.EventEmitter();

// When a message is received from the master process, check if it contains the needed files
process.on('message', function(message) {
	if (message["name"] === "fileupload"){
		var resultsfile = message["value"][0];
		var groundtruthfile = message["value"][1];

		// Add a listener to the updater
		updater.on('result', function(evaluation){
			// Send the result to the master process
			process.send({"name":"result", "value":evaluation});
		});

		// Get the evaluator
		var evaluator = require(__dirname + '/evaluator.js');
		evaluator.evaluate(resultsfile,groundtruthfile,updater);
	}
});


