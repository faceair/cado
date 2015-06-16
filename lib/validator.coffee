_ = require 'lodash'

module.exports = class Validator
  constructor: (@schema) ->
    @fields = _.mapValues @schema, (definition, field) ->
      switch definition.name
        when 'Boolean'
          definition =
            type: 'Boolean'
        when 'Date'
          definition =
            type: 'Date'
        when 'Number'
          definition =
            type: 'Number'
        when 'String'
          definition =
            type: 'String'
        else
          unless definition.type
            throw new Error 'unknow type'
      return definition

  filter: (query) ->
    return _.pick _.mapValues @fields, (definition, field) ->
      value = query[field]
      return unless value

      switch definition.type
        when 'Boolean'
          if value in ['true', 'false']
            value = value == 'true'
          else if value in ['TRUE', 'FALSE']
            value = value == 'TRUE'
          else
            value = !! value
        when 'String'
          value = value.toString?()
        when 'Enum'
          unless value in definition.values
            value = undefined
        when 'Number'
          unless _.isFinite value
            value = undefined
        when 'Date'
          parseDate = (date) ->
            if Date.parse date
              return new Date date
            else
              return undefined
          [from, to] = (value or '').split('~').map parseDate
          if from or to
            value =
              from: from or null
              to: to or null
          else
            value = parseDate value

      return value
    , (value) ->
      return ! _.isUndefined(value)
