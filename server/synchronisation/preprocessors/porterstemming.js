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
	var tokenizer = new natural.TreebankWordTokenizer();
	var tokens = tokenizer.tokenize(text); // Stem and tokenize using Porter stemming
	var returntext = "";
	tokens.forEach(function(token){
		var stem = natural.PorterStemmer.stem(token);
		returntext += natural.PorterStemmer.stem(token)+" ";
	});
	if (returntext.split(" ").length < text.split(" ").length){
		console.log(text);
		console.log(returntext);
		console.log(tokens);
	}
	callback(returntext.trim()); // Remove trailing spaces
}