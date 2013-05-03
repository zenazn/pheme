define([
  'common/class',
  'async!http://maps.googleapis.com/maps/api/js?sensor=false&libraries=geometry'
], function(Class) {
  "use strict";

  var LatLng = google.maps.LatLng;

  var PAN_ROUND = 4;

  var map = new google.maps.Map(document.getElementById('map'), {
    center: new google.maps.LatLng(42.37839, -71.11291),
    zoom: 12,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  // Overplot protection
  function skew() {
    return (Math.random() - 0.5) / 2000;
  };

  function pos_to_latlng(pos, overplot) {
    var lat = pos.lat() + (overplot ? skew() : 0);
    var lon = pos.lon() + (overplot ? skew() : 0);
    return new LatLng(lat, lon);
  }

  var Marker = Class.extend({
    init: function(pos, color) {
      if (!color) color = 'blue';
      this.shown = true;
      this.marker = new google.maps.Marker({
        map: map,
        draggable: false,
        flat: true,
        animation: google.maps.Animation.DROP,
        position: pos_to_latlng(pos, true),
        icon: this.style(color)
      });
    },
    style: function(color) {
      return {
        fillColor: color,
        path: google.maps.SymbolPath.CIRCLE,
        fillOpacity: 1,
        strokeWeight: 1,
        strokeColor: "black",
        scale: 4
      };
    },
    setPosition: function(pos) {
      this.marker.setPosition(pos_to_latlng(pos, true));
    },
    setColor: function(color) {
      var icon = this.marker.getIcon();
      icon.fillColor = color;
      this.marker.setIcon(icon);
    },
    setOpacity: function(opacity) {
      var icon = this.marker.getIcon();
      icon.fillOpacity = opacity;
      this.marker.setIcon(icon);
    },
    setSize: function(size) {
      var icon = this.marker.getIcon();
      icon.scale = size;
      this.marker.setIcon(icon);
    },
    setTitle: function(title) {
      this.marker.setTitle(title);
    },
    show: function() {
      this.marker.setMap(map);
      this.shown = true;
    },
    hide: function() {
      this.marker.setMap(null);
      this.shown = false;
    }
  });

  var ClusterMarker = Marker.extend({
    init: function(pos, radius, color) {
      if (!color) color = 'blue';
      this._super(pos, color);
      this.ring = new google.maps.Circle({
        map: map,
        radius: radius,
        fillColor: color,
        fillOpacity: 0.2
      });
      this.ring.bindTo('center', this.marker, 'position');
    },
    style: function(color) {
      return {
        fillColor: color,
        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        fillOpacity: 1,
        strokeWeight: 1,
        strokeColor: 'black',
        scale: 4
      };
    },
    setRadius: function(radius) {
      this.ring.setRadius(radius);
    },
    show: function() {
      this._super();
      this.ring.setMap(null);
    },
    hide: function() {
      this._super();
      this.ring.setMap(null);
    }
  });

  return {
    map: map,
    Marker: Marker,
    ClusterMarker: ClusterMarker
  };
});
