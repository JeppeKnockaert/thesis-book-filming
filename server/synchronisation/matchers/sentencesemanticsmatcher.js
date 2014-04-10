/**
 * Synchronizes a given book and subtitle using sentence level semantic analysis
 */

/**
 * Synchronizes a parsed epub and srt from simpleparser using sentence level semantic analysis
 * @param book the parsed epub file
 * @param subtitle the parsed srt file
 * @param postprocessor an instance of the postprocessor
 * @param updater the eventemitter to keep track of the progressupdates
 * @param callback the callback that needs to be executed after this function is ready
 */
exports.synchronize = function(book,subtitle,postprocessor,updater,callback){
	var bookArray = book[0];
	var bookRoles = book[1];
	var bookPos = book[2];
	var subArray = subtitle[0];
	var subRoles = subtitle[1];
	var subPos = subtitle[2];

	calculateSentenceSimilarity(bookRoles[126],bookPos[126],subRoles[24],subPos[24],function(similarity){
		console.log("total similarity: "+similarity);
	});

	// bookArray.forEach(function (bookvalue, bookindex){
	// 	var frames = bookRoles[bookindex]; // Fetch the frames for the current sentence
	// });
	
}

/**
 * Calculates the similarity between two sentences
 * @param sentence1 first sentence with SRL tagging
 * @param pos1 first sentence with POS tagging
 * @param sentence2 second sentence with SRL tagging
 * @param pos2 second sentence with POS tagging
 * @param callback function called with the resulting similarity as parameter
 */
calculateSentenceSimilarity = function(sentence1,pos1,sentence2,pos2,callback){
	var maxsim = -1;
	var nrdone = 0;
	Object.keys(sentence1).forEach(function(verb1){
		var frame1 = sentence1[verb1];
    	Object.keys(sentence2).forEach(function(verb2){
    		var frame2 = sentence2[verb2];
    		calculateFrameSimilarity(frame1,pos1,frame2,pos2,function(fsim){
				if (fsim > maxsim){
					maxsim = fsim;
				}
				nrdone++;
				// Every frame similarity has been calculated
				if (nrdone == Object.keys(sentence1).length*Object.keys(sentence2).length){ 
					callback(maxsim);
				}
			});
    	});
	});
}

/**
 * Calculates the similarity between two frames
 * @param frame1 first frame with SRL tagging
 * @param pos1 first frame with POS tagging
 * @param frame2 second frame with SRL tagging
 * @param pos2 second frame with POS tagging
 * @param callback function called with the resulting similarity as parameter
 */
calculateFrameSimilarity = function(frame1,pos1,frame2,pos2,callback){
	var commonroles = new Array();
	Object.keys(frame1).forEach(function(argLabel){
		// Check if the role exists in the other frame
		var commonrole = (Object.keys(frame2).indexOf(argLabel) !== -1); 
		if (commonrole){ // Role exists
			commonroles.push(argLabel);
		}
	});
	var fsim = 0;
	var nrdone = 0; // How many roles are processed so far?
	commonroles.forEach(function(role){
		var rsimready = function(rsim){
			fsim += rsim;
			nrdone++;
			if (nrdone === commonroles.length){ // We are done
				// Check which frame has the most roles
				var length1 = Object.keys(frame1).length;
				var length2 = Object.keys(frame2).length;
				var biggestnrofroles = (length1 >= length2)?length1:length2;
				callback(fsim/biggestnrofroles); // Return the frame similarity
			}
		}
		if (frame1[role].length <= frame2[role].length){
			calculateRoleSimilarity(frame1[role],frame2[role],pos1,pos2,rsimready);
		}
		else{
			calculateRoleSimilarity(frame2[role],frame1[role],pos2,pos1,rsimready);
		}
	});
}

/**
 * Calculates the similarity between two termsets
 * @param termsetm the biggest of the two termsets
 * @param termsetn the smallest of the two termsets
 * @param possetm the POS tagging for the biggest of the two termsets
 * @param possetn the POS tagging for the smallest of the two termsets
 * @param callback function called with the resulting similarity as parameter
 */
