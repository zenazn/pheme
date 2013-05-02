requirejs.config({
  baseUrl: '/js',
  waitSeconds: 120,
  paths: {
    common: '../common',
    jquery: '//cdnjs.cloudflare.com/ajax/libs/jquery/1.9.1/jquery.min',
    'socket.io': '//cdnjs.cloudflare.com/ajax/libs/socket.io/0.9.10/socket.io.min',
    handlebars: '//cdnjs.cloudflare.com/ajax/libs/handlebars.js/1.0.0-rc.3/handlebars.min',
    bootstrap: '//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/2.3.1/js/bootstrap.min',
    d3: '//cdnjs.cloudflare.com/ajax/libs/d3/3.0.8/d3.min',
    crossfilter: '//cdnjs.cloudflare.com/ajax/libs/crossfilter/1.1.3/crossfilter.min',
    dc: '../libraries/dc'
  },
  shim: {
    bootstrap: { deps: ['jquery'] },
    d3: { exports: 'd3' },
    crossfilter: { exports: 'crossfilter' },
    dc: { exports: 'dc' }
  }
});

define([
  'jquery',
  'common/phemeclustering',
  'common/LatLon',
  'twitterstream',
  'handlebars',
  'common/geolib',
  'map',
  'common/nlp',
  'd3',
  'crossfilter',
  'dc',
  'bootstrap'
], function($, PhemeClustering, LatLon, stream, handlebars, geolib, map, nlp) {
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
  var maxTime = 300;

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
  var t = setTimeout(update_bounds, 500);
  map.map.addListener('bounds_changed', function() {
    if (t) clearTimeout(t);
    t = setTimeout(update_bounds, 500);
  });

  var cluster_markers = {};

  var stuff = crossfilter(tweets);

  var tweetsByMin = stuff.dimension(function (d) {
    return d3.time.minute(d.date);
  });

  var tweetsByMinGroup = tweetsByMin.group().reduceSum(function(d) { 
    return 1; 
  });

  dc.barChart("#timedensity")
    .width(990) // (optional) define chart width, :default = 200
    .height(250) // (optional) define chart height, :default = 200
    .transitionDuration(100) // (optional) define chart transition duration, :default = 500
    // (optional) define margins
    .margins({top: 10, right: 50, bottom: 30, left: 40})
    .dimension(tweetsByMin) // set dimension
    .group(tweetsByMinGroup) // set group
    // (optional) whether chart should rescale y axis to fit data, :default = false
    .elasticY(true)
    // (optional) when elasticY is on whether padding should be applied to y axis domain, :default=0
    // (optional) whether chart should rescale x axis to fit data, :default = false
    .elasticX(true)
    // (optional) when elasticX is on whether padding should be applied to x axis domain, :default=0
    .xAxisPadding(0)
    // define x scale
    .x(d3.time.scale().domain([new Date(1985, 0, 1), new Date(2013, 11, 31)]))
    // (optional) set filter brush rounding
    .y([0, 10])
    .round(d3.time.minute.round)
    // define x axis units
    .xUnits(d3.time.minutes)
    // (optional) whether bar should be center to its x value, :default=false
    .centerBar(true)
    // (optional) render horizontal grid lines, :default=false
    .renderHorizontalGridLines(true)
    // (optional) render vertical grid lines, :default=false
    .renderVerticalGridLines(true)
    // (optional) add stacked group and custom value retriever
    .brushOn(true)
    // (optional) whether svg title element(tooltip) should be generated for each bar using
    // the given function, :default=no
    .title(function(d) { return "Value: " + d.value; })
    // (optional) whether chart should render titles, :default = false
    .renderTitle(true);

  var tweetsByMin = stuff.dimension(function (d) {
    return d3.time.minute(d.date);
  });

  var tweetsByMinGroup = tweetsByMin.group().reduceSum(function(d) { 
    return 1; 
  });

  dc.renderAll();

  stream.on('data', function(d) {
    var point = clustering.push(d);

    if (!point) return;

    point.data.marker = new map.Marker(point.pos);

    tweets.push({
      date: point.time,
      point: point
    });

    stuff.add([{
      date: point.time,
      point: point
    }]);

    dc.redrawAll();

    // Fade and remove old tweets
    var curTime = new Date().getTime();
    tweets = tweets.filter(function(tweet) {
      var age = (curTime - tweet.date.getTime())/1000;
      if (age > maxTime) {
        tweet.point.data.marker.hide();
        return false;
      }
      else {
        var opacity = (maxTime - age)/maxTime;
        tweet.point.data.marker.setOpacity(opacity);
        return true;
      }
    });

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
        .domain([0,1])
        .range(["grey", color]);

      // Create simple wordcloud display element
      var wordCloud = document.createElement("div");
      wordCloud.className = "wordCloud";
      tags.forEach(function(word) {
        var size = (word.value - minCount)/(maxCount - minCount) * 15 + 5;
        var tag = document.createElement("span");
        tag.style.fontSize = size + "px";
        tag.style.color = wordcolor((word.value-minCount)/(maxCount-minCount));
        tag.innerHTML = word.key;
        wordCloud.appendChild(tag);
      });

      // change color of points in cluster
      cluster.points.forEach(function(point) {
        point.data.marker.setColor(color);
      });

      var markers = cluster_markers[cluster.id];
      if (!markers) {
        console.log('new cluster', cluster);
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
      cluster.points.forEach(function(point) {
        el.append(tweet_template(point.data));
      });

      el.append(wordCloud);

      seen_ids[cluster.id] = true;
    });
    $.each(cluster_markers, function(k, markers) {
      if (k in seen_ids) return;
      markers.marker.hide();
      markers.sidebar.remove();
    });
  });
});
