if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(['common/disjointset', 'common/latlon'], function(DisjointSet, LatLon) {
  "use strict";

  var GeoTemporalSet = DisjointSet.extend({
    init: function(time, pos, data) {
      if (!(time instanceof Date)) {
        throw new TypeError("Expected a Date");
      }
      if (!(pos instanceof LatLon)) {
        throw new TypeError("Expected a LatLon");
      }
      this._super(data);

      this.time = time;
      this.pos = pos;
    }
  });

  return GeoTemporalSet;
});
