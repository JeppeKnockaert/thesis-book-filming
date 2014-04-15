package wordnetsimilarity;

import java.util.HashMap;
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
    
    double  threshold = 0.2;
    
    // Instance
    private final static SemanticSimilarity instance = new SemanticSimilarity();
    
    public static SemanticSimilarity getInstance(){
        return instance;
    }
    
    private SemanticSimilarity(){
        // Intentionally empty
    }
    
    // Word Similarity instance
    private final static WordSimilarity ws = WordSimilarity.getInstance();
    
    private Map<String, Double> corpusstats = null;
    public void setCorpusStats(Map<String, Double> corpusstats){
        this.corpusstats = corpusstats;
    }
    
    public double getSentenceSimilarity(List<String> sentence1, List<String> sentence2, Map<String,String> pos1, Map<String, String> pos2){
        if (corpusstats == null){
            System.err.println("No corpus stats found!");
        }
        Set<String> jointwordset = new HashSet<>(sentence1);
        jointwordset.addAll(sentence2);
        RealVector lexicalsemanticvector1 = getLexicalSemanticVector(sentence1,pos1,pos2,jointwordset);
        RealVector lexicalsemanticvector2 = getLexicalSemanticVector(sentence2,pos2,pos1,jointwordset);
        if (lexicalsemanticvector1.getNorm() == 0 || lexicalsemanticvector2.getNorm() == 0){
            System.out.println("");
        }
        double cosinesimilarity = lexicalsemanticvector1.cosine(lexicalsemanticvector2);
        return 0;
    }

    private RealVector getLexicalSemanticVector(List<String> sentence, Map<String,String> pos1, Map<String, String> pos2, Set<String> jointwordset) {
        double[] lexicalsemanticvector = new double[jointwordset.size()];
        
        int i = 0;
        for (String word : jointwordset) {
            if (sentence.contains(word)){
                lexicalsemanticvector[i++] = 1;
            }
            else{
                double maxsim = 0;
                String bestmatch = null;
                String wordpos = pos1.get(word);
                if (wordpos == null){
                    wordpos = pos2.get(word);
                }
                for (String sentenceword : sentence) {  
                    double sim = ws.getWordSimilarity(word, sentenceword, wordpos, pos1.get(sentenceword));
                    if (sim > maxsim){
                        maxsim = sim;
                        bestmatch = sentenceword;
                    }
                }
                if (maxsim > threshold){
                    lexicalsemanticvector[i++] = maxsim*corpusstats.get(word)*corpusstats.get(bestmatch);
                }
                else{
                    lexicalsemanticvector[i++] = 0;
                }
            }
        }
        return new ArrayRealVector(lexicalsemanticvector);
    }
    
    
    
}
