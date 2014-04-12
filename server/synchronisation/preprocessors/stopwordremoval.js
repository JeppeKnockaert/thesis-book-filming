/**
 * Performs stopword removal as preprocessing step
 */

var fs = require('fs'); // Module for reading files
var stopwords = null; // Array with stopwords

/**
 * Preprocesses the given text by performing stopword removal
 * @param text the text that needs preprocessing
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.preprocess = function(text, callback){
	if (stopwords === null){
		var stopwordsfile = fs.readFileSync(__dirname + '/stopwords.json', 'utf8'); // Read the file with stopwords
		stopwords = JSON.parse(stopwordsfile); // Save the stopwords in an array
	}
	var words = text.toLowerCase().split(" ");
	var returnsentence = "";
	
	words.forEach(function(word,i){
		if (stopwords.indexOf(word) === -1){ // Word is not in the stopwordlist
			returnsentence += word+" ";
		}
	});
	callback(returnsentence.trim()); // Remove extra space
}