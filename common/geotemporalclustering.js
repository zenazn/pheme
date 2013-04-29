if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  'common/clustering',
  'common/neighborhood',
  'common/geotemporalset'
], function(Clustering, Neighborhood, GeoTemporalSet) {
  "use strict";

  var GeoTemporalClustering = Clustering.extend({
    init: function(metric, max_distance, max_time, threshold) {
      // TODO: Write GeoTemporalNeighborhood
      var neighborhood = new Neighborhood();
      this._super(neighborhood, threshold);
    },
    push: function(point) {
      if (!(point instanceof GeoTemporalSet)) {
        throw new TypeError("Expected a GeoTemporalSet");
      }
      return this._super(point);
    }
  });

  return GeoTemporalClustering;
});
