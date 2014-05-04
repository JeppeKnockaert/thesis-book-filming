/**
 * This postprocessor looks for the best scene adhering to a paragraph based on voting
 */

/**
 * Postprocesses the given text by keeping only the best matching scene for a paragraph
 * @param matches current array with matches
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.postprocess = function(matches, callback){
	var persubtitle = {};
	var toremove = new Array();
	// Add matches to a map with the subtitle indexes as keys
	matches["match"].forEach(function (match,index){
		if(typeof persubtitle[match.subtitleindex] === "undefined"){
			persubtitle[match.subtitleindex] = new Array();
		}
		persubtitle[match.subtitleindex].push(index);
	});
	// Check which subtitles have more than one match
	Object.keys(persubtitle).forEach(function (subindex){
		if (persubtitle[subindex].length > 1){
			var maxscore = 0;
			// If there is more than one match, remove the ones that are worse than the best match
			persubtitle[subindex].forEach(function (matchindex){
				if (matches["match"][matchindex].score > maxscore){
					maxscore = matches["match"][matchindex].score;
				}
			});
			// Keep an array with the elements that need to be removed
			// (because we need to remove them in the right order)
			persubtitle[subindex].forEach(function (matchindex){
				if (matches["match"][matchindex].score < maxscore){
					toremove.push(matchindex);
				}
			});
		}
	});
	// The indexes need to be sorted from big to small, because the array will be shifted
	// If not removing in the right order, the indexes of the elements to remove will have shifted
	toremove.sort(function(a,b){return b-a}); 
	toremove.forEach(function(toremoveindex){
		matches["match"].splice(toremoveindex,1);
	});
	// console.log("def");
	// matches["match"].forEach(function (match,index){
	// 	if (match.quoteindex == 663 && match.subtitleindex == 257){
	// 		console.log(match);
	// 	}
	// });
	
	callback(matches);
}