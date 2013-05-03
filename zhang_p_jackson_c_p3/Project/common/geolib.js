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
    return rad * 180 / Math.pi
  }

  function centroid(points) {
    if (points.length == 0) {
      throw new TypeError("I expected some points, instead you gave me none");
    }

    // Latitudes
    var lat = 0, lon, lonx = 0, lony = 0;
    points.forEach(function(point) {
      // Bad Carl. _lat and _lon are probably private. Just flipping back and
      // forth between radians and degrees seems silly to me.
      lat += point._lat;
      lonx += Math.cos(point._lon);
      lony += Math.sin(point._lon);
    });

    lat /= points.length;
    lon = Math.atan(lony / points.length, lonx / points.length);

    return new LatLon(to_deg(lat), to_deg(lon));
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
