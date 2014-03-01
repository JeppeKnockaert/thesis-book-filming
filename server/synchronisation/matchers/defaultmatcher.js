/**
 * Synchronizes a given book and subtitle using (partial) exact string match
 */

var natural = require('natural'); // load natural language facilities

var windowsize = 0.2;
var allowedretries = 5;

/**
 * Synchronizes a parsed epub and srt from simpleparser using (partial) exact matching
 * @param book the parsed epub file
 * @param subtitle the parsed srt file
 * @param postprocessor an instance of the postprocessor
 * @param updater the eventemitter to keep track of the progressupdates
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.synchronize = function(book,subtitle,postprocessor,updater,callback){
	var maxdist = 0;
	var matches = {"match" : new Array()};
	var lastmatch = -1;
	var retries = 0;
	book.forEach(function (bookvalue, bookindex){ 
		subtitle.forEach(function (subvalue, subindex){ 
			if ((Math.abs(lastmatch-subindex)/subtitle.length <= windowsize||lastmatch === -1) && 
				(subvalue.text.search(bookvalue) >= 0 || bookvalue.search(subvalue.text) >= 0)){ // One contains the other
				lastmatch = bookindex;
				var match = { 
					"fromTime" : subvalue.fromTime,
					"subtitleindex" : subindex,
					"quoteindex" : bookindex,
					"subtitle" : subvalue.text,
			   		"quote" : bookvalue,
			   		"score" : 1								
				};
				postprocessor.postprocess(match,function(newmatch){
					if (newmatch !== null){
						matches["match"].push(newmatch);
					}
				});
			}
			else{
				retries++;
				if (retries === allowedretries){
					lastmatch = -1;
					retries = 0;
				}
			}
		});
		updater.emit('syncprogressupdate',Math.floor((bookindex*100)/book.length));
	});
	callback(matches); // Return the array with matches
}