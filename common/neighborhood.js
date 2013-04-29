if (typeof define !== 'function') { var define = require('amdefine')(module) }

// The dependency on DisjointSet is sort of "meh", but it's probably more
// efficient this way
define(['common/class', 'common/disjointset'], function(Class, DisjointSet) {
  "use strict";

  /**
   * A neighborhood is a data structure that returns the set of points that are
   * considered "close enough" to any given point based on some metric. It's
   * implemented generically like that such that subclasses can implement
   * efficient algorithms for specialized types of points and metrics.
   */
  var Neighborhood = Class.extend({
    init: function(metric) {
      this.points = [];
      this.metric = metric;
    },
    add: function(el) {
      if (!(el instanceof DisjointSet)) {
        throw new TypeError("Expected a DisjointSet");
      }
      this.points.append(el);
    },
    /**
     * Return a list of the neighbors to a given point, or if the optional
     * callback is passed, iterate over each of them
     */
    neighbors: function(el, cb) {
      if (!(el instanceof DisjointSet)) {
        throw new TypeError("Expected a DisjointSet");
      }
      var points, metric = this.metric;
      if (typeof cb == 'undefined') {
        points = [];
        cb = points.push.bind(points);
      }
      this.points.forEach(function(point) {
        if (metric(point.data, el.data)) {
          cb(point);
        }
      });

      if (typeof cb == 'undefined') {
        return points;
      }
    },
    forEach: function(cb) {
       return this.points.forEach(cb);
    };
  });

  return Neighborhood;
});
