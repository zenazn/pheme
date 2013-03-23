"use strict";

var domain = require('domain');

exports.io = function(socket, fn) {
  var sandbox = domain.create();
  sandbox.add(socket);

  var handler = sandbox.run(fn);
  sandbox.on('error', function(e) {
    console.error(e.stack);
    if (typeof handler != 'undefined') {
      handler.disconnect(e);
    }
    socket.disconnect();
  });
};
