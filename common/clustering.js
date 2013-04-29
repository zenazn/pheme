if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  'common/class',
  'common/disjointset',
  'common/neighborhood'
], function(Class, DisjointSet, Neighborhood) {
  "use strict";

  // Dummy class to get struct-like efficiency in modern JS engines. No need to
  // expose it.
  function Cluster(id) {
    this.id = id;
    this.points = [];
  };
  // Proxy a couple methods through to the inner list
  ['forEach', 'push'].forEach(function(method) {
    Cluster.prototype[method] = function() {
      this.points[method].apply(this.points, arguments);
    };
  });

  /**
   * Cluster points using the given neighborhood. Only clusters of at least
   * `threshold` points will be reported.
   */
  var Clustering = Class.extend({
    init: function(neighborhood, threshold) {
      if (!(neighborhood instanceof Neighborhood)) {
        throw new TypeError("Expected a Neighborhood");
      }
      if (typeof threshold != 'number') {
        throw new TypeError("Threshold must be a number");
      }

      this.neighborhood = neighborhood;
      this.threshold = threshold;
    },
    push: function(point) {
      if (!(point instanceof DisjointSet)) {
        throw new TypeError("Expected a DisjointSet");
      }
      this.neighborhood.neighbors(point, function(neighbor) {
        point.union(neighbor);
      });
      this.neighborhood.push(point);
    },
    /**
     * Return the set of clusters. This is a pretty expensive operation (it
     * generates the full clustering every time, since we've lost data about
     * individual unions at this level of abstraction), so try not to call it
     * too often
     */
    clusters: function() {
      // `clusters` is a sparse array, which is sort of "meh"
      var clusters = [], threshold = this.threshold;
      this.neighborhood.forEach(function(point) {
        var p = point.find();
        if (typeof clusters[p.id] == 'undefined') {
          clusters[p.id] = new Cluster(p.id);
        }
        clusters[p.id].push(point);
      });

      return clusters.filter(function(cluster) {
        return cluster.points.length >= threshold;
      });
    }
  });

  return Clustering;
});
