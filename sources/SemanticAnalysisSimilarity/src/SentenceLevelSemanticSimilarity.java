

import edu.smu.tspell.wordnet.AdjectiveSynset;
import edu.smu.tspell.wordnet.NounSynset;
import edu.smu.tspell.wordnet.Synset;
import edu.smu.tspell.wordnet.SynsetType;
import edu.smu.tspell.wordnet.VerbSynset;
import edu.smu.tspell.wordnet.WordNetDatabase;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import se.lth.cs.srl.CompletePipeline;
import se.lth.cs.srl.corpus.Predicate;
import se.lth.cs.srl.corpus.Sentence;
import se.lth.cs.srl.corpus.Word;
import se.lth.cs.srl.corpus.Yield;

/**
 * Synchronizes a given book and subtitle using sentence level semantic analysis
 * @author jeknocka
 */
public class SentenceLevelSemanticSimilarity {
    private final float mindelta; // Minimum similarity to be considered a match
    private final int minnumberofmatchingwords; // The smallest number of words a match must consist of 
    private final float relsearchwindow; // Search window for exact matches with less words than minnumberofmatchingwords
    private final CompletePipeline srllib; // handle for the SRL library
    private final WordNetDatabase wn = WordNetDatabase.getFileInstance(); // The WordNet database
    
    // Data for calculating similarity values
    // Semantic role labelling
    private List<Map<String, Map<String, List<String>>>> bookSRL;
    private List<Map<String, Map<String, List<String>>>> subtitleSRL;
    // Part-of-speech tags and tokens
    private List<List<String>> bookTokens;
    private List<List<String>> bookPOS;
    private List<List<String>> subtitleTokens;
    private List<List<String>> subtitlePOS;
    // At least one predicate with the minimum number of words
    private List<Boolean> enoughBookWordsWithRoles;
    private List<Boolean> enoughSubtitleWordsWithRoles;
    // Word counts per predicate
    private List<Map<String, Integer>> bookWordCounts;
    private List<Map<String, Integer>> subtitleWordCounts;
    // Related words for each word
    private final Map<String, Map<Character, Set<String>>> relatedwords = new HashMap<String, Map<Character, Set<String>>>();
    private final Map<String, Map<Character, Set<String>>> derivatewordsMap = new HashMap<String, Map<Character, Set<String>>>();
    
    /**
     * Initialize the matcher with the given parameter values
     * @param srllib handle for the SRL library
     * @param mindelta Minimum similarity that is needed to be considered a match
     * @param minnumberofmatchingwords Minimum number of matching words to be a match
     * @param relsearchwindow Size of the search window that is used when there are not enough common words
     */
    public SentenceLevelSemanticSimilarity(CompletePipeline srllib, float mindelta, int minnumberofmatchingwords, float relsearchwindow){
        this.srllib = srllib;
        this.mindelta = mindelta;
        this.minnumberofmatchingwords = minnumberofmatchingwords;
        this.relsearchwindow = relsearchwindow;
    }
    
