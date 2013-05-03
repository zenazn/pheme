define(['socket.io'], function() {
  var socket = io.connect('http://localhost:3000');

  var twitter = socket.of('/twitter');

  // Authenticate
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
    sessionStorage['stream'] = 'twitter';
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
        sessionStorage['stream'] = 'twitter';
      });
    }
  });

  return twitter;
});
