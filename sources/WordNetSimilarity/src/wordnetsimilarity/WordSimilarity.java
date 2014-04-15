package wordnetsimilarity;

import edu.smu.tspell.wordnet.NounSynset;
import edu.smu.tspell.wordnet.Synset;
import edu.smu.tspell.wordnet.SynsetType;
import edu.smu.tspell.wordnet.VerbSynset;
import edu.smu.tspell.wordnet.WordNetDatabase;
import java.io.File;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Singleton class with functions to calculate word similarity
 * @author jeknocka
 */
public class WordSimilarity {
    
    // Cache for similarities between words
    private final Map<String,Double> cachednounsimilarities;
    private final Map<String,Double> cachedverbsimilarities;
    
    // Cache for the wordtrees
    private final Map<Synset, Map<Synset, Set<Synset>>> cachedSynsetTrees;
    
    // Cache for nodes
    private final Map<Synset, Set<Synset>> nounnodes;
    private final Map<Synset, Set<Synset>> nounnodeswithoutholonyms;
    private final Map<Synset, Set<Synset>> verbnodes;
    
    // Cache for distances
    private final Map<Synset,Map<Synset, Integer>> cacheddistances;
    
    // Optimal parameters for WordNet
    private static final double alpha = 0.2;
    private static final double beta = 0.45;
    
    // Class to represent path results
    private class Path{
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
    
    // WordNet DB instance
    private final static WordNetDatabase wn = WordNetDatabase.getFileInstance(); // Get the wordnet database
    
    // Instance
    private final static WordSimilarity instance = new WordSimilarity();
    
    public static WordSimilarity getInstance(){
        return instance;
    }
    
    private WordSimilarity(){
        // Set path to wordnet dictionairy
        System.setProperty("wordnet.database.dir", (new File("dict")).getAbsolutePath());
        cachednounsimilarities = new HashMap<String,Double>();
        cachedverbsimilarities = new HashMap<String,Double>();
        cachedSynsetTrees = new HashMap<Synset, Map<Synset, Set<Synset>>>();
        cacheddistances = new HashMap<Synset, Map<Synset, Integer>>();
        nounnodes = new HashMap<Synset, Set<Synset>>();
        nounnodeswithoutholonyms = new HashMap<Synset, Set<Synset>>();
        verbnodes = new HashMap<Synset, Set<Synset>>();
    }
    
    /**
     * Get the word similarity of two words
     * @param word1 first word
     * @param word2 second word
     * @param pos1 POS tag of first word
     * @param pos2 POS tag of second word
     * @return the word similarity
     */
    public double getWordSimilarity(String word1, String word2, String pos1, String pos2) {
        SynsetType type1 = getSynsetType(pos1); 
        SynsetType type2 = getSynsetType(pos2);
        
        if (word1.equals(word2)){ // If the words are the same, the similarity is 1
            return 1;
        }
        else if (type1 != null && type1.equals(type2) && // Same POS
                (type1.equals(SynsetType.NOUN)||type1.equals(SynsetType.VERB))){ // Only verbs and nouns have hierarchies
            double fromCache = checkCacheForSimilarity(word1,word2,type1);
            if (fromCache >= 0){
                return fromCache;
            }
            Synset[] syns1 = wn.getSynsets(word1,type1);
            Synset[] syns2 = wn.getSynsets(word2,type2);
            if (syns1.length > 0 && syns2.length > 0){ // Both words included in WordNet
                Path path = getPath(syns1,syns2);
                double lengthfunction = Math.exp(-alpha*path.length);
                double ebh = Math.exp(beta*path.subsumerdepth);
                double nebh = Math.exp(-beta*path.subsumerdepth);
                double depthfunction = (ebh-nebh)/(ebh+nebh);
                double similarity = lengthfunction*depthfunction;
                // Cache similarity value
                addSimilarityToCache(word1,word2,type1,similarity);
                return similarity;
            }
        }
        return 0; // In all other cases, the similarity is zero
    }