    private int nrofinits;
    /**
     * Initializes all data needed for calculating similarity values
     * @param sentencelist list with sentences
     * @param book true for book, false for subtitles
     */
    private void init(List<String> sentencelist, boolean book){
        nrofinits++;
        // Initialize the lists
        if (book){
            bookSRL = new ArrayList<Map<String, Map<String, List<String>>>>();
            enoughBookWordsWithRoles = new ArrayList<Boolean>();
            bookWordCounts = new ArrayList<Map<String, Integer>>();
            bookTokens = new ArrayList<List<String>>();
            bookPOS = new ArrayList<List<String>>();
        }
        else{
            subtitleSRL = new ArrayList<Map<String, Map<String, List<String>>>>();
            enoughSubtitleWordsWithRoles = new ArrayList<Boolean>();
            subtitleWordCounts = new ArrayList<Map<String, Integer>>();
            subtitleTokens = new ArrayList<List<String>>();
            subtitlePOS = new ArrayList<List<String>>();
        }
        int index = 0;
        int previousprogress = -1;
	for (String sentence : sentencelist){
            // Parse the sentence
            Sentence parsedSentence = parseSentence(sentence);
            // Fetch the SRL labels
            Map<String, Map<String, List<String>>> SRLMap = getSRLMap(parsedSentence);            
            // Count the words for each predicate and check if at least one of those predicates has the minimum number of words
            Map<String, Integer> wordCount = new HashMap<String, Integer>();
            boolean enoughwords = fillWordCounts(SRLMap, wordCount);
            // Fetch the POS tags 
            String[] posarray = parsedSentence.getPOSArray();
            String[] wordarray = parsedSentence.getFormArray();
            List<String> poslist = new ArrayList<String>();
            List<String> tokenlist = new ArrayList<String>();
            for (int i = 0; i < wordarray.length; i++){
                if (wordarray[i].matches(".*[a-zA-Z0-9].*")){ // Don't do empty strings or punctuation
                    tokenlist.add(wordarray[i].toLowerCase());
                    poslist.add(posarray[i]);
                }
            }
            // Get the related words for each word
            // Add derivate forms to the related words map
            for (int i = 0; i < tokenlist.size(); i++){
                String token = tokenlist.get(i);
                String pos = poslist.get(i);
                addRelatedWords(token, pos, derivatewordsMap);
            }
            // Fill the lists
            if (book){
                bookSRL.add(SRLMap);
                enoughBookWordsWithRoles.add(enoughwords);
                bookWordCounts.add(wordCount);
                bookTokens.add(tokenlist);
                bookPOS.add(poslist);
            }
            else{
                subtitleSRL.add(SRLMap);
                enoughSubtitleWordsWithRoles.add(enoughwords);
                subtitleWordCounts.add(wordCount);
                subtitleTokens.add(tokenlist);
                subtitlePOS.add(poslist);
            }
            int progress = (int)Math.floor((index*100)/sentencelist.size());
            if (progress > previousprogress){
                if (book)
                    System.out.println("bookpreparationprogress - "+progress+"%");
                else
                    System.out.println("subpreparationprogress - "+progress+"%");
                previousprogress = progress;
            }
            index++;
	}
        // Add derivate forms to the related words map
        if (nrofinits == 2){            
            for (Entry<String, Map<Character, Set<String>>> baseform : derivatewordsMap.entrySet()){
                Map<Character, Set<String>> baseformtypemap = relatedwords.get(baseform.getKey());
                if (baseformtypemap != null){ // If the baseform isn't in the map, there's no need to add it
                    for (Entry<Character, Set<String>> basetype : baseform.getValue().entrySet()){
                        Set<String> currentSet = baseformtypemap.get(basetype.getKey());
                        Set<String> newrelated = new HashSet<String>(basetype.getValue());
                        if (currentSet != null){ // Add existing related words
                            newrelated.addAll(currentSet);
                        }
                        baseformtypemap.put(basetype.getKey(), newrelated);
                    }
                }
            }
        }
    }
    
