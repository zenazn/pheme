(function(exports) {
  "use strict";

  var metric = google.maps.geometry.spherical.computeDistanceBetween;

  // 12 qualitative colors from http://colorbrewer2.org/
  var colors = [
    '#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462',
    '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f'
  ];

  var point_id = 1;

  function Point(pos, data) {
    this.id = point_id++; // All points have a unique id

    this.pos = pos;
    this.data = data;

    // Disjoint set. Mitzenmacher would love us!
    this.parent = this;
    this.rank = 0;
  }
  exports.Point = Point;

  // Now with path compression!
  Point.prototype.find = function() {
    var path = [], p = this;
    while (p.parent != p) {
      path.push(p);
    }
    path.forEach(function(el) {
      el.parent = p;
    });
    return p;
  };
  // Also, union-by-rank! Ahmeezing!
  Point.prototype.union = function(other) {
    var p = this.find();
    if (p.rank < other.rank) {
      p.parent = other;
    } else if (p.rank > other.rank) {
      other.parent = p;
    } else {
      p.parent = other;
      other.rank++;
    }
  };

  Point.prototype.distance = function(other) {
    return metric(this.pos, other.pos);
  };

  function Clustering(max_distance, threshold) {
    this.points = [];
    this.max_distance = max_distance;
    this.threshold = threshold;
  }
  exports.Clustering = Clustering;

  Clustering.prototype.add = function(new_point) {
    var max_distance = this.max_distance;
    this.points.forEach(function(point) {
      if (new_point.distance(point) < max_distance) {
        new_point.union(point);
      }
    });
    this.points.push(new_point);
  };
  Clustering.prototype.clusters = function() {
    var clusters = [], threshold = this.threshold;
    this.points.forEach(function(point) {
      var p = point.find();
      if (clusters[p.id] === undefined) {
        clusters[p.id] = {
          points: [point],
          color: colors[p.id % colors.length]
        };
      } else {
        clusters[p.id].points.push(point);
      }
    });

    // Clusters is a sparse array. Let's filter it down.
    return clusters.filter(function(c) {
      return c.points.length > threshold;
    });
  };
})(window);
