/**
 * Synchronizes a given book and subtitle using sentence level semantic analysis
 */

var delta = 0.8; // Minimum similarity to pass
var reldict; // Dictionairy with the related words for each word and wordtype in the text

/**
 * Synchronizes a parsed epub and srt from simpleparser using sentence level semantic analysis
 * @param book the parsed epub file
 * @param subtitle the parsed srt file
 * @param postprocessor an instance of the postprocessor
 * @param updater the eventemitter to keep track of the progressupdates
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.synchronize = function(book,subtitle,postprocessor,updater,callback){
	var bookArray = book[0];
	var bookRoles = book[1];
	var bookPos = book[2];
	var subArray = subtitle[0];
	var subRoles = subtitle[1];
	var subPos = subtitle[2];
	reldict = book[3]; // should be the same as subtitle[3]
	var matches = {"match" : new Array()};
	var done = new Array();
	var totaldone = 0;
	var subMatches = new Array();

 	subArray.forEach(function (subvalue, subindex){
 		var sentence1 = subRoles[subindex];
 		subMatches[subindex] = new Array(); // Initialize submatches array for this subtitle
 		done[subindex] = 0;
 		var evaluate = function(index){ // Function that is executed after each comparison of two sentences
 			done[index]++; 
 			if (done[index] === bookArray.length){ // Check if every quote has been compared to the subtitle
 				if (subMatches[index].length > 0){
 					matches["match"].push(chooseBestMatch(subMatches[index],bookRoles,subRoles));
 				}
 				totaldone++;
 				if (totaldone === subArray.length){ // If completely finished, return the matches
 					callback(matches); // Return the array with matches	
 				}
 			}
 		}
 		bookArray.forEach(function (bookvalue, bookindex){
 			var checkMatch = function (similarity){
	 			if (similarity >= delta){ // Match is found
					var match = { 
						"fromTime" : subvalue.fromTime,
						"subtitleindex" : subindex,
						"quoteindex" : bookindex,
						"subtitle" : subvalue.text,
				   		"quote" : bookvalue,
				   		"score" : similarity
					};
					subMatches[subindex].push(match);
				}
				evaluate(subindex);
				var progress = subindex*bookArray.length+bookindex;
				var size = bookArray.length*subArray.length;
				updater.emit('syncprogressupdate',Math.floor((progress*100)/size));
	 		}
	 		var sentence2 = bookRoles[bookindex];
	 		if (sentence1["predicates"] !== null && sentence2["predicates"] !== null){
 				calculateSentenceSimilarity(sentence1["predicates"],subPos[subindex],sentence2["predicates"]
 					,bookPos[bookindex],checkMatch);
	 		}
	 		else{
	 			if (sentence1["tokens"].length <= sentence2["tokens"].length){
	 				calculateRoleSimilarity(sentence1["tokens"],sentence2["tokens"],
	 					subPos[subindex],bookPos[bookindex],checkMatch);
	 			}
	 			else{
	 				calculateRoleSimilarity(sentence2["tokens"],sentence1["tokens"],
	 					bookPos[bookindex],subPos[subindex],checkMatch);
	 			}
	 		}
	 	});
	 	
	});
}

/**
 * Choose best match in a list with possible matches
 * @param subMatches list with possible matches
 * @param bookRoles object with tokens per sentence for the book
 * @param subRoles object with tokens per sentence for the subtitles
 * @return the best match
 */
chooseBestMatch = function(subMatches,bookRoles,subRoles){
	if (subMatches.length > 1){ // Check if we need to reduce the number of matches
		var maxsimilarity = 0;
		var found = false;
		subMatches.forEach(function (matchvalue,matchindex){ // Calculate the maximum similarity
			if (matchvalue.score > 0){
				maxsimilarity = matchvalue.score;
			}
			if (matchvalue.quote === matchvalue.subtitle){ // Check for perfect match
				return matchvalue;
				found = true;
			}
		});
		if (!found){ // Check if perfect match has been found
			var maxMatches = new Array();
			subMatches.forEach(function (matchvalue,matchindex){ // Keep only those with the maximum similarity
				if (matchvalue.score === maxsimilarity){
					maxMatches.push(matchvalue);
				}
			});
			if (maxMatches.length > 1){ // Check if we need to reduce the number of matches
				var mostequal = 0;
				var mostequalindex = 0;
				maxMatches.forEach(function (matchvalue,matchindex){
					var bookwords = bookRoles[matchvalue.quoteindex]["tokens"];
					var subwords = subRoles[matchvalue.subtitleindex]["tokens"];
					var longest = (bookwords.length > subwords.length)?bookwords:subwords;
					var shortest = (bookwords.length > subwords.length)?subwords:bookwords;
					var equalwords = 0;
					shortest.forEach(function (word,index){
						if (word.match(/.*[a-zA-Z].*/) !== null && longest.indexOf(word) !== -1){ // Equal words
							equalwords++;
						}
					});
					if (equalwords > mostequal){ // Check for the match with the biggest number of equal words
						mostequal = equalwords;
						mostequalindex = matchindex;
					}
				});
				return maxMatches[mostequalindex];
			}
			else{
				return maxMatches[0];
			}
		}
	}
	else{
		return subMatches[0];
	}
}

