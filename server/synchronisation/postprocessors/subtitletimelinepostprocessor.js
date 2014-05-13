/**
 * This postprocessor tries to find a logical timeline in the subtitles, 
 * removing "lonely" subtitles (in the sequence 200-5000-254, 5000 is the lonely quote)
 */

// Allowed percentual gap between two subtitles
var allowedgappercentage = 0.05;
// Number of nearby samples that are tested when a quote is out of range
var numberofsamples = 5;

/**
 * Postprocesses the given text by keeping only subtitles that fit the general timeline
 * @param matches current array with matches
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.postprocess = function(matches, callback){
	var subtitlesperquote = {};
	var maxsub = 0;

	// Sort the subtitles by quote
	matches["match"].forEach(function (match,index){
		if(typeof subtitlesperquote[match.quoteindex] === "undefined"){
			subtitlesperquote[match.quoteindex] = new Array();
		}
		subtitlesperquote[match.quoteindex].push({"subindex":match.subtitleindex,"matchindex":index});
		if (match.subtitleindex > maxsub){
			maxsub = match.subtitleindex;
		}
	});
	// Sort the quotes for each subtitle
	var sortedsubtitlesperquote = {};
	Object.keys(subtitlesperquote).forEach(function(quoteindex){
		var sortedsubs = subtitlesperquote[quoteindex]; // Sort the subtitles for the quote from small to big
		sortedsubs.sort(function(a,b){return a.subindex-b.subindex}); 
		sortedsubtitlesperquote[quoteindex] = sortedsubs;
	});

	var toremove = new Array();

	// Calculate the allowed gap between two quotes using the allowed percentual gap and the biggest quote index
	var allowedsubgap= allowedgappercentage*maxsub;	

	// Make sure the gap between quote indexes never gets bigger than "allowedsubgap"
	var previousindex = -1;
	var quotes = Object.keys(subtitlesperquote);
	quotes.sort((function(a,b){return a-b})); // Sort the quotes from small to big
	quotes.forEach(function(quoteindex,arrayindex){		
		sortedsubtitlesperquote[quoteindex].forEach(function(subtitle,sortedsubtitlesarrayindex){
			var subindex = parseInt(subtitle.subindex);
			// If the subtitle is out of its timeline, investigate it further
			if (previousindex !== -1 && (subindex < (previousindex-allowedsubgap) || subindex > (previousindex+allowedsubgap))){

				// If it is within twice the range, it could still be allowed if there are enough samples nearby to support it
				if (subindex < (previousindex-2*allowedsubgap) || subindex > (previousindex+2*allowedsubgap)){
					var samples = new Array();
					var i = 1;
					// First look for extra samples associated with the current subtitle
					while (samples.length < numberofsamples && sortedsubtitlesarrayindex+i < sortedsubtitlesperquote.length){
						samples.push(parseInt(sortedsubtitlesperquote[quoteindex][sortedsubtitlesarrayindex+i].subindex));
						i++;
					}
					var j = 1;
					// If more samples are required, look into subsequent quotes
					while (samples.length < numberofsamples && arrayindex+j < quotes.length){
						var nextquoteindex = quotes[arrayindex+j];
						var nextsortedsubs = sortedsubtitlesperquote[nextquoteindex];
						var k = 0;
						while (samples.length < numberofsamples && k < nextsortedsubs.length){
							samples.push(parseInt(nextsortedsubs[k].subindex));
							k++;
						}
						j++;
					}
					
					// if enough samples are gathered, check how much of them support the current subtitle versus the previous subtitle
					var subsupport = samples.length;
					var previousindexsupport = samples.length;
					samples.forEach(function (sample){
						if (subindex < (sample-allowedsubgap/2) || subindex > (sample+allowedsubgap/2)){
							subsupport--;
						}
						if (previousindex < (sample-allowedsubgap/2) || previousindex > (sample+allowedsubgap/2)){
							previousindexsupport--;
						}
					});
					// If less or equal support for the current subtitle, remove it from the results
					if (subsupport <= previousindexsupport){
						toremove.push(subtitle.matchindex);
					}
				}
				else{ // If a subtitle is too far out of the timeline, remove it without further investigation
					toremove.push(subtitle.matchindex);
				}
			}
			else{
				previousindex = subindex;
			}
		});
	});

	// The indexes need to be sorted from big to small, because the array will be shifted
	// If not removing in the right order, the indexes of the elements to remove will have shifted
	toremove.sort(function(a,b){return b-a}); 
	var ind = 0;
	toremove.forEach(function(toremoveindex){
		matches["match"].splice(toremoveindex,1);
		ind++;
		if (ind == toremove.length-1){
		}
	});

	callback(matches);
}