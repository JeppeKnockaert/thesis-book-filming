package wordnetsimilarity;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.smu.tspell.wordnet.NounSynset;
import edu.smu.tspell.wordnet.Synset;
import edu.smu.tspell.wordnet.SynsetType;
import edu.smu.tspell.wordnet.VerbSynset;
import edu.smu.tspell.wordnet.WordNetDatabase;
import java.io.File;
import java.io.IOException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;

/**
 * Application that calculates the WordNet similarity between each two words in a given input file
 * @author jeknocka
 */
public class Main {
    
    // As there is no virtual root node for verbs in WordNet, we have to keep them ourselves
    private static final HashSet<Synset> rootverbs = new HashSet<Synset>();
    
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
        
        
        // Set path to wordnet dictionairy
        System.setProperty("wordnet.database.dir", (new File("dict")).getAbsolutePath());
        
        // Read the input file
        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode compareArray = objectMapper.readTree(new File(args[0]));
        
        // Get the similarity values
        for (int i = 0; i < compareArray.size(); i++) {
            Iterator<Entry<String,JsonNode>> it = compareArray.get(i).fields();
            Entry<String,JsonNode> entry1 = it.next();
            Entry<String,JsonNode> entry2 = it.next();
            Map<String,Object> result = new HashMap<String, Object>();
            String[] words = {entry1.getKey(),entry2.getKey()};
            result.put("words", words);
            result.put("similarity", getWordSimilarity(
                    entry1.getKey().toLowerCase(),
                    entry2.getKey().toLowerCase(), 
                    entry1.getValue().asText(), entry2.getValue().asText()));
        }
    }
    
    /**
     * Get the word similarity of two words
     * @param word1 first word
     * @param word2 second word
     * @param pos1 POS tag of first word
     * @param pos2 POS tag of second word
     * @return the word similarity
     */
    private static int getWordSimilarity(String word1, String word2, String pos1, String pos2) {
        WordNetDatabase wn = WordNetDatabase.getFileInstance(); // Get the wordnet database
        SynsetType type1 = getSynsetType(pos1); 
        SynsetType type2 = getSynsetType(pos2);
        int pathlength = -1;
        if (word1.equals(word2)){
            pathlength = 0;
        }
        else if (type1.equals(type2)){ // Same POS
            Synset[] syns1 = wn.getSynsets(word1,type1);
            Synset[] syns2 = wn.getSynsets(word2,type2);
            if (syns1.length > 0 && syns2.length > 0){ // Both words included in WordNet
                pathlength = getPathLength(syns1,syns2);
            }
        }
        System.out.println("pathlength: "+pathlength);
        if (pathlength >= 0){
            return 1;
        }
        else{
            return 0;
        }
    }

    /**
     * Find the synset type based on the POS tag
     * @param pos the pos tag
     * @return the synsettype according to the tag
     */
    private static SynsetType getSynsetType(String pos) {
        SynsetType type = SynsetType.NOUN;
        if (pos.contains("VB")){
            type = SynsetType.VERB;
        }
        else if (pos.contains("JJ")){
            type = SynsetType.ADJECTIVE;
        }
        else if (pos.contains("RB")){
            type = SynsetType.ADVERB;
        }
        return type;
    }

    /**
     * Gets the shortest path length between two synsets
     * @param synsets1 first synset
     * @param synsets2 second synset
     * @return the path length
     */
    private static int getPathLength(Synset[] synsets1, Synset[] synsets2) {
        Set<String> words1 = new HashSet<String>();
        Set<String> words2 = new HashSet<String>();
        // Look for an equal synset (= pathlength 0)
        for (Synset synset1 : synsets1) { 
            for (Synset synset2 : synsets2) {
                if (synset1.equals(synset2)) { 
                    return 0;
                }
                words1.addAll(Arrays.asList(synset1.getWordForms()));
                words2.addAll(Arrays.asList(synset2.getWordForms()));
            }
        }
        // Look for common words in the synsets (= pathlength 1)
        for (String word : words1) {
            if (words2.contains(word)){
                return 1;
            }
        }
        
        // Calculate paths
        Map<Synset, Map<Synset, Set<Synset>>> paths1 = new HashMap<Synset, Map<Synset, Set<Synset>>>();
        Map<Synset, Map<Synset, Set<Synset>>> paths2 = new HashMap<Synset, Map<Synset, Set<Synset>>>();
        for (Synset synset : synsets1) {
            paths1.put(synset, calculatePaths(synset));
        }
        for (Synset synset : synsets2) {
            paths2.put(synset, calculatePaths(synset));
        }
        
        // Compare paths
        int min = Integer.MAX_VALUE;
        for (Entry<Synset, Map<Synset, Set<Synset>>> path1 : paths1.entrySet()) {
            for (Entry<Synset, Map<Synset, Set<Synset>>> path2 : paths2.entrySet()) {
                int distance = getTotalDistance(path1.getValue(),path2.getValue(),
                        path1.getKey(),path2.getKey());
                if (distance < min){
                    min = distance;
                }
            }
        }
        return min;
    }

    /**
     * Calculate the three for a given leaf node
     * @param synset the leaf node
     * @return the three, represented as a map with the parents for each node
     */
    private static Map<Synset, Set<Synset>> calculatePaths(Synset synset) {
        Map<Synset, Set<Synset>> parents = new HashMap<Synset, Set<Synset>>();

        Set<Synset> pursued = new HashSet<Synset>(); // Synsets that have been pursued
        pursued.add(synset); // Set initial synset as pursued
        Set<Synset> setsabove = getSynsetsAbove(synset); // Get the sets above the initial synset
        parents.put(synset,setsabove); // Add the parents of the inital synset
        while (!setsabove.isEmpty()){
            Set<Synset> newsetsabove = new HashSet<Synset>();
            for (Synset levelset : setsabove) {
                Set<Synset> abovelevelsets = getSynsetsAbove(levelset);
                parents.put(levelset,abovelevelsets);
                for (Synset abovelevelset : abovelevelsets) {
                    if (!pursued.contains(abovelevelset)){
                        pursued.add(abovelevelset); // Add the synsets to the pursued ones
                        newsetsabove.add(abovelevelset); // Pursue the path in the next round
                    }
                }
            }
            // We reached a verb root node!
            if (newsetsabove.isEmpty() && synset.getType().equals(SynsetType.VERB)){ 
                for (Synset rootnode : setsabove) {
                    rootverbs.add(rootnode);
                }
            }
            setsabove = newsetsabove;
            
        }
        return parents;
    }
    
    /**
     * Get the synsets that are direct supersets of the given synset
     * @param synset the given synset
     * @return the supersets
     */
    private static Set<Synset> getSynsetsAbove(Synset synset){
        SynsetType type = synset.getType();
        Set<Synset> setsabove = new HashSet<Synset>();
        if (type.equals(SynsetType.NOUN)){
            NounSynset nounsynset = (NounSynset) synset;
            setsabove.addAll(Arrays.asList(nounsynset.getHypernyms())); // ISA relation
            setsabove.addAll(Arrays.asList(nounsynset.getPartHolonyms())); // HASA relation
        }
        else{
            VerbSynset verbsynset = (VerbSynset) synset;
            setsabove.addAll(Arrays.asList(verbsynset.getHypernyms())); // ISA relation
        }
        return setsabove;
    }

    /**
     * Get the shortest total distance between a startnode and a goalnode
     * @param startpath the three from the perspective of the startnode
     * @param goalpath the three from the perspective of the goalnode
     * @param start the startnode
     * @param goal the goalnoade
     * @return the shortest total distance
     */
    private static int getTotalDistance(Map<Synset, Set<Synset>> startpath, Map<Synset, Set<Synset>> goalpath, Synset start, Synset goal) {
        int bestdistance = Integer.MAX_VALUE;
        Set<Synset> commonsets = new HashSet<Synset>();

        for (Synset synset : goalpath.keySet()) { // Get the shared sets 
            if (startpath.keySet().contains(synset)){
                commonsets.add(synset);
            }
        }
        // Go trough the sets that are shared between paths,
        // calculate the distance when using each of these as subsumer and keep the minimum distance
        for (Synset synset : commonsets) {
            int startToSubsumer = getSingleDistance(startpath, start, synset, 0);
            int goalToSubsumer = getSingleDistance(goalpath, goal, synset, 0);
            int totalDistance = startToSubsumer+goalToSubsumer;
            if (totalDistance < bestdistance){
                bestdistance = totalDistance;
            }
        }
        if (start.getType().equals(SynsetType.VERB)){ // If we're handling verbs, try the root nodes too
            for (Synset synset : rootverbs) {  
                // Get distance to current root nodes, but add one to each distance for the virtual rootnode
                int startToRoot = getSingleDistance(startpath, start, getRootNode(startpath), 1);
                int goalToRoot = getSingleDistance(goalpath, goal, getRootNode(goalpath), 1);
                int totalDistance = startToRoot+goalToRoot;
                if (totalDistance < bestdistance){
                    bestdistance = totalDistance;
                }
            }
        }
        return bestdistance;
    }
    
    

    /**
     * Calculates the path length between the given start and goal within the same path
     * @param path the given path, contains parents for each node
     * @param start the startndoe
     * @param goal the endnode
     * @param distance the distance traveled so far
     * @return the path length
     */
    private static int getSingleDistance(Map<Synset, Set<Synset>> path, Synset start, Synset goal, int distance) {
        if (goal.equals(start)){ // If goal is same as start, the pathlength is given by the traveled distance
            return distance;
        }
        else { // Check all possible paths to the goal and take the shortest to return
            int bestdistance = Integer.MAX_VALUE;
            Set<Synset> parents = path.get(start);
            for (Synset parent : parents) {
                int pathlength = getSingleDistance(path, parent, goal, distance+1); // Add one to traveled distance
                if (pathlength < bestdistance){
                    bestdistance = pathlength;
                }
            }
            return bestdistance;
        }
    }

    /**
     * Gets the root node from the given path
     * @param path the path
     * @return the root node
     */
    private static Synset getRootNode(Map<Synset, Set<Synset>> path) {
        for (Entry<Synset, Set<Synset>> entry : path.entrySet()) {
            if (entry.getValue().isEmpty()){
                return entry.getKey();
            }
        }
        return null;
    }
}