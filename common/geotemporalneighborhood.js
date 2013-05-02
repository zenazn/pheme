if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  'common/neighborhood',
  'common/geotemporalset',
  'common/latlon'
], function(Neighborhood, GeoTemporalSet, LatLon) {
  "use strict";

  function Globe(radius, max_distance, truncate) {
    this.radius = radius;
    this.max_distance = max_distance;
    this.truncate = truncate;
    this.bands = [];

    var nbands = Math.ceil(Math.PI * radius / max_distance);
    var rads_per_band = max_distance / radius;
    for (var i = 0; i < nbands; i++) {
      var lat_lo = i * rads_per_band - Math.PI / 2;
      var lat_hi = Math.min((i + 1) * rads_per_band - Math.PI / 2, Math.PI / 2);
      if (lat_hi > Math.PI / 2) throw new Error("Wut");
      this.bands.push(new Band(this, lat_lo, lat_hi));
    }
  }
  Globe.prototype.push = function(point) {
    // XXX: abstraction!
    var idx = Math.floor(point.pos._lat * this.radius / this.max_distance);
    this.bands[idx].push(point);
  };
  Globe.prototype.forEach = function(lat, lon, start_time, cb) {
    var idx = Math.floor(lat * this.radius / this.max_distance);
    var lo = Math.max(idx - 1, 0), hi = Math.min(idx + 1, this.bands.length - 1);
    for (var i = lo; i <= hi; i++) {
      this.bands[i].forEach(lon, start_time, cb);
    }
  };
  Globe.prototype.all = function(start_time, cb) {
    this.bands.forEach(function(band) {
      band.all(start_time, cb);
    });
  };

  function Band(globe, lat_lo, lat_hi) {
    this.globe = globe;
    this.lat_lo = lat_lo;
    this.lat_hi = lat_hi;
    this.sectors = [];

    // XXX: how do we know lat's are between -pi/2 and pi/2? Enforce elsewhere
    this.min_r = globe.radius * Math.min(Math.cos(lat_lo), Math.cos(lat_hi));

    // Typically this would be a ceiling, but the last sector is extra fat to
    // keep our invariants. This makes for odd edge conditions elsewhere
    var nsectors = Math.floor(2 * Math.PI * this.min_r / globe.max_distance);
    for (var i = 0; i < nsectors; i++) {
      this.sectors.push(new Sector(globe));
    }
    // If we're at a pole, we have one sector
    if (nsectors == 0) {
      this.sectors.push(new Sector(globe));
    }
  }
  Band.prototype.push = function(point) {
    var idx = Math.floor(point.pos._lon * this.min_r / this.globe.max_distance);
    if (idx == this.sectors.length) idx--;
    this.sectors[idx].push(point);
  };
  Band.prototype.forEach = function(lon, start_time, cb) {
    // Special case the poles
    if (this.min_r == 0) {
      this.sectors[0].forEach(start_time, cb);
      return;
    }
    var rads_per_band = this.globe.max_distance / this.min_r;
    // XXX: same for lon and 0-2pi
    var idx = Math.floor(lon * this.min_r / this.globe.max_distance);
    if (idx == this.sectors.length) idx--; // Last sector is fat

    var prev = idx - 1, next = idx + 1;
    if (prev < 0) prev += this.sectors.length;
    if (next >= this.sectors.length) next -= this.sectors.length;

    this.sectors[prev].forEach(start_time, cb);
    this.sectors[idx].forEach(start_time, cb);
    this.sectors[next].forEach(start_time, cb);
  };
  Band.prototype.all = function(start_time, cb) {
    this.sectors.forEach(function(sector) {
      sector.forEach(start_time, cb);
    });
  };

  function Sector(globe) {
    // Sorted by time (or, rather, by insert time, which we assume is the same
    // thing)
    this.globe = globe;
    this.points = [];
  }
  Sector.prototype.push = function(point) {
    if (!(point instanceof GeoTemporalSet)) {
      throw new TypeError("Expected a GeoTemporalSet");
    }
    this.points.push(point);
  };
  // Special iteration semantics: return false to stop iteration
  Sector.prototype.forEach = function(start_time, cb) {
    // (Rough) binary search. Invariant: a[lo] <= el < a[hi]
    var lo = 0, hi = this.points.length, mid;
    while (hi - lo > 1) {
      mid = Math.floor((hi + lo) / 2);
      if (this.points[mid].time > start_time) {
        hi = mid;
      } else {
        lo = mid;
      }
    }

    for (var i = lo; i < this.points.length; i++) {
      if (!cb(this.points[i])) break;
    }

    if (this.globe.truncate) {
      this.points = this.points.slice(lo);
    }
  };

  var EARTH_RADIUS = 6371 * 1000;

  /**
   * GeoTemporalNeighborhood is a subclass of Neighborhood that optimizes for
   * metrics which measure closeness in time and space (perhaps among other
   * qualities). In particular, given a maximum distance and a maximum time
   * difference, it will only compare points that (roughly; with some error)
   * satisfy these criteria, instead of iterating through all the points.
   *
   * Note: GeoTemporalNeighborhood assumes that points are added in strict
   * chronological order. It won't attempt to sort points by time on its own.
   */
  var GeoTemporalNeighborhood = Neighborhood.extend({
    init: function(metric, max_distance, max_time) {
      this.metric = metric;
      this.max_distance = max_distance;
      this.max_time = max_time;
      // TODO: truncate?
      this.globe = new Globe(EARTH_RADIUS, max_distance, false);
    },
    push: function(el) {
      if (!(el instanceof GeoTemporalSet)) {
        throw new TypeError("Expected a GeoTemporalSet");
      }
      this.globe.push(el);
    },
    neighbors: function(el, cb) {
      if (!(el instanceof GeoTemporalSet)) {
        throw new TypeError("Expected a GeoTemporalSet");
      }
      var lat = el.pos._lat, lon = el.pos._lon, metric = this.metric;
      var start = el.time - this.max_time, end = el.time + this.max_time;
      var points;
      if (typeof cb == 'undefined') {
        points = [];
        cb = points.push.bind(points);
      }
      this.globe.forEach(lat, lon, start, function(point) {
        if (metric(el, point)) {
          cb(point);
        }
        return point.time <= end;
      });
    },
    forEach: function(cb) {
      this.globe.all(0, cb);
    }
  });

  return GeoTemporalNeighborhood;
});
