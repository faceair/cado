inflection = require 'inflection'
Promise = require 'yaku'
mysql = require 'mysql'
_ = require 'lodash'

querier = require './lib/querier'

class Model
  constructor: (record, options = {}) ->
    _.extend @, _.defaults options,
      is_new: true
      is_destroy: false

    @refresh record

    Object.seal @

  @initialize: ({table_name, schema, @pool, @log}) ->
    @schema = _.defaults schema,
      id:
        number: true

    @Querier = (args...) ->
      @query querier(table_name, @schema).apply(@, args)

    _.keys(@schema).map (key) =>
      Object.defineProperty @prototype, key,
        enumerable: true
        configurable: false
        get: ->
          @record[key]

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
              return new @ record,
                is_new: false

          resolve records

  @create: (values) ->
    @Querier 'INSERT', values
    .then ({insertId}) =>
      @findById insertId

  @findAll: (condition) ->
    @Querier 'SELECT', condition

  @findOne: (condition) ->
    @findAll _.extend condition,
      limit: 1
    .then (records) ->
      return _.first(records) or null

  @find: @findOne

  @findById: (id) ->
    Promise.resolve().then =>
      unless _.isNumber id
        throw new Error 'Cado#findById:Id must be integer.'

      @findOne
        id: id

  @update: (values, condition) ->
    @Querier 'UPDATE', values, condition

  @destroy: (condition) ->
    @Querier 'DELETE', condition

  get: (key) ->
    return @record[key]

  refresh: (record, options = {}) ->
    record = _.pick record, _.keys(@constructor.schema)
    if _.isUndefined @record
      Object.defineProperty @, 'record',
        enumerable: false
        configurable: true
        writable: true
        value: record
    else
      @record = record

    _.extend @, options

    return @

  save: ->
    unless @is_new
      throw new Error 'Cado#save:Record has been save.'

    @constructor.create @record
    .then ({record}) =>
      @refresh record,
        is_new: false

  verify: (method) ->
    if @is_new
      throw new Error "Cado##{method}:Record must be save."

    unless _.isNumber @id
      throw new Error "Cado##{method}:Record id must be integer."

    if @is_destroy
      throw new Error "Cado##{method}:Record has been destroy."

  update: (values) ->
    Promise.resolve().then =>
      @verify 'update'

      @constructor.update values,
        id: @id
      .then ({affectedRows}) =>
        unless affectedRows > 0
          throw new Error 'Cado#update:Record update fail.'
        @reload()

  destroy: ->
    Promise.resolve().then =>
      @verify 'destroy'

      @constructor.destroy
        id: @id
      .then ({affectedRows}) =>
        unless affectedRows > 0
          throw new Error 'Cado#destroy:Record destroy fail.'
        @is_destroy = true

  reload: ->
    Promise.resolve().then =>
      @verify 'reload'

      @constructor.findById @id
      .then ({record}) =>
        unless record
          throw new Error 'Cado#reload:Record reload fail.'
        @refresh record

  inspect: ->
    if @is_destroy
      throw new Error 'Cado#inspect:Record has been destroy.'

    return _.clone @record

  toJSON: @prototype.inspect

  toString: ->
    return JSON.stringify @inspect()

module.exports = class Cado
  constructor: (@config) ->
    @models = {}
    if @config
      @connect()

  connect: (@config = @config) ->
    unless @pool
      @pool = mysql.createPool @config
    return @

  model: (name, schema, options) ->
    unless @pool
      throw new Error 'Cado#model: not connected to the server'

    if @models[name]
      if schema
        throw new Error "Cado#model: #{name} already exists"
      else
        return @models[name]

    class SubModel extends Model

    SubModel.initialize
      schema: schema
      table_name: inflection.pluralize name.toLowerCase()
      pool: @pool
      log: @config.log or ->

    @models[name] = SubModel

    return SubModel

