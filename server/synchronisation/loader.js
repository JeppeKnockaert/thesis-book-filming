/**
 * Reads the uploaded files and sends them to the appropriate parser
 */

// Check if the synchronization is already started
var synced = false;

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
	var parser = require(__dirname + "/" + sequence.parser + ".js");
	var preprocessors = new Array();
	sequence.preprocessor.forEach(function(preprocessor,i){
		preprocessors[i] = require(__dirname + "/preprocessors/" + preprocessor + ".js");
	});
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
		var postprocessor = require(__dirname + "/" + sequence.postprocessor + ".js");
		var formatter = require(__dirname + "/" + sequence.formatter + ".js");
		synced = true;
		updater.emit('message',"Synchronisation in progress...");
		matcher.synchronize(parsedBook,parsedSubtitle,postprocessor,updater,function(matches){
			updater.emit('message',"Writing results...");
			formatter.format(matches, updater);
			updater.emit('message',"Synchronisation finished!");
		});
	}
}
