/**
 * Takes care of the preprocessing by cleaning up the given text
 * 	- removes tags
 * 	- removes extra spaces
 * 	- removes linebreaks
 *  - replace non-regular line endings (different from period, question mark, exclamation mark and horizontal ellipsis)
 *  - add a period to sentences that have no puntctuation mark at the end
 *  - removes dashes at the start of sentences (often occurs in subtitles)
 * 	- change ’ apostrophes to '
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
	returntext = returntext.replace(/([a-zA-Z])’([a-zA-Z])/g,"$1'$2"); // Unify all apostrophes
	returntext = returntext.trim().replace(/([a-zA-Z0-9])\s*$/,"$1."); // If there is no punctuation marks at the end, add a period
	returntext = returntext.trim().replace(/[^\.\?\!…]\s*$/,"."); // Replace non-regular line endings (different from period, question mark, exclamation mark and horizontal ellipsis)
	if (returntext.match(/.*[a-zA-Z0-9].*/) !== null){
		callback(returntext.trim()); // Remove additional whitespaces  
	}
	else{
		callback(""); // If no word, return an empty string
	}	
}