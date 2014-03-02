/**
 * Synchronizes a given book and subtitle using (partial) exact string match
 */

var natural = require('natural'); // load natural language facilities
var pos = require('pos');
var fs = require('fs'); // Module for reading files


var noundelta = 0.9;
var otherdelta = 0.75;
var maxnrofmatches = 3;

/**
 * Synchronizes a parsed epub and srt from simpleparser using (partial) exact matching
 * @param book the parsed epub file
 * @param subtitle the parsed srt file
 * @param postprocessor an instance of the postprocessor
 * @param updater the eventemitter to keep track of the progressupdates
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.synchronize = function(book,subtitle,postprocessor,updater,callback){
	var maxdist = 0;
	var matches = {"match" : new Array()};
	var lastmatch = -1;
	var retries = 0;
	var booktext = "";
	var subtext = "";

	var lexer = new pos.Lexer();
	var tagger = new pos.Tagger();

	var bookWords = new Array();
	book.forEach(function (bookvalue, bookindex){
		bookWords[bookindex] = lexer.lex(bookvalue);
	});
	var subWords = new Array();
	subtitle.forEach(function (subvalue, subindex){				
		subWords[subindex] = lexer.lex(subvalue.text);
	});

	subWords.forEach(function (subvalue, subindex){
		var maxmatches = 0;
		var matchindex = 0;
		var bookmatches = new Array();
		var doublematches = new Array();
		var doublematchindex = 0;
		bookWords.forEach(function (bookvalue, bookindex){
			var matchingwords = 0;
			subvalue.forEach(function (subword, subwordindex){
				if (bookvalue.indexOf(subword) !== -1){
					matchingwords++;
				}
			});
			if (matchingwords > maxmatches || (matchingwords == bookvalue.length || matchingwords == subvalue.length)){
				if (matchingwords == bookvalue.length || matchingwords == subvalue.length){ //Exact match
					bookmatches[matchindex++] = bookindex;
					if (bookvalue.length == subvalue.length){ // Double exact match
						doublematches[doublematchindex++] = bookindex;
					}
				}
				else{
					bookmatches[0] = bookindex; //Will be overwritten by subsequent better matches
				}
				maxmatches = matchingwords;							
			}
		});

		var matchfunction = function (matchvalue, matchindex){	
			var match = { 
				"fromTime" : subtitle[subindex].fromTime,
				"subtitleindex" : subindex,
				"quoteindex" : matchvalue,
				"subtitle" : subtitle[subindex].text,
		   		"quote" : book[matchvalue],
		   		"score" : maxmatches
			};
			matches["match"].push(match);
		};

		if (bookmatches.length <= maxnrofmatches){
			bookmatches.forEach(matchfunction);	
		}
		else{
			doublematches.forEach(matchfunction);
		}
		
		updater.emit('syncprogressupdate',Math.floor((subindex*100)/subtitle.length));
	});
	callback(matches); // Return the array with matches	
}