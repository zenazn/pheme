// Tweet Object
function Tweet(data, marker) {
  this.lat = data.coordinates.coordinates[1];
  this.lon = data.coordinates.coordinates[0];
  this.marker = marker;
  this.tweet = data;
}

// Geographical Distance Metric
// Returns geographical distance between two tweets
function geoMetric(t1, t2) {
  p1 = new google.maps.LatLng(t1.lat, t1.lon);
  p2 = new google.maps.LatLng(t2.lat, t2.lon);
  return google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
}

// Graph Object
function Graph(metric) {
  this.distance = metric;
  this.vertices = [];
  this.edges = [];
}

// Update graph with new vertex, keeping edges sorted in descending order
// by length
Graph.prototype.update = function (vertex) {
  var that = this;
  this.vertices.forEach(function(element, index, array) {
    that.edges.push([that.distance(vertex, element), index, array.length]);
    that.edges.sort(function(a,b) {return b[0]-a[0]});
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

  var num = 0;
  var curEdge;
  while((curEdge = edges.pop()) && curEdge[0] < maxLength) {
    var el1 = curEdge[1];
    var el2 = curEdge[2];
    var cluster1;
    var cluster2;
    clusters.forEach(function(element, index, array) {
      if(element.indexOf(el1) != -1) {
        cluster1 = index;
      }
      if(element.indexOf(el2) != -1) {
        cluster2 = index;
      }
    });
    if(cluster1 != cluster2) {
      var newCluster = clusters[cluster1].concat(clusters[cluster2]);
      if(cluster1 < cluster2) {
        clusters.splice(cluster2, 1);
        clusters.splice(cluster1, 1);
      }
      else {
        clusters.splice(cluster1, 1);
        clusters.splice(cluster2, 1);
      }
      clusters.push(newCluster);
    }
    num++;
  }
  return clusters;
};

!function() {
  "use strict";

  var graph = new Graph(geoMetric);
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
    twitter.on('data', function(d) {
      var c = d.coordinates.coordinates;
      var marker = new google.maps.Marker({
        map: map,
        draggable: false,
        animation: google.maps.Animation.DROP,
        position: new google.maps.LatLng(c[1], c[0])
      });
      
      var tweet = new Tweet(d, marker);
      graph.update(tweet);
      console.log(graph.cluster(5000));
    });
  });
}();
