/*
 * PhantomJS proxy v0.1, (c) 2013 Gadi Cohen, released under the GPLv3.
 *
 * Listen on a port, receive entire scripts at a time, run them on phantomjs and return
 * the output to the sending socket.  I prefer this to forking a new instance of
 * phantomjs for each request, as that wastes time and system resources.
 *
 * This is my first node script :)  Go easy on me.  I got help from:
 * http://www.davidmclifton.com/2011/07/22/simple-telnet-server-in-node-js/
 *
 *
 * TODO:
 *
 * [] Ability to serve up static files created by phantomjs.  I don't need this for my
 *    purposes but I guess it would be useful.
 */ 

var net = require('net');
 
var spawn = require('child_process').spawn;
var phantomjs = spawn('phantomjs');

var sockets = [];
var queue = [];
var buffer = '';
var buffers = {};

phantomjs.stdout.on('data', function(data) {
	console.log('ph: ' + data.toString());
	if (data == "phantomjs> ") {
		if (buffer == '')
			return;

		var matches = /!!({.*})!!/.exec(buffer);
		if (matches) {
			var obj = JSON.parse(matches[1]);
			console.log(obj);
			if (obj.exit)
				sockets[obj.socket].end(obj.data);
			else
				sockets[obj.socket].write(obj.data);
		} else {
			console.log("Didn't know what to do with the following buffer:");
			console.log(buffer);
		}

		var socket = queue.shift();
		if (sockets.indexOf(socket) != -1)
			socket.end(buffer);
		buffer = '';
	} else if (data.toString().substr(0,11) == "phantomjs> ") {
		buffer += data.toString().substr(0, data.length-11);
	} else {
		buffer += data;
	}
});

phantomjs.stderr.on('data', function (data) {
    console.log('PhantomJS error: ' + data);
});

phantomjs.on('close', function (code) {
    console.log('PhantomJS exited with code ' + code);
});


/*
 * Take first line of input (there should only be one, and it should be shorter
 * than node's buffer... this is fine for spiderable, untested with anything else.
 */
function receiveData(socket, data) {
	var str = data.toString().replace(/\r|\n/g, '');
	var i = sockets.indexOf(socket);

	//console.log('[socket:'+i+'] "' + str + '"');
	if (str.match(/_EOF_$/)) {
		queue.push(socket);
		buffers[i] = '(function(){'
			+ 'function remote_return(data, exit) {'
			+ '  console.log("!!"+JSON.stringify({ socket: ' + i + ', data: data, exit: exit })+"!!");'
			+ '} ' + buffers[i] + str.replace(/_EOF_$/, '') + '}).call(this);\n';
		console.log('sending: ' + buffers[i]);
		phantomjs.stdin.write(buffers[i]);
	} else {
		buffers[i] += str;
	}
}

function closeSocket(socket) {
	var i = sockets.indexOf(socket);
	if (i != -1) {
		sockets.splice(i, 1);
	}
}

function newSocket(socket) {
	console.log('[' + new Date().toLocaleString() + '] New connection');
	sockets.push(socket);
	buffers[sockets.indexOf(socket)] = '';
	socket.on('data', function(data) {
		receiveData(socket, data);
	});	
	socket.on('end', function() {
		closeSocket(socket);
	});
}
 
// Create a new server and provide a callback for when a connection occurs
var server = net.createServer(newSocket);
 
// Listen on port 8888
server.listen(8000);
