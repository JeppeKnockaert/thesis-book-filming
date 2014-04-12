package semanticrolelabeler;

import com.fasterxml.jackson.core.JsonEncoding;
import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.util.DefaultPrettyPrinter;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import edu.smu.tspell.wordnet.NounSynset;
import edu.smu.tspell.wordnet.Synset;
import edu.smu.tspell.wordnet.SynsetType;
import edu.smu.tspell.wordnet.VerbSynset;
import edu.smu.tspell.wordnet.WordNetDatabase;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import se.lth.cs.srl.CompletePipeline;
import se.lth.cs.srl.corpus.Predicate;
import se.lth.cs.srl.corpus.Sentence;
import se.lth.cs.srl.corpus.Word;
import se.lth.cs.srl.corpus.Yield;
import se.lth.cs.srl.options.CompletePipelineCMDLineOptions;
import se.lth.cs.srl.util.FileExistenceVerifier;

/**
 * Wrapper for the SRL library that creates a JSON file with the results from the input
 * @author jeknocka
 */
public class SemanticRoleLabeler {

    // Map with for each word and each type of that word, the related words
    private static final Map<String,Map<String,String[]>> relatedwordsMap = new HashMap<String, Map<String,String[]>>();

        
    /**
     * Executes main application
     * @param args the input file
     * @throws java.io.IOException Writing failed
     */
    public static void main(String[] args) throws IOException {
        // Set path to wordnet dictionairy
        System.setProperty("wordnet.database.dir", (new File("dict")).getAbsolutePath());

        // Look for filenames of inputfiles
        if (args.length != 2){
            System.err.println("needs <bookinput> <subtitleinput> as arguments");
            System.exit(0);
        }
        // Read in the sentences
        List<String> booksentences = new ArrayList<String>();
        List<String> subsentences = new ArrayList<String>();
        try {
            for (int i = 0; i <= 1; i++){
                BufferedReader in = new BufferedReader(new FileReader(args[i]));
                String sentence = in.readLine();
                while (sentence != null){
                    if (i == 0)
                        booksentences.add(sentence);
                    else
                        subsentences.add(sentence);
                    sentence = in.readLine();
                }
            }
        } catch (FileNotFoundException ex) {
            System.err.println("File not found!");
        } catch (IOException ex) {
            System.err.println(ex);
        }
        // Set default arguments for the SRL library
        String[] defaultargs = {
            "eng",
            "-tagger", "models/CoNLL2009-ST-English-ALL.anna-3.3.postagger.model",
            "-parser", "models/CoNLL2009-ST-English-ALL.anna-3.3.parser.model",
            "-srl", "models/CoNLL2009-ST-English-ALL.anna-3.3.srl-4.1.srl.model",
            "-lemma", "models/CoNLL2009-ST-English-ALL.anna-3.3.lemmatizer.model",
            "-tokenize"
        };
        
        // Parse the arguments
        CompletePipelineCMDLineOptions options=new CompletePipelineCMDLineOptions();
        options.parseCmdLineArgs(defaultargs);
        // Verify the arguments
        String error=FileExistenceVerifier.verifyCompletePipelineAllNecessaryModelFiles(options);
        if(error!=null){
            System.err.println(error);
            System.err.println("Aborting.");
            System.exit(1);
        }
        // Create pipeline of the SRL library in order to be able to parse sentences
        CompletePipeline completePipeline = null;
        try {
            completePipeline = CompletePipeline.getCompletePipeline(options);
        } catch (ClassNotFoundException ex) {
            System.err.println(ex);
        }
        
        List<Sentence> booksentencelist = new ArrayList<>();
        List<Sentence> subsentencelist = new ArrayList<>();
        int totalsize = booksentences.size()+subsentences.size();
        // Parse all sentences and add them in a list for printing     
        if (completePipeline != null){
            int index = 0;
            int prevprocent = -1;
            for (String stringsentence : booksentences){
                prevprocent = printProgress(index, totalsize, prevprocent);
                booksentencelist.add(parseSentence(completePipeline, stringsentence));
                index++;
            }
            for (String stringsentence : subsentences){
                prevprocent = printProgress(index, totalsize, prevprocent);
                subsentencelist.add(parseSentence(completePipeline, stringsentence));
                index++;
            }
        }
        
        // Prepare JSON files with the results
        JsonFactory jfactory = new JsonFactory();
        JsonGenerator srlgen = jfactory.createGenerator(new File("srlout.json"),JsonEncoding.UTF8);
        JsonGenerator posgen = jfactory.createGenerator(new File("posout.json"),JsonEncoding.UTF8);
        try {
            srlgen.setPrettyPrinter(new DefaultPrettyPrinter()); // Enable pretty printing
            posgen.setPrettyPrinter(new DefaultPrettyPrinter());
            // Write the results for the book
            srlgen.writeStartObject();
            posgen.writeStartObject();
            srlgen.writeFieldName("book");
            posgen.writeFieldName("book");
            srlgen.writeStartArray(); // Start array with sentences
            posgen.writeStartArray();
            // Parse all sentences    
            for (Sentence sentence : booksentencelist){
                generateSRLSentence(srlgen, sentence);
                generatePOSSentence(posgen, sentence);
            }
            srlgen.writeEndArray(); // End array with sentences
            posgen.writeEndArray();
            // Write the results for the subtitle
            srlgen.writeFieldName("subtitle");
            posgen.writeFieldName("subtitle");
            srlgen.writeStartArray(); // Start array with sentences
            posgen.writeStartArray();
            // Parse all sentences    
            for (Sentence sentence : subsentencelist){
                generateSRLSentence(srlgen, sentence);
                generatePOSSentence(posgen, sentence);
            }
            srlgen.writeEndArray(); // End array with sentences
            posgen.writeEndArray();
            srlgen.writeEndObject();                  
            posgen.writeEndObject();
        } finally{
            srlgen.close();
            posgen.close();
        }
        // Write related words map to file
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.enable(SerializationFeature.INDENT_OUTPUT); //Enable pretty printing
        objectMapper.writeValue(new File("relatedwords.json"), relatedwordsMap);
    }     
    
