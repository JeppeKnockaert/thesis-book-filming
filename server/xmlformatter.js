/**
 * Formats the results in XML form and saves it as a file
 */

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
	var result = js2xmlparser("matches", matches);
	var fs = require('fs');

	// Create a temporary file
	tmp.tmpName({ dir: __dirname+'/download/', prefix: "result", postfix: ".xml" }, function _tempNameGenerated(err, path) {
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