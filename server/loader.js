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
	var matcher = require(__dirname + "/" + sequence.matcher + ".js");
	var parser = require(__dirname + "/" + sequence.parser + ".js");
	// Parse the epub file
	parser.parseBook(bookfile, function(err, book){
		if (err){
			console.log(err);
		}
		parsedBook = book;
		if (parsedSubtitle !== null){
			callSynchronization(matcher, parsedBook, parsedSubtitle, updater);
		}
	});
	// Parse the srt file
	parser.parseSubtitle(subtitlefile, function(err, subtitle){
		if (err){
			console.log(err);
		}
		parsedSubtitle = subtitle;
		if (parsedBook !== null){
			callSynchronization(matcher, parsedBook, parsedSubtitle, updater);
		}
	});
};

/**
 * Calls the synchronization function on the matcher object
 * @param matcher the object containing the main synchronization function
 * @param bookfile the file containing the epub
 * @param subtitlefile the file containing the srt
 * @param updater the eventemitter to keep track of the progressupdates
 */
callSynchronization = function(matcher, parsedBook, parsedSubtitle, updater){
	if (!synced){
		synced = true;
		matcher.synchronize(parsedBook,parsedSubtitle, updater);
	}
}
