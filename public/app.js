!function() {
  "use strict";

  var clustering = new Clustering(1500, 2);
  var socket = io.connect('http://localhost:3000');
  var twitter = socket.of('/twitter');
  //var replay = socket.of('/replay');

  var tweet_template = Handlebars.compile($('#tweet-template').html());

  var token, map, clusters;

  if (!localStorage.credentials) {
    twitter.emit('request_token');
    twitter.on('token', function(tdata) {
      token = tdata;
      $('#auth').modal();
      $('#auth-yes').bind('click', function() {
        open(tdata.url);
      });
    });
  } else {
    var creds = JSON.parse(localStorage.credentials);
    twitter.emit('authenticate', creds.token, creds.secret);
  }

  // We get notified of verification credentials through localStorage
  $(window).bind('storage', function(e) {
    e = e.originalEvent; // IDK jQuery
    if (e.key == 'verifier' && e.newValue) {
      var v = JSON.parse(e.newValue);
      if (!token || v.token != token.token) {
        throw new Error("Something mysterious has happened with OAuth");
      }
      twitter.emit('verify', v.token, token.secret, v.verifier);
      twitter.on('credentials', function(credentials) {
        localStorage.credentials = JSON.stringify(credentials);
        $('#auth').modal('hide');
      });
    }
  });

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
    if (localStorage.credentials && bounds != previous_bounds) {
      console.log("Panning to", bounds);
      twitter.emit('stream', {locations: bounds});
      previous_bounds = bounds;
    }
  }

  $(function() {
    map = new google.maps.Map(document.getElementById('map'), {
      center: new google.maps.LatLng(42.37839, -71.11291),
      zoom: 12,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    var t = setTimeout(update_bounds.bind(null, map), 500);
    map.addListener('bounds_changed', function() {
      if (t) clearTimeout(t);
      t = setTimeout(update_bounds.bind(null, map), 500);
    });

    var clusterMarkers = [];
    var clusterCircles = [];
    twitter.on('data', function(d) {
      if (!d.coordinates) return;
      var c = d.coordinates.coordinates;
      // Overplot protection
      var skew = function() {
        return (Math.random() - 0.5) / 2000;
      }

      var marker = new google.maps.Marker({
        map: map,
        draggable: false,
        flat: true,
        animation: google.maps.Animation.DROP,
        position: new google.maps.LatLng(c[1] + skew(), c[0] + skew()),
        title: d.text,
        icon: {
          fillColor: "blue",
          path: google.maps.SymbolPath.CIRCLE,
          fillOpacity: 1,
          strokeWeight: 1,
          strokeColor: "black",
          scale: 4
        }
      });

      var p = new Point(new google.maps.LatLng(c[1], c[0]), {
        id: d.id_str,
        name: d.user.name,
        handle: d.user.screen_name,
        text: d.text,
        place: d.place,
        marker: marker
      });

      clustering.add(p);
      clusters = clustering.clusters();

      // erase old cluster markers
      clusterMarkers.forEach(function(marker) {
        marker.setMap(null);
      });

      clusterCircles.forEach(function(circle) {
        circle.setMap(null);
      });

      var seen_ids = {};
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

        // draw cluster circles
        var marker = new google.maps.Marker({
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
        });

        var circle = new google.maps.Circle({
          map: map,
          radius: cluster.radius,
          fillColor: cluster.color,
          fillOpacity: 0.2
        });
        circle.bindTo('center', marker, 'position');

        clusterMarkers.push(marker);
        clusterCircles.push(circle);

        // display cluster tweets in sidebar
        var el = $('#sidebar #' + cluster.id + '.cluster');
        if (el.length == 0) {
          el = $(document.createElement('div'));
          el.addClass('cluster');
          el.attr('id', '' + cluster.id);
          el.css('backgroundColor', cluster.color);
          el.onmouseover = function () {
            marker.setIcon({
              fillColor: cluster.color,
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              fillOpacity: 1,
              strokeWeight: 5,
              strokeColor: 'white',
              scale: 10
            });
          };
          $('#sidebar').append(el);
        }
        el.empty();
        cluster.points.forEach(function(point) {
          el.append(tweet_template(point.data));
        });
        seen_ids['' + cluster.id] = true;
      });

      $('#sidebar .cluster').each(function(i, el) {
        if (!(el.id in seen_ids)) {
          el.remove();
        }
      });
    });
  });
}();
