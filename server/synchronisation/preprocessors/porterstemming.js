/**
 * Performs Porter stemming as preprocessing step
 */


var natural = require('natural'); // Module for natural language processing

/**
 * Preprocesses the given text by performing stopword remova
 * @param text the text that needs preprocessing
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.preprocess = function(text, callback){
	var tokens = natural.PorterStemmer.tokenizeAndStem(text); // Stem and tokenize using Porter stemming
	var returntext = "";
	tokens.forEach(function(token){
		returntext += token+" ";
	});
	callback(returntext.trim()); // Remove trailing spaces
}