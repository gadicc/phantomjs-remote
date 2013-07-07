var net = require('net');

var socket = new net.Socket();
var callback;
var buffer = '';

/* Usage:
 *
 * phantomjs_remote(phantomScript, function(error, result) {
 *  if (!error)
 *    console.log(result);
 *  else
 *    console.log('There was an error: ' + error);
 * }, [options], [host], [port]);
 *
 * Last two arguments are optional if PHANTOMJS_REMOTE set.
 *
*/

function phantomjs_remote(script, _callback, options, host, port) {
    if (!(host && port)) {
        if (!process.env.PHANTOMJS_REMOTE) {
            console.log('phantomjs_remote: Set PHANTOMJS_REMOTE environment variable or call with ,host,port');
            return;
        } else {
            host = process.env.PHANTOMJS_REMOTE.split(':');
            port = host[1]; host = host[0];
        }
    }
    callback = _callback;
    socket.connect(port, host, function() {
        console.log('Connected to ' + host + ':' + port);
        script = (options ? 'OPTIONS:' + JSON.stringify(options) + ' ' : '')
               + script + '_EOF_';
        socket.write(script);
    }); 
}

// Add a 'data' event handler for the client socket
// data is what the server sent to this socket
socket.on('data', function(data) {
    buffer += data.toString();
});

socket.on('error', function(exception){
    if (callback)
        callback(exception);
    console.log(exception);
});


socket.on('drain', function() {
    if (callback)
        callback('drain');
    console.log("drain!");
});

socket.on('timeout', function() {
    if (callback)
        callback('timeout');
    console.log("timeout!");
});

// Add a 'close' event handler for the client socket
socket.on('close', function() {
    if (callback) {
        if (buffer.match(/^ERROR: /))
            callback(buffer);
        else
            callback(false, buffer);
    }
    console.log('Connection closed, buffer sent to callback');
});

phantomjs_remote('console.log(1); phantom.exit();', function(error, result) {
    console.log(error);
    console.log(result);
}, { 'load-images': 'no' }, 'localhost', '8000');
