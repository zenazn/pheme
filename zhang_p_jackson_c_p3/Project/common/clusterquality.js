if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(['common/nlp'], function(nlp) {
  "use strict";

  function filter(clusters) {
    return clusters.filter(function(cluster) {
      var authors = {};
      cluster.points.forEach(function(point) {
        authors[point.data.user.screen_name] = true;
      });
      authors = Object.keys(authors);
      if (authors.length / cluster.points.length < 0.4) {
        console.log("REJECTED authors");
        return false;
      }

      var words = nlp.frequency(cluster), similar = 0;
      for (var word in words) {
        similar = Math.max(words[word], similar);
      }
      // You either need 6 tweets, or 3 where two tweets use the same word
      if (similar * cluster.length < 6) {
        console.log("REJECTED words");
        return false;
      }

      return true;
    });
  }

  return {
    filter: filter
  };
});
