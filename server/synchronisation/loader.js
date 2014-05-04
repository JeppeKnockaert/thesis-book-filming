/**
 * Reads the uploaded files and sends them to the appropriate parser
 */

var fs = require('fs'); // Load module for IO

var synced = false; // Check if the synchronization is already started

var parsedBook = null;
var parsedSubtitle = null;

/**
 * Read the uploaded files and send them to the parser (from the processing chain)
 * for further processing.
 * @param bookfile the file containing the epub
 * @param subtitlefile the file containing the srt
 * @param sequence all files in the processing chain
 * @param updater the eventemitter to keep track of the progressupdates
 */
exports.readFiles = function(bookfile, subtitlefile, sequence, updater){
	var parser = require(__dirname + "/parsers/" + sequence.parser + ".js");
	var preprocessors = new Array();
	sequence.preprocessor.forEach(function(preprocessor,i){
		preprocessors[i] = require(__dirname + "/preprocessors/" + preprocessor + ".js");
	});
	updater.emit('message',"Parsing in progress...");
	// Parse the epub file
	parser.parseBook(bookfile, preprocessors, updater, function(err, book){
		if (err){
			console.log(err);
		}
		parsedBook = book;
		if (parsedSubtitle !== null){
			callSynchronization(sequence, parsedBook, parsedSubtitle, updater);
		}
	});
	// Parse the srt file
	parser.parseSubtitle(subtitlefile, preprocessors, updater, function(err, subtitle){
		if (err){
			console.log(err);
		}
		parsedSubtitle = subtitle;
		if (parsedBook !== null){
			callSynchronization(sequence, parsedBook, parsedSubtitle, updater);
		}
	});
};

/**
 * Calls the synchronization function on the matcher object
 * @param sequence all files in the processing chain
 * @param bookfile the file containing the epub
 * @param subtitlefile the file containing the srt
 * @param updater the eventemitter to keep track of the progressupdates
 */
callSynchronization = function(sequence, parsedBook, parsedSubtitle, updater){
	if (!synced){
		var matcher = require(__dirname + "/matchers/" + sequence.matcher + ".js");
		var formatter = require(__dirname + "/formatters/" + sequence.formatter + ".js");
		synced = true;
		updater.emit('message',"Synchronisation in progress...");
		matcher.synchronize(parsedBook,parsedSubtitle,updater,function(matches){
			var syncready = "Synchronisation finished!";
			if (sequence.postprocessor.length > 0){ // If there is a postprocessor, do the postprocessing first
				updater.emit('message',"Postprocessing in progress...");
				var postprocessors = new Array();
				sequence.postprocessor.forEach(function(postprocessor,i){
					postprocessors[i] = require(__dirname + "/postprocessors/" + postprocessor + ".js");
				});
				var process = function(functionind,processedmatches){
		    		if (functionind !== -1){
		    			var nextfunction = (functionind+1<sequence.postprocessor.length)?functionind+1:-1;
		    			postprocessors[functionind].postprocess(processedmatches, process.bind(null,nextfunction));
		    		}
		    		else{
	    				formatter.format(processedmatches, updater);
						updater.emit('message',syncready);
		    		}
			    };
			    var nextfunction = -1;
			    if (postprocessors.length > 1){
			    	nextfunction = 1;
			    }
			    postprocessors[0].postprocess(matches, process.bind(null,nextfunction));
			}
			else{ // Else, continue to formatter
				formatter.format(matches, updater);
				updater.emit('message',syncready);
			}
		});
	}
}