    /**
     * Synchronizes a parsed epub and srt using sentence level semantic analysis.
     * progress and matches are printeded to stdout
     * @param book the list with parsed sentences from the book
     * @param subtitles the list with parsed sentences from the subtitle file
     */
    public void synchronize(List<String> book, List<String> subtitles){
        // Perform initialisation
        nrofinits = 0;
        init(book,true);
        init(subtitles,false);
        
	int laststart = -1;
	int lastend = -1;
        int previousprogress = -1;
        for (int bookindex = 0; bookindex < book.size(); bookindex++){ 
            int numberofbookwords = bookPOS.get(bookindex).size();
            // The list of best matching subtitles (all with the maxscore)
            List<Integer> submatches = new ArrayList<Integer>();
            // Keep the best score for a subtitle in combination with the current book index
            double maxscore = 0;
            // If the sentence is very short, try to find an exact match within a certain window of the previous match
            if (numberofbookwords < minnumberofmatchingwords && laststart >= 0 && lastend >= 0 && relsearchwindow >= 0){
                int searchwindow = Math.round(relsearchwindow*subtitles.size());
                int start = (laststart-searchwindow > 0 && laststart >= 0)?laststart-searchwindow:0;
                int end = (lastend+searchwindow < subtitles.size() && lastend >= 0)?lastend+searchwindow:subtitles.size();
                // Find exact matching subtitles for this quote
                for (int subindex = start; subindex < end; subindex++){
                    String cleanedbooksentence = book.get(bookindex).toLowerCase().replaceAll("[^a-zA-Z0-9]","").trim();
                    String cleanedsubsentence = subtitles.get(subindex).toLowerCase().replaceAll("[^a-zA-Z0-9]","").trim();
                    if (cleanedbooksentence.equals(cleanedsubsentence)){
                        submatches.add(subindex);
                    }
                }
                maxscore = 1;
            }
            else if (numberofbookwords >= minnumberofmatchingwords) {
                // Find the best matching subtitles for this quote
                for (int subindex = 0; subindex < subtitles.size(); subindex++){
                    int numberofsubwords = subtitlePOS.get(subindex).size();
                    if (numberofsubwords >= minnumberofmatchingwords){
                        // The relative number of matching words (the score)
                        double score = calculateSimilarity(bookindex,subindex);

                        // If the similarity measure is at least delta and the new match for the quote
                        // is at least as good as the previous one, add the subtitle to the array of matches for the quote
                        if (score >= mindelta && score > maxscore){
                            // Reset resultsarray if an absolute better match has been found
                            if (score > maxscore){ 
                                submatches = new ArrayList<Integer>();
                            }					
                            submatches.add(subindex);	
                            maxscore = score;
                        }
                    }
                }
            }
            int start = -1;
            int end = -1;
            for (int matchvalue : submatches){
                start = (start == -1 || matchvalue < start)?matchvalue:start;
                end = (matchvalue > end)?matchvalue:end;
                System.out.format("match - %d - %d - %.2f\n",matchvalue,bookindex,maxscore);
            }
            if (numberofbookwords >= minnumberofmatchingwords && maxscore >= 0.8){
                laststart = start;
                lastend = end;
            }
            else{
                laststart = -1;
                lastend = -1;
            }
            int progress = (int)Math.floor(((bookindex+1)*100)/book.size());
            if (progress > previousprogress){
                System.out.println("similarityprogress - "+progress+"%");
                previousprogress = progress;
            }            
        }
    }

    /**
     * Calculate the similarity between two sentences
     * @param bookindex the index for the book sentence
     * @param subindex the index for the subtitle sentence
     * @return the similarity value
     */
    private double calculateSimilarity(int bookindex, int subindex) {
        double similarity;
        // If at least one predicate with enough words is found in both sentences, proceed with calculating
        if (bookSRL.get(bookindex) != null && subtitleSRL.get(subindex) != null
            && enoughBookWordsWithRoles.get(bookindex) && enoughSubtitleWordsWithRoles.get(subindex)){
                similarity = calculateSentenceSimilarity(bookindex,subindex);
        }
        // Use role similarity using POS tags if there are not enough labels
        else{
            if (bookPOS.get(bookindex).size() <= subtitlePOS.get(subindex).size()){
                similarity = calculateRoleSimilarity(bookTokens.get(bookindex), subtitleTokens.get(subindex), bookPOS.get(bookindex));
            }
            else{
                similarity = calculateRoleSimilarity(subtitleTokens.get(subindex), bookTokens.get(bookindex), subtitlePOS.get(subindex));
            }
        }
        return similarity;
    }
    
    /**
     * Calculates the similarity between two sentences
     * @param bookindex index of the book sentence
     * @param subindex index of the subtitle sentence
     * @return the resulting similarity
     */
    private double calculateSentenceSimilarity (int bookindex, int subindex){
	Map<String, Map<String, List<String>>> booksentence = bookSRL.get(bookindex);
	Map<String, Map<String, List<String>>> subsentence = subtitleSRL.get(subindex);
        
        double maxsim = -1;

        for (Entry<String, Map<String, List<String>>> bookpredicate : booksentence.entrySet()){
            Map<String, List<String>> bookframe = bookpredicate.getValue();
            if (bookWordCounts.get(bookindex).get(bookpredicate.getKey()) >= minnumberofmatchingwords){
                for (Entry<String, Map<String, List<String>>> subtitlepredicate : subsentence.entrySet()){
                    Map<String, List<String>> subframe = subtitlepredicate.getValue();
                    if (subtitleWordCounts.get(subindex).get(subtitlepredicate.getKey()) >= minnumberofmatchingwords){
                        double fsim = calculateFrameSimilarity(bookframe,subframe,bookindex,subindex);
                        if (fsim > maxsim){
                            maxsim = fsim;
                        }
                    }
                }
	    }
	}
        return maxsim;
    }

