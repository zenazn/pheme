define(['d3'], function(d3) {
  "use strict";

  var el = $('#scrubber'), brush, data = [];

  function add_data(d) {
    data.push(d.time);
  }

  var x = d3.time.scale(), y = d3.scale.linear();
  var svg = d3.select('#scrubber').append('svg'), g = svg.append('g');
  var axg = g.append('g'), brg = g.append('g'), arp = g.append('path');

  function draw_scrubber() {
    // Inspiration from http://bl.ocks.org/mbostock/1667367#index.html
    var margin = {top: 10, right: 10, bottom: 30, left: 10};
    var width = el.width() - margin.left - margin.right;
    var height = el.height() - margin.top - margin.bottom;

    svg.attr('width', width + margin.left + margin.right);
    svg.attr('height', height + margin.top + margin.bottom);
    g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var hist = d3.layout.histogram()
      .bins(Math.ceil((d3.max(data) - d3.min(data)) / 1000)) // 1s hunks
      (data);

    x.range([0, width]).domain(d3.extent(hist.map(function(d) { return d.x })));
    y.range([height, 0]).domain([0, d3.max(hist, function(d) { return d.y })]);

    var xAxis = d3.svg.axis().scale(x).orient('bottom');
    //var yAxis = d3.svg.axis().scale(y).orient('left');

    brush = d3.svg.brush().x(x).on('brush', update);

    var area = d3.svg.area()
      .interpolate('monotone')
      .x(function(d) { return x(d.x); })
      .y0(height)
      .y1(function(d) { return y(d.y); });


    arp.datum(hist).attr('d', area);

    axg.attr('class', 'x axis')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis);

    brg.attr('class', 'x brush')
      .attr('transform', 'translate(0,' + height + ')')
      .call(brush);

  }

  function update() {
    console.log('hi');
  }

  return {
    add: add_data,
    draw: draw_scrubber
  }
});
