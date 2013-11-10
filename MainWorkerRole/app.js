
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');

var app = express();
var server = http.createServer(app);

var io = require('socket.io').listen(server);
var tfs = require('./tfs').createMonitor(
  'http://172.16.0.4/odatatfs',
  'ACE',
  'ACE-CI',
  30000);

// all environments
app.set('port', process.env.PORT || 1337);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

io.sockets.on('connection', function(socket) {
  if (io.sockets.clients().length === 1) {
    tfs.on('build update', function(build) {
      io.sockets.emit('build update', build);
    });
  }
});

io.sockets.on('disconnect', function() {
  if (io.sockets.clients().length === 0) {
    tfs.removeAllListeners('build update');
  }
});
