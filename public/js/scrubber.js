define(['d3'], function(d3) {
  "use strict";

  var el = $('#scrubber'), data = [];

  function add_data(d) {
    data.push(d.time);
  }

  var x = d3.time.scale(), y = d3.scale.linear();
  var brush = d3.svg.brush();
  var svg = d3.select('#scrubber').append('svg'), g = svg.append('g');
  var axg = g.append('g'), arp = g.append('path'), brg = g.append('g');

  function draw_scrubber(tweets) {
    // Inspiration from http://bl.ocks.org/mbostock/1667367#index.html
    var margin = {top: 10, right: 10, bottom: 25, left: 10};
    var width = el.width() - margin.left - margin.right;
    var height = el.height() - margin.top - margin.bottom;

    svg.attr('width', width + margin.left + margin.right);
    svg.attr('height', height + margin.top + margin.bottom);
    g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var bins = Math.ceil((d3.max(data) - d3.min(data)) / 1000); // 1s hunks
    // Make sure we don't have too many
    while (bins > 2 * 60) bins /= 5;
    var hist = d3.layout.histogram().bins(bins)(data);

    x.range([0, width]).domain(d3.extent(hist.map(function(d) { return d.x })));
    y.range([height, 0]).domain([0, d3.max(hist, function(d) { return d.y })]);

    var xAxis = d3.svg.axis().scale(x).orient('bottom');

    brush.x(x).on('brush', update(tweets));

    var area = d3.svg.area()
      .interpolate('monotone')
      .x(function(d) { return x(d.x); })
      .y0(height)
      .y1(function(d) { return y(d.y); });


    arp.attr('class', 'data').datum(hist).attr('d', area);

    axg.attr('class', 'x axis')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis);

    brg.attr('class', 'x brush')
      .attr('transform', 'translate(0,' + height + ')')
      .call(brush)
    .selectAll('rect')
      .attr('y', -height - 6)
      .attr('height', height + 7);

  }

  function update(tweets) {
    if (!brush.empty()) {
      var range = brush.extent();
      tweets.forEach(function(tweet) {
        if (tweet.time > range[1] || tweet.time < range[0]) {
          if (tweet.data.marker.shown) {
            tweet.data.marker.hide();
          }
        }
        else {
          if (!tweet.data.marker.shown) {
            tweet.data.marker.show();
          }
        }
      });
    }
    else {
      tweets.forEach(function(tweet) {
        if (!tweet.data.marker.shown) {
            tweet.data.marker.show();
        }
      });
    }
  }

  return {
    add: add_data,
    draw: draw_scrubber
  }
});
