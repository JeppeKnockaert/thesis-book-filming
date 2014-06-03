/**
 * Formats the results in an HTML page with fragments along the quotes
 */

 /**
 * Creates a webpage with results
 * @param matches the result from the synchronization phase
 * @param filenameprefix choose the first part of the filename
 * @param film the URL to the film
 * @param updater the eventemitter to keep track of the progressupdates
 * @param callback function to be called when ready, has the resulting filepath as parameter
 */
exports.format = function(matches, filenameprefix, film, updater, callback){
	updater.emit('message',"Formatting results...");
	callback("results.html");

	matches["match"].sort(function(a,b){return a.subtitleindex-b.subtitleindex});
	matches["match"].forEach(function(match) {
		var hours = parseInt(match.fromTime.substr(0,2));
		var minutes = parseInt(match.fromTime.substr(3,2));
		var seconds = parseInt(match.fromTime.substr(6,2));
		var startinseconds = hours*60*60+minutes*60+seconds;

		var completeurl = (film.indexOf("?") !== -1)?film+"&":film+"?";
		completeurl += 't='+startinseconds+','+(startinseconds+10);
	  	updater.emit('websitecontent',
			'<tr>'+
				'<td class="quote">'+match.quote+'</td>'+
				'<td class="fragment">'+
					'<video width="512" height="280" controls="controls">'+
			  			'<source src="'+completeurl+'"  type="video/mp4">'+
						'Your browser does not support the video tag.'+
					'</video>'+
				'</td>'+
			'</tr>');	
	});
	updater.emit('websitecontent',"EOF");

	
}