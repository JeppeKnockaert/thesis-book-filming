/**
 * Runs the server-application
 */

// Load "express" (web application framework for node)
var express = require('express');

// Create a new application
var app = express();

// If a user surfs to the root folder, send him to index file in the client folder
app.get('/', function(req, res){
  res.sendfile('client/index.html');
});

// If a JavaScript or CSS file is requested, send the request to the client folder
app.get(/^(\/(js|css)\/.+)$/, function(req, res) {
  res.sendfile('client/' + req.params[0]);
});

// Let the server listen for incoming requests on port 4000
app.listen(4000);