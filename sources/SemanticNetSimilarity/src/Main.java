import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

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
        if (args.length != 8){
            System.err.println("needs <book> <subtitle> <mindelta> <minnumberofwords> <relsearchwindow> <minimumscorefortimewindow> <minwordsim> <relativelexicalimportance> as argument");
            System.exit(0);
        }
        
        // Read in the sentences
        List<String> booksentences = new ArrayList<String>();
        List<String> subtitlesentences = new ArrayList<String>();
        try {
            for (int i = 0; i <= 1; i++){
                BufferedReader in = new BufferedReader(new FileReader(args[i]));
                String sentence = in.readLine();
                while (sentence != null){
                    if (i == 0)
                        booksentences.add(sentence);
                    else
                        subtitlesentences.add(sentence);
                    sentence = in.readLine();
                }
            }
        } catch (FileNotFoundException ex) {
            System.err.println("File not found!");
        } catch (IOException ex) {
            System.err.println(ex);
        }
        float mindelta = Float.parseFloat(args[2]);
        int minnumberofwords = Integer.parseInt(args[3]);
        float relsearchwindow = Float.parseFloat(args[4]);
        float minimumscorefortimewindow = Float.parseFloat(args[5]);
        float minwordsim = Float.parseFloat(args[6]);
        float relativelexicalimportance = Float.parseFloat(args[7]);
        
        SemanticSimilarity semsim = new SemanticSimilarity(mindelta,minnumberofwords,relsearchwindow,minimumscorefortimewindow,minwordsim,relativelexicalimportance);
        semsim.synchronize(booksentences, subtitlesentences);
        
    }
}