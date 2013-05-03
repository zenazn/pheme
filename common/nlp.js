if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(function() {
  "use strict";

  // Stopwords from http://norm.al/2009/04/14/list-of-english-stop-words/
  var stopwords = ["a","able","about","across","after","all","almost","also","am","among","an","and","any","are","as","at","be","because","been","but","by","can","cannot","could","dear","did","do","does","either","else","ever","every","for","from","get","got","had","has","have","he","her","hers","him","his","how","however","i","if","in","into","is","it","its","just","least","let","like","likely","may","me","might","most","must","my","neither","no","nor","not","of","off","often","on","only","or","other","our","own","rather","said","say","says","she","should","since","so","some","than","that","the","their","them","then","there","these","they","this","tis","to","too","twas","us","wants","was","we","were","what","when","where","which","while","who","whom","why","will","with","would","yet","you","your"];
  // Twitter has some common "words" that we don't want
  stopwords.concat(['rt', 'mt']);

  function frequency(tweets) {
    var words = {};
    tweets.forEach(function(tweet) {
      var my_words = {};
      var text = tweet.data.text;
      // clean tweet text
      text = text.split(/\s+/g).map(function(word) {
        return word.replace(/\W|_/, "");
      }).filter(function(word) {
        return (word && stopwords.indexOf(word.toLowerCase()) == -1);
      }).forEach(function(word) {
        if (!(word in my_words)) {
          my_words[word] = true;
          words[word] = (words[word] || 0) + 1;
        }
      });
    });
    return words;
  }

  return {
    stopwords: stopwords,
    frequency: frequency
  };
});
