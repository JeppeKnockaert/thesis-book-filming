/**
 * Synchronizes a given book and subtitle using sentence level semantic analysis
 */

var thrift = require('thrift'); // Load thrift library (for Curator)
var Curator = require('./curator-nodejs/Curator'); // Load Curator for SRL facilities
var fs = require('fs'); // Module for reading files

/**
 * Synchronizes a parsed epub and srt from simpleparser using sentence level semantic analysis
 * @param book the parsed epub file
 * @param subtitle the parsed srt file
 * @param postprocessor an instance of the postprocessor
 * @param updater the eventemitter to keep track of the progressupdates
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.synchronize = function(book,subtitle,postprocessor,updater,callback){
	
}

parseSemanticRoles = function(book,subtitle,postprocessor,callback){
	// Select the right protocol method and transport method (defined by Curator)
	var protocol = thrift.TBinaryProtocol;
	var transport =  thrift.TFramedTransport;

	// Setup connection to the Curator instance
	var config = fs.readFileSync(__dirname + '/../../config.json'); // Read config file
	var connection = thrift.createConnection(config.curator.host, config.curator.port, {
		transport: transport,
		protocol: protocol
	});

	// Create curator client connection
	var client = thrift.createClient(Curator, connection);

	book.forEach(function (bookvalue, bookindex){
		client.provide("srl", bookvalue, false, function(err, response) {
			var trees = response.parseViews.srl.trees;
			trees.forEach(function(tree){
				var nodes = tree.nodes;
				var predicate = "";
				var children = new Array();
				var index = 1;
				nodes.forEach(function(node){
					console.log(node);
					if (node.label === 'Predicate'){
						index = 1;
						children = node.children;
						console.log("Predicate "+node.span.attributes.sense+": "+node.span.attributes.predicate);
					}
					else{
						var start = node.span.start;
						var end = node.span.ending;
						var word = sentence.substring(start,end);
						console.log("--- Argument "+children[index]+": "+word);
						index++;
					}
					
				});
			});
		});
	});
	// subtitle.forEach(function (subvalue, subindex){				
	// 	subWords[subindex] = lexer.lex(subvalue.text.toLowerCase());
	// 	subTags[subindex] = tagger.tag(subWords[subindex]);
	// });
}