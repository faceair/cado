mysql = require 'mysql'
_ = require 'lodash'

exports.cond = (data, set) ->
  delimiter = ' AND '
  if set
    delimiter = ', '
  if _.isNumber(data) or _.isString(data)
    data = id: Number(data)

  return _.map(data, (value, key) ->
    exports.pair key, value, null, true, true, set
  ).join(delimiter)

exports.pair = (key, value, operator = '=', escapeKey, escapeValue, set) ->
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
    value = exports.escape value, set

  return "#{key} #{operator} #{value}"

exports.escape = (value, set) ->
  if _.isNaN(value) or _.isNull(value) or _.isUndefined(value)
    return 'NULL'

  if _.isNumber value
    return value

  if _.isBoolean value
    return Number(value)

  unless set
    if _.isArray value
      string = _.map(value, (data) ->
        exports.escape(data, set)
      ).join(', ')
      return "(#{string})"

    if _.isObject value
      if not _.isUndefined(value.from) and not _.isUndefined(value.to)
        return "#{exports.escape(value.from, set)} AND #{exports.escape(value.to, set)}"

      unless _.isUndefined value.from
        return exports.escape value.from, set

      unless _.isUndefined value.to
        return exports.escape value.to, set

  return mysql.escape String(value)
