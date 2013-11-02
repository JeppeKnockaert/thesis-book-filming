/**
 * This postprocessor removes one word sentences from the resuts as they are not representative
 */

/**
 * Postprocesses the given text by removing one word sentences
 * @param match one of the matches found by the matcher
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.postprocess = function(match, callback){
	// Remove all non-whitespaces and non-alphabetical symbols and trim the whole string
	var text = match.subtitle.replace("[^A-z\s]","").trim(); 
	// If the string still has spaces, let it pass
	if (text.indexOf(" ") !== -1){
		callback(match);
	}
	// Else, remove the match
	else{
		callback(null);
	}
}