const _ = require('lodash')
const Loki = require('lokijs')
const Model = require('./model')

module.exports = class Cado {
  constructor(config) {
    this.models = {}
    if (config) {
      this.connect(config)
    }
  }

  connect(config) {
    if (!this.loki) {
      if (!config.filename) {
        throw new Error('Cado#Connect: config.filename is required.')
      }
      this.loki = new Loki(config.filename, _.extend({
        env: 'NODEJS',
        autoload: true,
      }, config))
      this.config = config
    } else {
      throw new Error('Cado#Connect: cado has been already connected.')
    }
    return this
  }

  model(name, definition, options = {}) {
    if (!this.loki) {
      throw new Error('Cado#Model: Not connected to the server')
    }

    if (this.models[name]) {
      if (definition) {
        throw new Error(`Cado#Model: ${name} already exists`)
      } else {
        return this.models[name]
      }
    }

    class SubModel extends Model {}

    SubModel.initialize({
      name,
      definition,
      options,
      loki: this.loki,
    })

    this.models[name] = SubModel

    return SubModel
  }
}
