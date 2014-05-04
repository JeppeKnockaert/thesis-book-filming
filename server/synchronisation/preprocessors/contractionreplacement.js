/**
 * Performs contraction replacement as preprocessing step
 */

var fs = require('fs'); // Module for reading files
var contractions = null; // Object with contractions and their replacements

/**
 * Preprocesses the given text by performing contraction replacement
 * @param text the text that needs preprocessing
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.preprocess = function(text, callback){
	if (contractions === null){
		var contractionsfile = fs.readFileSync(__dirname + '/contractions.json', 'utf8'); // Read the file with contractions
		contractions = JSON.parse(contractionsfile); // Save the contractions in an object
	}

	Object.keys(contractions).forEach(function(key){
		text = text.replace(key,contractions[key]);
	});
	callback(text.trim()); // Remove extra space
}