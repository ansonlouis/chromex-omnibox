// omnibox.js


function ChromeOmnibox(options){

  var getActiveTab = function(callback){
    chrome.tabs.query({active:true, currentWindow:true}, function(data){
      data = data.length ? data[0] : null;
      callback && callback(data);
    });
  };


  this.init = function(options){

    var _this = this;
    this.currentSearch = "";
    this.tabId = 0;
    this.defaultSuggestion = options.defaultSuggestion || null;

    // array of top level actions (associated with the first
    // word in the omnibox)
    this.actions = options.actions || [

    ];


    var _this = this;
    var setTab = function(){
      getActiveTab(function(tab){
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


  this.testActionWord = function(word, action){
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

  this.parseAction = function(inputArray, resultObject, actionObject){

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
              resultObject.suggestions = suggestions.concat(resultObject.suggestions || []);
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

  this.getArgsFromInput = function(input){
    // the "suggest" prefix is just because chrome doesn't like multiple suggestion objects
    // with the same key, nor a suggestion object with a key that is the same as what the user
    // has typed into the omnibox...in these cases it won't respect those suggestions and will
    // not show them...adding "suggest" (sometimes with an # after it) makes it unique
    input = input.replace(/^suggest\s?\d?:/i, '');
    return input.split(/\s+/g);
  };

  this.parseInput = function(input){
    var result = {};
    if(input.length){

      var parsedInput = this.getArgsFromInput(input);
      result.args = Array.from(parsedInput);
      this.parseAction(parsedInput, result, this.actions);

      this.currentParsed = result;
      return result;
    }
  };

  this.input = function(text){

    this.currentSearch = text.trim();

    var parsed = this.parseInput(this.currentSearch);
    var suggestions = [];

    if(parsed && parsed.suggestions){
      suggestions = parsed.suggestions;
    }

    if(this.defaultSuggestion){
      suggestions.push(this.defaultSuggestion);
    }

    console.log("%cChromeOmnibox: %csuggestions %o", "color:orange;", "", suggestions);

    return suggestions;

  };


  this.submit = function(text, disp){
    var parsed = this.parseInput(text);
    if(parsed){
      console.log("%cChromeOmnibox: %conSubmit %o", "color:orange;", "", parsed);
      this.runFn(parsed);
    }
  };

  this.runFn = function(parsed){
    if(parsed.action && parsed.action.onSubmit){
      parsed.action.onSubmit.call(this, parsed);
    }
  };


  this.init(options);

};

ChromeOmnibox.like = function(word){
  word = word.toLowerCase();
  return function(input){
    return word.indexOf(input.toLowerCase()) === 0;
  }
};


if(typeof(module) !== "undefined"){
  module.exports = ChromeOmnibox;
}

