

export class ChromexOmnibox{

  constructor(options){

    var _this = this;
    this.currentSearch = "";
    this.tabId = 0;
    this.defaultSuggestion = options.defaultSuggestion || null;

    // array of top level actions (associated with the first
    // word in the omnibox)
    this.actions = options.actions || [];


    var setTab = function(){
      ChromexOmnibox.getActiveTab(function(tab){
        _this.tabId = tab.id;
      });
    };

    chrome.omnibox.onInputStarted.addListener(setTab);
    chrome.omnibox.onInputChanged.addListener(function(text, responseFn){
      responseFn(_this.input(text));
    });
    chrome.omnibox.onInputEntered.addListener(function(text, disp){
      _this.submit(text, disp);
    });
  };


  testActionWord(word, action){
    if(word){
      if(typeof(action) === "string" && word.toLowerCase() === action.toLowerCase()){
        return true;
      }
      else if(typeof(action) === "function"){
        return action.call(this, word);
      }
      else if(action instanceof RegExp){
        return action.test(word);
      }
      else if(action === null){
        return true;
      }
    }
  };

  parseAction(inputArray, resultObject, actionObject){

    if(inputArray.length && resultObject){

      // current word
      var word = inputArray.shift();

      actionObject.every(function(action){
        if(this.testActionWord(word, action.word)){
          resultObject.action = action;
          if(action.callback){
            action.callback.call(this, word, inputArray, resultObject);
          }
          if(action.suggestions){
            var suggestions = action.suggestions.call(this, word, inputArray, resultObject);
            if(suggestions && suggestions instanceof Array){
              resultObject.suggestions = suggestions.concat(resultObject.suggestions || []).map(function(suggestion, index){
                suggestion.content = "suggest " + (index+1) + ":" + suggestion.content;
                return suggestion;
              });
            }
          }
          if(action.actions){
            this.parseAction(inputArray, resultObject, action.actions);
          }
          return false;
        }
        return true;
      }, this);

    }

    return resultObject;
  };

  getArgsFromInput(input){
    // the "suggest" prefix is just because chrome doesn't like multiple suggestion objects
    // with the same key, nor a suggestion object with a key that is the same as what the user
    // has typed into the omnibox...in these cases it won't respect those suggestions and will
    // not show them...adding "suggest" (sometimes with an # after it) makes it unique
    input = input.replace(/^suggest\s?\d?:/i, '');
    return input.split(/\s+/g);
  };

  parseInput(input){
    var result = {};
    if(input.length){

      var parsedInput = this.getArgsFromInput(input);
      result.args = Array.from(parsedInput);
      this.parseAction(parsedInput, result, this.actions);

      this.currentParsed = result;
      return result;
    }
  };

  input(text){

    this.currentSearch = text.trim();

    var parsed = this.parseInput(this.currentSearch);
    var suggestions = [];

    if(parsed && parsed.suggestions){
      suggestions = parsed.suggestions;
    }

    if(this.defaultSuggestion){
      suggestions.push(this.defaultSuggestion);
    }

    console.log("%ChromexOmnibox: %csuggestions %o", "color:orange;", "", suggestions);

    return suggestions;

  };


  submit(text, disp){
    var parsed = this.parseInput(text);
    if(parsed){
      console.log("%ChromexOmnibox: %conSubmit %o", "color:orange;", "", parsed);
      this.runFn(parsed);
    }
  };

  runFn(parsed){
    if(parsed.action && parsed.action.onSubmit){
      parsed.action.onSubmit.call(this, parsed);
    }
  };

};


ChromexOmnibox.getActiveTab = function(callback){
  chrome.tabs.query({active:true, currentWindow:true}, function(data){
    data = data.length ? data[0] : null;
    callback && callback(data);
  });
};

ChromexOmnibox.like = function(word){
  word = word.toLowerCase();
  return function(input){
    return word.indexOf(input.toLowerCase()) === 0;
  }
};