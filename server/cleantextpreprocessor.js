/**
 * Takes care of the preprocessing by cleaning up the given text
 * 	- removes tags
 * 	- removes extra spaces
 */

/**
 * Preprocesses the given text by removing html tags
 * @param text the text that needs preprocessing
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.preprocess = function(text, callback){
	var returntext = text.replace(/<[^>]*>/g,""); // Remove tags
	returntext = text.replace(/\s+/," "); // Remove extra spaces
	callback(text); 
}