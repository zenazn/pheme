if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(['common/class'], function(Class) {
  "use strict";

  var set_id = 1;

  // Disjoint Set data structure. Mitzenmacher would love us!
  var DisjointSet = Class.extend({
    init: function(data) {
      this.id = point_id++;
      this.data = data;

      this.parent = this;
      this.rank = 0;
    },
    // Now with path compression!
    find: function() {
      var path = [], p = this;
      while (p.parent != p) {
        path.push(p);
        p = p.parent;
      }
      path.forEach(function(el) {
        el.parent = p;
      });
      return p;
    },
    // Also, union-by-rank! Ahmeezing!
    union: function(other) {
      var p = this.find(), o = other.find();
      if (p.rank < o.rank) {
        p.parent = o;
      } else if (p.rank > o.rank) {
        other.parent = p;
      } else {
        p.parent = o;
        o.rank++;
      }
    }
  });

  return DisjointSet;
});
