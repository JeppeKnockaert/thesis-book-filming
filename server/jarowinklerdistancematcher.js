/**
 * Synchronizes a given book and subtitle using the Jaro Winkler Distance
 */

var natural = require('natural'); // load natural language facilities

var delta = 0.90; // Minimum distance between two fragments to be equal

/**
 * Synchronizes a parsed epub and srt from simpleparser using the Jaro Winkler Distance
 * @param book the parsed epub file
 * @param subtitle the parsed srt file
 * @param postprocessor an instance of the postprocessor
 * @param updater the eventemitter to keep track of the progressupdates
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.synchronize = function(book,subtitle,postprocessor,updater,callback){
	var maxdist = 0;
	var matches = {"match" : new Array()};
	subtitle.forEach(function (subvalue, subindex){ // Go trough all subtitles
		book.forEach(function (bookvalue, bookindex){ // For each subtitle, look at all paragraphs
			// Calculate the Jaro Winkler distance between subtitle and paragraph
			var dist = natural.JaroWinklerDistance(subvalue.text,bookvalue); 
			if (dist > delta){
				var match = { 
					"fromTime" : subvalue.fromTime,
					"toTime" : subvalue.toTime,
					"subtitle" : subvalue.text,
					"paragraphindex" : bookindex,
			   		"paragraph" : bookvalue,
			   		"score" : dist								
				};
				postprocessor.postprocess(match,function(newmatch){
					if (newmatch !== null){
						matches["match"].push(newmatch);
					}
				});
			}
		});
		if (subindex === subtitle.length-1){
			callback(matches); // Return the array with matches
		}
		else{
			updater.emit('syncprogressupdate',Math.floor((subindex*100)/subtitle.length));
		}
	});
}