/**
 * Preprocessor that removes punctuation characters
 */

/**
 * Preprocesses the given text by removing punctuation characters
 * @param text the text that needs preprocessing
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.preprocess = function(text, callback){
	var returntext = text.replace(/[^a-zA-Z\-0-9\ \']/g," "); // Remove punctuation
	returntext = returntext.replace(/\s+/g," "); // remove double spaces	
	
	if (returntext.match(/.*[a-zA-Z0-9].*/) !== null){
		callback(returntext.trim()); // Remove additional whitespaces  
	}
	else{
		callback(""); // If no words left, return an empty string
	}	
}