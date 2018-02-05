// extension.js

import { ChromexOmnibox } from './index.js';
console.log(ChromexOmnibox);

var myOmnibox = new ChromexOmnibox({
    actions : [
        {
            // if the user hits 'help' exactly
            word : 'help',
            suggestions : function(word, args, session){
                return [
                    {
                        content : 'help',
                        description : 'Hit enter to open up the <match>help</match> page'
                    }
                ]
            },
            onSubmit : function(session){
              console.log("Open 'help' page!");
            }
        },
        {
            // on any non-matched action
            word : null,
            callback : function(word, args, session){
                session.word = word;
            },
            suggestions : function(word, args, session){
                return [
                    {
                        content : word,
                        description : 'Look up the definition for ' + session.word
                    }
                ]
            },
            onSubmit : function(session){
                chrome.tabs.create({url : 'https://www.merriam-webster.com/dictionary/' + session.word});
            },
            actions : [
                {
                    word : ChromexOmnibox.like('synonym'),
                    suggestions : function(word, args, session){
                        return [
                            {
                                content : session.word + ' ' + 'synonym',
                                description : 'Loop up synonyms for ' + session.word
                            }
                        ]
                    },
                    onSubmit : function(session){
                        chrome.tabs.create({url : 'https://www.merriam-webster.com/thesaurus/' + session.word});
                    }
                }
            ]
        }
    ]
});