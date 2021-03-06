/**
 * Runs the server-application
 */

// Load "express" (web application framework for node)
var express = require('express');

// Load module to work with child processes for heavy calculations
var cp = require('child_process');

// Create a new application
var app = express();

// Load logger for express
var morgan = require('morgan');
app.use(morgan('dev'));

// Load busboy module for parsing uploaded files
var Busboy = require('busboy');

// Load module for temporary file creation
var tmp = require('tmp');

// Load module for os functions
var os = require('os');

// Load module for file paths
var path = require('path');

// Load module for IO
var fs = require('fs');

// If a JavaScript or CSS file is requested, send the request to the client folder
app.get(/^(\/(js|css|files)\/.+)$/, function(req, res) {
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
	var fieldsreceived = 0;
	var book; 
	var subtitle;
	var film;
	var outputformat;
	var busboy = new Busboy({ headers: req.headers }); // Parse the uploaded files
	var ready = function(){
		fieldsreceived++;
		if (fieldsreceived == 4){
			child.send({"name" : "fileupload", "value" : [book, film, subtitle, outputformat] });
		}
	}
	busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
		var extension = path.extname(filename);
		var baseName = path.basename(fieldname,extension);
		tmp.tmpName({ dir: os.tmpdir(), prefix: baseName, postfix: extension }, function (err, path) {
			file.pipe(fs.createWriteStream(path));
			if (fieldname === "bookfile"){
				book = path;
				if (extension !== '.epub'){
					var err = new Error("Not an epub file!");
					throw err;
				}
			}
			
			else{
				subtitle = path;
				if (extension !== '.srt'){
					var err = new Error("Not an srt file!");
					throw err;
				}
			}
		});
		file.on('end', function() { // When file has been read, pass it on
			ready();
		});
	});
	busboy.on('field', function(key, value, keyTruncated, valueTruncated) {
		if (key === "filmurl" && value !== ""){
			film = value;
		}
		// Set formatter to use based on the choice that was made
		if (key === "outputformat"){
			if (value === "XML"){
				outputformat = "xmlformatter";
			}
			else if (value === "Fragments"){
				outputformat = "fragmentformatter";
			}
		}
		ready();
	});
    req.pipe(busboy); // Start the parsing

	child.on("message", function(message){
		// Make sure the child wasn't cancelled before processing messages
		if (typeof children[child.pid] !== "undefined"){
			if (message["name"] === "progressreport"){
				// Update the progressvariable when an update is received
				children[child.pid].progress = message["value"];
			}
			else if (message["name"] === "result"){
				children[child.pid].filepath = message["value"];
			}
			else if (message["name"] === "message"){
				children[child.pid].message = message['value'];
			}
			else if (message["name"] === "websitecontent"){
				if (message['value'] === "EOF"){
					children[child.pid].websitecontentready = true;	
				}
				else{
					if (typeof children[child.pid].websitecontent === "undefined"){
						children[child.pid].websitecontentready = false;	
						children[child.pid].websitecontent = new Array();	
					}
					children[child.pid].websitecontent.push(message['value']);
				}
			}
		}
	});
	// End the request, return the pid of the child to fetch the progress and result later on
	res.send(""+child.pid);
});

// Send the uploaded files to the evaluator when the form is submitted
app.post('/evaluate', function(req, res){
	var filesread = 0;
	var resultfile; 
	var groundtruthfile;
	var busboy = new Busboy({ headers: req.headers }); // Parse the uploaded files
	busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
		var extension = path.extname(filename);
		var baseName = path.basename(fieldname,extension);
		tmp.tmpName({ dir: os.tmpdir(), prefix: baseName, postfix: extension }, function (err, path) {
			file.pipe(fs.createWriteStream(path));
			if (extension !== '.xml'){
				var err = new Error("Not an xml file!");
				throw err;
			}
			if (fieldname === "resultfile"){
				resultfile = path;
			}
			else{
				groundtruthfile = path;
			}
		});
		file.on('end', function() { // When file has been read, pass it on
			filesread++;
			if (filesread == 2){
				// Make a new child to start the processing
				var child = cp.fork(__dirname + '/evaluation/evaluationscript.js'); 
				// Add the child to the array to keep track of its results
				children[child.pid] = {"child": child, "evaluation": null};
				child.send({"name" : "fileupload", "value" : [resultfile, groundtruthfile] });
				child.on("message", function(message){
					if (message["name"] === "result"){
						children[child.pid].evaluation = message["value"];
					}
				});
				// End the request, return the pid of the child to fetch the progress and result later on
				res.send(""+child.pid);
			}
		});
	});
    req.pipe(busboy); // Start the parsing
});

