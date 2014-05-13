/**
 * This postprocessor tries to find a logical timeline in the quotes, 
 * removing "lonely" quotes (in the sequence 200-5000-254, 5000 is the lonely quote)
 */

// Allowed percentual gap between two quotes
var allowedgappercentage = 0.05;
// Number of nearby samples that are tested when a quote is out of range
var numberofsamples = 5;

/**
 * Postprocesses the given text by keeping only quotes that fit the general timeline
 * @param matches current array with matches
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.postprocess = function(matches, callback){
	var quotespersubtitle = {};
	var maxquote = 0;

	// Sort the quotes by subtitle
	matches["match"].forEach(function (match,index){
		if(typeof quotespersubtitle[match.subtitleindex] === "undefined"){
			quotespersubtitle[match.subtitleindex] = new Array();
		}
		quotespersubtitle[match.subtitleindex].push({"quoteindex":match.quoteindex,"matchindex":index});
		if (match.quoteindex > maxquote){
			maxquote = match.quoteindex;
		}
	});
	// Sort the quotes for each subtitle
	var sortedquotespersubtitle = {};
	Object.keys(quotespersubtitle).forEach(function(subindex){
		var sortedquotes = quotespersubtitle[subindex]; // Sort the quotes for the subtitle from small to big
		sortedquotes.sort(function(a,b){return a.quoteindex-b.quoteindex}); 
		sortedquotespersubtitle[subindex] = sortedquotes;
	});

	var toremove = new Array();

	// Calculate the allowed gap between two quotes using the allowed percentual gap and the biggest quote index
	var allowedquotegap= allowedgappercentage*maxquote;	

	// Make sure the gap between quote indexes never gets bigger than "allowedquotegap"
	var previousindex = -1;
	var subtitles = Object.keys(quotespersubtitle);
	subtitles.sort((function(a,b){return a-b})); // Sort the subtitles from small to big
	subtitles.forEach(function(subindex,arrayindex){		
		sortedquotespersubtitle[subindex].forEach(function(quote,sortedquotesarrayindex){
			var quoteindex = parseInt(quote.quoteindex);
			// If the quote is out of its timeline, investigate it further
			if (previousindex !== -1 && (quoteindex < (previousindex-allowedquotegap) || quoteindex > (previousindex+allowedquotegap))){
				// If it is within twice the range, it could still be allowed if there are enough samples nearby to support it
				if (quoteindex < (previousindex-2*allowedquotegap) || quoteindex > (previousindex+2*allowedquotegap)){
					var samples = new Array();
					var i = 1;
					// First look for extra samples associated with the current subtitle
					while (samples.length < numberofsamples && sortedquotesarrayindex+i < sortedquotespersubtitle.length){
						samples.push(parseInt(sortedquotespersubtitle[subindex][sortedquotesarrayindex+i].quoteindex));
						i++;
					}
					var j = 1;
					// If more samples are required, look into subsequent subtitles
					while (samples.length < numberofsamples && arrayindex+j < subtitles.length){
						var nextsubindex = subtitles[arrayindex+j];
						var nextsortedquotes = sortedquotespersubtitle[nextsubindex];
						var k = 0;
						while (samples.length < numberofsamples && k < nextsortedquotes.length){
							samples.push(parseInt(nextsortedquotes[k].quoteindex));
							k++;
						}
						j++;
					}
					
					// if enough samples are gathered, check how much of them support the current quote versus the previous quote
					var quotesupport = samples.length;
					var previousindexsupport = samples.length;
					samples.forEach(function (sample){
						if (quoteindex < (sample-allowedquotegap/2) || quoteindex > (sample+allowedquotegap/2)){
							quotesupport--;
						}
						if (previousindex < (sample-allowedquotegap/2) || previousindex > (sample+allowedquotegap/2)){
							previousindexsupport--;
						}
					});
					// If less or equal support for the current quote, remove it from the results
					if (quotesupport <= previousindexsupport){
						toremove.push(quote.matchindex);
					}
				}
				else{ // If a quote is too far out of the timeline, remove it without further investigation
					toremove.push(quote.matchindex);
				}
			}
			else{
				previousindex = quoteindex;
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