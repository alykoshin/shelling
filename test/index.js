/* globals describe, before, beforeEach, after, afterEach, it */

'use strict';

const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
chai.should();
//chai.use(require('chai-things')); // breaks .to.have.all.keys
chai.use(require('chai-arrays'));


describe('shelling', function () {

  before('before', function () {
  });

  beforeEach('beforeEach', function () {

  });

  afterEach('afterEach', function () {

  });

  after('after', function () {

  });

  describe('lookup', function () {
    let lookup;
    before('before', function () {
      lookup = require('../lib/lookupError').lookup;
    });

    it('is a function', function () {
      assert(typeof lookup === 'function', 'Expect function');
    });

    it('handles common errors', function () {
      const result = lookup('EACCES');
      expect(result).to.be.an('object');
      expect(result).to.include.all.keys('short', 'long');
    });

    it('handles linux errors', function () {
      const result = lookup('EACCES');
      expect(result).to.be.an('object');
      expect(result).to.include.all.keys('short');
    });

    it('handles unknown errors', function () {
      const result = lookup('__non__existent__');
      expect(result).to.be.an('object');
      expect(result).to.include.all.keys('short', 'long', 'notFound');
      expect(result).to.include({ notFound: true });
    });

  });

  describe('stringUtils', function () {
    let stringUtils;

    before('before', function () {
      stringUtils = require('../lib/stringUtils');
    });

    describe('splitQuoted', function () {

      it('is a function', function () {
        assert(typeof stringUtils.splitQuoted === 'function', 'Expect function');
      });

      it('returns array with empty string for empty string', function () {
        const data = '';
        const expected = [''];
        const result = stringUtils.splitQuoted(data);
        expect( result ).to.be.array();
        expect( result ).to.be.ofSize(1);
        expect(result).to.be.equalTo(expected);
      });

      it('splits unquoted strings as `split(/\\s+/)`', function () {
        const data = ' abc def    ghi ';
        const expected = data.split(/\s+/);
        const result = stringUtils.splitQuoted(data);
        expect(result).to.be.equalTo(expected);
      });

      it('not splits spaces inside quoted strings`', function () {
        const data = 'abc "def ghi" jkl';
        const expected = ['abc', 'def ghi', 'jkl'];
        const result = stringUtils.splitQuoted(data);
        expect(result).to.be.equalTo(expected);
      });

      it('handles several spaces as one', function () {
        const data = 'abc "def"  \"ghi\"   jkl';
        const expected = ['abc', 'def', 'ghi', 'jkl'];
        const result = stringUtils.splitQuoted(data);
        expect(result).to.be.equalTo(expected);
      });

      it('handles escaped quote \\" as regular character', function () {
        const data = 'abc \\"def\\" "ghi \\" jkl" mno pqr';
        const expected = ['abc', '"def"', 'ghi " jkl', 'mno', 'pqr'];
        const result = stringUtils.splitQuoted(data);
        expect(result).to.be.equalTo(expected);
      });

    });

    describe('templateLiteralsLike', function () {

      it('is a function', function () {
        assert(typeof stringUtils.templateLiteralsLike === 'function', 'Expect function');
      });

      it('handles some cases', function () {
        const data = 'abc ${def} ghi';
        const context = { def: 'fed' };
        const expected = 'abc fed ghi';
        const result = stringUtils.templateLiteralsLike(data, context);
        expect(result).to.be.equal(expected);
      });

    });

  });

});