/**
 * Calculates the similarity between two sentences
 * @param sentence1 first sentence with SRL tagging
 * @param pos1 first sentence with POS tagging
 * @param sentence2 second sentence with SRL tagging
 * @param pos2 second sentence with POS tagging
 * @param callback function called with the resulting similarity as parameter
 */
calculateSentenceSimilarity = function(sentence1,pos1,sentence2,pos2,callback){
	var maxsim = -1;
	var nrdone = 0;
	Object.keys(sentence1).forEach(function(verb1){
		var frame1 = sentence1[verb1];
    	Object.keys(sentence2).forEach(function(verb2){
    		var frame2 = sentence2[verb2];
    		calculateFrameSimilarity(frame1,pos1,frame2,pos2,function(fsim){
				if (fsim > maxsim){
					maxsim = fsim;
				}
				nrdone++;
				// Every frame similarity has been calculated
				if (nrdone == Object.keys(sentence1).length*Object.keys(sentence2).length){ 
					callback(maxsim);
				}
			});
    	});
	});
}

/**
 * Calculates the similarity between two frames
 * @param frame1 first frame with SRL tagging
 * @param pos1 first frame with POS tagging
 * @param frame2 second frame with SRL tagging
 * @param pos2 second frame with POS tagging
 * @param callback function called with the resulting similarity as parameter
 */
calculateFrameSimilarity = function(frame1,pos1,frame2,pos2,callback){
	var commonroles = new Array();
	Object.keys(frame1).forEach(function(argLabel){
		// Check if the role exists in the other frame
		var commonrole = (Object.keys(frame2).indexOf(argLabel) !== -1); 
		if (commonrole){ // Role exists
			commonroles.push(argLabel);
		}
	});
	var fsim = 0;
	var nrdone = 0; // How many roles are processed so far?
	commonroles.forEach(function(role){
		var rsimready = function(rsim){
			fsim += rsim;
			nrdone++;
			if (nrdone === commonroles.length){ // We are done
				// Check which frame has the most roles
				var length1 = Object.keys(frame1).length;
				var length2 = Object.keys(frame2).length;
				var biggestnrofroles = (length1 >= length2)?length1:length2;
				callback(fsim/biggestnrofroles); // Return the frame similarity
			}
		}
		if (frame1[role].length <= frame2[role].length){
			calculateRoleSimilarity(frame1[role],frame2[role],pos1,pos2,rsimready);
		}
		else{
			calculateRoleSimilarity(frame2[role],frame1[role],pos2,pos1,rsimready);
		}
	});
}

/**
 * Calculates the similarity between two termsets
 * @param termsetm the smallest of the two termsets
 * @param termsetn the biggest of the two termsets
 * @param possetm the POS tagging for the smallest of the two termsets
 * @param possetn the POS tagging for the biggest of the two termsets
 * @param callback function called with the resulting similarity as parameter
 */
calculateRoleSimilarity = function(termsetm,termsetn,possetm,possetn,callback){
	var rsim = 0;
	var nrdone = 0; // How many terms are processed so far?
	var ignoredterms = 0; // How many terms were ignored (because they are not words)?
	var checkForCallback = function(){
		nrdone++;
		if (nrdone === termsetm.length){ // We are done
			callback(rsim/termsetn.length); // Return the role similarity
		}
	}
	termsetm.forEach(function(term){
		if (term.match(/.*[a-zA-Z].*/) !== null){
			var posTerm = possetm[term];
			var type = 'n'; // Noun
			if (posTerm.indexOf('VB') !== -1){
				type = 'v'; // Verb
			}
			else if (posTerm.indexOf('JJ') !== -1){
				type = 'a'; // Adjective
			}
			else if (posTerm.indexOf('RB') !== -1){
				type = 'r'; // Adverb
			}
			if (termsetn.indexOf(term) !== -1){ // The term itself is included in the other termset
				rsim++;
				checkForCallback();
			}
			else{
				// Fetch the terms related to the current term
				var relatedwords = reldict[term.toLowerCase()];
				if (typeof relatedwords !== "undefined" && relatedwords !== null){
					relatedwords = relatedwords[type];
				}
				if (typeof relatedwords !== "undefined" && relatedwords !== null){ 
					var i = 0;
					var found = false;
					while (!found && i < relatedwords.length){
						// A related term is included in the other termset
						if (termsetn.indexOf(relatedwords[i]) !== -1){ 
							found = true;
							rsim++;
						}
						i++;
					}
				}
				checkForCallback();
			}
		}
		else{
			ignoredterms++;
			nrdone++;
		}
	});
}