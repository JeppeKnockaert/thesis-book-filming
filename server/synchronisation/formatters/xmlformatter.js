/**
 * Formats the results in XML form and saves it as a file
 */
// Load module for os functions
var os = require('os');

// Load module for file paths
var path = require('path');

// Load the Jason to XML parser
var js2xmlparser = require("js2xmlparser");

// Load module for temporary file creation
var tmp = require('tmp');

/**
 * Saves the results in XML form
 * @param matches the result from the synchronization phase
 * @param updater the eventemitter to keep track of the progressupdates
 */
exports.format = function(matches, updater){
	updater.emit('message',"Writing results...");

	var result = js2xmlparser("matches", matches);
	var fs = require('fs');

	// Create a temporary file
	tmp.tmpName({ dir: os.tmpdir(), prefix: "result", postfix: ".xml" }, function (err, path) {
		if (err){
			console.log(err);
		}
		else{
			fs.writeFile(path, result, function(err) {
			    if(err) {
			        console.log(err);
			    }
			    updater.emit('syncprogressupdate',100); // Put the progress on 100%
				updater.emit("result",path); // Send the filepath to the result
			});
		}
	});	 
}