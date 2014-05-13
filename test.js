var libxmljs = require("libxmljs"); // Load module for reading XML
var fs = require('fs'); // Load module for IO

var type = "s";

var filename;
var name;
//var movie = "Hunger Games";
var movie = "Game of Thrones";

if (type == "q"){
	filename = "Quotes";
	name = "quote";
}
else{
	filename = "Subtitles";
	name = "subtitle";
}

fs.readFile(__dirname + "/files/"+movie+" - "+filename+".xml", 'utf8', function (err,resultsxml) {
	fs.readFile(__dirname  + "/files/"+movie+" - Groundtruth.xml", 'utf8', function (err,groundtruthxml) {
		// Parse both xml files
		var resultsDoc = libxmljs.parseXmlString(resultsxml);
		var groundtruthDoc = libxmljs.parseXmlString(groundtruthxml);
		
		// Get matches from both files
		var resultChildren = resultsDoc.find('//'+name);
		
		var multi = false;
		var checkChildren = function(groundtruthChildren){
			groundtruthChildren.forEach(function (groundchild, groundindex){ // Go trough all ground truth matches
				var groundquoteindexes = groundchild.find(name+'index');
				if (groundquoteindexes.length == 0){
					groundquoteindexes = groundchild.find(name+'//indexes//'+name+'index');
				}
				groundquoteindexes.forEach(function(groundquoteindex){
					groundquoteindex = groundquoteindex.text(); // quote index from ground truth element
					var i = 0;
					var found = false;
					while (i < resultChildren.length && !found){ // Look at all results till the same indices are found (if there is one)
						var resultquoteindex = resultChildren[i].find(name+'index')[0].text();
						if (groundquoteindex === resultquoteindex){ // Look for the same indices
							var ground;
							if (multi){
								ground = groundchild.find(name+'//text')[0].text().replace(/[^a-zA-Z]/g,"");
							}
							else{
								ground = groundchild.find(name)[0].text().replace(/[^a-zA-Z]/g,"");
							}
							var result = resultChildren[i].find(name+'text')[0].text().replace(/[^a-zA-Z]/g,"");

							if (ground !== result){
								console.log(groundquoteindex+": "+result+" en "+ground);
							}
							found = true;
						}
						i++;
					}
				});
			});
		};
		checkChildren(groundtruthDoc.find('//match'));
		multi = true;
		checkChildren(groundtruthDoc.find('//multimatch'));
	});
});
