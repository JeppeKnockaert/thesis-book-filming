package wordnetsimilarity;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Application that calculates the WordNet similarity between each two words in a given input file
 * @author jeknocka
 */
public class Main {
    
    /**
     * Calculates the WordNet similarity between each two words in a given input file
     * @param args the command line arguments
     * @throws java.io.IOException something wrong with the input file
     */
    public static void main(String[] args) throws IOException {
        // Look for filenames of inputfile
        if (args.length != 1){
            System.err.println("needs <input> as arguments");
            System.exit(0);
        }
        
        // Read the input file
        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode compareFile = objectMapper.readTree(new File(args[0]));
        JsonNode quotes = compareFile.get("book");
        JsonNode subtitles = compareFile.get("subtitle");
        
        List<Map<String,String>> bookPOS = new ArrayList<Map<String,String>>();
        List<Map<String,String>> subtitlePOS = new ArrayList<Map<String,String>>();
        List<List<String>> bookSentences = new ArrayList<List<String>>(quotes.size());
        List<List<String>> subtitleSentences = new ArrayList<List<String>>(subtitles.size());
        
        // Get the sentences and the POS tags
        convertToLists(quotes,bookSentences,bookPOS);
        convertToLists(subtitles, subtitleSentences, subtitlePOS);
        
        SemanticSimilarity semsim = SemanticSimilarity.getInstance();
        // Find all sentence similarities
        int procent = 0;
        for (int j = 0; j < subtitleSentences.size(); j++) {
            for (int k = 0; k < bookSentences.size(); k++) {
                double sim = semsim.getSentenceSimilarity(subtitleSentences.get(j),
                        bookSentences.get(k), subtitlePOS.get(j), bookPOS.get(k));
                if (((j*bookSentences.size()+k)*100)/(bookSentences.size()*subtitleSentences.size()) > procent){
                    procent = ((j*bookSentences.size()+k)*100)/(bookSentences.size()*subtitleSentences.size());
                    System.out.println(procent+"%");
                }
            }
        }
        System.out.println("done");
    }

    private static void convertToLists(JsonNode quotes, List<List<String>> bookSentences, List<Map<String, String>> bookPOS) {
        for (JsonNode quote : quotes) {
            Map<String, String> posmap = new HashMap<String,String>();
            List<String> wordlist = new ArrayList<String>();
            for (JsonNode word : quote) {
                String wordtext = word.get(0).asText();
                String wordpos = word.get(1).asText();
                if (wordtext.matches(".*[a-zA-Z].*")){ // Don't do punctuation
                    posmap.put(wordtext, wordpos);
                    wordlist.add(wordtext);
                }
            }
            bookSentences.add(wordlist);
            bookPOS.add(posmap);
        }
    }
}