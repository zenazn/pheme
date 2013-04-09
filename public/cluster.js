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
      p = p.parent;
    }
    path.forEach(function(el) {
      el.parent = p;
    });
    return p;
  };
  // Also, union-by-rank! Ahmeezing!
  Point.prototype.union = function(other) {
    var p = this.find(), o = other.find();
    if (p.rank < o.rank) {
      p.parent = o;
    } else if (p.rank > o.rank) {
      other.parent = p;
    } else {
      p.parent = o;
      o.rank++;
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
          id: p.id,
          points: [point],
          color: colors[p.id % colors.length]
        };
      } else {
        clusters[p.id].points.push(point);
      }
    });

    clusters.forEach(function(cluster) {
      cluster.bounds = new google.maps.LatLngBounds();
      cluster.points.forEach(function(point) {
        cluster.bounds.extend(point.pos);
      });
    });

    // Clusters is a sparse array. Let's filter it down.
    clusters = clusters.filter(function(c) {
      return c.points.length >= threshold;
    });

    // Find center and radius of each cluster
    clusters.forEach(function(cluster) {
      var centerlat = 0;
      var centerlng = 0;
      cluster.points.forEach(function(point) {
        centerlat = centerlat + point.pos.lat();
        centerlng = centerlng + point.pos.lng();
      });
      centerlat = centerlat/cluster.points.length;
      centerlng = centerlng/cluster.points.length;
      cluster.center = new google.maps.LatLng(centerlat, centerlng);

      var maxDist = 0;
      cluster.points.forEach(function(point) {
        if(maxDist < metric(point.pos, cluster.center)) {
          maxDist = metric(point.pos, cluster.center);
        }
      });
      cluster.radius = maxDist * 1.5;
    });

    return clusters;

  };
})(window);
