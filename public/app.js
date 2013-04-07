// Tweet Object
function Tweet(data, marker) {
    this.lat = data.geo.coordinates[0];
    this.lon = data.geo.coordinates[1];
    this.marker = marker;
    this.tweet = data;
}

// Geographical Distance Metric
// Returns euclidean distance between two tweets
function geoMetric(t1, t2) {
    return Math.sqrt(Math.pow(t1.lat - t2.lat, 2) + Math.pow(t1.lon - t2.lon, 2));
}

// Graph Object
function Graph(metric) {
    this.distance = metric;
    this.vertices = [];
    this.edges = [];
}

// Update graph with new vertex, keepin edges sorted in descending order
// by length
Graph.prototype.update = function (vertex) {
    this.vertices.forEach(function(element, index, array) {
        this.edges.push([this.distance(vertex, element), index, (array.length + 1)]);
        this.edges.sort(function(a,b) {return b[0]-a[0]});
    });
    this.vertices.push(vertex);
};

// Identify clusters in graph, with edges of length no
// greater than maxLength
Graph.prototype.cluster = function(maxLength) {
    var edges = this.edges.slice(0);
    var clusters = [];
    this.vertices.forEach(function(element, index, array) {
        clusters.push([index]);
    });

    curEdge = edges.pop();
    while(curEdge < maxLength) {
        var el1 = this.vertices[curEdge[1]];
        var el2 = this.vertices[curEdge[2]];
        var cluster1;
        var cluster2;
        clusters.forEach(function(element, index, array) {
            if(element.indexOf(el1) != -1) {
                cluster1 = index;
            }
            else if(element.indexOf(el2) != -1) {
                cluster2 = index;
            }
        });
        var newCluster = clusters[cluster1].concat(clusters[cluster2]);
        clusters.splice(cluster1, 1);
        clusters.splice(cluster2, 1);
        clusters.push(newCluster);
        curEdge = edges.pop();
    }

    return clusters;
};

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
      if (!d.geo) return;
      var c = d.geo.coordinates;
      var marker = new google.maps.Marker({
        map: map,
        draggable: false,
        animation: google.maps.Animation.DROP,
        position: new google.maps.LatLng(c[0], c[1])
      });
    });
  });
}();
