/**
 * Synchronizes a given book and subtitle using sentence similarity based on semantic nets and corpus statistics
 */

var pos = require('pos'); // Module for POS tagging
var fs = require('fs'); // Module for IO
var readline = require('readline'); // Module for reading IO per line

var delta = 0.7;

/**
 * Synchronizes a parsed epub and srt from simpleparser using sentence similarity
 * based on semantic nets and corpus statistics
 *
 * @param book the parsed epub file
 * @param subtitle the parsed srt file
 * @param postprocessor an instance of the postprocessor
 * @param updater the eventemitter to keep track of the progressupdates
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.synchronize = function(book,subtitle,postprocessor,updater,callback){
	var matches = {"match" : new Array()};
	var tagger = new pos.Tagger();
	var lexer = new pos.Lexer();

	var tocompare = {
		"book" : new Array(),
		"subtitle" : new Array()
	}

	subtitle.forEach(function(subtitle,subtitleindex){
		var subWords = lexer.lex(subtitle.text);
		tocompare["subtitle"].push(tagger.tag(subWords));
	});
	book.forEach(function(quote, quoteindex){
		var quoteWords = lexer.lex(quote);
		tocompare["book"].push(tagger.tag(quoteWords));
	});

	var tocomparejson = JSON.stringify(tocompare)
	fs.writeFile(__dirname + '/../libs/tocompare', tocomparejson, function (err) {
		if (err){
			console.log(err);
		}
		var spawn = require('child_process').spawn;
		var child = spawn('java',['-jar','WordNetSimilarity.jar','tocompare',''+delta],
		{
			cwd : __dirname+'/../libs/' // Set working directory to the libs folder (where the java application resides)
		});

		child.stdout.setEncoding('utf8');
		linereader = readline.createInterface({ // Make the file output be produced line per line
			input : child.stdout, 
			output : child.stdin,
			terminal: false
		});
		linereader.on('line', function(line) { // Reaction on receiving a line from stdout
			var procentindex = line.indexOf('%');
			if (procentindex === -1){ // If not a progressreport, it is a result
				var linesplit = line.split('-');
				var subindex = linesplit[0].trim();
				var subvalue = subtitle[subindex];
				var quoteindex = linesplit[1].trim();
				var bookvalue = book[quoteindex];
				var match = { 
					"fromTime" : subvalue.fromTime,
					"subtitleindex" : subindex,
					"quoteindex" : quoteindex,
					"subtitle" : subvalue.text,
			   		"quote" : bookvalue,
			   		"score" : linesplit[2]
				};
				matches["match"].push(match);
			}
			else{ // Pass progressreport to the updater
				var procentnumber = line.substr(0,procentindex);
				updater.emit('syncprogressupdate',procentnumber);
			}
		});
		child.on('close', function (code) {
			updater.emit('syncprogressupdate',100);
		});
	});
}