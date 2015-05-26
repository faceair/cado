_ = require 'lodash'
moment = require 'moment'

module.exports = (table, schema, options) ->
  options = _.extend {}, options, table: table

  return (params...) ->
    model = params[0]
    switch model
      when 'SELECT', 'DELETE'
        query = params[1] or {}
      when 'UPDATE'
        values = params[1] or {}
        query = params[2] or {}

    where_sql = ''

    whereAnd = (condition) ->
      if where_sql
        where_sql = "#{where_sql} AND (#{condition})"
      else
        where_sql = "WHERE (#{condition})"

    _.keys(schema).forEach (field) ->
      escaped_field = escapeIdentifier field
      definition = schema[field]
      value = query[field]

      if value == undefined
        return

      if definition.string
        whereAnd "#{escaped_field} = #{escape value}"

      else if definition.number
        if _.isFinite value
          whereAnd "#{escaped_field} = #{escape parseInt value}"
        else if definition.multi
          numbers = splitToArray value, (value) ->
            if _.isFinite value
              return escape parseInt value
            else
              return null

          unless _.isEmpty numbers
            whereAnd "#{escaped_field} IN (#{numbers.join ', '})"

      else if definition.bool
        if value in ['true', 'false']
          value = value == 'true'
        else if value in ['TRUE', 'FALSE']
          value = value == 'TRUE'
        else
          value = !! value

        whereAnd "#{escaped_field} = #{escape value}"

      else if definition.enum
        if value in definition.enum
          whereAnd "#{escaped_field} = #{escape value}"
        else if definition.multi
          values = splitToArray value, (value) ->
            if value in definition.enum
              return escape value
            else
              return null

          unless _.isEmpty values
            whereAnd "#{escaped_field} IN (#{values.join ', '})"

      else if definition.enum_sql
        if value in _.keys definition.enum_sql
          whereAnd definition.enum_sql[value]
        else if definition.multi
          conditions = splitToArray value, (value) ->
            if value in _.keys definition.enum_sql
              return "(#{definition.enum_sql[value]})"
            else
              return null

          unless _.isEmpty conditions
            whereAnd conditions.join ' OR '

      else if definition.date
        [from, to] = (value or '').split('~').map (date) ->
          if Date.parse date
            return escape new Date date
          else
            return null

        if from and to
          whereAnd "#{escaped_field} BETWEEN #{from} AND #{to}"
        else if from
          whereAnd "#{escaped_field} >= #{from}"
        else if to
          whereAnd "#{escaped_field} =< #{to}"

      else if definition.search
        conditions = definition.search.map (field) ->
          return "#{escapeIdentifier field} LIKE #{escape "%#{value}%"}"

        unless _.isEmpty conditions
          whereAnd conditions.join ' OR '

    switch model
      when 'SELECT'
        head = selectClause options
      when 'UPDATE'
        head = updateClause values, options
      when 'DELETE'
        head = deleteClause options

    return _.compact([
      head
      where_sql
      orderByClause query, options
      limitClause query, options
    ]).join ' '

escapeIdentifier = (value) ->
  return "`#{value.replace(/`/g, '``')}`"

escape = (value) ->
  if value in [null, undefined]
    return 'NULL'

  else if _.isString value
    escaped = value.replace /[\0\n\r\b\t\\\'\"\x1a]/g, (char) ->
      switch char
        when '\0' then return '\\0'
        when '\n' then return '\\n'
        when '\r' then return '\\r'
        when '\b' then return '\\b'
        when '\t' then return '\\t'
        when '\x1a' then return '\\Z'
        else return '\\' + char

    return "'#{escaped}'"

  else if _.isNumber value
    return value.toFixed()

  else if _.isBoolean value
    if value
      return 'TRUE'
    else
      return 'FALSE'

  else if _.isDate value
    return escape moment(value).format 'YYYY-MM-DD HH:mm:ss.SSS'

  else
    throw new Error "Can't escape #{value}"

splitToArray = (value, filter) ->
  if _.isArray value
    values = value
  else if _.isString value
    values = value.split(',').map (value) -> value.trim()
  else
    return []

  return _.compact values.map filter

selectClause = ({table, fields}) ->
  table = escapeIdentifier table

  if fields?.length > 0
    fields = fields.map escapeIdentifier
    return "SELECT #{fields.join ', '} FROM #{table}"
  else
    return "SELECT * FROM #{table}"

updateClause = (values, {table, fields}) ->
  table = escapeIdentifier table

  fields = _.keys(values).map (key) ->
    return "#{escapeIdentifier key} = '#{values[key]}'"
  return "UPDATE #{table} SET #{fields.join ', '}"

deleteClause = ({table}) ->
  table = escapeIdentifier table

  return "DELETE FROM #{table}"

orderByClause = ({order_by}, {sortable}) ->
  if order_by and order_by[... 1] in ['+', '-']
    desc = order_by[... 1] == '-'
    order_field = order_by[1 ...]
  else
    order_field = order_by

  if order_field in (sortable or [])
    return "ORDER BY #{escapeIdentifier order_field}#{if desc then ' DESC' else ''}"
  else
    return ''

limitClause = ({limit, offset}, {max_limit}) ->
  limit_sql = ''
  offset_sql = ''

  if _.isFinite limit
    limit = Math.min (max_limit or Infinity), parseInt limit
    limit_sql = "LIMIT #{escape limit}"
  else if max_limit and max_limit < Infinity
    limit_sql = "LIMIT #{escape max_limit}"

  if _.isFinite offset
    offset_sql = "OFFSET #{escape parseInt offset}"

  return [limit_sql, offset_sql].join(' ').trim()
