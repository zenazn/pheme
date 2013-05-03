if (typeof define !== 'function') { var define = require('amdefine')(module) }

/**
 * Generic geographical utility functions
 */

define(['common/latlon'], function(LatLon) {
  "use strict";

  function to_rad(deg) {
    return deg * Math.PI / 180;
  }
  function to_deg(rad) {
    return rad * 180 / Math.PI;
  }

  function centroid(points) {
    if (points.length == 0) {
      throw new TypeError("I expected some points, instead you gave me none");
    }

    // Latitudes
    var x = 0;
    var y = 0;
    var z = 0;
    points.forEach(function(point) {
      var rlat = to_rad(point.lat());
      var rlon = to_rad(point.lon());
      x += Math.cos(rlat) * Math.cos(rlon);
      y += Math.cos(rlat) * Math.sin(rlon);
      z += Math.sin(rlat);
    });

    x /= points.length;
    y /= points.length;
    z /= points.length;

    var rlon = Math.atan2(y, x);
    var hyp = Math.sqrt(x*x + y*y);
    var rlat = Math.atan2(z, hyp);

    return new LatLon(to_deg(rlat), to_deg(rlon));
  }

  function radius(points, /* optional */ center) {
    // We can save ourselves an iteration if we pass in a cached center point
    if (!center) {
      center = centroid(points);
    }
    // You end up calculating one distance twice. "Oh well!"
    var max_distance = points[0].distance(center);
    points.forEach(function(point) {
      max_distance = Math.max(point.distance(center), max_distance);
    });

    return max_distance;
  }

  return {
    centroid: centroid,
    radius: radius
  };
});
