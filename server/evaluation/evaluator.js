/**
 * Compares the result of a synchronisation to a ground truth file
 */

var libxmljs = require("libxmljs"); // Load module for reading XML
var fs = require('fs'); // Load module for IO
var debug = true;

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
			
			// Get matches from the results file and the groundtruth file
			var resultChildren = resultsDoc.find('//match');
			var normalmatches = groundtruthDoc.find('//match');
			var multimatches = groundtruthDoc.find('//multimatch');

			// Create a list of indexarrays for the multimatches (so it only has to be done once)
			var multimatchgroundsubindexes = {};
			var multimatchgroundquoteindexes = {};
			multimatches.forEach(function (groundchild, groundindex){
				var groundsubindexes = new Array();
				var groundquoteindexes = new Array();
				var indexes = groundchild.find('subtitle//indexes//subtitleindex');
				indexes.forEach(function (index){
					groundsubindexes.push(parseInt(index.text()));
				});
				indexes = groundchild.find('quote//indexes//quoteindex');
				indexes.forEach(function (index){
					groundquoteindexes.push(parseInt(index.text()));
				});
				multimatchgroundquoteindexes[groundindex] = groundquoteindexes;
				multimatchgroundsubindexes[groundindex] = groundsubindexes;
			});

			var falsenegatives = normalmatches.length+multimatches.length; // Maximum number of false negatives
			var truepositives = 0; // Minimum number of true positives
			var falsepositives = -1; // Initiate false positives
			var positives = resultChildren.length; // Number of positives

			var foundsinglegroundindexes = new Array();
			var foundmultigroundindexes = new Array();

			var multimatching = false;
			var checkChildren = function (groundtruthChildren){
				groundtruthChildren.forEach(function (groundchild, groundindex){ // Go trough all ground truth matches
					var groundsubindexes; // subtitle indexes from ground truth element
					var groundquoteindexes; // quote indexes from ground truth element
					if (!multimatching){
						groundsubindexes = [parseInt(groundchild.find('subtitleindex')[0].text())]; 
						groundquoteindexes = [parseInt(groundchild.find('quoteindex')[0].text())];
					}
					else{
						groundsubindexes = multimatchgroundsubindexes[groundindex];
						groundquoteindexes = multimatchgroundquoteindexes[groundindex];						
					}
					var i = 0;
					var found = false;
					while (i < resultChildren.length && !found){ // Look at all results till the same indices are found (if there is one)
						var resultsubindex = parseInt(resultChildren[i].find('subtitleindex')[0].text());
						var resultquoteindex = parseInt(resultChildren[i].find('quoteindex')[0].text());

						// For multimatches, 1 matching pair is enough to be considered a match
						if (groundsubindexes.indexOf(resultsubindex) !== -1 && groundquoteindexes.indexOf(resultquoteindex) !== -1){ // Look for the same indices
							if (multimatching){
								foundmultigroundindexes.push(groundindex);
							}
							else{
								foundsinglegroundindexes.push(groundindex);
							}
							resultChildren.splice(i,1); // Remove the matched item
							falsenegatives--; // One less false negative
							truepositives++; // Add a new true match
							found = true;
							console.log(resultsubindex+" en "+resultquoteindex);
						}
						i++;
					}
				});
			}

			if (debug){
				// Print the true positives
				console.log("Single matches");
				console.log("--------------");
				checkChildren(normalmatches);
				multimatching = true;
				console.log("");
				console.log("Multi matches");
				console.log("--------------");
				checkChildren(multimatches);

				// Print the false negatives
				foundsinglegroundindexes.sort(function(a,b){return b-a});
				foundmultigroundindexes.sort(function(a,b){return b-a}); 
				foundsinglegroundindexes.forEach(function(groundindex){
					normalmatches.splice(groundindex,1);
				});
				foundmultigroundindexes.forEach(function(groundindex){
					multimatches.splice(groundindex,1);
				});
				normalmatches.forEach(function(falsenegative){
					console.log(falsenegative.toString());
				});
				multimatches.forEach(function(falsenegative){
					console.log(falsenegative.toString());
				});
			}

			// Go over the remaining results and check if they are doubles of true positives (can be the case for multimatches)
			resultChildren.forEach(function (resultChild){
				var resultsubindex = parseInt(resultChild.find('subtitleindex')[0].text());
				var resultquoteindex = parseInt(resultChild.find('quoteindex')[0].text());
				var i = 0;
				var found = false;
				while (i < multimatches.length && !found){
					var groundquoteindexes = multimatchgroundquoteindexes[i];
					var groundsubindexes = multimatchgroundsubindexes[i];
					if (groundsubindexes.indexOf(resultsubindex) !== -1 && groundquoteindexes.indexOf(resultquoteindex) !== -1){ // Look for the same indices
						positives--; // these double matches count neither as true positives, nor as false positives
						found = true; 
					}
					i++;
				}
			});

			falsepositives = positives - truepositives;
			var precision = truepositives/(truepositives+falsepositives); 
			var recall = truepositives/(truepositives+falsenegatives);
			updater.emit("result","<p>True positives: "+truepositives+
				"</p><p>False positives: "+falsepositives+
				"</p><p>False negatives: "+falsenegatives+
				"</p><p>Precision: "+precision+
				"</p><p>Recall: "+recall+
				"</p><p>F<sub>1</sub>: "+(2*precision*recall)/(precision+recall)+
				"</p><p>F<sub>0.5</sub>: "+(1.25*precision*recall)/(0.25*precision+recall)+
				"</p><p>F<sub>2</sub>: "+(5*precision*recall)/(4*precision+recall)+"</p>");
		});
	});


}