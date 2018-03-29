const assert = require('assert')
const Joi = require('joi')
const Cado = require('../lib/cado')

describe('Cado', () => {
  describe('#constructor', () => {
    it('init loki config success', () => {
      const cado = new Cado({
        filename: `${__dirname}/test.db`,
      })
      assert.ok(cado.loki)
    })

    it('init loki without config.filename failed', () => {
      assert.throws(
        () => {
          const cado = new Cado({})
          assert.ok(!cado.loki)
        },
        Error
      )
    })
  })
  describe('#connect', () => {
    it('connect loki success', () => {
      const cado = new Cado()
      cado.connect({
        filename: `${__dirname}/test.db`,
      })
      assert.ok(cado.loki)
    })
    it('connect failed with duplicate', () => {
      const cado = new Cado()
      cado.connect({
        filename: `${__dirname}/test.db`,
      })
      assert.throws(
        () => {
          cado.connect({
            filename: `${__dirname}/test.db`,
          })
          assert.ok(!cado.loki)
        },
        Error
      )
    })
  })
  describe('#model', () => {
    it('create success', () => {
      const cado = new Cado({
        filename: `${__dirname}/test.db`,
      })
      const User = cado.model('user', {
        name: Joi.string(),
        phone: Joi.string(),
        address: Joi.string(),
      })
      assert.ok(User.findAndUpdateByFunction)
    })
    it('create failed without joi schema', () => {
      const cado = new Cado({
        filename: `${__dirname}/test.db`,
      })
      assert.throws(
        () => {
          const User = cado.model('user', {
            name: String,
            phone: String,
            address: String,
          })
          assert.ok(!User.findAndUpdateByFunction)
        },
        Error
      )
    })
    it('create failed with duplicate', () => {
      const cado = new Cado({
        filename: `${__dirname}/test.db`,
      })
      const User = cado.model('user', {
        name: Joi.string(),
        phone: Joi.string(),
        address: Joi.string(),
      })
      assert.ok(User.findAndUpdateByFunction)
      assert.throws(
        () => {
          const DuplicateUser = cado.model('user', {
            name: Joi.string(),
            phone: Joi.string(),
            address: Joi.string(),
          })
          assert.ok(!DuplicateUser.findAndUpdateByFunction)
        },
        Error
      )
    })
    it('create failed without init loki', () => {
      const cado = new Cado()
      assert.throws(
        () => {
          const User = cado.model('user', {
            name: String,
            phone: String,
            address: String,
          })
          assert.ok(!User.findAndUpdateByFunction)
        },
        Error
      )
    })
    it('get created model success', () => {
      const cado = new Cado({
        filename: `${__dirname}/test.db`,
      })
      const User = cado.model('user', {
        name: Joi.string(),
        phone: Joi.string(),
        address: Joi.string(),
      })
      assert.ok(User.findAndUpdateByFunction)
      assert.ok(cado.model('user').findAndUpdateByFunction)
    })
  })
})
