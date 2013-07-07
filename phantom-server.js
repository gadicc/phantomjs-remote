/*
 * PhantomJS proxy v0.1, (c) 2013 Gadi Cohen, released under the GPLv3.
 *
 * Accepts scripts to run in PhantomJS over a network connection 
 *
 * This is my first node script :)  Go easy on me.  I got help from:
 * http://www.davidmclifton.com/2011/07/22/simple-telnet-server-in-node-js/
 *
 * The original plan was to keep a single phantomjs running in REPL mode rather than
 * spawning a new process for each script, but it seems REPL mode is broken, i.e.
 * https://github.com/ariya/phantomjs/issues/11180
 *
 * Once the REPL is rewritten/fixed, I intend to continue work on the old code (see
 * phantomjs-repl.js), as I think this will be faster and less resource intensive.
 *
 * TODO:
 *
 * [] Ability to serve up static files created by phantomjs.  I don't need this for my
 *    purposes but I guess it would be useful.
 */ 


var net = require('net');
var child_process = require('child_process');

if (process.argv.length < 3) {
	console.log('Usage: ./phantom-server <port>');
	return;
}

var port = process.argv[2];
var sockets = [];
var buffer = '';
var buffers = [];

// how long to let phantomjs run before we kill it
var REQUEST_TIMEOUT = 15*1000;

// only allow safe user input
function process_options(options) {
	var out = {};
	if (options['load-images'])
		out['load-images'] = (options['load-images'] == 'yes') ? 'yes' : 'no';
	return out;
}

function receiveData(socket, data) {
	var str = data.toString().replace(/\r|\n/g, '');
	var i = sockets.indexOf(socket);
	var options = {};

	if (str.match(/_EOF_$/)) {
		var script = buffers[i] + str.replace(/_EOF_$/, '');
		script = script.replace(/^OPTIONS:(\{.*?\}) /, function(match, _options) {
			options = process_options(JSON.parse(_options));
			return '';
		});

		// Security note: The script has had all newlines stripped.  Our script
		// is piped through bash, so this also ensures that no one can send a
		// newline followed by _EOF_, which would allow them to run custom shell
		// commands (bash injection).

	    // Run phantomjs (this note taken from Meteor spiderable package)
	    //
	    // Use '/dev/stdin' to avoid writing to a temporary file. We can't
	    // just omit the file, as PhantomJS takes that to mean 'use a
	    // REPL' and exits as soon as stdin closes.
	    //
	    // However, Node 0.8 broke the ability to open /dev/stdin in the
	    // subprocess, so we can't just write our string to the process's stdin
	    // directly; see https://gist.github.com/3751746 for the gory details. We
	    // work around this with a bash heredoc. (We previous used a "cat |"
	    // instead, but that meant we couldn't use exec and had to manage several
	    // processes.)

		var execLine = 'exec phantomjs';
		if (options['load-images'])
			execLine += " --load-images=" + options['load-images'];
		execLine += ' /dev/stdin << _EOF_\n' + script + '\n_EOF_\n';

	    child_process.execFile('/bin/bash', ['-c', (execLine)],
	      {timeout: REQUEST_TIMEOUT},
	      function (error, stdout, stderr) {
	        if (!error) {
	        	if (sockets.indexOf(socket) != -1)
	        		socket.end(stdout);
	        } else {
				if (error && error.code === 127) {
					socket.end("ERROR: phantomjs not installed. Download and install from http://phantomjs.org/");
					console.log("phantomjs not installed. Download and install from http://phantomjs.org/");
				} else {
					socket.end("ERROR: phantomjs failed: " +  error + "\nstderr:" + stderr);
					console.log("phantomjs failed:", error, "\nstderr:", stderr);
				}
	        }
	      }
	    );
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
//	console.log('[' + new Date().toLocaleString() + '] New connection');
	sockets.push(socket);
	buffers[sockets.indexOf(socket)] = '';
	socket.on('data', function(data) {
		receiveData(socket, data);
	});	
	socket.on('end', function() {
		closeSocket(socket);
	});
}
 
var server = net.createServer(newSocket);
server.listen(port);
