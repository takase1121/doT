'use strict';

var assert = require('assert');
var doT = require('..');

exports.test = function (templates, data, result) {
    templates.forEach((tmpl) => {
        const fn = doT.template(tmpl);
        assert.strictEqual(fn(data), result);
    });
};