    /**
     * Find the synset type based on the POS tag
     * @param pos the pos tag
     * @return the synsettype according to the tag
     */
    private SynsetType getSynsetType(String pos) {
        SynsetType type = null;
        if (pos.contains("NN")){
            type = SynsetType.NOUN;
        }
        else if (pos.contains("VB")){
            type = SynsetType.VERB;
        }
        return type;
    }

    /**
     * Gets the shortest path length between two synsets
     * @param synsets1 first synset
     * @param synsets2 second synset
     * @return the path
     */
    private Path getPath(Synset[] synsets1, Synset[] synsets2) {
        // Calculate paths
        Map<Synset, Map<Synset, Set<Synset>>> trees1 = new HashMap<Synset, Map<Synset, Set<Synset>>>();
        Map<Synset, Map<Synset, Set<Synset>>> trees2 = new HashMap<Synset, Map<Synset, Set<Synset>>>();
        for (Synset synset : synsets1) {
            trees1.put(synset, getSynsetTree(synset));
        }
        for (Synset synset : synsets2) {
            trees2.put(synset, getSynsetTree(synset));
        }
        
        // Look for an equal synset (= pathlength 0)
        for (Synset synset1 : synsets1) { 
            for (Synset synset2 : synsets2) {
                if (synset1.equals(synset2)) {
                    Path path = new Path(0,synset1);
                    path.setSubsumerdepth(getSingleDistance(trees1.get(synset1),synset1,null));
                    return path;
                }
            }
        }
        // Look for common words in the synsets (= pathlength 1)
        for (Synset synset1 : synsets1) {
            List<String> words1 = Arrays.asList(synset1.getWordForms());
            for (Synset synset2 : synsets2) {
                String[] words2 = synset2.getWordForms();
                for (String word : words2) {
                    if (words1.contains(word)){
                        // Get the deepest of the two synsets
                        int depth1 = getSingleDistance(trees1.get(synset1), synset1, null);
                        int depth2 = getSingleDistance(trees2.get(synset2), synset2, null);
                        int maxdepth = (depth1 >= depth2)?depth1:depth2;
                        Synset subsumer = (depth1 >= depth2)?synset1:synset2;
                        Path path = new Path(1, subsumer);
                        path.setSubsumerdepth(maxdepth);
                        return path;                        
                    }
                }
            }
        }
        
        // Compare paths
        Path minpath = null;
        Map<Synset, Set<Synset>> mintree = null;
        
        for (Map.Entry<Synset, Map<Synset, Set<Synset>>> tree1 : trees1.entrySet()) {
            for (Map.Entry<Synset, Map<Synset, Set<Synset>>> tree2 : trees2.entrySet()) {
                Path newpath = getTotalPath(tree1.getValue(),tree2.getValue(),
                        tree1.getKey(),tree2.getKey());
                if (minpath == null || newpath.length < minpath.length){
                    mintree = tree1.getValue();
                    minpath = newpath;
                }
            }
        }
        if (minpath != null && minpath.subsumer != null){ // If the subsumer is filled in, set its depth
            minpath.setSubsumerdepth(getSingleDistance(mintree, minpath.subsumer, null));
        }
        return minpath;
    }