    /**
     * Calculates the similarity between two frames
     * @param bookframe frame of the book with SRL tagging
     * @param subframe frame of the subtitle with SRL tagging
     * @param bookindex index of the book sentence
     * @param subindex index of the subtitle sentence
     * @return the resulting similarity
     */
    private double calculateFrameSimilarity (Map<String, List<String>> bookframe,Map<String, List<String>> subframe, int bookindex, int subindex){
	Set<String> commonroles = new HashSet<String>();
	for (String argLabel : bookframe.keySet()){
            // Check if the role exists in the other frame
            if (subframe.containsKey(argLabel)){ // Role exists
                commonroles.add(argLabel);
            }
	}
	double fsim = 0;
	for (String role : commonroles){
            List<String> bookpostags = bookPOS.get(bookindex);
            List<String> subpostags = subtitlePOS.get(subindex);
            if (bookframe.get(role).size() <= subframe.get(role).size()){
                fsim += calculateRoleSimilarity(bookframe.get(role),subframe.get(role),bookpostags);
            }
            else{
                fsim += calculateRoleSimilarity(subframe.get(role),bookframe.get(role),subpostags);
            }
	}
        
        // Check which frame has the most roles
        int nrofbookroles = bookframe.keySet().size();
        int nrofsubroles = subframe.keySet().size();
        int biggestnrofroles = (nrofbookroles >= nrofsubroles)?nrofbookroles:nrofsubroles;
        return (fsim/biggestnrofroles); // Return the frame similarity
    }

    /**
     * Calculates the similarity between two termsets
     * @param termsetm the smallest of the two termsets
     * @param termsetn the biggest of the two termsets
     * @param possetm the POS tagging for the smallest of the two termsets
     * @return the resulting similarity
     */
    private double calculateRoleSimilarity (List<String> termsetm, List<String> termsetn, List<String> possetm){
	double rsim = 0;
        int i = 0;
        Set<Integer> usedindexes = new HashSet<Integer>();
	for (String term : termsetm){
            if (term.matches(".*[a-z0-9A-Z].*")){
                String posTerm = possetm.get(i);
                char type = 'n'; // Noun
                if (posTerm.contains("VB")){
                    type = 'v'; // Verb
                }
                else if (posTerm.contains("JJ")){
                    type = 'a'; // Adjective
                }
                else if (posTerm.contains("RB")){
                    type = 'r'; // Adverb
                }
                int termindex = termsetn.indexOf(term);
                if (termindex != -1){
                    while (usedindexes.contains(termindex) && termindex+1 < termsetn.size()){
                        int tempindex = termsetn.subList(termindex+1, termsetn.size()).indexOf(term);
                        termindex = (tempindex >= 0)?termindex+tempindex+1:tempindex;
                    }
                }
                if (termindex != -1){ // The term itself is included in the other termset
                    usedindexes.add(termindex);
                    rsim++;
                }
                else{
                    // Fetch the terms related to the current term
                    Map<Character, Set<String>> relatedwordmap = relatedwords.get(term.toLowerCase());
                    Set<String> relatedwordset = null;
                    if (relatedwordmap != null){
                        relatedwordset = relatedwordmap.get(type);
                    }
                    if (relatedwordset != null){ 
                        boolean found = false;
                        Iterator<String> relatedworditerator = relatedwordset.iterator();
                        while (!found && relatedworditerator.hasNext()){
                            // A related term is included in the other termset
                            String relatedterm = relatedworditerator.next();
                            int relatedtermindex = termsetn.indexOf(relatedterm);
                            if (relatedtermindex != -1){
                                while (usedindexes.contains(relatedtermindex)){
                                    int tempindex = termsetn.subList(relatedtermindex+1, termsetn.size()).indexOf(relatedterm);
                                    relatedtermindex = (tempindex >= 0)?relatedtermindex+tempindex+1:tempindex;
                                }
                            }
                            if (relatedtermindex != -1){ // The term itself is included in the other termset
                                usedindexes.add(relatedtermindex);
                                found = true;
                                rsim++;
                            }
                        }
                    }
                }
                i++;
            }
	}
        return (rsim/termsetn.size()); // Return the role similarity
    }

