/**
 * This postprocessor tries to find a logical timeline in the quotes, 
 * removing "lonely" quotes (in the sequence 200-5000-254, 5000 is the lonely quote)
 */

var allowedgappercentage = 0.05;  //600

/**
 * Postprocesses the given text by keeping only quotes that fit the general timeline
 * @param matches current array with matches
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.postprocess = function(matches, callback){
	var quotespersubtitle = {};
	var maxquote = 0;

	// Sort the quotes by subtitle and the subtitles by quote
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

	console.log(sortedquotespersubtitle);
//while (toremovepercentage > 0){
	var toremove = new Array();

	// Calculate the allowed gap between two quotes using the allowed percentual gap and the biggest quote index
	var allowedquotegap= allowedgappercentage*maxquote;	

	// Make sure the gap between quote indexes never gets bigger than "allowedquotegap"
	var previousindex = -1;
	var previoussub = -1;
	var subtitles = Object.keys(quotespersubtitle);
	subtitles.sort((function(a,b){return a-b})); // Sort the subtitles from small to big
	var maxsub = subtitles[subtitles.length-1];
	subtitles.forEach(function(subindex,arrayindex){		
		sortedquotespersubtitle[subindex].forEach(function(quote,sortedquotesarrayindex){
			var quoteindex = parseInt(quote.quoteindex);
			//var totalgap = (allowedgappercentage+(Math.abs(subindex-previoussub)/maxsub))*maxquote;
			if (previousindex !== -1 && (quoteindex < (previousindex-allowedquotegap) || quoteindex > (previousindex+allowedquotegap))){
				// indien eventueel, kijk paar stappen vooruit
				if (quoteindex < (previousindex-2*allowedquotegap) || quoteindex > (previousindex+2*allowedquotegap)){
					var numberofsamples = 10;
					var samples = new Array();
					var i = 1;
					while (samples.length < numberofsamples && sortedquotesarrayindex+i < sortedquotespersubtitle.length){
						samples.push(parseInt(sortedquotespersubtitle[subindex][sortedquotesarrayindex+i].quoteindex));
						i++;
					}
					var j = 1;
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

					if (quotesupport > previousindexsupport){
						console.log("problem: "+quoteindex);
						console.log(samples);
						console.log("support: "+quotesupport+" -> "+(quotesupport/samples.length));
					}
					else{
						toremove.push(quote.matchindex);
					}
					// while (numberofsamples < 10){
					// 	while ()
					// 	sortedquotespersubtitle[subindex]

					// }
					// for (var i = 0; i < 10; i++){
					// 	if 
					// }
				}
				else{		
					toremove.push(quote.matchindex);
				}
				//console.log(quoteindex+" doesn't fit ("+allowedquotegapbackward+" and "+allowedquotegapforward+")");
			}
			else{
				//console.log(subindex+": "+quoteindex+" produced");
				previousindex = quoteindex;
				previoussub = subindex;
			}
		});
	});
	toremovepercentage = (toremove.length/matches["match"].length)*100;
	console.log(allowedgappercentage+" will delete "+toremovepercentage+"% ("+toremove.length+"/"+matches["match"].length+")");
	if (toremovepercentage > 100){
		console.log(toremove);
	}
	allowedgappercentage+=0.01;
//}
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
	// 	if (match.quoteindex == 663||match.subtitleindex == 257){
	// 		console.log(match);
	// 	}
	// });
	callback(matches);
}