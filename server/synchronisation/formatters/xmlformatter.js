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
 * @param filenameprefix choose the first part of the filename
 * @param film the URL to the film
 * @param updater the eventemitter to keep track of the progressupdates
 * @param callback function to be called when ready, has the resulting filepath as parameter
 */
exports.format = function(matches, filenameprefix, film, updater, callback){
	updater.emit('message',"Writing results...");

	var result = js2xmlparser("matches", matches);
	var fs = require('fs');

	// Create a temporary file
	tmp.tmpName({ dir: os.tmpdir(), prefix: filenameprefix+"-", postfix: ".xml" }, function (err, path) {
		if (err){
			console.log(err);
		}
		else{
			fs.writeFile(path, result, function(err) {
			    if(err) {
			        console.log(err);
			    }
			    callback(path); // Send the filepath as result
			});
		}
	});
}