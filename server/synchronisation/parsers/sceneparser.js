/**
 * Parses books and subtitles with separation of scenes in subtitles
 */

var epubParser = require("epub"); // Module for parsing epub files
var fs = require('fs'); // Module for reading files
var maxtimebetweendialogue = 5000; // Maximum amount of time between two sentences in a dialogue (in milliseconds)
var segmentlength = 60; // Length of one videosegment (in seconds)

/**
 * Parses epubs
 * @param bookfile the path to the epub file
 * @param preprocessor the preprocessor array
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.parseBook = function(bookfile, preprocessor, updater, callback){
	var epub = new epubParser(bookfile); // Create the epub parser
	var fulltext = "";
	epub.on("end", function(){
    	epub.flow.forEach(function(chapter, index){ // Loop trough all chapters and fetch the text
    		epub.getChapter(chapter.id, function(err,text){
    			if (err){
    				callback(new Error("Error reading chapter with id "+chapter.id));
    			}
    			else{
    				fulltext += text;
    				if (index == epub.flow.length-1){ // When the last chapters is processed, start parsing
    					var regex = /[“]([^“”]+?)[”]/g; // Match quotes
    					var matcharray = new Array();
						while (matches = regex.exec(fulltext)) { // Go over all matches and put them in an array
							var sentences = matches[1].match(/([^\.\?\!“”](\.\.\.)?)+([\.\?\!“”]|$)/g);
							var process = function(functionind,processedmatch){
					    		if (functionind !== -1){
					    			var nextfunction = (functionind+1<preprocessor.length)?functionind+1:-1;
					    			preprocessor[functionind].preprocess(processedmatch, process.bind(null,nextfunction));
					    		}
					    		else if (processedmatch.trim() !== ""){
				    				matcharray.push({
				    					"text" : processedmatch
				    				});
					    		}
						    };
						    if (sentences == null){ // If only one sentence, add it to the array (else, the array already exists)
						    	sentences = [ matches[1] ];
						    }
							sentences.forEach(function (sentence){
								var nextfunction = -1;
								if (preprocessor.length > 1){
									nextfunction = 1;
								}
								if (preprocessor.length > 0){
									preprocessor[0].preprocess(sentence, process.bind(null,nextfunction));	
								}
								else{
									process(-1,sentence);
								}
							});
						}
    					callback(null, matcharray); // Make a callback using all quotes
    				}
    			}
    		});
		});
	});
	epub.parse();
}

/**
 * Parses subtitles
 * @param subtitlefile the path to the srt file
 * @param preprocessor the preprocessor array
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.parseSubtitle = function(subtitlefile, preprocessor, updater, callback){
	fs.readFile(subtitlefile, 'utf8', function (err,data) {
	  	if (err) {
	    	callback(err);
		}
		else{
			var subtitles = new Array();
			var scenestarts = {};
			var previousEndInMillis = -1;
			var startSceneMillis = 0;
			var sceneindex = 0;
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
				var totalFromInMillis = parseInt(fromHours)*60*60*1000+parseInt(fromMinutes)*60*1000+parseInt(fromSeconds)*1000+parseInt(fromMillis);

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
				var totalToInMillis = parseInt(toHours)*60*60*1000+parseInt(toMinutes)*60*1000+parseInt(toSeconds)*1000+parseInt(toMillis);

				var textline = null;
				var text = "";
				while (textline !== "" || textline === null){ // Fetch all lines of text that are connected to the subtitle index
					linebreak = data.indexOf("\n");
					textline = data.substring(0,linebreak).trim();
					text += textline+"\n";
					data = data.substring(linebreak+1);
				}
				// Split into sentences based on period, question mark or excamation mark
				// If an ellipsis doesn't occur at the end of the sentence, don't break on it
				var sentences = text.match(/([^\.\?\!]+?(\.\.\.[^\n])?)+\s*(\.\.\.|[\.\?\!]|$)\s*/g);
			    if (sentences == null){ // If only one sentence, add it to the array (else, the array already exists)
			    	sentences = [ text ];
			    }
				sentences.forEach(function (sentence){
					// If a new scene is detected (because too much time between subtitles), increase the scene index
	    			if (totalFromInMillis-previousEndInMillis >= maxtimebetweendialogue || previousEndInMillis < 0){
	    				//console.log(sceneindex+": "+(totalFromInMillis-startSceneMillis)/1000+" seconds (started at:"+startSceneMillis/1000/60+")");
	    				startSceneMillis = totalFromInMillis;
	    				sceneindex++;
	    				scenestarts[sceneindex] = subtitles.length; // Map the index of the first subtitle of the index of the scene
	    			}	

					subtitles.push({ // Store the subtitle
						"scene" : sceneindex,
						"fromTime"	: fromHours+":"+fromMinutes+":"+fromSeconds+","+fromMillis,
						"toTime"	: toHours+":"+toMinutes+":"+toSeconds+","+toMillis,
						"text" : sentence
					});
					
					// If multiple sentences, make sure the scene index isn't increased twice
					previousEndInMillis = totalFromInMillis;
				});
				previousEndInMillis = totalToInMillis;
				// if (data.trim() === ""){
				// 	console.log(sceneindex+": "+(totalFromInMillis-startSceneMillis)/1000+" seconds (started at:"+startSceneMillis/1000/60+")");
				// }
			}

			var mergedsubs = new Array();
			// Perform preprocessing for the parsed subtitles
			var process = function(functionind,from,to,scene,processedtext){
	    		if (functionind !== -1){ // Call next preprocessor
	    			var nextfunction = (functionind+1<preprocessor.length)?functionind+1:-1;
	    			preprocessor[functionind].preprocess(processedtext, process.bind(null,nextfunction,subtitles[i].fromTime,subtitles[j].toTime,subtitles[j].scene));
	    		}
	    		else if (processedtext.trim() !== ""){
					mergedsubs.push({ // Store the subtitle
						"scene" : scene,
						"fromTime"	: from,
						"toTime"	: to,
						"text" : processedtext
					});
				}
		    };
		    // Try to merge multiple lines of subtitles
			for (var i = 0; i < subtitles.length; i++){
				var subtext = "";
				var nextscene = false;
				var j = i;
				while (j < subtitles.length && subtext.match(/[\.\?\!\…]/) === null && !nextscene){
					subtext += " "+subtitles[j].text;
					j++;
					nextscene = (j >= subtitles.length || subtitles[j].scene !== subtitles[j-1].scene);
				}
				j--;
				// Call preprocessors
				var nextfunction = -1;
				if (preprocessor.length > 1){
					nextfunction = 1;
				}
				if (preprocessor.length > 0){
					preprocessor[0].preprocess(subtext.trim(), process.bind(null,nextfunction,subtitles[i].fromTime,subtitles[j].toTime,subtitles[j].scene));
				}
				else{
					process(-1,subtitles[i].fromTime,subtitles[j].toTime,subtitles[j].scene,subtext.trim());
				}
				i = j;
			}
			callback(null,[mergedsubs,scenestarts]);  // When the file is empty, pass the resulting array to the callback
		}
	});
}
