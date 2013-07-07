var net = require('net');

var socket = new net.Socket();
var callback;
var buffer;

exports.send = function(script, _callback, options, host, port) {
    if (!(host && port)) {
        if (!process.env.PHANTOMJS_REMOTE) {
            console.log('phantomjs_remote: Set PHANTOMJS_REMOTE environment variable or call with ,host,port');
            return;
        } else {
            host = process.env.PHANTOMJS_REMOTE.split(':');
            port = host[1]; host = host[0];
        }
    }
    buffer = '';
    callback = _callback;
    socket.connect(port, host, function() {
//        console.log('Connected to ' + host + ':' + port);
        script = (options ? 'OPTIONS:' + JSON.stringify(options) + ' ' : '')
               + script + '_EOF_';
        socket.write(script);
    }); 
};

socket.on('data', function(data) {
    buffer += data.toString();
});

socket.on('error', function(exception){
    if (callback)
        callback(exception);
    // console.log(exception);
});


socket.on('drain', function() {
    // console.log("drain!");
});

socket.on('timeout', function() {
    if (callback)
        callback('timeout');
    // console.log("timeout!");
});

// Add a 'close' event handler for the client socket
socket.on('close', function() {
    if (callback) {
        if (buffer.match(/^ERROR: /))
            callback(buffer);
        else
            callback(false, buffer);
    }
    // console.log('Connection closed, buffer sent to callback');
});
