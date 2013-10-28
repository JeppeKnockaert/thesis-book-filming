/**
 * Reads the uploaded files and sends them to the appropriate parser
 */

var parsedBook = null;
var parsedSubtitle = null;

/**
 * Read the uploaded files and send them to the parser (from the processing chain)
 * for further processing.
 * @param req request object from express
 * @param res response object from express
 * @param processingsequence all files in the processing chain
 */
exports.readFiles = function(req, res, processingsequence){
	var bookfile = req.files.bookfile;
	var subtitlefile = req.files.subtitlefile;
	var parser = require(__dirname + "/" + processingsequence.parser + ".js");
	parser.parseBook(bookfile, req, res, function(err, book){
		if (err){
			console.log(err);
		}
		parsedBook = book;
		if (parsedSubtitle !== null){
			callSynchronization();
		}
	});
	parser.parseSubtitle(subtitlefile, req, res, function(err, subtitle){
		if (err){
			console.log(err);
		}
		parsedSubtitle = subtitle;
		if (parsedBook !== null){
			callSynchronization();
		}
	});
};

/**
 * Calls the synchronization function on the matcher object
 */
callSynchronization = function(){
	var matcher = require(__dirname + "/" + processingsequence.matcher + ".js");
	matcher.synchronize(parsedBook,parsedSubtitle);
}
