

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import opennlp.tools.postag.POSModel;
import opennlp.tools.postag.POSTaggerME;
import opennlp.tools.tokenize.SimpleTokenizer;
import org.apache.commons.math3.linear.ArrayRealVector;
import org.apache.commons.math3.linear.RealVector;

/**
 * Singleton class with functions to calculate semantic sentence similarity
 * @author jeknocka
 */
public class SemanticSimilarity {
    
    private final float mindelta; // Minimum similarity to be considered a match
    private final int minnumberofmatchingwords; // The smallest number of words a match must consist of 
    private final float relsearchwindow; // Search window for exact matches with less words than minnumberofmatchingwords
    private final float minimumscorefortimewindow; // Minimum score of a match to be create a time window around it
    
    private final double  minwordsim; // Minimum word similarity to be categorized as similar
    private final double relativelexicalimportance; // Relative importance of lexical semantic similarity (vs. word order similarity)
    
    // Data for calculating similarity values
    // Part-of-speech tags and tokens
    private List<List<String>> bookTokens;
    private List<List<String>> bookPOS;
    private List<List<String>> subtitleTokens;
    private List<List<String>> subtitlePOS;
    // Corpus statistics
    private Map<String, Double> corpusstats;
    
    

    /**
     * Constructor with defaults for threshold values
     * @param mindelta Minimum similarity that is needed to be considered a match
     * @param minnumberofmatchingwords Minimum number of matching words to be a match
     * @param relsearchwindow Size of the search window that is used when there are not enough common words
     * @param minimumscorefortimewindow Minimum score of a match to be create a time window around it
     * @param minwordsim Minimum word similarity to be categorized as similar
     * @param relativelexicalimportance Relative importance of lexical semantic similarity
     */
    public SemanticSimilarity(float mindelta, int minnumberofmatchingwords, float relsearchwindow, float minimumscorefortimewindow, float minwordsim, float relativelexicalimportance){
        this.mindelta = mindelta;
        this.minnumberofmatchingwords = minnumberofmatchingwords;
        this.relsearchwindow = relsearchwindow;
        this.minimumscorefortimewindow = minimumscorefortimewindow;
        this.minwordsim = minwordsim;
        this.relativelexicalimportance = relativelexicalimportance;
    }
    
    // Word Similarity instance
    private final static WordSimilarity ws = WordSimilarity.getInstance();
    
