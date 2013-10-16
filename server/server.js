/**
 * Runs the server-application
 */

// Load "express" (web application framework for node)
var express = require('express');

// Create a new application
var app = express();

// Enable file upload
app.use(express.bodyParser({ keepExtensions: true, uploadDir: __dirname + '/tmp' }));

// Describe the files that need to be used in the processing chain
// TODO: put this in a config file
var processingsequence = {
	parser : 'simpleparser',
	matcher : 'simplematcher'
};

// Get the loader
var loader = require(__dirname + '/loader.js');

// If a user surfs to the root folder, send him to index file in the client folder
app.get('/', function(req, res){
  res.sendfile('client/index.html');
});

// If a JavaScript or CSS file is requested, send the request to the client folder
app.get(/^(\/(js|css)\/.+)$/, function(req, res) {
  res.sendfile('client/' + req.params[0]);
});

// Send the uploaded files to the loader when the form is submitted
app.post('/synchronize', function(req,res){
	loader.readFiles(req,res,processingsequence)
});

// Let the server listen for incoming requests on port 4000
app.listen(4000);
console.log('Listening on port 4000');