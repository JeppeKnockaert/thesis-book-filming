/**
 * Parses books and subtitles and performs semantic role labeling for each sentence
 * Performs callback with an array: [[array of sentences], {Parsed JSON with labels}]
 */

var epubParser = require("epub"); // Module for parsing epub files
var fs = require('fs'); // Module for reading files
var srl = false; // Has SRL started yet?
var bookParsed = false; // Is the book parsed yet?
var subParsed = false; // Are the subs parsed yet?
var parsedBook; // Results from parsing the book
var bookCallback; // Callback to execute after parsing book
var parsedSubtitles; // Results from parsing the subtitles
var subtitleCallback; // Callback to execute after parsing subtitles
var eventupdater; // Updater for registring our progress
var minimumnrofparagraphs = 5; // The minimum number of paragraphs a chapter must contain to be considered

/**
 * Parses epubs
 * @param bookfile the path to the epub file
 * @param preprocessor the preprocessor array
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.parseBook = function(bookfile, preprocessor, updater, callback){
	eventupdater = updater;
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
					var bookText = "";
					parsedBook = new Array();
    				if (index == epub.flow.length-1){ // When the last chapters is processed, start parsing
    					var regex = /[“]([^“”]+?)[”]/g; // Match quotes
						while (matches = regex.exec(fulltext)) { // Go over all matches and put them in an array
							var sentences = matches[1].match(/[^\.\?\!“”]+([\.\?\!“”]|$)/g);
							var done = 0;
							var process = function(functionind,processedmatch){
								done++;
					    		if (functionind !== -1){
					    			var nextfunction = (functionind+1<preprocessor.length)?functionind+1:-1;
					    			preprocessor[functionind].preprocess(processedmatch, process.bind(null,nextfunction));
					    		}
					    		if (done === preprocessor.length && processedmatch.trim() !== ""){
					    			parsedBook.push({
					    				"text" : processedmatch
					    			});
				    				bookText += processedmatch+"\n";
					    		}
						    };
						    if (sentences == null){ // If only one sentence, add it to the array (else, the array already exists)
						    	sentences = [ matches[1] ];
						    }
							sentences.forEach(function (sentence){
								var nextfunction = -1;
								if (preprocessor.length > 1){ // If there is more than one preprocessor, the next has index 1
									nextfunction = 1;
								}
								if (preprocessor.length > 0){ // If there is at least one preprocessor, execute it
									preprocessor[0].preprocess(sentence, process.bind(null,nextfunction));	
								}
								else{ // If there are no preprocessors, just add the not processed sentence
									process(-1,sentence);
								}	
							});
						}
						fs.writeFile(__dirname + '/libs/book', bookText, function (err) { // Write the sentences to file for SRL
							if (err){
								console.log(err);
							}
							bookCallback = callback; 
							if (subParsed && !srl){ // If subtitles are done and that method didn't start the SRL, start it
								srl = true;
								callSRLParser();
							}
							bookParsed = true; // Book has been parsed
						});
    				}
    			}
    		});
		});
	});
	epub.parse();
}

/**
 * Spawns the java application that does the semantic role labeling
 */