    /**
     * Initializes all data needed for calculating similarity values
     * @param booksentences list with parsed sentences from the book
     * @param subtitlesentences list with parsed sentences from the subtitles
     */
    private void init(List<String> booksentences, List<String> subtitlesentences){
        // Initialize the lists
        bookTokens = new ArrayList<List<String>>();
        bookPOS = new ArrayList<List<String>>();
        subtitleTokens = new ArrayList<List<String>>();
        subtitlePOS = new ArrayList<List<String>>();
        corpusstats = new HashMap<String, Double>();
        
        int wordsinquotes = processSentences(booksentences, bookTokens, bookPOS, corpusstats);
        int wordsinsubs = processSentences(subtitlesentences, subtitleTokens, subtitlePOS, corpusstats);
        int totalwords = wordsinquotes+wordsinsubs;
        // Calculate corpus statistics
        for (Map.Entry<String, Double> entry : corpusstats.entrySet()) {
            double iw = 1-(Math.log(entry.getValue()+1)/Math.log(totalwords+1));
            entry.setValue(iw);
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
        init(book,subtitles);
        
	int lastindex = -1;
        int previousprogress = -1;
        for (int bookindex = 0; bookindex < book.size(); bookindex++){ 
            int numberofbookwords = bookPOS.get(bookindex).size();
            // The list of best matching subtitles (all with the maxscore)
            List<Integer> submatches = new ArrayList<Integer>();
            // Keep the best score for a subtitle in combination with the current book index
            double maxscore = 0;
            // If the sentence is very short, try to find an exact match within a certain window of the previous match
            if (numberofbookwords < minnumberofmatchingwords && lastindex >= 0 && relsearchwindow >= 0){
                int searchwindow = Math.round(relsearchwindow*subtitles.size());
                int start = (lastindex-searchwindow > 0)?lastindex-searchwindow:0;
                int end = (lastindex+searchwindow < subtitles.size())?lastindex+searchwindow:subtitles.size();
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
                        double score = getSentenceSimilarity(bookindex,subindex);

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
            for (int matchvalue : submatches){
                if (numberofbookwords >= minnumberofmatchingwords && maxscore >= minimumscorefortimewindow){
                    lastindex = matchvalue;
                }
                System.out.format("match - %d - %d - %.2f\n",matchvalue,bookindex,maxscore);
            }
            int progress = (int)Math.floor(((bookindex+1)*100)/book.size());
            if (progress > previousprogress){
                System.out.println("similarityprogress - "+progress+"%");
                previousprogress = progress;
            }            
        }
    }

    
    /**
     * Calculates the similarity between two sentences based on a mixture of lexical
     * semantic similarity and word order similarity
     * @param bookindex index for the sentence from the book
     * @param subindex index for the sentence from the subtitles
     * @return the similarity value (between 0 and 1)
     */
    public double getSentenceSimilarity(int bookindex, int subindex){
        List<String> bookWords = bookTokens.get(bookindex);
        List<String> bookWordsPos = bookPOS.get(bookindex);
        List<String> subtitleWords = subtitleTokens.get(subindex);
        List<String> subtitleWordsPOS = subtitlePOS.get(subindex);
        
        // Get joint word set
        List<String> jointwordset = new ArrayList<String>();
        for (String word : bookWords){
            if (!jointwordset.contains(word)){
                jointwordset.add(word);
            }
        }
        for (String word : subtitleWords){
            if (!jointwordset.contains(word)){
                jointwordset.add(word);
            }
        }
        
        Map<String, String> posmap = new HashMap<String, String>();
        for (int i = 0; i < bookWords.size(); i++){
            posmap.put(bookWords.get(i), bookWordsPos.get(i));
        }
        for (int i = 0; i < subtitleWords.size(); i++){
            posmap.put(subtitleWords.get(i), subtitleWordsPOS.get(i));
        }
        
        // Calculate lexical semantic similarity
        RealVector semanticvector1 = getSemanticVector(bookWords,posmap,jointwordset);
        RealVector semanticvector2 = getSemanticVector(subtitleWords,posmap,jointwordset);
        double sentencesimilarity = semanticvector1.cosine(semanticvector2);
        
        // Calculate word order similarity
        RealVector ordervector1 = getWordOrderVector(bookWords,posmap,jointwordset);
        RealVector ordervector2 = getWordOrderVector(subtitleWords,posmap,jointwordset);
        double wordordersimilarity = 1 - ((ordervector1.subtract(ordervector2)).getNorm()/(ordervector1.add(ordervector2)).getNorm());
        
        return relativelexicalimportance*sentencesimilarity+(1-relativelexicalimportance)*wordordersimilarity;
    }

    /**
     * Generates the semantic vector of a sentence, based on its joint word set
     * @param sentence the sentence for which to calculate the vector
     * @param posmap the POS tags for the joint word set
     * @param jointwordset the joint word set of both sentences
     * @return the semantic vector
     */
    private RealVector getSemanticVector(List<String> sentence, Map<String,String> pos, List<String> jointwordset) {
        double[] semanticvector = new double[jointwordset.size()];
        
        int i = 0;
        for (String word : jointwordset) { // Go trough every word of the joint word set
            if (sentence.contains(word)){ // If the sentence contains the word, the semantic similarity is 1
                semanticvector[i++] = 1*corpusstats.get(word)*corpusstats.get(word);
            }
            else{ 
                // If it doesn't contain the word, we look in the sentence for the word 
                // that is most similar to the one in the joint word set
                double maxsim = 0;
                String bestmatch = null;
                
                // Go over every word in the sentence and find the one most similar to the word from the joint word set
                for (String sentenceword : sentence) {  
                    double sim = ws.getWordSimilarity(word, sentenceword, pos.get(word), pos.get(sentenceword));
                    if (sim > maxsim){
                        maxsim = sim;
                        bestmatch = sentenceword;
                    }
                }
                // If the most similar word is similar enough according to the threshold, calculate the similarity measure
                if (maxsim > minwordsim){
                    semanticvector[i++] = maxsim*corpusstats.get(word)*corpusstats.get(bestmatch);
                }
                // If not, use 0 as similarity
                else{
                    semanticvector[i++] = 0;
                }
            }
        }
        return new ArrayRealVector(semanticvector);
    }

    /**
     * Generates the word order vector of a sentence, based on its joint word set
     * @param sentence the sentence for which to calculate the vector
     * @param pos1 the POS tags for the that sentence
     * @param pos2 the POS tags for the other sentence
     * @param jointwordset the joint word set of both sentences
     * @return the word order vector
     */
    private RealVector getWordOrderVector(List<String> sentence, Map<String,String> pos, List<String> jointwordset) {
        double[] worderordervector = new double[jointwordset.size()];
        
        int i = 0;
        for (String word : jointwordset) { // Go trough every word of the joint word set
            int wordindex = sentence.indexOf(word);
            if (wordindex != -1){ // If the sentence contains the word, we can use its index (+1, because we count from 1)
                worderordervector[i++] = wordindex+1;
            }
            else{ 
                // If it doesn't contain the word, we look in the sentence for the word 
                // that is most similar to the one in the joint word set
                double maxsim = 0;
                int bestindex = -1;

                // Go over every word in the sentence and find the one most similar to the word from the joint word set
                int j = 0;
                for (String sentenceword : sentence) {  
                    double sim = ws.getWordSimilarity(word, sentenceword, pos.get(word), pos.get(sentenceword));
                    if (sim > maxsim){
                        maxsim = sim;
                        bestindex = j;
                    }
                    j++;
                }
                // If the most similar word is similar enough according to the threshold, use its index (+1, because we count from 1)
                if (maxsim > minwordsim){
                    worderordervector[i++] = bestindex+1;
                }
                // If not, use 0 as index
                else{
                    worderordervector[i++] = 0;
                }
            }
        }
        return new ArrayRealVector(worderordervector);
    }    
    
    /**
     * Processes a list of sentences by splitting into tokens, performing POS tagging and collecting corpus statistics
     * @param sentences the list of sentences
     * @param tokenList the list in which to put the tokenized sentences
     * @param posList the List in which to put the found POS tags
     * @param wordstats the map in which to keep track of word occurrences
     * @return the total number of words that were put in the sentence list
     */
    private static int processSentences(List<String> sentences, List<List<String>> tokenList, List<List<String>> posList, Map<String, Double> wordstats) {     
        InputStream modelIn = null;
        POSModel model = null;
        try {
            modelIn = new FileInputStream("models/en-pos-maxent.bin");
            model = new POSModel(modelIn);
        }
        catch (IOException e) {
            System.err.println(e);
        }
        finally {
            if (modelIn != null) {
                try {
                    modelIn.close();
                }
                catch (IOException e) {
                    System.err.println(e);
                }
            }
        }
        POSTaggerME tagger = new POSTaggerME(model);
       
        int words = 0;
        for (String sentence : sentences) {
            String[] tokens = SimpleTokenizer.INSTANCE.tokenize(sentence);
            String[] tags = tagger.tag(tokens);
            List<String> pos = new ArrayList<String>();
            List<String> wordlist = new ArrayList<String>();
            for (int i = 0; i < tokens.length; i++) {
                String wordtext = tokens[i].toLowerCase();
                String wordpos = tags[i];
                if (wordtext.matches(".*[a-zA-Z0-9].*")){ // Don't do punctuation
                    Double occurrence = wordstats.get(wordtext);
                    if (occurrence != null){
                        wordstats.put(wordtext, occurrence+1);
                    }
                    else{
                        wordstats.put(wordtext, 1.0);
                    }
                    words++;
                    wordlist.add(wordtext);
                    pos.add(wordpos);
                }
            }
            tokenList.add(wordlist);
            posList.add(pos);
        }
        return words;
    }
}
