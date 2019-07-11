var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
const {
  exec
} = require('child_process');

/////////////////
// constants
/////////////////

_folders = __dirname.split(path.sep)
_folders = _folders.slice(0, _folders.length - 1)
_folders.push(".git")
pilotnetPath = _folders.join(path.sep)


//////////////////
///// routes
//////////////////
app.use('/', express.static(path.join(__dirname, 'public')));

io.on('connection', function(socket) {
  var address = socket.handshake.address;
  console.log('a user connected: ' + address);

  socket.on('telemetry', function(data) {
    // console.log("telemetry");
    io.emit("telemetry", data);
  });

  socket.on('manual', function(data) {
    // console.log("telemetry");
    io.emit("manual", data);
  });

  socket.on('steer', function(data) {
    Object.keys(data).forEach(function(k) {
      data[k] = String(data[k])
    })

    io.emit("steer", data);
  });

  socket.on('disconnect', function(socket) {
    console.log('a user disconnected: ' + address);
  });
});

port = 4567;

http.listen(port, function() {
  console.log('listening on *:' + port);
});
