'use strict';

var doT = require('..');
var assert = require('assert');

describe('defines', function() {
    describe('without parameters', function() {
        it('should render define', function(){
            testDef('{{##def.tmp:{{=it.foo}}#}}{{#def.tmp}}');
        });

        it('should render define if it is passed to doT.compile', function() {
            testDef('{{#def.tmp}}', {tmp: '{{=it.foo}}'});
        });
    });

    describe('with parameters', function() {
        it('should render define', function(){
            testDef('{{##def.tmp:foo:{{=foo}}#}}{{ var bar = it.foo; }}{{# def.tmp:bar }}');
        });
    });

    function testDef(tmpl, defines) {
        var fn = doT.compile(tmpl, defines);
        assert.equal(fn({foo:'http'}), 'http');
        assert.equal(fn({}), 'undefined');
    }
});