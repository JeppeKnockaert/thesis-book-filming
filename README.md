thesis-book-filming
===================

Thesis for MMLab (UGent) about synchronization of books and their filming.

##Requirements

- Node.js

##Installation

###Configuration
Go to the server folder, rename config-example.json to config.json and fill the needed fields in the file.
- For processingsequence, each module can be chosen by using the filename of the module without the extension.
- For alchemyapi, you need to fill your private API key.

###Dependencies
Go into your cloned folder trough a terminal and enter the following

``` bash
$ npm install
```

Node will automatically fetch all dependencies for the project.

###Upload folder and download folder

Make sure you have a folder called "tmp" in the server folder, the uploaded files will be stored here.
You will also need a folder called "download" to store files that are available for the user to download.

###SRL Module

####Dependencies

You will need to install the WordNet command-line tool and add it to your PATH variable.
The latest release is available for download on their [website](http://wordnet.princeton.edu/wordnet/download/current-version/).

####Models

The SRL (Semantic Role Labeling) module needs model files to work properly. 
These files are quite big, that's why you need to download them yourself and put them in the right directory.

Download the following files:

- [CoNLL2009-ST-English-ALL.anna-3.3.srl-4.1.srl.model](https://mate-tools.googlecode.com/files/CoNLL2009-ST-English-ALL.anna-3.3.srl-4.1.srl.model)
- [CoNLL2009-ST-English-ALL.anna-3.3.parser.model](https://mate-tools.googlecode.com/files/CoNLL2009-ST-English-ALL.anna-3.3.parser.model)
- [CoNLL2009-ST-English-ALL.anna-3.3.postagger.model](https://mate-tools.googlecode.com/files/CoNLL2009-ST-English-ALL.anna-3.3.postagger.model)
- [CoNLL2009-ST-English-ALL.anna-3.3.lemmatizer.model](https://mate-tools.googlecode.com/files/CoNLL2009-ST-English-ALL.anna-3.3.lemmatizer.model)

Put them in this directory (relative to the main folder): server/synchronisation/srl/models

##Usage

In order to start the server application, use the following command in your main folder

``` bash
$ node server/server.js
```

This will start the server on port 4000.