callSRLParser = function(){
	var done = function(){
		eventupdater.emit('syncprogressupdate',0); // Reset progress for the next part
		fs.readFile(__dirname + '/libs/srlout.json', 'UTF-8', function (srlerr, srldata){
			var parsedSRL = JSON.parse(srldata);
			fs.readFile(__dirname + '/libs/posout.json', 'UTF-8', function (poserr, posdata){
				var parsedPOS = JSON.parse(posdata);
				fs.readFile(__dirname + '/libs/relatedwords.json', 'UTF-8', function (relerr, reldata){
					var reldict = JSON.parse(reldata);
					bookCallback(null, [parsedBook, parsedSRL["book"], parsedPOS["book"], reldict]); // Make a callback using all quotes
					subtitleCallback(null, [parsedSubtitles, parsedSRL["subtitle"], parsedPOS["subtitle"], reldict]); // Make a callback using all subtitles
				});
			});
		});
	};
	fs.readFile(__dirname + '/../config.json', 'UTF-8', function (configerr, configdata){
		var usecachedfile = JSON.parse(configdata)['srl']['usecachedversion'];
		fs.readFile(__dirname + '/libs/srlout.json', 'UTF-8', function (srlerr, srlout){
			fs.readFile(__dirname + '/libs/posout.json', 'UTF-8', function (poserr, posout){
				fs.readFile(__dirname + '/libs/relatedwords.json', 'UTF-8', function (relerr, relout){
					if (!usecachedfile||srlerr||poserr||relerr){
						eventupdater.emit('message',"SRL/POS tagging in progress...");
						var spawn = require('child_process').spawn;
						var child = spawn('java',['-jar','-Xmx4g','SemanticRoleLabeler.jar','book','subtitle'],
						{
							cwd : __dirname+'/libs/' // Set working directory to the libs folder (where the java application resides)
						});
						child.stdout.setEncoding('utf8');
						child.stdout.on('data', function (data) {
							var procentindex = data.indexOf('%');
							if (procentindex !== -1){
								var procentnumber = data.substr(0,procentindex);
								eventupdater.emit('syncprogressupdate',procentnumber);
							}
						});
						child.on('close', function (code) {
							done();
						});
					}
					else{
						console.log("Using old data! (Only for debugging purposes)");
						done();
					}
				});
			});
		});	
	});
	
}

/**
 * Parses subtitles
 * @param subtitlefile the path to the srt file
 * @param preprocessor the preprocessor array
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.parseSubtitle = function(subtitlefile, preprocessor, updater, callback){
	eventupdater = updater;
	fs.readFile(subtitlefile, 'utf8', function (err,data) {
	  	if (err) {
	    	callback(err);
		}
		else{
			parsedSubtitles = new Array();
			var subtitleText = "";
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
				var sentences = text.match(/([^\.\?\!“”]+([\.\?\!“”]|$)|^\-[^\-]+)/g);
				var done = 0;
				var process = function(functionind,processedtext){
					done++;
		    		if (functionind !== -1){
		    			var nextfunction = (functionind+1<preprocessor.length)?functionind+1:-1;
		    			preprocessor[functionind].preprocess(processedtext, process.bind(null,nextfunction));
		    		}
		    		if (done === preprocessor.length && processedtext.trim() !== ""){
						parsedSubtitles.push({ // Store the subtitle
							"fromTime"	: fromHours+":"+fromMinutes+":"+fromSeconds+","+fromMillis,
							"toTime"	: toHours+":"+toMinutes+":"+toSeconds+","+toMillis,
							"text" : processedtext
						});
						subtitleText += processedtext+'\n';
					}
			    };
			    if (sentences == null){ // If only one sentence, add it to the array (else, the array already exists)
			    	sentences = [ text ];
			    }
				sentences.forEach(function (sentence){
					var nextfunction = -1;
					if (preprocessor.length > 1){ // If there is more than one preprocessor, the next has index 1
						nextfunction = 1;
					}
					if (preprocessor.length > 0){ // If there is at least one preprocessor, execute it
						preprocessor[0].preprocess(sentence, process.bind(null,nextfunction));
					}
					else{ // If there are no preprocessors, just add the not processed sentence
						process(-1,sentence);
					}
				});
			}
			// When the file is empty, we're ready
			fs.writeFile(__dirname + '/libs/subtitle', subtitleText, function (err) {
				if (err){
					console.log(err);
				}
				subtitleCallback = callback;
				if (bookParsed && !srl){ // If book is done and that method didn't start the SRL, start it
					srl = true;
					callSRLParser();
				}
				subParsed = true; // Subtites have been parsed
			});
		}
	});
}
