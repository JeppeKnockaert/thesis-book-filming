/**
 * Takes care of the preprocessing by cleaning up the given text
 * 	- removes tags
 * 	- removes extra spaces
 * 	- removes linebreaks
 *  - removes dashes that are not part of a word (hyphens)
 * 	- change ’ apostrophes to '
 */

/**
 * Preprocesses the given text by removing tags, extra spaces, punctuation and linebreaks
 * @param text the text that needs preprocessing
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.preprocess = function(text, callback){
	var returntext = text.replace(/\\n/g,""); // Remove linebreaks
	returntext = returntext.replace(/<[^>]+?>/g,""); // Remove tags
	returntext = returntext.replace(/([^a-zA-Z]|^)-([^a-zA-Z])/g,"$1 $2"); // Remove non-hyphen dashes (occurs often in subtitles, especially in dialogues)
	returntext = returntext.replace(/([a-zA-Z])’([a-zA-Z])/g,"$1'$2"); // Unify all apostrophes
	returntext = returntext.replace(/\s+/g," "); // Remove extra spaces
	if (returntext.match(/.*[a-zA-Z0-9].*/) !== null){
		callback(returntext.trim()); // Remove additional whitespaces  
	}
	else{
		callback(""); // If no word, return an empty string
	}	
}