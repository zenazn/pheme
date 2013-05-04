requirejs.config({
  baseUrl: '/js',
  waitSeconds: 120,
  paths: {
    common: '../common',
    jquery: '//cdnjs.cloudflare.com/ajax/libs/jquery/1.9.1/jquery.min',
    'socket.io': '//cdnjs.cloudflare.com/ajax/libs/socket.io/0.9.10/socket.io.min',
    handlebars: '//cdnjs.cloudflare.com/ajax/libs/handlebars.js/1.0.0-rc.3/handlebars.min',
    bootstrap: '//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/2.3.1/js/bootstrap.min',
    d3: '//cdnjs.cloudflare.com/ajax/libs/d3/3.0.8/d3.min'
  },
  shim: {
    bootstrap: { deps: ['jquery'] },
    d3: { exports: 'd3' }
  }
});

define([
  'jquery',
  'common/phemeclustering',
  'twitterstream',
  'common/geolib',
  'map',
  'common/nlp',
  'scrubber',
  'handlebars',
  'bootstrap'
], function($, PhemeClustering, stream, geolib, map, nlp, scrubber) {
  "use strict";

  var clustering = new PhemeClustering();

  var tweet_template = Handlebars.compile($('#tweet-template').html());

  // 12 qualitative colors from http://colorbrewer2.org/
  var colors = [
    '#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462',
    '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f'
  ];

  // Store all tweets in order of time received.
  var tweets = [];

  // Maximum age of tweet allowed
  var maxTime = 1200;

  var previous_bounds = '';
  function update_bounds() {
    var bounds = map.map.getBounds();
    var ne = bounds.getNorthEast(), sw = bounds.getSouthWest();
    var floor = function(n) { return Math.floor(n * 4) / 4; };
    var ceil = function(n) { return Math.ceil(n * 4) / 4; };
    bounds = [
      floor(sw.lng()), floor(sw.lat()),
      ceil(ne.lng()), ceil(ne.lat())
    ].join(',');
    if (sessionStorage.stream && bounds != previous_bounds) {
      console.log("Panning to", bounds);
      stream.emit('stream', {locations: bounds});
      previous_bounds = bounds;
    }
  }

  var cluster_markers = {};

  // Do periodic tasks, like fading and drawing things
  setInterval(function() {
    // Fade and remove old tweets
    if (!window.location.hash) {
      var curTime = new Date().getTime();
      tweets = tweets.filter(function(tweet) {
        var age = (curTime - tweet.time.getTime())/1000;
        if (age > maxTime) {
          tweet.data.marker.hide();
          return false;
        }
        else {
          var opacity = (maxTime - age)/maxTime;
          tweet.data.marker.setOpacity(opacity);
          return true;
        }
      });
    }

    scrubber.draw(tweets);

    var clusters = clustering.clusters(), seen_ids = {};

    clusters.forEach(function(cluster) {
      // Compatability stuff
      var color = colors[cluster.id % colors.length];
      var points = cluster.points.map(function(p) { return p.pos; });
      var center = geolib.centroid(points);
      var radius = geolib.radius(points, center);

      var tags = nlp.frequency(cluster.points);

      tags = d3.entries(tags).sort(function(a, b) {
        return b.value - a.value;
      }).slice(0,10);

      var maxCount = tags[0].value;
      var minCount = tags[tags.length - 1].value - 1;

      tags = tags.sort(function(a, b) {
        return (b.key < a.key);
      });

      // Color gradient using d3
      var wordcolor = d3.scale.linear()
        .domain([0, 1])
        .range(['#999', '#2980b9']);

      // Create simple wordcloud display element
      var wordCloud = $('<div></div>').addClass('word-cloud');
      tags.forEach(function(word) {
        var percent = (word.value - minCount)/(maxCount - minCount);
        var size = percent * 15 + 5;
        var tag = $('<span></span>');
        tag.css('font-size', size + 'px');
        tag.css('color', wordcolor(percent));
        tag.text(word.key);
        wordCloud.append(tag);
      });

      // change color of points in cluster
      cluster.points.forEach(function(point) {
        point.data.marker.setColor(color);
      });

      var markers = cluster_markers[cluster.id];
      if (!markers) {
        //console.log('new cluster', cluster);
        markers = cluster_markers[cluster.id] = {
          marker: new map.ClusterMarker(center, radius, color),
          sidebar: $("<div></div>")
        };

        // Set up sidebar element
        markers.sidebar
          .addClass('cluster')
          .data('cluster', cluster.id)
          .css('backgroundColor', color)
          // Sometimes this glitches out and keeps a marker really big. IDK.
          .hover(/* mouseenter */ function() {
            markers.marker.setSize(10);
          }, /* mouseleave */function() {
            markers.marker.setSize(4);
          });
        $('#sidebar').append(markers.sidebar);
      } else {
        markers.marker.setPosition(center);
        markers.marker.setRadius(radius);
      }

      var el = markers.sidebar;
      el.empty();

      el.append(wordCloud);

      cluster.points.forEach(function(point) {
        el.append(tweet_template(point.data));
      });


      seen_ids[cluster.id] = true;
    });
    $.each(cluster_markers, function(k, markers) {
      if (k in seen_ids) return;
      markers.marker.hide();
      markers.sidebar.remove();
    });
  }, 1000);

  function add_tweet(d) {
    var point = clustering.push(d);
    if (!point) return;

    scrubber.add(point);

    point.data.marker = new map.Marker(point.pos);
    point.data.marker.setTitle(point.data.text);

    tweets.push(point);
  }

  if (window.location.hash) {
    var file = window.location.hash.substr(1);
    d3.json('/traces/' + file, function(data) {
      data.forEach(add_tweet);
    });
  } else {
    stream.on('data', add_tweet);

    // Allow the user to scrub
    var t = setTimeout(update_bounds, 500);
    map.map.addListener('bounds_changed', function() {
      if (t) clearTimeout(t);
      t = setTimeout(update_bounds, 500);
    });
  }
});
