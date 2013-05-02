requirejs.config({
  baseUrl: '/js',
  waitSeconds: 120,
  paths: {
    common: '../common',
    jquery: '//cdnjs.cloudflare.com/ajax/libs/jquery/1.9.1/jquery.min',
    'socket.io': '//cdnjs.cloudflare.com/ajax/libs/socket.io/0.9.10/socket.io.min',
    handlebars: '//cdnjs.cloudflare.com/ajax/libs/handlebars.js/1.0.0-rc.3/handlebars.min',
    bootstrap: '//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/2.3.1/js/bootstrap.min'
  },
  shim: {
    bootstrap: {
      deps: ['jquery']
    }
  }
});

define([
  'jquery',
  'common/phemeclustering',
  'common/LatLon',
  'twitterstream',
  'handlebars',
  'marker',
  'bootstrap',
  'async!http://maps.googleapis.com/maps/api/js?sensor=false&libraries=geometry',
], function($, PhemeClustering, LatLon, stream, handlebars, marker) {
  "use strict";

  var clustering = new PhemeClustering();

  var map = new google.maps.Map(document.getElementById('map'), {
    center: new google.maps.LatLng(42.37839, -71.11291),
    zoom: 12,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  var tweet_template = Handlebars.compile($('#tweet-template').html());

  var previous_bounds = '';
  function update_bounds(map) {
    var bounds = map.getBounds();
    var ne = bounds.getNorthEast(), sw = bounds.getSouthWest();
    var floor = function(n) { return Math.floor(n * 4) / 4; };
    var ceil = function(n) { return Math.ceil(n * 4) / 4; };
    bounds = [
      floor(sw.lng()), floor(sw.lat()),
      ceil(ne.lng()), ceil(ne.lat())
    ].join(',');
    if (sessionStorage['stream'] && bounds != previous_bounds) {
      console.log("Panning to", bounds);
      stream.emit('stream', {locations: bounds});
      previous_bounds = bounds;
    }
  }

  var t = setTimeout(update_bounds.bind(null, map), 500);
  map.addListener('bounds_changed', function() {
    if (t) clearTimeout(t);
    t = setTimeout(update_bounds.bind(null, map), 500);
  });

  var cluster_markers = {};

  stream.on('data', function(d) {
    var point = clustering.push(d);
    if (!point) return;

    point.data.marker = marker(map, point.pos);

    var clusters = clustering.clusters(), seen_ids = {};

    clusters.forEach(function(cluster) {
      // change color of points in cluster
      cluster.points.forEach(function(point) {
        point.data.marker.setIcon({
          fillColor: cluster.color,
          path: google.maps.SymbolPath.CIRCLE,
          fillOpacity: 1,
          strokeWeight: 1,
          strokeColor: 'black',
          scale: 4
        });
      });
      var markers = cluster_markers[cluster.id];
      if (!markers) {
        console.log('new cluster', cluster);
        markers = cluster_markers[cluster.id] = {
          center: new google.maps.Marker({
            map: map,
            draggable: false,
            position: cluster.center,
            icon: {
              fillColor:cluster.color,
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              fillOpacity: 1,
              strokeWeight: 1,
              strokeColor: 'black',
              scale: 4
            }
          }),
          ring: new google.maps.Circle({
            map: map,
            radius: cluster.radius,
            fillColor: cluster.color,
            fillOpacity: 0.2
          }),
          sidebar: $("<div></div>")
        };
        markers.ring.bindTo('center', markers.center, 'position');

        // Set up sidebar element
        markers.sidebar
          .addClass('cluster')
          .data('cluster', cluster.id)
          .css('backgroundColor', cluster.color)
          // Sometimes this glitches out and keeps a marker really big. IDK.
          .hover(/* mouseenter */ function() {
            var icon = markers.center.getIcon();
            icon.scale = 10;
            markers.center.setIcon(icon);
          }, /* mouseleave */function() {
            var icon = markers.center.getIcon();
            icon.scale = 4;
            markers.center.setIcon(icon);
          });
        $('#sidebar').append(markers.sidebar);
      } else {
        markers.center.setPosition(cluster.center);
        markers.ring.setRadius(cluster.radius);
      }

      var el = markers.sidebar;
      el.empty();
      cluster.points.forEach(function(point) {
        el.append(tweet_template(point.data));
      });

      seen_ids[cluster.id] = true;
    });
    $.each(cluster_markers, function(k, markers) {
      if (k in seen_ids) return;
      markers.center.setMap(null);
      markers.ring.setMap(null);
      markers.sidebar.remove();
    });
  });
});
