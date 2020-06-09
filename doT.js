/**
 * doT.js
 * @author Laura Doktorova <https://github.com/olado/doT>
 * @author takase1121
 * @license MIT
 */

"use strict";
const { version } = require('./package.json');
/**
 * The method used to concatenate strings.
 * Defaults to append currently, but if template string is stable, we will use that.
 */
const concatMethod = {
	append:   { start: "`+(",      end: ")+`" },
	template: { start: "${",       end: "}"   }
};
/**
 * This regex matches empty string
 */
const skip = /$^/;

/**
 * This function constructs a 'pipe' that allows chaining functions
 * Note that only one argument can be passed to the first function. If you want more,
 * curry your own function
 * @param {...*} fn The list of function to pipe from left to right
 * @returns {function} The generated function.
 */
const pipe = (...fn) => arg => [...fn].reduce((val, fn) => fn(val), arg);
/**
 * Strips trailing newline and spaces
 * @param {string} str input
 * @returns {string} output
 */
const stripWS = str => str.replace(/(^|\r|\n)\t* +| +\t*(\r|\n|$)/g, ' ');
/**
 * Strips block comments
 * @param {string} str input
 * @returns {string} output
 */
const stripComment = str => str.replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g, '');
/**
 * Unescapes code
 * @param {string} code input
 * @returns {string} output
 */
const unescapeCode = code => code.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, " ");
/**
 * Unescapes a literal escape sequence (eg. '\\t' -> '\t')
 * @param {string} str input
 * @returns {string} output
 */
const unescapeString = str => JSON.parse('"' + str.replace(/"/g, '\\"') + '"');
const resolveDefs = (settings, template, def) => {
	return template
		.toString()
		.replace(settings.define || skip, (m, code, assign, value) => {
			if (code.startsWith('def.'))
				code = code.slice(4);
			if (!(code in def)) {
				if (assign === ':') {
					if (settings.defineParams)
						// we AND the value with undefined because that way we can return undefined instead of def[code]
						value.replace(settings.defineParams, (m, param, v) => (def[code] = { arg: param, text: v }) && undefined );
					if (!(code in def))
						def[code] = value;
				} else {
					new Function('def', `def['${code}']=${value}`)(def);
				}
			}
			return "";
		})
		.replace(settings.use || skip, (m, code) => {
			if (settings.useParams)
				code = code.replace(settings.useParams, (m, s, d, param) => {
					if (def[d] && def[d].arg && param) {
						const rw = `${d}:${param}`.replace(/'\\/g, '_');
						def.__exp = def.__exp || {};
						def.__exp[rw] = def[d].text.replace(new RegExp(`(^|[^\\w$])${def[d].arg}([^\\w$])`, 'g'), `$1${param}$2`);
						return `${s}def.__exp['${rw}']`;
					}
				});

			const v = new Function('def', `return ${code}`)(def);
			return v ? resolveDefs(settings, v, def) : v;
		});
};
/**
 * Creates a templating function
 * @param {string} template doT template
 * @param {object} [def] Compile time snippets
 * @param {object} [templateSettings] Template settings
 * @returns {*} a template function that accepts an argument `(it)`
 */
const template = (template, def, templateSettings) => {
	const settings = Object.assign({}, exports.defaultTemplateSettings, templateSettings || {});
	const concat = settings.tstring ? concatMethod.template : concatMethod.append;

	// this counter counts the number of iterate statements to generate a unique id for its index
	// this is unecessary in case of 1 level iteration, but you can do multiple, so it is needed after all
	let iterationCounter = 0;
	let str = settings.use || settings.define ? resolveDefs(settings, template, def || {}) : template;

	// if strip is enabled we strip trailing newlines and whitespaces
	str = settings.strip ? pipe(stripWS, stripComment)(str) : str;
	str = str
		// escape quotes and backslashes?
		.replace(/'|\\/g, "\\$&")
		// escape literal (raw) text
		.replace(settings.raw || skip, (m, code) => code ? unescapeString(code) : settings.newline)
		// interpolate data
		.replace(settings.interpolate || skip, (m, code) => concat.start + unescapeCode(code) + concat.end)
		// generate conditional statements
		.replace(settings.conditional || skip, (m, elseif, code) => {
			return elseif ?
				(code ? '`;}else if(' + unescapeCode(code) + '){out+=`' : '`;}else{out+=`') :
				(code ? '`;if(' + unescape(code)  + '){out+=`' : '`;};out+=`');
		})
		// generate loops for literation
		.replace(settings.iterate || skip, (m, iterate, varName, indexName) => {
			if (!iterate) return '`};out+=`';

			iterate = unescapeCode(iterate);
			const iname = `i${iterationCounter++}`;
			// basically we generate a for loop with the iterate, and define varName as iterate[i] and indexName as i
			return '`;' +
				`for(let ${iname}=0;${iname}<${iterate}.length;${iname}++){` +
				`let ${varName}=${iterate}[${iname}],${indexName}=${iname};` +
				'out+=`';
		})
		// escape js code
		.replace(settings.evaluate || skip, (m, code) => '`;' + unescapeCode(code) + 'out+=`');

	// generate headers
	str = 'let out=`' + str + '`;return out;';
	str = str
		// replace literal newlines and tabs with escaped version
		.replace(/\n/g, "\\n").replace(/\t/g, '\\t').replace(/\r/g, "\\r")
		// remove useless 'out+=``' statements, it will generate that sometimes and should be removed
		.replace(/(\s|;|\}|^|\{)out\+=``;/g, '$1')
		// remove useless '+``' statements
		.replace(/\+``/g, "");

	// make the function
	if (settings.log)
		typeof settings.log === 'function' ? settings.log('Output: ' + str) : console.log('Output: ' + str);
	return new Function(settings.varname, str);
};
/**
 * Convience function to compile a template with default settings
 * @param {string} template doT template
 * @param {object} def compile time values
 * @returns {*} A function
 */
const compile = (template, def) => exports.template(template, def);

exports.name = 'doT';
exports.version = version;
exports.defaultTemplateSettings = {
	evaluate:    /\{\{([\s\S]+?(\]?)+)\}\}/g,
	interpolate: /\{\{=([\s\S]+?)\}\}/g,
	raw:         /\{\{\!([\s\S]*?)\}\}/g,
	use:         /\{\{#([\s\S]+?)\}\}/g,
	useParams:   /(^|[^\w$])def(?:\.|\[[\'\"])([\w$\.]+)(?:[\'\"]\])?\s*\:\s*([\w$\.]+|\"[^\"]+\"|\'[^\']+\'|\{[^\}]+\})/g,
	define:      /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
	defineParams:/^\s*([\w$]+):([\s\S]+)/,
	conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
	iterate:     /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
	varname:	"it",
	newline:    '\n',
	strip:		true,
	tstring:	false,
	log:		false
};
exports.template = template;
exports.compile = compile;
