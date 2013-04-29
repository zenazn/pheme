if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(['common/class'], function(Class) {
  "use strict";

  var earth_radius = 6371;

  var sin = Math.sin, cos = Math.cos, atan2 = Math.atan2, sqrt = Math.sqrt;
  function to_radians(deg) {
    return deg * Math.PI / 180;
  }
  function to_degrees(rad) {
    return rad * 180 / Math.PI;
  }

  var LatLon = Class.extend({
    init: function(lat, lon) {
      // We store lat and lon in radians to optimize for the common case of
      // calculating distances.
      this.lat = to_radians(lat);
      this.lon = to_radians(lon);
    },
    // Haversine distance
    // http://www.movable-type.co.uk/scripts/latlong.html
    distance: function(other) {
      var dlat = sin((other.lat - this.lat)/2);
      var dlon = sin((other.lon - this.lon)/2);

      var a = dlat * dlat +
              dlon * dlon * cos(this.lat) * cos(other.lat);
      var c = 2 * atan2(sqrt(a), sqrt(1 - a));

      return earth_radius * c;
    },
    lat: function() { return to_degrees(this.lat); },
    lon: function() { return to_degrees(this.lon); }
  });

  return LatLon;
});