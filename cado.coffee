inflection = require 'inflection'
mysql = require 'mysql'
Promise = require 'yaku'
_ = require 'lodash'
querier = require './lib/querier'

class Model
  constructor: (record) ->
    _.extend @, record

  @initialize: (options) ->
    @Querier = querier options._table_name, options._schema
    _.extend @, options

  @query: (query, params) ->
    new Promise (resolve, reject) =>
      @pool.getConnection (err, connection) =>
        return reject err if err

        @log "Cado: #{query}"
        connection.query query, params, (err, records) ->
          connection.release()

          return reject err if err

          resolve records.map (record) ->
            return new Model record

  @find: (condition) ->
    @query @Querier condition

  @findOne: (condition) ->
    @query @Querier(condition)
    .then (records) ->
      return _.first records

module.exports = class Cado
  constructor: (@config) ->
    @models = {}

  connect: (@config) ->
    unless @pool
      @pool = mysql.createPool @config
    return @

  define: (name, schema, options) ->
    unless @pool
      throw new Error 'Cado#model: not connected to the server'

    if @models[name]
      if schema
        throw new Error "Cado#model: #{name} already exists"
      else
        return @models[name]

    class SubModel extends Model

    SubModel.initialize
      _name: name
      _schema: schema
      _table_name: inflection.pluralize name.toLowerCase()
      _options: options
      _cado: @
      pool: @pool
      log: @config.log or console.log

    @models[name] = SubModel

    return SubModel

