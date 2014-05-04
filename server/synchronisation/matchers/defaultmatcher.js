/**
 * Synchronizes a given book and subtitle using (partial) exact string match
 */

// Minimum similarity to be considered a match
var mindelta = 0.6;

// The smallest number of words a match must consist of 
var minnumberofmatchingwords = 3;

/**
 * Synchronizes a parsed epub and srt from simpleparser using (partial) exact matching
 * @param book the parsed epub file
 * @param subtitle the parsed srt file
 * @param updater the eventemitter to keep track of the progressupdates
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.synchronize = function(book,subtitle,updater,callback){
	var matches = {"match" : new Array()};
	var bookWords = new Array();

	book.forEach(function (bookvalue, bookindex){ // Split the quotes into words
		bookWords[bookindex] = bookvalue.text.toLowerCase().split(" ");
	});

	var subWords = new Array();
	var subtitles = subtitle[0]; // Get the subtitles
	subtitles.forEach(function (subvalue, subindex){ // Split the sentences into words
		subWords[subindex] = subvalue.text.toLowerCase().split(" ");
	});


	bookWords.forEach(function (bookvalue, bookindex){
		var newmaxscore = -1;
		var oldmaxscore = -1;
		var quotesmerged = 0;
		
		var newsubmatches;
		var oldsubmatches;
		var mergedbookvalue = new Array();
		var oldmaxmatchingwords = -1;
		var newmaxmatchingwords = -1;
		var oldmerged = -1;
		var newmerged = -1;

		var addedwords = -1;

		while (newmaxscore === -1 || (newmaxscore > oldmaxscore && matchingwords > 1 && (quotesmerged <= 1 || addedwords > 1))){
			oldmaxscore = newmaxscore;
			oldsubmatches = newsubmatches;
			oldmaxmatchingwords = newmaxmatchingwords;
			oldmerged = newmerged;
			newmaxscore = 0;

			var matchindex = 0;

			mergedbookvalue = mergedbookvalue.concat(bookWords[bookindex+quotesmerged]);
			newsubmatches = new Array();

			var startindex = 0; 
			var endindex = subWords.length;
			// Find the best matching subtitles for this quote
			for (var subindex = startindex; subindex < endindex; subindex++){
				var oldrelnrofmatches = -1;
				var newrelnrofmatches = -1;

				var oldmatchingwords = -1;
				var newmatchingwords = -1;
				var subvalue = new Array();
				var merged = 0;

				var newfractionscore = -1;
				while (newrelnrofmatches === -1 || (newrelnrofmatches > oldrelnrofmatches && newmatchingwords > 1 && (merged <= 1 || (newmatchingwords-oldmatchingwords) > 1))){
					oldmatchingwords = newmatchingwords;

					subvalue = subvalue.concat(subWords[subindex+merged]);
					newmatchingwords = 0;
					var usedindices = new Array();
					mergedbookvalue.forEach(function (bookword, bookwordindex){
						// Check if the word occurs in the subtitle
						var index = subvalue.indexOf(bookword);
						// Look if the word in the subtitle was already used as a match
						var usedindex = usedindices.indexOf(index); 
						// Check if the word occurs multiple times in the sentence of the subtitle
						while (usedindex !== -1 && usedindex+1 < subvalue.length){
							index = subvalue.indexOf(bookword,index+1);
							usedindex = usedindices.indexOf(index);
						}
						// If the word was found and the word wasn't used as match before, add the match
						if (index !== -1 && usedindex === -1){ 
							newmatchingwords++;
							usedindices.push(index);
						}				
					});
					// Set the previous score as old score
					oldrelnrofmatches = newrelnrofmatches;
					// Calculate the new score as the average fraction of matching words
					bookfraction = newmatchingwords/mergedbookvalue.length;
					subtitlefraction = newmatchingwords/subvalue.length;
					newrelnrofmatches = (bookfraction+subtitlefraction)/2;

					merged++;
				}

				var relnrofmatches = (merged == 1)?newrelnrofmatches:oldrelnrofmatches;
				var matchingwords = (merged == 1)?newmatchingwords:oldmatchingwords;

				merged = (merged > 1)?merged-1:merged; // The last merge was unsuccesful (that's why we stepped out of the loop)

				// If a minimum number of words matches, the similarity measure is at least delta and the new match for the quote
				// is at least as good as the previous one, add the subtitle to the array of matches for the quote
				if (relnrofmatches >= mindelta && relnrofmatches >= newmaxscore && matchingwords >= minnumberofmatchingwords){
					// Reset resultsarray if an absolute better match has been found
					if (relnrofmatches > newmaxscore){ 
						newsubmatches = new Array();
						matchindex = 0;
					}

					// The subtitle shouldn't already be in the submatches array (because of an earlier merge)
					if (newsubmatches.indexOf(subindex) === -1){ 
						newsubmatches[matchindex] = subindex;	
						matchindex++;
					}

					if (merged > 1){
						var completesubtitle = subtitles[subindex].text;
						for (var i = 1; i < merged; i++){
							completesubtitle+=" "+subtitles[subindex+i].text;
							// The subtitle shouldn't already be in the submatches array (because of an earlier merge)
							if (newsubmatches.indexOf(subindex+i) === -1){
								newsubmatches[matchindex] = subindex+i;
								matchindex++;
							}
						}
					}				
					newmaxscore = relnrofmatches;
					newmaxmatchingwords = matchingwords;
					newmerged = merged;
				}
			}
			addedwords = (newmaxmatchingwords >= oldmaxmatchingwords)?newmaxmatchingwords-oldmaxmatchingwords:newmaxmatchingwords;
			quotesmerged++;
		}

		var submatches = (quotesmerged === 1)?newsubmatches:oldsubmatches;
		var maxscore = (quotesmerged === 1)?newmaxscore:oldmaxscore;
		var maxmatchingwords = (quotesmerged === 1)?newmaxmatchingwords:oldmaxmatchingwords;
		var merged = (quotesmerged === 1)?newmerged:oldmerged;

		quotesmerged = (quotesmerged > 1)?quotesmerged-1:quotesmerged;
		
		// if (quotesmerged > 1 || merged > 1){
		// 	console.log("------------------------------");
		// 	for (var i = 0; i < submatches.length; i++){
		// 		console.log(submatches[i]+": "+subtitles[submatches[i]].text);
		// 	}
		// 	var completebook = "";
		// 	for (var i = 0; i < quotesmerged; i++){
		// 		completebook+=" "+book[bookindex+i].text;
		// 	}
		// 	console.log("quote "+bookindex+": "+completebook+" ("+(quotesmerged)+", "+newmaxmatchingwords+" vs "+oldmaxmatchingwords+")");
		// 	console.log("MERGED ("+maxscore+")");
		// 	console.log("------------------------------");
		// }

		var matchfunction = function (matchvalue, matchindex){
			for (var i = 0; i < quotesmerged; i++){	
				var match = { 
					"fromTime" : subtitles[matchvalue].fromTime,
					"subtitleindex" : matchvalue,
					"sceneindex" : subtitles[matchvalue].scene,
					"quoteindex" : bookindex+i,
					"subtitle" : subtitles[matchvalue].text,
			   		"quote" : book[bookindex+i].text,
			   		"score" : maxscore
				};
				matches["match"].push(match);
			}
		};
		if (maxmatchingwords >= minnumberofmatchingwords){
			submatches.forEach(matchfunction);
		}
		updater.emit('syncprogressupdate',Math.floor((bookindex*100)/book.length));	
	});
	callback(matches); // Return the array with matches	
}