/**
 * Takes care of the preprocessing by removing html tags from the text
 */

/**
 * Preprocesses the given text by removing html tags
 * @param text the text that needs preprocessing
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.preprocess = function(text, callback){
	callback(text.replace(/<[^>]*>/g,""));
}