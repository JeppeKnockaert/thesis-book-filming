/**
 * Runs the server-application
 */

// Load "express" (web application framework for node)
var express = require('express');

// Load module to work with child processes for heavy calculations
var cp = require('child_process');

// Create a new application
var app = express();

// Enable file upload
app.use(express.bodyParser({ keepExtensions: true, uploadDir: __dirname + '/tmp' }));
app.use(express.logger('dev'));

// Describe the files that need to be used in the processing chain
// TODO: put this in a config file
var processingsequence = {
	parser : 'simpleparser',
	matcher : 'simplematcher'
};

// Keep track of the progress of the synchronization
var progress = 0;

// If a JavaScript or CSS file is requested, send the request to the client folder
app.get(/^(\/(js|css)\/.+)$/, function(req, res) {
  res.sendfile('client/' + req.params[0]);
});

// Send the uploaded files to the loader when the form is submitted
app.post('/synchronize', function(req,res){
	// Make a new child to start the processing because this is a lot of work
	var child = cp.fork(__dirname + '/syncscript.js'); 
	// Send the files to the child
	child.send({"name" : "fileupload", "value" : [req.files.bookfile, req.files.subtitlefile] });
	child.on("message", function(message){
		// Update the progressvariable when an update is received
		progress = message["value"];
	});
	// End the request, everything is ok
	res.send(200);
});

// If a request is received to return the progress, return it based on the variable
app.get('/progressreport', function(req, res){
	// TODO: fix for multiple requests at the same time
	res.send(""+progress+"%");
});

// If a user surfs to any other folder, send him to index file in the client folder
app.get('*', function(req, res){
  res.sendfile('client/index.html');
});

// Let the server listen for incoming requests on port 4000
app.listen(4000);
console.log('Listening on port 4000');