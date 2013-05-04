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
    this.count = 0;

    var nbands = Math.ceil(Math.PI * radius / max_distance);
    this.bands = new Array(nbands);
  }
  Globe.prototype.get_band_idx = function(idx) {
    if (idx < 0 || idx >= this.bands.length) {
      throw new Error('Band index out of range!');
    }
    if (typeof this.bands[idx] == 'undefined') {
      var rads = this.max_distance / this.radius;
      var lat_lo = idx * rads - Math.PI / 2;
      var lat_hi = Math.min((idx + 1) * rads - Math.PI / 2, Math.PI / 2);
      this.bands[idx] = new Band(this, lat_lo, lat_hi);
    }
    return this.bands[idx];

  };
  Globe.prototype.get_band = function(lat) {
    lat += Math.PI / 2;
    var idx = Math.floor(lat * this.radius / this.max_distance);
    return this.get_band_idx(idx);
  };
  Globe.prototype.get_bands = function(lat) {
    lat += Math.PI / 2;
    var idx = Math.floor(lat * this.radius / this.max_distance);
    var min_idx = Math.max(0, idx - 1);
    var max_idx = Math.min(idx + 1, this.bands.length - 1);
    var bands = [];
    for (var i = min_idx; i <= max_idx; i++) {
      bands.push(this.get_band_idx(i));
    }
    return bands;
  }
  Globe.prototype.push = function(point) {
    this.get_band(point.pos._lat).push(point);
    if (++this.count % 200 == 0) {
      console.log("point", this.count);
    }
  };
  Globe.prototype.forEach = function(lat, lon, start_time, cb) {
    this.get_bands(lat).forEach(function(band) {
      band.forEach(lon, start_time, cb);
    });
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

    this.min_r = globe.radius * Math.min(Math.cos(lat_lo), Math.cos(lat_hi));

    // Typically this would be a ceiling, but the last sector is extra fat to
    // keep our invariants. This makes for odd edge conditions elsewhere
    var nsectors = Math.floor(2 * Math.PI * this.min_r / globe.max_distance);
    this.sectors = new Array(Math.max(nsectors, 1));
  }
  Band.prototype.get_sector_idx = function(idx) {
    if (idx < 0 || idx >= this.sectors.length) {
      throw new Error('Sector index out of range!');
    }
    if (typeof this.sectors[idx] == 'undefined') {
      this.sectors[idx] = new Sector(this.globe);
    }
    return this.sectors[idx];
  };
  Band.prototype.get_sector = function(lon) {
    var idx = Math.floor(lon * this.min_r / this.globe.max_distance);
    if (idx == this.sectors.length) idx--;
    return this.get_sector_idx(idx);
  };
  Band.prototype.get_sectors = function(lon) {
    var l = this.sectors.length;
    var idx = Math.floor(lon * this.min_r / this.globe.max_distance);
    if (idx == l) idx--; // Last sector
    var prev = (idx - 1 + l) % l, next = (idx + 1) % l;
    var idxs = [prev];
    if (idx != prev) idxs.push(idx);
    if (next != idx && next != prev) idxs.push(next);
    return idxs.map(this.get_sector_idx.bind(this));
  };
  Band.prototype.push = function(point) {
    this.get_sector(point.pos._lon).push(point);
  };
  Band.prototype.forEach = function(lon, start_time, cb) {
    // Special case the poles
    if (this.min_r == 0) {
      return this.get_sector_idx(0).forEach(start_time, cb);
    }
    this.get_sectors(lon).forEach(function(sector) {
      sector.forEach(start_time, cb);
    });
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
    if (this.points.length == 0) return;
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

    var iter = 0;
    for (var i = lo; i < this.points.length; i++) {
      iter++;
      if (!cb(this.points[i])) break;
    }
    //console.log(lo, hi, this.points.length, iter);

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
      this.globe = new Globe(EARTH_RADIUS, max_distance, true);
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
      var start = new Date(el.time - this.max_time)
      var end = new Date(el.time + this.max_time);
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
      if (typeof cb == 'undefined') {
        return points;
      }
    },
    forEach: function(cb) {
      this.globe.all(0, function(point) {
        cb(point);
        return true;
      });
    }
  });

  return GeoTemporalNeighborhood;
});
