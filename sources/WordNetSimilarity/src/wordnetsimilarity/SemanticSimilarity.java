package wordnetsimilarity;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.commons.math3.linear.ArrayRealVector;
import org.apache.commons.math3.linear.RealVector;

/**
 * Singleton class with functions to calculate semantic sentence similarity
 * @author jeknocka
 */
public class SemanticSimilarity {
    
    double  threshold = 0.2; // Minimum word similarity to be categorized as similar
    double delta = 0.7; // Relative importance of lexical semantic similarity (vs. word order similarity)
        
    private final Map<String, Double> corpusstats;

    /**
     * Constructor with defaults for threshold values
     * @param corpusstats the map with corpus statistics
     */
    public SemanticSimilarity(Map<String, Double> corpusstats){
        this.corpusstats = corpusstats;
    }
    
    /**
     * Constructor with specific values for the thresholds
     * @param corpusstats the map with corpus statistics
     * @param threshold minimum word similarity to be categorized as similar
     * @param delta relative importance of lexical semantic similarity (vs. word order similarity)
     */
    public SemanticSimilarity(Map<String, Double> corpusstats, double threshold, double delta){
        this.corpusstats = corpusstats;
        this.delta = delta;
        this.threshold = threshold;
    }
    
    // Word Similarity instance
    private final static WordSimilarity ws = WordSimilarity.getInstance();
    
    /**
     * Calculates the similarity between two sentences based on a mixture of lexical
     * semantic similarity and word order similarity
     * @param sentence1 first sentence
     * @param sentence2 second sentence
     * @param pos1 POS tags for the first sentence
     * @param pos2 POS tags for the second sentence
     * @return the similarity value (between 0 and 1)
     */
    public double getSentenceSimilarity(List<String> sentence1, List<String> sentence2, Map<String,String> pos1, Map<String, String> pos2){
        // Get joint word set
        Set<String> jointwordset = new HashSet<>(sentence1);
        jointwordset.addAll(sentence2);
        
        // Calculate lexical semantic similarity
        RealVector semanticvector1 = getSemanticVector(sentence1,pos1,pos2,jointwordset);
        RealVector semanticvector2 = getSemanticVector(sentence2,pos2,pos1,jointwordset);
        double sentencesimilarity = semanticvector1.cosine(semanticvector2);
        
        // Calculate word order similarity
        RealVector ordervector1 = getWordOrderVector(sentence1,pos1,pos2,jointwordset);
        RealVector ordervector2 = getWordOrderVector(sentence2,pos2,pos1,jointwordset);
        double wordordersimilarity = 1 - ((ordervector1.subtract(ordervector2)).getNorm()/(ordervector1.add(ordervector2)).getNorm());
        
        return delta*sentencesimilarity+(1-delta)*wordordersimilarity;
    }

    /**
     * Generates the semantic vector of a sentence, based on its joint word set
     * @param sentence the sentence for which to calculate the vector
     * @param pos1 the POS tags for the that sentence
     * @param pos2 the POS tags for the other sentence
     * @param jointwordset the joint word set of both sentences
     * @return the semantic vector
     */
    private RealVector getSemanticVector(List<String> sentence, Map<String,String> pos1, Map<String, String> pos2, Set<String> jointwordset) {
        double[] semanticvector = new double[jointwordset.size()];
        
        int i = 0;
        for (String word : jointwordset) { // Go trough every word of the joint word set
            if (sentence.contains(word)){ // If the sentence contains the word, the semantic similarity is 1
                semanticvector[i++] = 1;
            }
            else{ 
                // If it doesn't contain the word, we look in the sentence for the word 
                // that is most similar to the one in the joint word set
                double maxsim = 0;
                String bestmatch = null;
                // Get the POS tag of the word in the joint word set
                String wordpos = pos1.get(word);
                if (wordpos == null){
                    wordpos = pos2.get(word);
                }
                // Go over every word in the sentence and find the one most similar to the word from the joint word set
                for (String sentenceword : sentence) {  
                    double sim = ws.getWordSimilarity(word, sentenceword, wordpos, pos1.get(sentenceword));
                    if (sim > maxsim){
                        maxsim = sim;
                        bestmatch = sentenceword;
                    }
                }
                // If the most similar word is similar enough according to the threshold, calculate the similarity measure
                if (maxsim > threshold){
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
    private RealVector getWordOrderVector(List<String> sentence, Map<String,String> pos1, Map<String, String> pos2, Set<String> jointwordset) {
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
                // Get the POS tag of the word in the joint word set
                String wordpos = pos1.get(word);
                if (wordpos == null){
                    wordpos = pos2.get(word);
                }
                // Go over every word in the sentence and find the one most similar to the word from the joint word set
                int j = 0;
                for (String sentenceword : sentence) {  
                    double sim = ws.getWordSimilarity(word, sentenceword, wordpos, pos1.get(sentenceword));
                    if (sim > maxsim){
                        maxsim = sim;
                        bestindex = j;
                    }
                    j++;
                }
                // If the most similar word is similar enough according to the threshold, use its index (+1, because we count from 1)
                if (maxsim > threshold){
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
}
