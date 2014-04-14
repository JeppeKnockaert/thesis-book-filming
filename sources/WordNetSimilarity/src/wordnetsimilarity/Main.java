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
    
    // Optimal parameters for WordNet
    private static final double alpha = 0.2;
    private static final double beta = 0.45;
    
    // Class to represent path results
    private static class Path{
        private final int length;
        private final Synset subsumer;
        private int subsumerdepth;
        
        public Path(int length, Synset subsumer){
            this.length = length;
            this.subsumer = subsumer;
        }

        public void setSubsumerdepth(int subsumerdepth) {
            this.subsumerdepth = subsumerdepth;
        }
    }
    
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
    private static double getWordSimilarity(String word1, String word2, String pos1, String pos2) {
        WordNetDatabase wn = WordNetDatabase.getFileInstance(); // Get the wordnet database
        SynsetType type1 = getSynsetType(pos1); 
        SynsetType type2 = getSynsetType(pos2);
        
        if (word1.equals(word2)){ // If the words are the same, the similarity is 1
            return 1;
        }
        else if (type1.equals(type2)){ // Same POS
            
            Synset[] syns1 = wn.getSynsets(word1,type1);
            Synset[] syns2 = wn.getSynsets(word2,type2);
            if (syns1.length > 0 && syns2.length > 0){ // Both words included in WordNet
                Path path = getPath(syns1,syns2);
                double lengthfunction = Math.exp(-alpha*path.length);
                double ebh = Math.exp(beta*path.subsumerdepth);
                double nebh = Math.exp(-beta*path.subsumerdepth);
                double depthfunction = (ebh-nebh)/(ebh+nebh);
                System.out.println("depth: "+path.subsumerdepth);
                System.out.println("length: "+path.length);
                System.out.println(lengthfunction*depthfunction);
                return lengthfunction*depthfunction;
            }
        }
        return 0; // In all other cases, the similarity is zero
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
     * @return the path
     */
    private static Path getPath(Synset[] synsets1, Synset[] synsets2) {
        
        // Calculate paths
        Map<Synset, Map<Synset, Set<Synset>>> trees1 = new HashMap<Synset, Map<Synset, Set<Synset>>>();
        Map<Synset, Map<Synset, Set<Synset>>> trees2 = new HashMap<Synset, Map<Synset, Set<Synset>>>();
        for (Synset synset : synsets1) {
            trees1.put(synset, calculatePaths(synset));
        }
        for (Synset synset : synsets2) {
            trees2.put(synset, calculatePaths(synset));
        }
        
        Set<String> words1 = new HashSet<String>();
        Set<String> words2 = new HashSet<String>();
        // Look for an equal synset (= pathlength 0)
        for (Synset synset1 : synsets1) { 
            for (Synset synset2 : synsets2) {
                if (synset1.equals(synset2)) {
                    Path path = new Path(0,synset1);
                    path.setSubsumerdepth(getSubsumerDepth(trees1.get(synset1), trees2.get(synset2), synset1));
                    return path;
                }
                words1.addAll(Arrays.asList(synset1.getWordForms()));
                words2.addAll(Arrays.asList(synset2.getWordForms()));
            }
        }
        // Look for common words in the synsets (= pathlength 1)
        for (String word : words1) {
            if (words2.contains(word)){ 
                // Get a random synset from both words (because the level is the same for each one), take the deepest of the two and return it
                int depth1 = getSubsumerDepth(trees1.get(synsets1[0]), trees2.get(synsets2[0]), synsets1[0]);
                int depth2 = getSubsumerDepth(trees1.get(synsets1[0]), trees2.get(synsets2[0]), synsets2[0]);
                if (depth1 >= depth2){
                    Path path = new Path(1, synsets1[0]);
                    path.setSubsumerdepth(depth1);
                    return path;
                }
                else{
                    Path path = new Path(1, synsets2[0]);
                    path.setSubsumerdepth(depth2);
                    return path;
                }
            }
        }
        
        // Compare paths
        Path minpath = null;
        Map<Synset, Set<Synset>> mintree1 = null;
        Map<Synset, Set<Synset>> mintree2 = null;
        
        for (Entry<Synset, Map<Synset, Set<Synset>>> tree1 : trees1.entrySet()) {
            for (Entry<Synset, Map<Synset, Set<Synset>>> tree2 : trees2.entrySet()) {
                Path newpath = getTotalPath(tree1.getValue(),tree2.getValue(),
                        tree1.getKey(),tree2.getKey());
                if (minpath == null || newpath.length < minpath.length){
                    mintree1 = tree1.getValue();
                    mintree2 = tree2.getValue();
                    minpath = newpath;
                }
            }
        }
        if (minpath != null && minpath.subsumer != null){ // If the subsumer is filled in, set its depth
            minpath.setSubsumerdepth(getSubsumerDepth(mintree1, mintree2, minpath.subsumer));
        }
        return minpath;
    }

    /**
     * Calculate the tree for a given leaf node
     * @param synset the leaf node
     * @return the tree, represented as a map with the parents for each node
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
     * Get the path with shortest total distance between a startnode and a goalnode
     * @param starttree the tree from the perspective of the startnode
     * @param goaltree the tree from the perspective of the goalnode
     * @param start the startnode
     * @param goal the goalnoade
     * @return the path with the shortest total distance
     */
    private static Path getTotalPath(Map<Synset, Set<Synset>> starttree, Map<Synset, Set<Synset>> goaltree, Synset start, Synset goal) {
        int bestdistance = Integer.MAX_VALUE;
        Synset bestsubsumer = null;
        Set<Synset> commonsets = new HashSet<Synset>();
        
        for (Synset synset : goaltree.keySet()) { // Get the shared sets 
            if (starttree.keySet().contains(synset)){
                commonsets.add(synset);
            }
        }
        // Go trough the nodes that are shared between trees,
        // calculate the distance when using each of these as subsumer and keep the minimum distance
        for (Synset synset : commonsets) {
            int startToSubsumer = getSingleDistance(starttree, start, synset, 0);
            int goalToSubsumer = getSingleDistance(goaltree, goal, synset, 0);
            int totalDistance = startToSubsumer+goalToSubsumer;
            if (totalDistance < bestdistance){
                if (totalDistance == 9){
                    int startToSubsumer2 = getSingleDistance(starttree, start, synset, 0);
                    System.out.println("");
                }
                bestdistance = totalDistance;
                bestsubsumer = synset;
            }
        }
        if (start.getType().equals(SynsetType.VERB)){ // If we're handling verbs, try the root nodes too
            // Get distance to current root nodes, but add one to each distance for the virtual rootnode
            int startToRoot = getSingleDistance(starttree, start, getRootNode(starttree), 1);
            int goalToRoot = getSingleDistance(goaltree, goal, getRootNode(goaltree), 1);
            int totalDistance = startToRoot+goalToRoot;
            if (totalDistance < bestdistance){
                bestdistance = totalDistance;
            }
        }
        Path path = new Path(bestdistance,bestsubsumer);
        // If a virtual root node (in the case of verbs) was chose, that's the subsumer
        // This isn't a real node, so we set subsumer to null, but we know its depth (0)
        if (bestsubsumer == null){ 
            path.setSubsumerdepth(0);
        }
        return path;
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
    
    /**
     * Gets the maximal depth in the hierarchical tree for the subsumer node
     * @param tree1 tree1
     * @param tree2 tree2
     * @param subsumer subsumer node
     * @return the maximal depth
     */
    private static int getSubsumerDepth(Map<Synset, Set<Synset>> tree1, Map<Synset, Set<Synset>> tree2, Synset subsumer){
        Synset root1 = getRootNode(tree1);
        Synset root2 = getRootNode(tree2);
        int depth1 = getSingleDistance(tree1,subsumer,root1,0);
        int depth2 = getSingleDistance(tree2,subsumer,root2,0);
        int maxdepth = (depth1>=depth2)?depth1:depth2;
        if (!root1.equals(root2)){ // Shared virtual node, add 1 to outcome!
            maxdepth++;
        }
        return maxdepth;
    }
}