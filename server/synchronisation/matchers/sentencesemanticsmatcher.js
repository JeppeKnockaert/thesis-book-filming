/**
 * Synchronizes a given book and subtitle using sentence level semantic analysis
 */

var fs = require('fs'); // Module for IO
var readline = require('readline'); // Module for reading IO per line

// Minimum similarity to be considered a match
var mindelta = 0.6;

// The smallest number of words a match must consist of 
var minnumberofmatchingwords = 3;

// Search window for exact matches with less words than minnumberofmatchingwords
var relsearchwindow = -0.2;

/**
 * Synchronizes a parsed epub and srt from simpleparser using sentence level semantic analysis
 * @param book the parsed epub file
 * @param subtitle the parsed srt file
 * @param updater the eventemitter to keep track of the progressupdates
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.synchronize = function(book,subtitle,updater,callback){
	var subtitles = subtitle[0]; 
	var matches = {"match" : new Array()};

	var nrdone = 0;
	var bookpreparationstarted = false;
	var subpreparationstarted = false;
	var similarityprogressstarted = false;
	var doneWriting = function(){
		nrdone++;
		if (nrdone === 2){
			updater.emit('message',"Starting SRL Library (this can take some time)");
			var spawn = require('child_process').spawn;
			var child = spawn('java',['-jar','-Xmx4g','SemanticAnalysisSimilarity.jar','book','subtitle',''+mindelta,''+minnumberofmatchingwords,''+relsearchwindow],
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
				var linesplit = line.split('-');
				if (linesplit[0].indexOf("match") !== -1){ // If it is a match, process it
					var subindex = parseInt(linesplit[1].trim());
					var quoteindex = parseInt(linesplit[2].trim());
					var match = { 
						"fromTime" : subtitles[subindex].fromTime,
						"subtitleindex" : subindex,
						"quoteindex" : quoteindex,
						"subtitle" : subtitles[subindex].text,
				   		"quote" : book[quoteindex].text,
				   		"score" : parseFloat(linesplit[3].trim())
					};
					matches["match"].push(match);
				}
				else if (linesplit[0].indexOf("progress") !== -1){ // Pass progressreport to the updater
					var procentnumber = parseInt(linesplit[1].trim());
					updater.emit('syncprogressupdate',procentnumber);
					if (!similarityprogressstarted && linesplit[0].indexOf("similarity") !== -1){
						updater.emit('message',"Synchronisation in progress...");
						similarityprogressstarted = true;
					}
					else if (!bookpreparationstarted && linesplit[0].indexOf("bookpreparation") !== -1){
						updater.emit('message',"Preparing the book for synchronisation...");
						bookpreparationstarted = true;
					}
					else if (!subpreparationstarted && linesplit[0].indexOf("subpreparation") !== -1){
						updater.emit('message',"Preparing the subtitles for synchronisation...");
						subpreparationstarted = true;
					}
				}
			});
			linereader.on('close', function() { // Program has finished
				callback(matches);
			});
		}
	}

	// Write book sentences to file
	var bookText = "";
	book.forEach(function (bookvalue){
		bookText += bookvalue.text+"\n";
	});
	fs.writeFile(__dirname + '/../libs/book', bookText, function (err) {
		if (err){
			console.log(err);
		}
		doneWriting();
	});

	// Write subtitle sentences to file
	var subtitleText = "";
	subtitles.forEach(function (subvalue, subindex){ 
		subtitleText += subvalue.text+"\n";
	});
	fs.writeFile(__dirname + '/../libs/subtitle', subtitleText, function (err) {
		if (err){
			console.log(err);
		}
		doneWriting();
	});	
}