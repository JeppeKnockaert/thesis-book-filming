/**
 * Takes care of the preprocessing by cleaning up the given text
 * 	- removes tags
 * 	- removes extra spaces
 * 	- removes linebreaks
 *  - removes non-regular punctuation (different from period, exclamation mark and question mark)
 *  - removes hyphens at the start of sentences (often occurs in subtitles)
 * 	- Change ’ apostrophes to '
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
	returntext = returntext.replace("’","'"); // Unify all apostrophes
	returntext = returntext.replace(/[^\.\?\!]$/,"."); // Replace non-regular punctuation marks at the end by a period
	if (returntext.match(/.*[a-zA-Z].*/) !== null){
		callback(returntext.trim()); // Remove additional whitespaces  
	}
	else{
		callback(""); // If no word, return an empty string
	}	
}