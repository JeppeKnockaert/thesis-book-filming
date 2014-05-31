/**
 * Synchronizes a given book and subtitle using (partial) exact string match
 */

// Minimum similarity to be considered a match
var mindelta = 0.6;

// The smallest number of words a match must consist of 
var minnumberofmatchingwords = 3;

// Search window for exact matches with less words than minnumberofmatchingwords
var relsearchwindow = -1;

// Minimum score of a match to be create a time window around it
var minimumscorefortimewindow = 0.8;

/**
 * Synchronizes a parsed epub and srt
 * @param book the parsed epub file
 * @param subtitle the parsed srt file
 * @param parameters an array with the parameters for the matching algorithm
 * @param updater the eventemitter to keep track of the progressupdates
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.synchronize = function(book,subtitle,parameters,updater,callback){
	var matches = {"match" : new Array()};
	// Set parameter values
	if (parameters.length > 0){
		mindelta = parameters[0];
		minnumberofmatchingwords = parameters[1];
		relsearchwindow = parameters[2];
		minimumscorefortimewindow = parameters[3];
	}

	var bookWords = new Array();

	book.forEach(function (bookvalue, bookindex){ // Split the quotes into words
		bookWords[bookindex] = bookvalue.text.toLowerCase().split(" ");
	});

	var subWords = new Array();
	var subtitles = subtitle[0]; // Get the subtitles
	subtitles.forEach(function (subvalue, subindex){ // Split the sentences into words
		subWords[subindex] = subvalue.text.toLowerCase().split(" ");
	});

	var lastindex = -1;
	bookWords.forEach(function (bookvalue, bookindex){
		// The list of best matching subtitles (all with the maxscore)
		var submatches = new Array();
		// Keep the best score for a subtitle in combination with the current book index
		var maxscore = 0;
		// If the sentence is very short, try to find an exact match within a certain window of the previous match
		if (bookvalue.length < minnumberofmatchingwords && lastindex >= 0 && relsearchwindow >= 0){
			var searchwindow = Math.round(relsearchwindow*subWords.length);
			var start = (lastindex-searchwindow > 0)?lastindex-searchwindow:0;
			var end = (lastindex+searchwindow < subWords.length)?lastindex+searchwindow:subWords.length;
			// Find exact matching subtitles for this quote
			for (var subindex = start; subindex < end; subindex++){
				if (bookvalue.length == subWords[subindex].length && book[bookindex].text.toLowerCase() === subtitles[subindex].text.toLowerCase()){
					submatches.push(subindex);
				}
			}
			maxscore = 1;
		}
		else if (bookvalue.length >= minnumberofmatchingwords) {
			// Index for the submatches array
			var matchindex = 0;
			
			// Find the best matching subtitles for this quote
			for (var subindex = 0; subindex < subWords.length; subindex++){
				// The text of the subtitle
				var subvalue = subWords[subindex];
				if (subvalue.length >= minnumberofmatchingwords){
					// The absolute number of matching words
					var matchingwords = 0;
					// The indexes of the already matched words
					var usedindices = new Array();
					bookvalue.forEach(function (bookword, bookwordindex){
						// Check if the word occurs in the subtitle
						var index = subvalue.indexOf(bookword);
						// Look if the word in the subtitle was already used as a match
						var usedindex = usedindices.indexOf(index); 
						// Check if the word occurs multiple times in the sentence of the subtitle
						while (usedindex !== -1 && index+1 < subvalue.length){
							index = subvalue.indexOf(bookword,index+1);
							usedindex = usedindices.indexOf(index);
						}
						// If the word was found and the word wasn't used as match before, add the match
						if (index !== -1 && usedindex === -1){ 
							matchingwords++;
							usedindices.push(index);
						}				
					});

					// Calculate the new score as the average fraction of matching words
					var bookfraction = matchingwords/bookvalue.length;
					var subtitlefraction = matchingwords/subvalue.length;
					// The relative number of matching words (the score)
					var relnrofmatches = (bookfraction+subtitlefraction)/2;

					// If a minimum number of words matches, the similarity measure is at least delta and the new match for the quote
					// is at least as good as the previous one, add the subtitle to the array of matches for the quote
					if (relnrofmatches >= mindelta && relnrofmatches > maxscore && matchingwords >= minnumberofmatchingwords){
						// Reset resultsarray if an absolute better match has been found
						if (relnrofmatches > maxscore){ 
							submatches = new Array();
							matchindex = 0;
						}					
						submatches[matchindex++] = subindex;	
						maxscore = relnrofmatches;
					}
				}
			}	
		}

		var matchfunction = function (bookindex, maxscore, booklength, matchvalue, matchindex){
			if (booklength >= minnumberofmatchingwords && maxscore >= minimumscorefortimewindow){
				lastindex = matchvalue;
			}
			var match = { 
				"fromTime" : subtitles[matchvalue].fromTime,
				"subtitleindex" : matchvalue,
				"sceneindex" : subtitles[matchvalue].scene,
				"quoteindex" : bookindex,
				"subtitle" : subtitles[matchvalue].text,
		   		"quote" : book[bookindex].text,
		   		"score" : maxscore
			};
			matches["match"].push(match);
		};
		submatches.forEach(matchfunction.bind(null,bookindex, maxscore, bookvalue.length));
		updater.emit('syncprogressupdate',Math.floor((bookindex*100)/book.length));
	});
	callback(matches); // Return the array with matches	
}