// If a request is received to return the progress, return it based on the pid
app.post('/progressreport', function(req, res){
	var busboy = new Busboy({ headers: req.headers }); // Parse the uploaded files
	busboy.on('field', function(fieldname, val, valTruncated, keyTruncated) {
    	if (fieldname === "childpid"){
    		var child = children[val];
			if (typeof child !== "undefined"){
				var ready = false;
				if (typeof child['filepath'] !== "undefined"){
					ready = true;
				}
				var message = null;
				if (typeof child['message'] !== "undefined"){
					message = child['message'];
				}
				res.json({
					progress: child['progress']+"%",
					message: message,
					ready: ready
				});
			}
			else{
				res.json({
					progress: "0%",
					message: null,
					ready: false
				});
			}
		}
    });
	req.pipe(busboy);
});

// If a request is received to return the result, return it based on the pid
app.post('/fetchresult', function(req, res){
	var busboy = new Busboy({ headers: req.headers }); // Parse the uploaded files
	var childpid = null;
	var method = null;
	busboy.on('field', function(fieldname, val, valTruncated, keyTruncated) {
    	if (fieldname === "childpid"){
    		childpid = val;
    	}
    	else if (fieldname === "method"){
    		method = val;
    	}
    	if (method !== null && childpid !== null){
    		var child = children[childpid];
			if (method === "sync"){
				if (typeof child !== "undefined"){
					if (child['filepath'].indexOf(".html") !== -1){
						res.redirect(child['filepath']+"?pid="+childpid);
					}
					else{
						res.download(child['filepath']);
					}
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
    	}		
	});
	req.pipe(busboy); // Start the parsing
});

// If a request is received to return the website content, return it based on the pid
app.post('/fetchcontent', function(req, res){
	var busboy = new Busboy({ headers: req.headers }); // Parse the uploaded files
	var childpid = null;
	var method = null;
	busboy.on('field', function(fieldname, val, valTruncated, keyTruncated) {
    	if (fieldname === "childpid"){
    		childpid = val;
    	}
    	if (childpid !== null){
    		var child = children[childpid];
			if (typeof child !== "undefined"){
				res.json({
					"content":child['websitecontent'],
					"ready":child['websitecontentready']
				});
			}
			else{
				res.send(404);
			}
			killChild(req.param('childpid')); // Child is not needed anymore, so it can be killed
    	}		
	});
	req.pipe(busboy); // Start the parsing
});

// Cancel the synchronization by killing the child process
app.post('/cancelsynchronization', function(req, res){
	var busboy = new Busboy({ headers: req.headers }); // Parse the uploaded files
	busboy.on('field', function(fieldname, val, valTruncated, keyTruncated) {
    	if (fieldname === "childpid"){
    		killChild(val);
    		res.send(200);
    	}
	});
	req.pipe(busboy); // Start the parsing
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

// If a user wants to surf to the header page, send him to that page
app.get('/header.html', function(req, res){
	res.sendfile('client/header.html');
});

// If a user wants to surf to the header page, send him to that page
app.get('/results.html', function(req, res){
	res.sendfile('client/results.html');
});

// If a user surfs to any other folder, send him to index file in the client folder
app.get('*', function(req, res){
	res.sendfile('client/index.html');
});

// Let the server listen for incoming requests on port 4000
app.listen(4000);
console.log('Listening on port 4000');