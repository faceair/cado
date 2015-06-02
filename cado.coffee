inflection = require 'inflection'
Promise = require 'yaku'
mysql = require 'mysql'
_ = require 'lodash'

querier = require './lib/querier'

class Model
  constructor: (record) ->
    _.extend @, record
    @extend record

  @initialize: ({table_name, schema, @pool, @log}) ->
    schema = _.defaults schema,
      id:
        number: true

    @Querier = (args...) ->
      @query querier(table_name, schema).apply(@, args)

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
              return new @ record

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
    if _.isNumber id
      @findOne
        id: id
    else
      throw new Error 'Cado#findById:Id must be integer.'

  @update: (values, condition) ->
    @Querier 'UPDATE', values, condition

  @destroy: (condition) ->
    @Querier 'DELETE', condition

  get: (key) ->
    return @[key]

  extend: (record) ->
    _.keys(record).map (key) =>
      Object.defineProperty @, key,
        enumerable: true
        configurable: true
        get: ->
          record[key]

    return @

  save: ->
    @constructor.create @
    .then (record) =>
      @extend record

  update: (values) ->
    unless _.isNumber @id
      throw new Error 'Cado#update:Record id must be integer.'

    @constructor.update values,
      id: @id
    .then =>
      @reload()

  destroy: ->
    unless _.isNumber @id
      throw new Error 'Cado#drop:Record id must be integer.'

    @constructor.delete
      id: @id

  reload: ->
    unless _.isNumber @id
      throw new Error 'Cado#reload:Record id must be integer.'

    @constructor.findById @id
    .then (record) =>
      @extend record

  inspect: ->
    object = {}
    for own k, v of @
      object[k] = v
    return object

  toJSON: @prototype.inspect

  toString: @prototype.inspect

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

