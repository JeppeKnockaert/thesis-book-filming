/**
 * Reads the uploaded files and sends them to the appropriate parser
 */

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
	processingsequence.parser.parseBook(bookfile, req, res, processingsequence);
	processingsequence.parser.parseSubtitle(subtitlefile, req, res, processingsequence);
};
