package wordnetsimilarity;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Singleton class with functions to calculate semantic sentence similarity
 * @author jeknocka
 */
public class SemanticSimilarity {
    
    // Instance
    private final static SemanticSimilarity instance = new SemanticSimilarity();
    
    public static SemanticSimilarity getInstance(){
        return instance;
    }
    
    private SemanticSimilarity(){
        // Intentionally left empty
    }
    
    public double getSentenceSimilarity(List<String> sentence1, List<String> sentence2, Map<String,String> pos1, Map<String, String> pos2){
        WordSimilarity ws = WordSimilarity.getInstance();
        Set<String> jointwordset = new HashSet<String>();
        for (String word1 : sentence1) {
            for (String word2 : sentence2) {
                double sim = ws.getWordSimilarity(word1, word2, pos1.get(word1), pos2.get(word2));
            }
        }
        //jointwordset.addAll(Arrays.asList(sentence1));
        //jointwordset.addAll(Arrays.asList(sentence2));
        return 0;
    }
    
    
    
}
