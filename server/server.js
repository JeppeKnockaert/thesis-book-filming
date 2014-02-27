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

// If a JavaScript or CSS file is requested, send the request to the client folder
app.get(/^(\/(js|css)\/.+)$/, function(req, res) {
  res.sendfile('client/' + req.params[0]);
});

// Keep track of the progress of the synchronization
var children = new Array();

// Send the uploaded files to the loader when the form is submitted
app.post('/synchronize', function(req,res){
	// Make a new child to start the processing because this is a lot of work
	var child = cp.fork(__dirname + '/synchronisation/syncscript.js'); 
	// Add the child to the array to keep track of its progress
	children[child.pid] = {"child": child, "progress":0, "result":null};
	// Send the files to the child
	child.send({"name" : "fileupload", "value" : [req.files.bookfile, req.files.subtitlefile] });
	child.on("message", function(message){
		if (message["name"] === "progressreport"){
			// Update the progressvariable when an update is received
			children[child.pid].progress = message["value"];
		}
		else if (message["name"] === "result"){
			children[child.pid].filepath = message["value"];
		}
	});
	// End the request, return the pid of the child to fetch the progress and result later on
	res.send(""+child.pid);
});

// Send the uploaded files to the evaluator when the form is submitted
app.post('/evaluate', function(req, res){
	// Make a new child to start the processing
	var child = cp.fork(__dirname + '/evaluation/evaluationscript.js'); 
	// Add the child to the array to keep track of its results
	children[child.pid] = {"child": child, "evaluation": null};
	child.send({"name" : "fileupload", "value" : [req.files.resultfile, req.files.groundtruthfile] });
	child.on("message", function(message){
		if (message["name"] === "result"){
			children[child.pid].evaluation = message["value"];
		}
	});
	// End the request, return the pid of the child to fetch the progress and result later on
	res.send(""+child.pid);
});

// If a request is received to return the progress, return it based on the pid
app.post('/progressreport', function(req, res){
	var child = children[req.param('childpid')];
	if (typeof child !== "undefined"){
		res.send(""+child['progress']+"%");
	}
	else{
		res.send("0%");
	}
});

// If a request is received to return the result, return it based on the pid
app.post('/fetchresult', function(req, res){
	var child = children[req.param('childpid')];
	var method = req.param('method');
	if (method === "sync"){
		if (typeof child !== "undefined"){
			res.download(child['filepath']);
		}
		else{
			res.send(404);
		}
		killChild(req.param('childpid')); // Child is not needed anymore, so it can be killed
	}
	else{
		if (typeof child !== "undefined" && child['evaluation'] !== null){
			res.send(""+child['evaluation']);
			killChild(req.param('childpid')); // Child is not needed anymore, so it can be killed
		}
		else{
			res.send("Please wait...");
		}
	}
});

// Cancel the synchronization by killing the child process
app.post('/cancelsynchronization', function(req, res){
	killChild(req.param('childpid'));
	res.send(200);
});

/**
 * Kills the child with the given childpid and removes it from the array of children
 * @param childpid the PID of the child process
 */
var killChild = function(childpid){
	var child = children[childpid];
	if (typeof child !== "undefined"){
		child["child"].kill();
		// Remove the child from the array of children
		var index = children.indexOf(child["child"]);
		children.splice(index, 1);
	}
}

// If a user wants to surf to the evaluation page, send him to that page
app.get('/evaluation', function(req, res){
	res.sendfile('client/evaluate.html');
});

// If a user surfs to any other folder, send him to index file in the client folder
app.get('*', function(req, res){
  res.sendfile('client/index.html');
});

// Let the server listen for incoming requests on port 4000
app.listen(4000);
console.log('Listening on port 4000');