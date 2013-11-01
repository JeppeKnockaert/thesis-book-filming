/**
 * Synchronizes a given book and subtitle
 */

var natural = require('natural'); // load natural language facilities

/**
 * Synchronizes a parsed epub and srt from simpleparser
 * @param book the parsed epub file
 * @param subtitle the parsed srt file
 * @param updater the eventemitter to keep track of the progressupdates
 */
exports.synchronize = function(book,subtitle,updater){
	var maxdist = 0;
	subtitle.forEach(function (subvalue, subindex){ // Go trough all subtitles
		book.forEach(function (bookvalue, bookindex){ // For each subtitle, look at all paragraphs
			// Calculate the Jaro Winkler distance between subtitle and paragraph
			var dist = natural.JaroWinklerDistance(subvalue.text,bookvalue); 
			if (dist > 0.8){
				console.log(subvalue.text+"\n --- \n"+bookvalue+"\n !!----------------------------------!!");
			}
		});
		if (subindex === subtitle.length-1){
			updater.emit('syncprogressupdate',100);
		}
		else{
			updater.emit('syncprogressupdate',Math.floor((subindex*100)/subtitle.length));
		}
	});
}