'use strict';

var test = require('./util').test;
var assert = require('assert');
var doT = require('..');


describe('doT', function(){
	var basictemplate = '{"foo": "{{=it.foo}}"}';
	var basiccompiled = doT.template(basictemplate);

	describe('.name', function (){
		it('should have a name', function(){
			assert.strictEqual(doT.name, 'doT');
		});
	});

	describe('#template()', function(){
		it('should return a function', function(){
			assert.equal(typeof basiccompiled, 'function');
		});
	});

	describe('#()', function(){
		it('should render the template', function(){
			assert.equal(basiccompiled({foo:'http'}), '{"foo": "http"}');
			assert.equal(basiccompiled({}), '{"foo": "undefined"}');
		});
	});

	describe('interpolate 2 numbers', function() {
		it('should print numbers next to each other', function() {
			test([
				'{{=it.one}}{{=it.two}}',
				'{{= it.one}}{{= it.two}}',
				'{{= it.one }}{{= it.two }}'
			], {one:1, two: 2}, '12');
		});
	});

	describe('evaluate JavaScript', function() {
		it('should print numbers next to each other', function() {
			test([
				'{{ it.one = 1; it.two = 2; }}{{= it.one }}{{= it.two }}',
			], {}, '12');
		});
	});

	describe('invalid JS in templates', function() {
		it('should throw exception', function() {
			assert.throws(function() {
				doT.template('<div>{{= foo + }}</div>');
			});
		});
	});
});
