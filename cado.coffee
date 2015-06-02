inflection = require 'inflection'
mysql = require 'mysql'
Promise = require 'yaku'
_ = require 'lodash'
querier = require './lib/querier'

class Model
  constructor: (record) ->
    _.extend @,
      record: record
      Model: @constructor

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

  @delete: (condition) ->
    @Querier 'DELETE', condition

  save: ->
    @Model.create @record
    .then ({insertId}) =>
      _.extend @record, id: insertId
      @reload()

  update: (values) ->
    unless _.isNumber @record.id
      throw new Error 'Cado#update:Record id must be integer.'

    @Model.update values,
      id: @record.id

  drop: ->
    unless _.isNumber @record.id
      throw new Error 'Cado#drop:Record id must be integer.'

    @Model.delete
      id: @record.id

  reload: ->
    unless _.isNumber @records
      throw new Error 'Cado#reload:Record id must be integer.'

    @Model.findById @record.id
    .then ({record}) =>
      _.extend @record, record

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

