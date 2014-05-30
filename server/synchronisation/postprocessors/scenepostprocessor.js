/**
 * This postprocessor looks for the best scene adhering to a quote based on voting
 */

var allowedgap = 100;

/**
 * Postprocesses the given text by keeping only the best matching scene for a quote
 * @param matches current array with matches
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.postprocess = function(matches, callback){
	var perscene = {};
	var toremove = new Array();

	// Count the score for each quote in a scene and save these in a map with the scenes as keys
	matches["match"].forEach(function (match,index){
		if(typeof perscene[match.sceneindex] === "undefined"){
			perscene[match.sceneindex] = {};
		}
		if(typeof perscene[match.sceneindex][match.quoteindex] === "undefined"){
			perscene[match.sceneindex][match.quoteindex] = {"index":index, "score":0}
		}
		perscene[match.sceneindex][match.quoteindex].score += match.score;
	});
 
	// Keep the optimal paragraphs from the last scene 
	var previousstart = -1; // First of the set of optimal paragraphs
	var previousend = -1; // Last of the set of optimal paragraphs
	var previousscore = -1; // Total score of the set of optimal paragraphs

	var scenes = Object.keys(perscene);
	scenes.sort((function(a,b){return a-b})); // Sort the scenes from small to big)

	// Aggregate quotes based on their closeness to each other
	scenes.forEach(function(sceneindex){
		var aggregatedscene = {};
		var sortedquotes = Object.keys(perscene[sceneindex]); // Keep quotes from small to big
		sortedquotes.sort(function(a,b){return a-b}); 

		var oldquote = -1;
		var aggregateindex = -1;
		// Keep the values of the optimal set of paragraphs
		var maxscore = -1;
		var maxstart = -1;
		var maxend = -1;

		sortedquotes.forEach(function (quote){
			var newquote = parseInt(quote);
			// If this is the first quote or the gap with the previous one is too big
			// Start a new aggregate quote
			if (oldquote === -1 || (newquote > (oldquote+allowedgap))){
				aggregateindex = newquote;
			}
			if(typeof aggregatedscene[aggregateindex] === "undefined"){
				// Check if the optimal paragraphs for the previous scene are within range
				if (previousstart >= 0 &&
					(aggregateindex >= (previousstart-allowedgap)) && 
					(aggregateindex <= (previousend+allowedgap))){
						// If so, start with the score of those paragraphs (instead of starting at zero)
						aggregatedscene[aggregateindex] = previousscore;
				}
				else{
					aggregatedscene[aggregateindex] = 0;
				}
			}
			// Add the score from the current quote to the aggregate quote
			aggregatedscene[aggregateindex] += perscene[sceneindex][newquote].score;
			if (perscene[sceneindex][newquote].score == 1){ // Count perfect matches double
				aggregatedscene[aggregateindex] += perscene[sceneindex][newquote].score;
			}
			if (aggregatedscene[aggregateindex] >= maxscore){
				maxscore = aggregatedscene[aggregateindex];
				maxstart = aggregateindex;
				maxend = (oldquote >= 0)?oldquote:aggregateindex;
			}
			oldquote = newquote;
		});	

		var quoteindex = -1;
		sortedquotes.forEach(function (newquote){
			// Check if the quote is an aggregated quote
			if (quoteindex === -1 || typeof aggregatedscene[newquote] !== "undefined"){
				quoteindex = newquote;
			}
			// Remove the quote if the aggregated quote has scored less than te maximum
			if (aggregatedscene[quoteindex] < maxscore){
				toremove.push(perscene[sceneindex][newquote].index);
			}
		});
		// Set the current optimal set of paragraphs as "previous"		
		previousstart = maxstart;
		previousend = maxend;
		previousscore = maxscore;			
	});

	// The indexes need to be sorted from big to small, because the array will be shifted
	// If not removing in the right order, the indexes of the elements to remove will have shifted
	toremove.sort(function(a,b){return b-a}); 
	var ind = 0;
	toremove.forEach(function(toremoveindex){
		matches["match"].splice(toremoveindex,1);
		ind++;
	});

	callback(matches);
}