== phantomjs-remote ==

Run [PhantomJS](http://phantomjs.org/) scripts on a remote server (e.g. if the phantomjs
binary is not available on the local system, like a PaaS virtual machine with an
unsupported architecture for [phantomjs node wrapper](https://github.com/Obvious/phantomjs).)

This is my first node.js script, go easy on me :)

== Usage ==

```js
require('phantomjs_remote');
phantomjs_remote(phantomJsScript, callback, [options], [host], [port]).
```

*options* is an optional JSON dictionary with any required options, for now only *load-images* is supported, e.g. { 'load-images': 'no' }.

The last two options may be ommitted if PHANTOMJS_REMOTE environment variable is set
with "host:port".

Short example:
```js
phantomjs_remote('console.log(1); phantom.exit();', function(error, result) {
	if (!error)
		console.log(result);
}, { 'load-images': 'no'} );
```

== Server script ==

The phantom

== Security ==

You are advised against running this script on it's own and should instead:

1. Run it in a chroot jail
2. Firewall the port to only receive connections from trusted hosts