    /**
     * Parse a sentence using the given pipeline
     * @param completePipeline the SRL pipeline
     * @param stringsentence the sentence to parse
     * @return the parsed sentence
     */
    private static Sentence parseSentence(CompletePipeline completePipeline, String stringsentence){
        Sentence sentence = null;
        try {
            sentence = completePipeline.parse(stringsentence); // Parse the sentence
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
     * Print progress to stdout
     * @param index current index
     * @param totalsize total number of sentences to parse
     * @param prevprocent last printed percentage
     * @return last printed percentage
     */
    private static int printProgress(int index, int totalsize, int prevprocent){
        int procent = index*100/totalsize;
        if (procent != prevprocent){
            System.out.println(procent+"% ("+index+"/"+totalsize+")");
        }
        return procent;
    }

    /**
     * Write SRL parse results to the JsonGenerator in order to write it later on
     * @param jgenerator the JSON generator
     * @param sentence the parsed sentence
     * @throws IOException writing failed
     */
    private static void generateSRLSentence(JsonGenerator jgenerator, Sentence sentence) throws IOException {
        boolean started = false;
        List<Predicate> predicates = sentence.getPredicates();
        for (Predicate predicate : predicates){ // Iterate the predicates
            if (predicate.getPOS().contains("VB")){ // Only verb predicates are needed
                if (!started){ // If object not yet openend
                    jgenerator.writeStartObject(); // Start object with predicates
                    started = true;
                }
                jgenerator.writeFieldName(predicate.getForm()); // Predicate as field name
                Map<Word, String> argmap = predicate.getArgMap(); // Get the arguments of the predicate
                Set<Word> arguments = argmap.keySet();
                jgenerator.writeStartObject(); // Start object with arguments
                jgenerator.writeFieldName("rel"); // Label to indicate the verb
                jgenerator.writeStartArray();
                jgenerator.writeString(predicate.getForm());
                jgenerator.writeEndArray();
                for (Entry<Word, String> entry : argmap.entrySet()){
                    Word word = entry.getKey();
                    String argLabel = entry.getValue();
                    Yield argYield = word.getYield(predicate, argLabel, arguments);
                    jgenerator.writeFieldName(argLabel); // Write argument label
                    jgenerator.writeStartArray(); // Start array with words (associated with the argument)
                    for (Word yieldWord : argYield){ // Add all the words (associated with the argument)
                        if (yieldWord.getForm().matches(".*[a-zA-Z].*")){ // Don't do punctuation
                            jgenerator.writeString(yieldWord.getForm());
                        }
                    }
                    jgenerator.writeEndArray(); // End array with words
                }
                jgenerator.writeEndObject(); // End object with arguments
            }
        }
        if (started){ // If there is an object
            jgenerator.writeEndObject(); // End object with predicates
        }
        else{
            jgenerator.writeNull(); // Fill in null if there is no object
        }        
    }

    /**
     * Write POS parse results to the JsonGenerator in order to write it later on
     * @param jgenerator the JSON generator
     * @param sentence the parsed sentence
     * @throws IOException writing failed
     */
    private static void generatePOSSentence(JsonGenerator jgenerator, Sentence sentence) throws IOException{
        String[] posarray = sentence.getPOSArray();
        String[] wordarray = sentence.getFormArray();
        jgenerator.writeStartObject(); // Start object with words from the sentence
        for (int i = 0; i < wordarray.length; i++){
            if (wordarray[i].matches(".*[a-zA-Z].*")){ // Don't do empty strings or punctuation
                jgenerator.writeFieldName(wordarray[i]); // word as field name
                jgenerator.writeString(posarray[i]); // pos as value
                generateRelatedWords(wordarray[i], posarray[i]);
            }
        }
        jgenerator.writeEndObject(); // End object with words from the sentence
    }
        
    private static void generateRelatedWords(String word, String POS) throws IOException{
        String lowercaseword = word.toLowerCase();
                
        // Find the synset type based on the POS tag
        SynsetType type = SynsetType.NOUN;
        String keytype = "n";
        if (POS.contains("VB")){
            type = SynsetType.VERB;
            keytype = "v";
        }
        else if (POS.contains("JJ")){
            type = SynsetType.ADJECTIVE;
            keytype = "a";
        }
        else if (POS.contains("RB")){
            type = SynsetType.ADVERB;
            keytype = "r";
        }
                
        // If we haven't got the related words yet, get them
        if (!relatedwordsMap.containsKey(lowercaseword)|| !relatedwordsMap.get(lowercaseword).containsKey(keytype)){
            WordNetDatabase wn = WordNetDatabase.getFileInstance(); // Get the wordnet database

            Synset[] synsets = wn.getSynsets(word, type);
            List<Synset> relatedsynsets = new ArrayList<>();
            Set<String> relatedstrings = new HashSet<>();
            for (Synset syns : synsets){
                relatedstrings.addAll(Arrays.asList(syns.getWordForms())); // Add synonyms
                if (type.equals(SynsetType.NOUN)){
                    NounSynset nsyns = (NounSynset)syns;
                    relatedsynsets.addAll(Arrays.asList(nsyns.getHypernyms())); // Add the hypernyms
                    relatedsynsets.addAll(Arrays.asList(nsyns.getHyponyms())); // Add the hyponyms
                    // Add the holonyms
                    relatedsynsets.addAll(Arrays.asList(nsyns.getMemberHolonyms()));
                    relatedsynsets.addAll(Arrays.asList(nsyns.getPartHolonyms()));
                    relatedsynsets.addAll(Arrays.asList(nsyns.getSubstanceHolonyms()));
                    // Add the meronyms
                    relatedsynsets.addAll(Arrays.asList(nsyns.getMemberMeronyms()));
                    relatedsynsets.addAll(Arrays.asList(nsyns.getPartMeronyms()));
                    relatedsynsets.addAll(Arrays.asList(nsyns.getSubstanceMeronyms()));
                }
                else if (type.equals(SynsetType.VERB)){
                    VerbSynset vsyns = (VerbSynset)syns; 
                    relatedsynsets.addAll(Arrays.asList(vsyns.getHypernyms())); // Add the hypernyms
                    relatedsynsets.addAll(Arrays.asList(vsyns.getTroponyms())); // Add the hyponyms
                }
            }
            for (Synset syns : relatedsynsets){
                relatedstrings.addAll(Arrays.asList(syns.getWordForms()));
            }
            if (!relatedstrings.isEmpty()){ // Don't need to add to the map if there are no related terms
                // If we haven't got the related words yet, make a hashmap to store them
                if (!relatedwordsMap.containsKey(lowercaseword)){
                    relatedwordsMap.put(lowercaseword, new HashMap<String, String[]>());
                }
                relatedwordsMap.get(lowercaseword).put(keytype,relatedstrings.toArray(new String[0])); // Add the resulting array to the map
            }
        }
    }
}

