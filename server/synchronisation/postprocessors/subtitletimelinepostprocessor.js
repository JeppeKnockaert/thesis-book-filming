/**
 * This postprocessor tries to find a logical timeline in the subtitles, 
 * removing "lonely" subtitles (in the sequence 200-5000-254, 5000 is the lonely subtitle)
 */

var allowedgappercentage = 0.06;  //600

/**
 * Postprocesses the given text by keeping only subtitles that fit the general timeline
 * @param matches current array with matches
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.postprocess = function(matches, callback){
	var subtitlesperquote = {};
	var toremove = new Array();
	var lastsub = 0;

	// Sort the subtitles by quote
	matches["match"].forEach(function (match,index){
		if(typeof subtitlesperquote[match.quoteindex] === "undefined"){
			subtitlesperquote[match.quoteindex] = new Array();
		}
		subtitlesperquote[match.quoteindex].push({"subtitleindex":match.subtitleindex,"matchindex":index});
		if (match.subtitleindex > lastsub){
			lastsub = match.subtitleindex;
		}
	});
	// Calculate the allowed gap between two subtitles using the allowed percentual gap and the biggest quote index
	var allowedgap = allowedgappercentage*lastsub;	

	// Make sure the gap between quote indexes never gets bigger than "allowedgap"
	var previousindex = -1;
	var quotes = Object.keys(subtitlesperquote);
	quotes.sort((function(a,b){return a-b})); // Sort the quotes from small to big
	quotes.forEach(function(quoteindex){
		var sortedsubtitles = subtitlesperquote[quoteindex]; // Sort the subtitles for the quote from small to big
		sortedsubtitles.sort(function(a,b){return a.subtitleindex-b.subtitleindex}); 

		sortedsubtitles.forEach(function(quote){
			var subtitleindex = parseInt(quote.subtitleindex);
			if (previousindex !== -1 && (subtitleindex < (previousindex-allowedgap) || subtitleindex > (previousindex+allowedgap))){
				toremove.push(quote.matchindex);
			}
			else{
				previousindex = subtitleindex;
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

	// console.log("time");
	// matches["match"].forEach(function (match,index){
	// 	if (match.subtitleindex == 663||match.subtitleindex == 257){
	// 		console.log(match);
	// 	}
	// });
	callback(matches);
}