/**
 * Prints the bookfile and the subtitlefile for creating a ground truth
 */

/**
 * Simply prints the input files for creating a ground truth
 * @param book the parsed epub file
 * @param subtitle the parsed srt file
 * @param updater the eventemitter to keep track of the progressupdates
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.synchronize = function(book,subtitle,updater,callback){
	if (Array.isArray(subtitle)){
		subtitle = subtitle[0];
	}
	var subtitles = {"subtitle" : new Array()};
	subtitle.forEach(function (subvalue, subindex){ // Go trough all subtitles
		var sub = { 
			"subtitleindex" : subindex,
			"fromTime" : subvalue.fromTime,
			"subtitletext" : subvalue.text						
		};
		if (typeof subvalue.scene !== "undefined"){
			sub["scene"]= subvalue.scene;
		}
		subtitles["subtitle"].push(sub);
		if (subindex === subtitle.length-1){
			callback(subtitles); // Return the array with subtitles
		}
	});
	var quotes = {"quote" : new Array()};
	book.forEach(function (bookvalue, bookindex){ // Go trough all quotes
		var quote = {
			"quoteindex" : bookindex,
	   		"quotetext" : bookvalue.text
		};
		quotes["quote"].push(quote);
		if (bookindex === book.length-1){
			callback(quotes); // Return the array with quotes
		}		
	});
}