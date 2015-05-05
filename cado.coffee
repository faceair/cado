{cond, pair, escape} = require './utils'
inflection = require 'inflection'
mysql = require 'mysql'
_ = require 'lodash'
Q = require 'q'

class Model
  constructor: (document) ->
    _.extend @, document

    _.each ['count', 'min', 'max', 'avg', 'sum'], (func) =>
      @[func] = (cond, field) ->
        @groupBy func, cond, field

  @initialize: (options) ->
    _.extend @, options

  @query: (sql) ->
    @log sql
    Q.Promise (resolve, reject) =>
      @_connection.query sql, (err, rows) ->
        if err
          reject err
        else
          resolve rows

  @end: ->
    Q.Promise (resolve, reject) =>
      @_connection.end resolve

  @find: (cond, field) ->
    unpackRow = _.isNumber(cond) or _.isString(cond)
    if _.isNumber(cond) or _.isString(cond) or _.isArray(cond)
      cond = id: cond
    cond = cond cond

    unpackField = (_.isNumber(field) or _.isString(field)) and (field isnt '*') and field
    field = field or '*'
    if _.isString field
      field = [ field ]

    field = _.map(field, (data) ->
      if data isnt '*'
        return mysql.escapeId field
      return data
    ).join(', ')

    query = "SELECT #{field} FROM #{@_options.table_name}"

    if cond
      query += " WHERE #{cond}"

    unpack = (data) ->
      if unpackField
        data = _.pluck data, unpackField
      if unpackRow
        data = data[0]
      return data

    @query query
    .then (rows) ->
      return unpack rows

  @groupBy: (func, cond, field) ->
    cond = cond cond

    defaultField = 'id'
    if func is 'count'
      defaultField = '*'
    field = field or defaultField

    if _.isString field
      field = [ field ]

    lastField = field.pop()

    if func isnt 'count'
      lastField = mysql.escapeId lastField

    field = _.map(field, ->
      mysql.escapeId field
    ).join(', ')

    query = 'SELECT ' + field
    if field
      query += ', '

    query += "#{func}(#{lastField}) AS #{func} FROM #{@_options.table_name}"

    if cond
      query += " where #{cond}"

    if field
      query += ' group by ' + field

    @query query
    .then (data) ->
      unless field
        value = data and data[0] and _.values(data[0])[0]
        if func is 'count'
          value = value or 0
        return value
      return data

  @create: (data) ->
    unless data
      data = id: null

    @query "INSERT #{@_options.table_name} SET #{cond(data, true)}"

  @update: (cond, data) ->
    if _.isString(cond) or _.isNumber(cond)
      cond = id: cond
    @query "UPDATE #{@_options.table_name} SET #{cond(data, true)} WHERE #{cond(cond)}"

  @delete: (cond) ->
    if _.isString(cond) or _.isNumber(cond)
      cond = id: cond
    @query "DELETE FROM #{@_options.table_name} WHERE #{cond(cond)}"

  @save: (data, field) ->
    unless data
      data = id: null

    if _.isString(field)
      field = [ field ]

    insert = []
    update = []

    _.each data, (value, key) ->
      if (key is 'id') and (value is false)
        pair = "`#{key}` = last_insert_id(#{key})"
      else
        pair = pair key, value, null, true, true, true
      insert.push pair

      if not field or _.contains(field, key)
        update.push(pair)

    @query "INSERT #{@_options.table_name} SET #{insert.join(', ')} ON DUPLICATE KEY UPDATE #{update.join(', ')}"

module.exports = class Cado
  log: null
  connection: null

  constructor: (@options) ->
    @models = {}
    @log = @options?.log or ->

  connect: (options = @options) ->
    Q.Promise (resolve, reject) =>
      if @connection
        resolve @
      else
        pool = mysql.createPool options
        pool.getConnection (err, connection) =>
          if err
            reject err
          else
            @connection = connection
            resolve @

  define: (name, schema, options) ->
    if @models[name]
      if schema
        throw new Error "Cado#model: #{name} already exists"
      else
        return @models[name]

    options = _.extend(
      table_name: inflection.pluralize name.toLowerCase()
      strict_pick: true
      memoize: true
    , options)

    class SubModel extends Model

    SubModel.initialize
      _name: name
      _cado: @
      _options: options
      _connection: @connection
      log: @log

    if options.memoize
      @models[name] = SubModel

    return SubModel
