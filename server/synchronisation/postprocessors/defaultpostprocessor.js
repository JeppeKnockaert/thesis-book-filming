/**
 * This postprocessor looks for the best scene adhering to a paragraph based on voting
 */

/**
 * Postprocesses the given text by keeping only the best matching scene for a paragraph
 * @param matches current array with matches
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.postprocess = function(matches, callback){
	var result = {};

	Object.keys(matches).forEach(function (matchindex){
		console.log(matchindex+": ");
		console.log(matches[matchindex]);
		
		matches[matchindex].forEach(function (match){
			if (typeof result[match.sceneindex] === "undefined"){
				result[match.sceneindex] = new Array();
			}
			result[match.sceneindex].push(parseInt(matchindex));
		});
	});
	Object.keys(result).forEach(function (sceneindex){
		console.log(sceneindex+": ");
		console.log(result[sceneindex]);
	});
}