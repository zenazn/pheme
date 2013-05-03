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

define(['jquery', 'handlebars'], function($) {
  var event_template = Handlebars.compile($('#event-template').html());
  $.get('/traces', function(data) {
    data.forEach(function(name) {
      var el = event_template({
        name: name.replace('.json', ''),
        file: name
      });
      $('#events').append(el);
    });
  });
  $('#events').on('click', '.event', function(e) {
    var file = $(this).data('file');
    window.location = '/map.html#' + file;
  });
});
