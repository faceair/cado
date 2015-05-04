mysql = require 'mysql'
_ = require 'lodash'
Q = require 'q'

module.exports = class Cado
  log: null
  connection: null

  constructor: (@options) ->
    @log = @options?.log or ->

    _.each ['count', 'min', 'max', 'avg', 'sum'], (func) =>
      @[func] = (table, cond, field) ->
        @groupBy func, table, cond, field

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

  query: (sql) ->
    @log sql
    Q.Promise (resolve, reject) =>
      @connection.query sql, (err, rows) ->
        if err
          reject err
        else
          resolve rows

  end: ->
    Q.Promise (resolve, reject) =>
      @connection.end resolve

  cond: (data, set) ->
    delimiter = ' AND '
    if set
      delimiter = ', '
    if _.isNumber(data) or _.isString(data)
      data = id: Number(data)

    return _.map(data, (value, key) =>
      @pair key, value, null, true, true, set
    ).join(delimiter)

  pair: (key, value, operator = '=', escapeKey, escapeValue, set) ->
    unless set
      if (_.isNaN(value) or _.isNull(value) or _.isUndefined(value)) and (operator is '=')
        operator = 'IS'

      if _.isArray value
        operator = 'IN'

      if _.isObject value
        if not _.isUndefined(value.from) and not _.isUndefined(value.to)
          operator = 'BETWEEN'
        unless _.isUndefined value.from
          operator = '>='
        unless _.isUndefined value.to
          operator = '<='

    if escapeKey
      key = mysql.escapeId String(key)

    if escapeValue
      value = @escape value, set

    return "#{key} #{operator} #{value}"

  escape: (value, set) ->
    if _.isNaN(value) or _.isNull(value) or _.isUndefined(value)
      return 'NULL'

    if _.isNumber value
      return value

    if _.isBoolean value
      return Number(value)

    unless set
      if _.isArray value
        string = _.map(value, (data) ->
          @escape(data, set)
        ).join(', ')
        return "(#{string})"

      if _.isObject value
        if not _.isUndefined(value.from) and not _.isUndefined(value.to)
          return "#{@escape(value.from, set)} AND #{@escape(value.to, set)}"

        unless _.isUndefined value.from
          return @escape value.from, set

        unless _.isUndefined value.to
          return @escape value.to, set

    return mysql.escape String(value)

  select: (table, cond, field) ->
    unpackRow = _.isNumber(cond) or _.isString(cond)
    if _.isNumber(cond) or _.isString(cond) or _.isArray(cond)
      cond = id: cond
    cond = @cond cond

    unpackField = (_.isNumber(field) or _.isString(field)) and (field isnt '*') and field
    field = field or '*'
    if _.isString field
      field = [ field ]

    field = _.map(field, (data) ->
      if data isnt '*'
        return mysql.escapeId field
      return data
    ).join(', ')

    query = "SELECT #{field} FROM #{mysql.escapeId(table)}"

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

  groupBy: (func, table, cond, field) ->
    cond = @cond cond

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

    query += "#{func}(#{lastField}) AS #{func} FROM #{mysql.escapeId(table)}"

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

  insert: (table, data) ->
    unless data
      data = id: null

    @query "INSERT #{mysql.escapeId(table)} SET #{@cond(data, true)}"

  update: (table, cond, data) ->
    if _.isString(cond) or _.isNumber(cond)
      cond = id: cond
    @query "UPDATE #{mysql.escapeId(table)} SET #{@cond(data, true)} WHERE #{@cond(cond)}"

  delete: (table, cond) ->
    if _.isString(cond) or _.isNumber(cond)
      cond = id: cond
    @query "DELETE FROM #{mysql.escapeId(table)} WHERE #{@cond(cond)}"

  save: (table, data, field) ->
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
        pair = @pair key, value, null, true, true, true
      insert.push pair

      if not field or _.contains(field, key)
        update.push(pair)

    @query "INSERT #{mysql.escapeId(table)} SET #{insert.join(', ')} ON DUPLICATE KEY UPDATE #{update.join(', ')}"