calculateRoleSimilarity = function(termsetm,termsetn,possetm,possetn,callback){
	var rsim = 0;
	var nrdone = 0; // How many terms are processed so far?
	var checkForCallback = function(){
		nrdone++;
		if (nrdone === termsetm.length){ // We are done
			callback(rsim/termsetn.length); // Return the role similarity
		}
	}
	termsetm.forEach(function(term){
		var posTerm = possetm[term];
		var type = 'n'; // Noun
		if (posTerm.indexOf('VB') !== -1){
			type = 'v'; // Verb
		}
		else if (posTerm.indexOf('JJ') !== -1){
			type = 'a'; // Adjective
		}
		else if (posTerm.indexOf('RB') !== -1){
			type = 'r'; // Adverb
		}
		if (termsetn.indexOf(term) !== -1){ // The term itself is included in the other termset
			rsim++;
			checkForCallback();
		}
		else{
			// Fetch the terms related to the current term
			getRelatedWords(term,type,function(relatedwords){ 
				var i = 0;
				var found = false;
				while (!found && i < relatedwords.length){
					// A related term is included in the other termset
					if (relatedwords[i].indexOf(termsetn) !== -1){ 
						found = true;
						rsim++;
					}
					i++;
				}
				checkForCallback();
			});
		}
	});
}

/**
 * Given a word an its word type, return an array of related words (synonyms, hypernyms, hyponyms, meronyms, holonyms)
 * @param word the word for which the related words are needed
 * @param type the type of that word: 'n' for nouns, 'v' for verbs, 'a' for adjectives, and 'r' for adverbs
 * @param callback function to call when ready
 */
getRelatedWords = function(word,type,callback){
	var options = '-syns'+type+' '; // Request synonyms/hypernyms
	if (type === 'n'||type === 'v'){
		options += '-hypo'+type+' '; // Request hyponyms
	}
	if (type == 'n'){
		options += '-meron '; // Request meronyms
		options += '-holon '; // Request holonyms
	}
	
	var exec = require('child_process').exec;
	exec('wn "'+word+'" '+options, function (error, stdout, stderr) {
		if (stdout === ""){
			callback(new Array());
		}
		else{
			// Split the output in parts
			var synonymText;
			var hyponymText;
			if (type === 'n'||type === 'v'){
				synonymText = stdout.match(/.*\n[\s\S]*Hyponyms/i)[0];
				if (type === 'n'){
					hyponymText = stdout.match(/Hyponyms.*\n[\s\S]*Meronyms/i)[0];
				}
				else{
					// Hyponyms is the last one for verbs, no meronyms and holonyms
					hyponymText = stdout.match(/Hyponyms.*\n[\s\S]*/i)[0]; 
				}
			}
			else{
				// Synonyms and hypernyms are the only ones for adjectives and adverbs, others are not available
				synonymText = stdout.match(/.*\n[\s\S]*/i)[0]; 
			}
			var meronymText;
			var holonymText;
			if (type === 'n'){ // Meronyms and holonyms are only for nouns
				meronymText = stdout.match(/Meronyms.*\n[\s\S]*Holonyms/i)[0];
				holonymText = stdout.match(/Holonyms.*\n[\s\S]*/i)[0];
			}
			
			// Get the synonyms
			var synonymRegex = /Sense\ [0-9]+\ *\n([^\n]*)/gi;
			var synonyms = getWordArrayFromRegex(synonymRegex,synonymText);
			
			// Get the hypernyms
			var hypernymRegex = /=>([^\n]*)/g;
			var hypernyms = getWordArrayFromRegex(hypernymRegex,synonymText);

			// Get the hyponyms
			var hyponyms = new Array();
			if (type === 'n'||type === 'v'){
				var hyponymRegex = /=>([^\n]*)/g;
				hyponyms = getWordArrayFromRegex(hyponymRegex,hyponymText);
			}

			var meronyms = new Array();
			var holonyms = new Array();
			if (type === 'n'){
				// Get the meronyms
				var meronymRegex = /:([^\n]*)/g;
				meronyms = getWordArrayFromRegex(meronymRegex,meronymText);
				
				// Get the holonyms
				var holonymRegex = /:([^\n]*)/g;
				holonyms = getWordArrayFromRegex(holonymRegex,holonymText);
			}

			callback(synonyms.concat(hypernyms,hyponyms,meronyms,holonyms));
		}
	});
}

/**
 * Given a regex that searches for comma separated strings of words, return an array with the words
 * @param regex the regex to execute
 * @param text the text on which to execute the regex
 * @return an array with words (if there are any) 
 */
getWordArrayFromRegex = function(regex,text){
	var completestring = "";
	while (matches = regex.exec(text)) {
		// Clean spaces and brackets
		completestring+=matches[1].replace(/\ *,\ */g,',').replace(/\([^\)]*\)/,'').trim()+","; 
	}
	if (completestring !== ""){
		completestring = completestring.substring(0,completestring.length-1); // Remove last comma
		return completestring.split(',');
	}
	else{
		return new Array();
	}
}