    /**
     * Write SRL parse results to a map structure
     * @param sentence the parsed sentence
     * @return SRL parse results in a map structure
     */
    private Map<String, Map<String, List<String>>> getSRLMap(Sentence sentence) {
        List<Predicate> predicates = sentence.getPredicates();
        Map<String, Map<String, List<String>>> predicatemap = new HashMap<String, Map<String, List<String>>>();
        for (Predicate predicate : predicates){
            // Get the arguments of the predicate
            Map<Word, String> argmap = predicate.getArgMap(); 
            Set<Word> arguments = argmap.keySet();

            // Create a hashmap with the roles for this predicate
            HashMap<String, List<String>> roleMap = new HashMap<String, List<String>>();
            
            // Add the predicate itself with "rel" as role
            List<String> relword = new ArrayList<String>();
            relword.add(predicate.getForm().toLowerCase());
            roleMap.put("rel", relword);
            
            for (Map.Entry<Word, String> entry : argmap.entrySet()){
                Word word = entry.getKey();
                String argLabel = entry.getValue();
                List<String> rolewords = roleMap.get(argLabel);
                if (rolewords == null){
                    rolewords = new ArrayList<String>();
                }
                Yield argYield = word.getYield(predicate, argLabel, arguments);
                for (Word yieldWord : argYield){ // Add all the words (associated with the argument)
                    if (yieldWord.getForm().matches(".*[a-zA-Z0-9].*")){ // Don't do punctuation
                        rolewords.add(yieldWord.getForm().toLowerCase());
                    }
                }
                if (!rolewords.isEmpty()){
                    roleMap.put(argLabel, rolewords);
                }
            }
            
            predicatemap.put(predicate.getForm(), roleMap);
        }
        return predicatemap;
    }
    
    /**
     * Parse a sentence using the given pipeline
     * @param stringsentence the sentence to parse
     * @return the parsed sentence
     */
    private Sentence parseSentence(String stringsentence){
        Sentence sentence = null;
        try {
            sentence = srllib.parse(stringsentence); // Parse the sentence
        } catch (Exception ex) {
            System.err.println(ex);
        }
        if (sentence != null){
            return sentence;
        }
        else{
            return null;
        }
    }

    /**
     * Calculate the number of words for every predicate and indicate if there is at least one predicate
     * with the minimum number of words
     * @param SRLMap the map with semantic role labels
     * @param wordCount the map to store the counts
     * @return true if there is at least one predicate with the minimum number of words
     */
    private boolean fillWordCounts(Map<String, Map<String, List<String>>> SRLMap, Map<String, Integer> wordCount) {
        boolean enoughwords = false;
        if (SRLMap != null){
            for (Entry<String, Map<String, List<String>>> predicate : SRLMap.entrySet()){                    
                int wordcount = 0;
                for (Entry<String, List<String>> roles : predicate.getValue().entrySet()){
                    wordcount += roles.getValue().size();
                }
                wordCount.put(predicate.getKey(), wordcount);
                if (wordcount >= minnumberofmatchingwords){
                    enoughwords = true;
                }
            }
        }
        return enoughwords;
    }
    
