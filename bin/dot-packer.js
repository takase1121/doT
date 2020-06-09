#!/usr/bin/env node
/* Continuation of https://github.com/Katahdin/dot-packer */

const fs = require('fs');
const { resolve, join } = require('path');
const { minify } = require('uglify-js');
const mkdirp = require('mkdirp');
const meow = require('meow');
const dot = require('..');

function mkdirOrDie(path) {
	try {
		mkdirp.sync(path);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
}

// main
const { flags, input } = meow(`
	Usage
		$ dottojs [option] source dest

	Options
		--global,  -g [value]	The global variable to install the templates in. Defaults to 'window.render'
		--package, -p [value]	If specified, package all templates from destination into specified file.

	Examples
		$ dottojs --package bundle.js src/ dest/
`, {
	version: '0.0.1',
	flags: {
		global: {
			type: 'string',
			alias: 'g',
			default: 'window.render'
		},
		package: {
			type: 'string',
			alias: 'p'
		}
	}
});

// get src and dest
if (input.length !== 2) {
	console.error('You did not specify input / output path');
	process.exit(1);
}

const [src, dest] = input;

if (resolve(dest) !== process.cwd())
	mkdirOrDie(dest);

if (flags.package && flags.package.endsWith('/'))
	mkdirOrDie(flags.package);


dot.process({
	path: src,
	destination: dest,
	global: flags.global
});


if (flags.package) {
	console.log("Packaging all files into " + flags.package);
	const files = fs.readdirSync(dest, { withFileTypes: true })
		.filter(dirent => dirent.isFile() && dirent.name.endsWith('.js'))
		.map(dirent => join(dest, dirent.name));
	const { code } = minify(files);

	fs.writeFileSync(flags.package, code);
}
