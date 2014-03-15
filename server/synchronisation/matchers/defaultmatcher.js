/**
 * Synchronizes a given book and subtitle using (partial) exact string match
 */

var natural = require('natural'); // load natural language facilities
var pos = require('pos');
var fs = require('fs'); // Module for reading files

var mindelta = 0.7;
var verbmatchdelta = 0.5;
var maxnrofmatches = 1;
var windowsize = 0.20;

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
	var bookTags = new Array();
	book.forEach(function (bookvalue, bookindex){
		bookWords[bookindex] = lexer.lex(bookvalue);
		bookTags[bookindex] = tagger.tag(bookWords[bookindex]);
	});
	var subWords = new Array();
	var subTags = new Array();
	subtitle.forEach(function (subvalue, subindex){				
		subWords[subindex] = lexer.lex(subvalue.text);
		subTags[subindex] = tagger.tag(subWords[subindex]);
	});

	var lastexactmatchindex = -1;
	subWords.forEach(function (subvalue, subindex){
		var maxmatches = 0;
		var matchindex = 0;
		var bookmatches = new Array();
		var doublematches = new Array();
		var doublematchindex = 0;

		var startindex = 0; 
		var endindex = bookWords.length;
		// if (lastexactmatchindex !== -1){
		// 	startindex = ((lastexactmatchindex/bookWords.length)-windowsize > 0)?Math.round(((lastexactmatchindex/bookWords.length)-windowsize)*bookWords.length):0;
		// 	endindex = ((lastexactmatchindex/bookWords.length)+windowsize < 1)?Math.round(((lastexactmatchindex/bookWords.length)+windowsize)*bookWords.length):bookWords.length;
		// }
		for (var bookindex = startindex; bookindex < endindex; bookindex++){
			var bookvalue = bookWords[bookindex];
			var matchingwords = 0;
			var matchingverbs = 0;
			var usedindices = new Array();
			var nrofsubverbs = 0;
			var nrofbookverbs = 0;
			bookvalue.forEach(function (bookword, bookwordindex){
				var tag = bookTags[bookindex][bookwordindex][1];
				if (tag.search("VB") !== -1){ // Tagged as verb
					nrofbookverbs++;
				}
			});
			subvalue.forEach(function (subword, subwordindex){
				var tag = subTags[subindex][subwordindex][1];
				var verb = false;
				if (tag.search("VB") !== -1){ // Tagged as verb
					nrofsubverbs++;
					verb = true;
				}

				// Check if the word occurs in the epub
				var index = bookvalue.indexOf(subword);
				// Look if the word in the epub was already used as a match
				var usedindex = usedindices.indexOf(index); 
				// Check if the word occurs multiple times in the sentence of the epub
				while (usedindex !== -1 && usedindex+1 < bookvalue.length){
					index = bookvalue.indexOf(subword,index+1);
					usedindex = usedindices.indexOf(index);
				}
				// If the word was found and the word wasn't used as match before, add the match
				if (index !== -1 && usedindex === -1){ 
					matchingwords++;
					if (verb){
						matchingverbs++;
					}
					usedindices.push(index);
				}				
			});

			// Take the maximum of the two relative numbers of matched verbs
			var relnrofmatchingverbs = 1;
			if (nrofsubverbs > 0){
				relnrofmatchingverbs = (nrofsubverbs > nrofbookverbs)?matchingverbs/nrofbookverbs:matchingverbs/nrofsubverbs;
			}
			var relnrofmatches = (subvalue.length > bookvalue.length)?matchingwords/bookvalue.length:matchingwords/subvalue.length;
			if ((matchingwords > maxmatches || (matchingwords == bookvalue.length || matchingwords == subvalue.length))
				&& (relnrofmatchingverbs >= verbmatchdelta)
				&& (relnrofmatches >= mindelta)){

				if (matchingwords == bookvalue.length || matchingwords == subvalue.length){ //Exact match
					bookmatches[matchindex++] = bookindex;
					if (bookvalue.length == subvalue.length){ // Double exact match
						doublematches[doublematchindex++] = bookindex;
						lastexactmatchindex = bookindex;
					}
				}
				else{
					bookmatches[0] = bookindex; //Will be overwritten by subsequent better matches
				}
				maxmatches = matchingwords;							
			}
		}

		var matchfunction = function (matchvalue, matchindex){	
			var match = { 
				"fromTime" : subtitle[subindex].fromTime,
				"subtitleindex" : subindex,
				"quoteindex" : matchvalue,
				"subtitle" : subtitle[subindex].text,
		   		"quote" : book[matchvalue],
			};
			matches["match"].push(match);
		};

		if (doublematches.length > 0 && doublematches.length <= maxnrofmatches){
			doublematches.forEach(matchfunction);
		}
		else if(bookmatches.length <= maxnrofmatches){
			bookmatches.forEach(matchfunction);
		}

		updater.emit('syncprogressupdate',Math.floor((subindex*100)/subtitle.length));
	});
	callback(matches); // Return the array with matches	
}