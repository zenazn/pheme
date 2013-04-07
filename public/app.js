!function() {
  "use strict";

  var socket = io.connect('http://localhost:3000');
  var twitter = socket.of('/twitter');
  var replay = socket.of('/replay');

  var token, map;

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

  function update_bounds(map) {
    var bounds = map.getBounds();
    var ne = bounds.getNorthEast(), sw = bounds.getSouthWest();
    var round = function (f, n) {
       return f(n * 1) / 1;
    }, fl = round.bind(null, Math.floor), ce = round.bind(null, Math.ceil);
    bounds = [fl(sw.lat()), fl(sw.lng()), ce(ne.lat()), ce(ne.lng())];
    console.log(bounds);
    if (localStorage.credentials) {
      //twitter.emit('stream', {locations: bounds.join(',')});
      twitter.emit('stream', {locations: '-122.75,36.8,-121.75,37.8'});
    }
  }

  $(function() {
    map = new google.maps.Map(document.getElementById('map'), {
      center: new google.maps.LatLng(42.37839,-71.11291),
      zoom: 12,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    var t = setTimeout(update_bounds.bind(null, map), 500);
    map.addListener('bounds_changed', function() {
      if (t) clearTimeout(t);
      t = setTimeout(update_bounds.bind(null, map), 500);
    });
    twitter.on('data', function(d) {
      var c = d.geo.coordinates;
      marker = new google.maps.Marker({
        map: map,
        draggable: false,
        animation: google.maps.Animation.DROP,
        position: new google.maps.LatLng(c[0], c[1])
      });
    });
  });
}();
