import assert from 'assert';
import Joi from 'joi';
import Cado from '../src/cado';

describe('Cado', () => {
  describe('#constructor', () => {
    it('init loki config success', () => {
      const cado = new Cado({
        filename: `${__dirname}/test.db`,
      });
      assert.ok(cado.loki);
    });

    it('init loki without config.filename failed', () => {
      assert.throws(
        () => {
          const cado = new Cado({});
          assert.ok(!cado.loki);
        },
        Error,
      );
    });
  });
  describe('#connect', () => {
    it('connect loki success', () => {
      const cado = new Cado();
      cado.connect({
        filename: `${__dirname}/test.db`,
      });
      assert.ok(cado.loki);
    });
  });
  describe('#model', () => {
    it('create success', () => {
      const cado = new Cado({
        filename: `${__dirname}/test.db`,
      });
      const User = cado.model('user', {
        name: Joi.string(),
        phone: Joi.string(),
        address: Joi.string(),
      }, {
        autoSave: true,
      });
      assert.ok(User.isCadoModel);
    });
    it('create failed without joi schema', () => {
      const cado = new Cado({
        filename: `${__dirname}/test.db`,
      });
      assert.throws(
        () => {
          const User = cado.model('user', {
            name: String,
            phone: String,
            address: String,
          }, {
            autoSave: true,
          });
          assert.ok(!User.isCadoModel);
        },
        Error,
      );
    });
    it('create failed with duplicate', () => {
      const cado = new Cado({
        filename: `${__dirname}/test.db`,
      });
      const User = cado.model('user', {
        name: Joi.string(),
        phone: Joi.string(),
        address: Joi.string(),
      }, {
        autoSave: true,
      });
      assert.ok(User.isCadoModel);
      assert.throws(
        () => {
          const DuplicateUser = cado.model('user', {
            name: Joi.string(),
            phone: Joi.string(),
            address: Joi.string(),
          }, {
            autoSave: true,
          });
          assert.ok(!DuplicateUser.isCadoModel);
        },
        Error,
      );
    });
    it('create failed without init loki', () => {
      const cado = new Cado();
      assert.throws(
        () => {
          const User = cado.model('user', {
            name: String,
            phone: String,
            address: String,
          }, {
            autoSave: true,
          });
          assert.ok(!User.isCadoModel);
        },
        Error,
      );
    });
    it('get created model success', () => {
      const cado = new Cado({
        filename: `${__dirname}/test.db`,
      });
      const User = cado.model('user', {
        name: Joi.string(),
        phone: Joi.string(),
        address: Joi.string(),
      }, {
        autoSave: true,
      });
      assert.ok(User.isCadoModel);
      assert.ok(cado.model('user').isCadoModel);
    });
  });
});
