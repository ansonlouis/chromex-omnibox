Chromex-Omnibox *In Development*
---------------
A simple javascript library for easily integrating Chrome's Omnibox API into your Chrome Extension.

# Installation
```bash
npm install chromex-omnibox
```
The Chromex-Omnibox implementation is written in es6 import/export style javascript. However, Chrome supports this natively so even if you do not use some sort of bundler/transpiler with your extension, you should be able to use it.

# HOW TO
The only export of the module is the ChromexOmnibox class, which, when initialized, will start using Chrome's Omnibox API to listen to the user's input in the search box. This is where the class comes in handy. By adding `actions` to the class config, you can set up callbacks for when the user enters specific keywords. See below for a simple `action`:
```javascript
import {ChromexOmnibox} from 'chromex-omnibox';

var myOmnibox = new ChromexOmnibox({
    actions : [
        {
            word : 'fire',
            onSubmit : function(result){
                // fires if user hits enter after typing 'fire', or 'fire' plus
                // a space, plus anything else
            },
            callback : function(currentWord, args, result){
                // starts to fire once the keyword 'fire' is entered, and every
                // input event after that (as long a `fire` is the first keyword)
            },
            suggestions : function(currentWord, args, result){
                // returning an array of suggestions objects will fill the omnibox
                // autocomplete list with whatever you return
            }
        }
    ]
});
```
You can even **add actions onto actions**, infinitely, to chain keywords, like so:
```javascript
import {ChromexOmnibox} from 'chromex-omnibox';

var myOmnibox = new ChromexOmnibox({
    actions : [
        {
            word : 'one',
            onSubmit : function(result){
                // fired if `one` is typed as the first keyword, and any subsequent actions
                // are NOT matched (after user hits enter)
            },
            callback : function(currentWord, args, result){
                // fired on every keyup after `one` is typed
            },
            suggestions : function(currentWord, args, result){
                // return suggestions array for `one`
            },
            actions : [
                {
                    word : 'two',
                    onSubmit : function(result){
                        // fired if `one two` is typed into the omnibox and the enter
                        // key is pressed (note: the onSubmit for the parent `one` action
                        // is NOT called in this case)
                    },
                    callback : function(currentWord, args, result){
                        // fired on every keyup after `one two` is typed
                    },
                    suggestions : function(currentWord, args, result){
                        // return suggestions array for `one two`
                        // Note: these suggestions will be prepended to any suggestions array
                        // returned from parent actions (these actions are more prevelant)
                    }
                }
            ]
        }
    ]
});
```

# API
The ChromexOmnibox class doesn't really have methods that should need to be used externally. The class is set up to work just fine through the passed `actions` configuration property and nothing else. Below is the documentation for the `actions` property.
### Actions Array
The `actions` array can take any amount of action objects you need. Like described previously, every action object can contain it's own actions array, full of sub actions.
### Action Object
The `action` object has four predefined properties you can implement.
#### action.word
```javascript
{ word : 'myKeyword' || RegExp || function || null }
```
The `word` property is what is used to match what the user has typed into the omnibox.
- By passing a simple **string**, the comparision will be made *case-insensitive*
- By passing a RegExp object, the comparison will be done using RegExp.test(input)
- By passing a function, the first argument will be the users input, and the function should return true to indicate a match, otherwise false
- By passing `null`, the callback property will fire on every input and the onSubmit property will fire on `enter`, regardless of the user's input. This is what you should use to match _anything_.

**Note:** if you use `null` as a action word, it should be listed last in the actions array. Otherwise, it will take precendence over any other action.

The ChromexOmnibox class also exposes a static method `like` that can be used as a helper to match words in a *very basic* fuzzy search manner.
```javascript
{ word : ChromexOmnibox.like('helloworld') }
// h, he, hel, ...helloworld will all be matches
```
#### action.callback
```javascript
{ callback : function(currentWord, args, session){} }
```
The `callback` property will fire on every user keypress after the keyword in the action has been matched.
- **currentWord**: the matched keyword for the action
- **args**: an array of words currently entered into the omnibox (separated by spaces), not including the matched keyword
- **session**: an object with generic omnibox action data
    - **action**: the full action object itself
    - **args**: the full array of space separated words in the omnibox
    - **suggestions**: an array of suggestion objects returned from the `suggestions` property

Since the `callback` property is fired on every keyup, you can utilize it, along with the `session` argument object to maintain a _state_ of the current omnibox input session. The `session` property is passed to all action callbacks (`callback`, `onSubmit`, `suggestions`).
```javascript
{
    callback : function(currentWord, args, session){
        session.userId = currentWord;
    },
    onSubmit : function(session){
        database.get({userId : session.userId}).then(function(user){
            window.open(user.homepage);
        });
    }
}
```
#### action.suggestions
```javascript
{
    suggestions : function(currentWord, args, session){
        return [
            {
                content : currentWord,
                description : "Open the profile page for <match>" + session.userName + "</match>"
            }
        ]
    }
}
```
The `suggestions` property should be a function that returns an array of `suggestion` objects that will fill Chrome's Omnibox autocomplete list. The function has the same arguments as the `callback` property function. The format of the returned suggestion objects is what is documented on the Chrome Extension documentation page: https://developer.chrome.com/extensions/omnibox#type-SuggestResult

Keep in mind, the `content` property of the `suggestion` object will be autopopulated into the Omnibox if the user arrows down into it, so make sure that the value of `content` matches what you would want to be submitted.

Sub-actions will have their suggestions array be highest priority. If an action returns suggestions but sub-actions do not, the parent suggestions will still be used. Essentially, all action/sub-action suggestions are prepended to each other.
#### action.onSubmit
```javascript
{
    onSubmit : function(session){
        // user has entered with the current actions!
    }
}
```
The `onSubmit` property fires when the user hits _submit_ after the currently matched action (and every parent action) has been typed into the omnibox in sequence. The only argument in the function is the `session` which matches the previously documented `session` argument.
### Example
Below is a real-world example of how you can use the ChromexOmnibox class to help you easily create rich Omnibox support.
```javascript
// Lets say we have a Chrome Extension for the Webster Dictionary, allowing users to go to the definition page for a word through the omnibox. Lets assume there is some Webster API Library we have installed.
import { ChromexOmnibox } from './index.js';

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
```
With the above implementation, if the user enters 'help' in the omnibox and hits submit, the `help` callback will fire. If the user enters `person` into the omnibox and hits enter, they will be taken to the webster dictionary page for `person`. If the user enters `person synonym` (or anything like synonym, e.g. `person syn`), and hits enter, they will be taken to the thesaurus page for `person`. Note that this implementation technically doesn't allow the user to search the definition for the word `help`, but you get the idea.
### Notes
Each entry in the returned suggestions array will get some text prepended to its `content` property. Specifically, you'll see `suggest <index>:` prepended. So, if a suggestion's content property is `user` and you arrow into the autocomplete suggestion, you might see `suggest 1:user` in the Omnibox. The reason for this is Chrome doesn't like having a suggestion's `content` property be the exact same as what is in the Omnibox (the suggestion simply wont show). This is actually undesirable (IMO) from a UX perspective as the autocomplete suggestion can be a more descriptive version of what the action would execute. The `suggest <index>:` gets stripped out if the user hits enter, so you don't have to worry about having that show up in your action callbacks.
