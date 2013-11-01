/**
 * Parses books and subtitles
 */

var epubParser = require("epub"); // Module for parsing epub files
var fs = require('fs'); // Module for reading files

/**
 * Parses epubs
 * @param bookfile the epub file in the format of the express bodyparser
 * @param callback that needs to be executed after this function is ready
 */
exports.parseBook = function(bookfile, callback){
	var epub = new epubParser(bookfile.path); // Create the epub parser
	var fulltext = "";
	epub.on("end", function(){
    	epub.flow.forEach(function(chapter, index){ // Loop trough all chapters and fetch the text
    		epub.getChapter(chapter.id, function(err,text){
    			if (err){
    				callback(new Error("Error reading chapter with id "+chapter.id));
    			}
    			else{
    				fulltext += text; // Add each chapter to the full text
    				if (index == epub.flow.length-1){
    					var paragraphs = fulltext.split(/<p\ [^>]*>/);
    					var nonemptyparagraphs = new Array();
						paragraphs.forEach(function (value, index){
							value = value.replace(/<[^>]*>/g,"");
							if (value.trim() !== ""){
								nonemptyparagraphs.push(value);
							}
							if (index == paragraphs.length-1){
		    					callback(null, nonemptyparagraphs); // Make a callback using the paragraphs
							}
						});

    				}
    			}
    		});
		});
	});
	epub.parse();
}

/**
 * Parses subtitles
 * @param subtitlefile the srt file in the format of the express bodyparser
 * @param callback that needs to be executed after this function is ready
 */
exports.parseSubtitle = function(subtitlefile, callback){
	fs.readFile(subtitlefile.path, 'utf8', function (err,data) {
	  	if (err) {
	    	callback(err);
		}
		else{
			var subtitles = new Array();
			while (data.trim() !== ""){
				var linebreak = data.indexOf("\n"); // Find next linebreak
				var indexline = data.substring(0,linebreak); // Capture the line
				data = data.substring(linebreak+1); // Delete the line and go on with the rest of the file

				while (!indexline.match(/^\s*[0-9]+\s*$/)){ // Go to the first index line of the subtitle file
					linebreak = data.indexOf("\n");
				 	indexline = data.substring(0,linebreak);
					data = data.substring(linebreak+1);
				}

				linebreak = data.indexOf("\n");
				var timeline = data.substring(0,linebreak).trim();
				data = data.substring(linebreak+1);

				var fromMinuteIndex = timeline.indexOf(":");
				var fromHours = timeline.substring(0, fromMinuteIndex);
				timeline = timeline.substring(fromMinuteIndex+1); // Remove hours

				var fromSecondIndex = timeline.indexOf(":");
				var fromMinutes = timeline.substring(0, fromSecondIndex);
				timeline = timeline.substring(fromSecondIndex+1); // Remove minutes

				var fromMillisIndex = timeline.indexOf(",");
				var fromSeconds = timeline.substring(0, fromMillisIndex);
				timeline = timeline.substring(fromMillisIndex+1); // Remove seconds

				var startArrowIndex = timeline.indexOf("-->");
				var fromMillis = timeline.substring(0, startArrowIndex);
				timeline = timeline.substring(startArrowIndex+3); // Remove arrow

				var toMinuteIndex = timeline.indexOf(":");
				var toHours = timeline.substring(0, toMinuteIndex);
				timeline = timeline.substring(toMinuteIndex+1); // Remove hours

				var toSecondIndex = timeline.indexOf(":");
				var toMinutes = timeline.substring(0, toSecondIndex);
				timeline = timeline.substring(toSecondIndex+1); // Remove minutes

				var toMillisIndex = timeline.indexOf(",");
				var toSeconds = timeline.substring(0, toMillisIndex);
				timeline = timeline.substring(toMillisIndex+1); // Remove seconds

				var endIndex = timeline.search(/[^0-9]/); // Look for text after the milliseconds part
				var toMillis = timeline.substring(0, endIndex);
				if (endIndex < 0){ // If no other text after the milliseconds, take the rest of the line
					toMillis = timeline;
				}

				var textline = null;
				var text = "";
				while (textline !== "" || textline === null){ // Fetch all lines of text that are connected to the subtitle index
					linebreak = data.indexOf("\n");
					textline = data.substring(0,linebreak).trim();
					text += textline+"\n";
					data = data.substring(linebreak+1);
				}

				subtitles.push({ // Store the subtitle
					"fromTime"	: new Date(0,0,0,fromHours,fromMinutes,fromSeconds,fromMillis),
					"toTime"	: new Date(0,0,0,toHours,toMinutes,toSeconds,toMillis),
					"text" : text.replace(/<[^>]*>/g,"") // Remove tags
				});

				if (data.trim() === ""){ // When the file is empty, pass the resulting array to the callback
					callback(null,subtitles);
				}
			}
		}
	});
}
