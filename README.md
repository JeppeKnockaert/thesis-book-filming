thesis-book-filming
===================

Thesis for MMLab (Ghent University) about the alignment of ebooks and their film adaptations.

##Requirements

- Node.js 
- Java 7

##Installation

###Configuration
Go to the server folder, rename config-example.json to config.json. Each of the fields can be filled according to the preferred modules. A module is entered by using its filename without the extension. The matcherparameters field is used to pass an array of parametervalues (need to be in the order specified by the matcher).

###Dependencies
Go into your cloned folder trough a terminal and enter the following

``` bash
$ npm install
```

Node will automatically fetch all dependencies for the project.

###Java libraries

####Dependencies

You will need to download the WordNet dictionairies and place them in this directory (relative to the main folder): 
server/synchronisation/libs/dict

To get all the latest dictionairy files:
- First download the [full WordNet distribution (3.0)](http://wordnetcode.princeton.edu/3.0/WordNet-3.0.tar.bz2)
- Get the dict folder from the distribution and move it to server/synchronisation/srl/dict
- Then download the [updated dictionairy files (3.1)](http://wordnetcode.princeton.edu/wn3.1.dict.tar.gz)
- Move the files to server/synchronisation/libs/dict and replace the ones that already exist

####Models

The SRL library and the OpenNLP library need model files to work properly. 
These files are quite big, that's why you need to download them yourself and put them in the right directory.

Download the following files:

- [CoNLL2009-ST-English-ALL.anna-3.3.srl-4.1.srl.model](https://mate-tools.googlecode.com/files/CoNLL2009-ST-English-ALL.anna-3.3.srl-4.1.srl.model)
- [CoNLL2009-ST-English-ALL.anna-3.3.parser.model](https://mate-tools.googlecode.com/files/CoNLL2009-ST-English-ALL.anna-3.3.parser.model)
- [CoNLL2009-ST-English-ALL.anna-3.3.postagger.model](https://mate-tools.googlecode.com/files/CoNLL2009-ST-English-ALL.anna-3.3.postagger.model)
- [CoNLL2009-ST-English-ALL.anna-3.3.lemmatizer.model](https://mate-tools.googlecode.com/files/CoNLL2009-ST-English-ALL.anna-3.3.lemmatizer.model)
- [en-token.bin](http://opennlp.sourceforge.net/models-1.5/en-token.bin)
- [en-pos-maxent.bin](http://opennlp.sourceforge.net/models-1.5/en-pos-maxent.bin)

Put them in this directory (relative to the main folder): server/synchronisation/libs/models

##Usage

In order to start the server application, use the following command in your main folder

``` bash
$ node server/server.js
```

This will start the server on port 4000.
