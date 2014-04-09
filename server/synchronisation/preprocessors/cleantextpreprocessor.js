/**
 * Takes care of the preprocessing by cleaning up the given text
 * 	- removes tags
 * 	- removes extra spaces
 * 	- removes linebreaks
 *  - removes punctuation
 */

/**
 * Preprocesses the given text by removing tags, extra spaces, punctuation and linebreaks
 * @param text the text that needs preprocessing
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.preprocess = function(text, callback){
	var returntext = text.replace(/\s+/g," "); // Remove extra spaces
	returntext = returntext.replace(/\\n/g,""); // Remove linebreaks
	returntext = returntext.replace(/<[^>]+?>/g,""); // Remove tags
	returntext = returntext.replace(/^\ *-/g,""); // Remove hyphen as first character (occurs often in subtitles)
	//returntext = returntext.replace(/—/," "); // Replace hyphen by space
	//returntext = returntext.replace(/[^A-z\ 0-9]/g,""); // Remove punctuation
	callback(returntext.trim()); // Remove additional whitespaces 
}