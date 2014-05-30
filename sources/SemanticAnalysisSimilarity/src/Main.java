import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import se.lth.cs.srl.CompletePipeline;
import se.lth.cs.srl.options.CompletePipelineCMDLineOptions;
import se.lth.cs.srl.util.FileExistenceVerifier;

/**
 * Synchronizes a given book and subtitle using sentence level semantic analysis
 * @author jeknocka
 */
public class Main {
        
    /**
     * Executes main application
     * @param args the input file
     * @throws java.io.IOException Writing failed
     */
    public static void main(String[] args) throws IOException {
        // Set path to wordnet dictionairy
        System.setProperty("wordnet.database.dir", (new File("dict")).getAbsolutePath());

        // Look for filenames of inputfiles
        if (args.length != 6){
            System.err.println("needs <bookinput> <subtitleinput> <mindelta> <minnumberofmatchingwords> <relsearchwindow> <minimumscorefortimewindow> as arguments");
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
        float mindelta = Float.parseFloat(args[2]);
        int minnumberofmatchingwords = Integer.parseInt(args[3]);
        float relsearchwindow = Float.parseFloat(args[4]);
        float minimumscorefortimewindow = Float.parseFloat(args[5]);
        
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
        // Execute synchronisation
        SentenceLevelSemanticSimilarity sentencesim = new SentenceLevelSemanticSimilarity(completePipeline, mindelta, minnumberofmatchingwords, relsearchwindow, minimumscorefortimewindow);
        sentencesim.synchronize(booksentences, subsentences);
    }     
}