    /**
     * Calculate the tree for a given leaf node
     * @param synset the leaf node
     * @return the tree, represented as a map with the parents for each node
     */
    private Map<Synset, Set<Synset>> calculatePaths(Synset synset, boolean withholonyms) {
        // Parents for each treenode
        Map<Synset, Set<Synset>> parents = new HashMap<Synset, Set<Synset>>(); 
        // All childnodes for a certain node (not only direct ones)
        Map<Synset, Set<Synset>> setsbelow = new HashMap<Synset, Set<Synset>>(); 
        
        Set<Synset> setsabove = getSynsetsAbove(synset,withholonyms); // Get the sets above the initial synset
        parents.put(synset,setsabove); // Add the parents of the inital synset
        for (Synset setabove : setsabove) { // Add the initial node as child for every member of its parents
            Set<Synset> setbelow = new HashSet<Synset>();
            setbelow.add(synset);
            setsbelow.put(setabove, setbelow);
        }
        while (!setsabove.isEmpty()){ // Keep going till the root is reached
            Set<Synset> newsetsabove = new HashSet<Synset>();
            for (Synset levelset : setsabove) {
                Set<Synset> currentsetsbelow = setsbelow.get(levelset);
                Set<Synset> setsabovelevel = getSynsetsAbove(levelset,withholonyms);
                parents.put(levelset,setsabovelevel);
                for (Synset setabovelevel : setsabovelevel) { // Add the children to each parent
                    Set<Synset> setsbelowlevel = new HashSet(currentsetsbelow);
                    // The set above is contained in the sets below on the same branch
                    // => We have a loop!
                    if (setsbelow.get(levelset).contains(setabovelevel)){
                        // we have a loop caused by holonyms 
                        if(synset.getType().equals(SynsetType.NOUN)){ 
                            return calculatePaths(synset, false); // Disable holonyms and try again!
                        }
                        // We have a verb loop, because we reached a root node that refers to its child as hypernym
                        else{ 
                            parents.put(levelset,new HashSet<Synset>()); // Make it a true root node
                        }
                    }   
                    else{
                        setsbelowlevel.add(levelset);
                        setsbelow.put(setabovelevel, setsbelowlevel);
                    }

                }
            }
            for (Synset levelset : setsabove) { // Check paths to pursue in the next round
                Set<Synset> abovelevelsets = parents.get(levelset);
                for (Synset abovelevelset : abovelevelsets) {
                    if (!parents.containsKey(abovelevelset)){
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
     * @param allowholonyms are holonyms allowed as supersets (could be disabled to prevent loops in the tree)
     * @return the supersets
     */
    private Set<Synset> getSynsetsAbove(Synset synset, boolean allowholonyms){
        SynsetType type = synset.getType();
        Set<Synset> setsabove = new HashSet<Synset>();
        if (type.equals(SynsetType.NOUN)){
            Set<Synset> cachedparents = (allowholonyms)?nounnodes.get(synset):nounnodeswithoutholonyms.get(synset);
            if (cachedparents != null){
                return cachedparents;
            }
            else{
                NounSynset nounsynset = (NounSynset) synset;
                setsabove.addAll(Arrays.asList(nounsynset.getHypernyms())); // ISA relation
                if (allowholonyms){
                    setsabove.addAll(Arrays.asList(nounsynset.getPartHolonyms())); // HASA relation
                    nounnodes.put(synset, setsabove);
                }
                else{
                    nounnodeswithoutholonyms.put(synset, setsabove);
                }
            }
        }
        else {
            Set<Synset> cachedparents = verbnodes.get(synset);
            if (cachedparents != null){
                return cachedparents;
            }
            VerbSynset verbsynset = (VerbSynset) synset;
            setsabove.addAll(Arrays.asList(verbsynset.getHypernyms())); // ISA relation
            verbnodes.put(synset,setsabove);
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
    private Path getTotalPath(Map<Synset, Set<Synset>> starttree, Map<Synset, Set<Synset>> goaltree, Synset start, Synset goal) {
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
            int startToSubsumer = getSingleDistance(starttree, start, synset);
            int goalToSubsumer = getSingleDistance(goaltree, goal, synset);
            int totalDistance = startToSubsumer+goalToSubsumer;
            if (totalDistance < bestdistance){
                bestdistance = totalDistance;
                bestsubsumer = synset;
            }
        }
        if (start.getType().equals(SynsetType.VERB)){ // If we're handling verbs, try the root nodes too
            // Get distance to current root nodes, but add one to each distance for the virtual rootnode
            int startToRoot = getSingleDistance(starttree, start, null);
            int goalToRoot = getSingleDistance(goaltree, goal, null);
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
     * @param path given path, contains parents for each node
     * @param start start node
     * @param goal end node, null if looking for the distance to the root node
     * @return the path length
     */
    private int getSingleDistance(Map<Synset, Set<Synset>> path, Synset start, Synset goal){
        int dist =  getSingleDistanceRecursive(path, start, goal, 0);
        if (dist < 0){
            System.err.println("No distance found!");
        }
        return dist;
    }

    /**
     * Calculates the path length between the given start and goal within the same path
     * @param path given path, contains parents for each node
     * @param start start node
     * @param goal end node, null if looking for the distance to the root node
     * @param distance the distance traveled so far
     * @return the path length
     */
    private int getSingleDistanceRecursive(Map<Synset, Set<Synset>> path, Synset start, Synset goal, int distance) {
        // Check cache
        Map<Synset, Integer> cachedstartdistances = cacheddistances.get(start);
        Integer cacheddistance = (cachedstartdistances!=null)?cachedstartdistances.get(goal):null;
        
        if (cacheddistance != null){
            return distance+cacheddistance;
        }
        if (goal != null && goal.equals(start)){ // If goal is same as start, the pathlength is given by the traveled distance
            return distance;
        }
        else { // Check all possible paths to the goal and take the shortest to return
            int bestdistance = Integer.MAX_VALUE;
            Set<Synset> parents = path.get(start);
            // If looking for the root node, we've found it, 
            //because the startnode is the root node (it has no parents)
            if (goal == null && parents.isEmpty()){ 
                if (start.getType().equals(SynsetType.VERB)){ // Real root node is virtual, so one up
                    distance++;
                }
                return distance;
            }
            for (Synset parent : parents) {
                int pathlength = getSingleDistanceRecursive(path, parent, goal, distance+1); // Add one to traveled distance
                if (pathlength < bestdistance && pathlength >= 0){
                    bestdistance = pathlength;
                }
            }
            // Write to cache
            if (cachedstartdistances == null){
                cachedstartdistances = new HashMap<Synset, Integer>();
                cacheddistances.put(start, cachedstartdistances);
            }
            if (bestdistance == Integer.MAX_VALUE){ // No path found
                return -1;
            }
            else{
                cachedstartdistances.put(goal,bestdistance);
                return bestdistance;
            }
        }
    }
    
    /**
     * Check if the similarity value was cached before
     * @param word1 first word
     * @param word2 second word
     * @param type type of the words
     * @return -1 if not cached, else the similarity value
     */
    private double checkCacheForSimilarity(String word1, String word2, SynsetType type) {
        String key = (word1.compareTo(word2) <= 0)?word1+" "+word2:word2+" "+word1;
        Double result;
        if (type.equals(SynsetType.NOUN)){
            result = cachednounsimilarities.get(key);
        }
        else{
            result = cachedverbsimilarities.get(key);
        }
        if (result != null){
            return result;
        }
        else{
            return -1;
        }
    }
    
    /**
     * Adds the similarity value to the cache
     * @param word1 first word
     * @param word2 second word
     * @param type word type
     * @param similarity the similarity value
     */
    private void addSimilarityToCache(String word1, String word2, SynsetType type, double similarity) {
        String key = (word1.compareTo(word2) <= 0)?word1+" "+word2:word2+" "+word1;
        if (type.equals(SynsetType.NOUN)){
            cachednounsimilarities.put(key, similarity);
        }
        else{
            cachedverbsimilarities.put(key, similarity);
        }
    }
    
    /**
     * Gets a synset tree from cache if possible or generates one, saves it in the cache and returns it
     * @param synset the synset
     * @return the synset tree
     */
    private Map<Synset, Set<Synset>> getSynsetTree(Synset synset) {
        Map<Synset, Set<Synset>> tree = cachedSynsetTrees.get(synset);
        if (tree == null){
            tree = calculatePaths(synset,true);
            cachedSynsetTrees.put(synset, tree);
        }
        return tree;
    }
    
}
