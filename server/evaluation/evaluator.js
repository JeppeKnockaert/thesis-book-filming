/**
 * Compares the result of a synchronisation to a ground truth file
 */

var libxmljs = require("libxmljs"); // Load module for reading XML
var fs = require('fs'); // Load module for IO

/**
 * Reads the uploaded files and compares them to achieve evaluation of the results
 * @param resultsfile path to the file with the results of a synchronisation
 * @param groundtruthfile path to the fie with the groundtruth
 * @param updater the eventemitter to keep track of the results of the evaluation
 */
exports.evaluate = function(resultsfile,groundtruthfile,updater){	
	// Read files
	fs.readFile(resultsfile, 'utf8', function (err,resultsxml) {
		fs.readFile(groundtruthfile, 'utf8', function (err,groundtruthxml) {
			// Parse both xml files
			var resultsDoc = libxmljs.parseXmlString(resultsxml);
			var groundtruthDoc = libxmljs.parseXmlString(groundtruthxml);
			
			// Get matches from both files
			var resultChildren = resultsDoc.find('//match');
			var groundtruthChildren = groundtruthDoc.find('//match');
			
			var falsenegatives = groundtruthChildren.length; // Maximum number of false negatives
			var truepositives = 0; // Minimum number of true positives
			var falsepositives = -1; // Initiate false positives
			groundtruthChildren.forEach(function (groundchild, groundindex){ // Go trough all ground truth matches
				var groundsubindex = groundchild.find('subtitleindex')[0].text(); // subtitle index from ground truth element
				var groundquoteindex = groundchild.find('quoteindex')[0].text(); // quote index from ground truth element
				var i = 0;
				var found = false;
				while (i < resultChildren.length && !found){ // Look at all results till the same indices are found (if there is one)
					var resultsubindex = resultChildren[i].find('subtitleindex')[0].text();
					var resultquoteindex = resultChildren[i].find('quoteindex')[0].text();
					if (groundsubindex === resultsubindex && groundquoteindex === resultquoteindex){ // Look for the same indices
						falsenegatives--; // One less false negative
						truepositives++; // Add a new true match
						found = true;
						console.log(groundsubindex+" en "+groundquoteindex);
					}
					i++;
				}
			});
			falsepositives = resultChildren.length - truepositives; // Every match found, minus the real matches = false matches
			updater.emit("result","<p>True positives: "+truepositives+"</p><p>False positives: "+falsepositives+"</p><p>False negatives: "+falsenegatives+"</p><p>Precision: "+(truepositives/(truepositives+falsepositives))+"</p><p>Recall: "+(truepositives/(truepositives+falsenegatives))+"</p>");
		});
	});


}