    /**
     * Add the related words of the given word and part of speech to the related words map
     * @param word the given word
     * @param POS its part of speech tag
     * @param derivatewordsMap the map containing derivate forms (values) of base forms (keys)
     */
    private void addRelatedWords(String word, String POS, Map<String, Map<Character, Set<String>>> derivatewordsMap){
        String lowercaseword = word.toLowerCase();
                
        // Find the synset type based on the POS tag
        SynsetType type = SynsetType.NOUN;
        char keytype = 'n';
        if (POS.contains("VB")){
            type = SynsetType.VERB;
            keytype = 'v';
        }
        else if (POS.contains("JJ")){
            type = SynsetType.ADJECTIVE;
            keytype = 'a';
        }
        else if (POS.contains("RB")){
            type = SynsetType.ADVERB;
            keytype = 'r';
        }
                
        // If we haven't got the related words yet, get them
        if (!relatedwords.containsKey(lowercaseword) || !relatedwords.get(lowercaseword).containsKey(keytype)){
            
            // Add this word to the sets of possible baseforms
            String[] baseFormCandidates = wn.getBaseFormCandidates(word, type);
            for (String baseform : baseFormCandidates){ // Add the word to each of the baseforms
                String lowerbaseform = baseform.toLowerCase();
                Map<Character, Set<String>> typemap = derivatewordsMap.get(lowerbaseform);
                Set<String> relatedbase = new HashSet<String>(); // Add the original form to the new related set
                relatedbase.add(lowercaseword);
                if (typemap != null){
                    Set<String> alreadyrelated = typemap.get(keytype); // Check if there was already a related set
                    if (alreadyrelated != null){ // Add them to the new related set
                        relatedbase.addAll(alreadyrelated);
                    }
                }
                else{
                    derivatewordsMap.put(lowerbaseform, new HashMap<Character, Set<String>>());
                    typemap = derivatewordsMap.get(lowerbaseform);
                }
                typemap.put(keytype, relatedbase);
            }
            Synset[] synsets = wn.getSynsets(word, type);
            Set<String> relatedstrings = new HashSet<>();
            for (Synset syns : synsets){
                relatedstrings.addAll(Arrays.asList(syns.getWordForms())); // Add synonyms
                if (type.equals(SynsetType.NOUN)){
                    NounSynset nsyns = (NounSynset)syns;                    
                    addToRelatedWords(nsyns.getHypernyms(),relatedstrings); // Add the hypernyms
                    addToRelatedWords(nsyns.getHyponyms(),relatedstrings); // Add the hyponyms
                    // Add the holonyms
                    addToRelatedWords(nsyns.getMemberHolonyms(),relatedstrings);
                    addToRelatedWords(nsyns.getPartHolonyms(),relatedstrings);
                    addToRelatedWords(nsyns.getSubstanceHolonyms(),relatedstrings);
                    // Add the meronyms
                    addToRelatedWords(nsyns.getMemberMeronyms(),relatedstrings);
                    addToRelatedWords(nsyns.getPartMeronyms(),relatedstrings);
                    addToRelatedWords(nsyns.getSubstanceMeronyms(),relatedstrings);
                }
                else if (type.equals(SynsetType.VERB)){
                    VerbSynset vsyns = (VerbSynset)syns; 
                    addToRelatedWords(vsyns.getHypernyms(),relatedstrings); // Add the hypernyms
                    addToRelatedWords(vsyns.getTroponyms(),relatedstrings); // Add the hyponyms
                }
                else if (type.equals(SynsetType.ADJECTIVE)){
                    AdjectiveSynset asyns = (AdjectiveSynset) syns;
                    addToRelatedWords(asyns.getSimilar(),relatedstrings); // Add the synonyms
                }
            }
            if (!relatedstrings.isEmpty()){ // Don't need to add to the map if there are no related terms
                // If we haven't got the related words yet, make a hashmap to store them
                if (!relatedwords.containsKey(lowercaseword)){
                    relatedwords.put(lowercaseword, new HashMap<Character, Set<String>>());
                }
                relatedwords.get(lowercaseword).put(keytype,relatedstrings); // Add the resulting list to the map
            }
        }
    }
    
    /**
     * Add the words from the given synset array to the relatedwords set
     * @param synsets array with synsets
     * @param relatedwords relatedwords set
     */
    private void addToRelatedWords(Synset[] synsets, Set<String> relatedwords){
        for (Synset synset : synsets){
            String[] wordforms = synset.getWordForms();
            relatedwords.addAll(Arrays.asList(wordforms));
        }
    }
}
