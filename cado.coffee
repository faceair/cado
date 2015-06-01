inflection = require 'inflection'
mysql = require 'mysql'
Promise = require 'yaku'
_ = require 'lodash'
querier = require './lib/querier'

class Model
  constructor: (record) ->
    _.extend @, _.defaults record,
      '_model': @constructor

  @initialize: (options) ->
    schema = _.defaults options._schema,
      id:
        number: true
    @Querier = querier options._table_name, schema
    _.extend @, options

  @query: (query, params) ->
    new Promise (resolve, reject) =>
      @pool.getConnection (err, connection) =>
        return reject err if err

        @log "Cado#log: #{query}"
        connection.query query, params, (err, records) =>
          connection.release()

          return reject err if err

          if _.isArray records
            records = records.map (record) =>
              return new Model _.extend(record, _model: @)

          resolve records

  @create: (values) ->
    @query @Querier 'INSERT', values

  @findAll: (condition) ->
    @query @Querier 'SELECT', condition

  @findOne: (condition) ->
    @findAll _.extend({}, condition, limit: 1)
    .then (records) ->
      return _.first(records) or null

  @find: @findOne

  @update: (values, condition) ->
    @query @Querier 'UPDATE', values, condition

  @delete: (condition) ->
    @query @Querier 'DELETE', condition

  save: ->
    @_model.create @
    .then (result) =>
      {insertId} = result
      @_model.findOne
        id: insertId
      .then (row) =>
        _.extend @, row
        return result

  update: (values) ->
    @_model.update values,
      id: @id

  drop: ->
    @_model.delete
      id: @id

module.exports = class Cado
  constructor: (@config) ->
    @models = {}
    if @config
      @connect()

  connect: (@config = @config) ->
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
      log: @config.log or ->

    @models[name] = SubModel

    return SubModel

