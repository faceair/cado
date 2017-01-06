'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Model = function () {
  function Model(record) {
    var _this = this;

    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, Model);

    _lodash2.default.mapKeys(_lodash2.default.defaults(options, {
      _isNew: true,
      _isRemoved: false
    }), function (value, key) {
      Object.defineProperty(_this, key, { writable: true, enumerable: false, value: value });
    });

    this.refresh(record, options);
  }

  _createClass(Model, [{
    key: 'refresh',
    value: function refresh() {
      var record = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (record instanceof this.constructor) {
        this.$loki = record.$loki;
        record = record.toObject();
      }
      return _lodash2.default.extend(this, record, _lodash2.default.pick(options, ['_isNew', '_isRemoved']));
    }
  }, {
    key: 'save',
    value: function save() {
      if (this._isNew) {
        var instance = this.constructor.create(this);
        this.refresh(instance, {
          _isNew: false
        });
      } else {
        var updateObject = _lodash2.default.omit(this.toObject(), ['$loki', 'meta']);
        this.constructor.findAndUpdate({ $loki: this.$loki }, updateObject);
        this.refresh(updateObject);
      }

      return this;
    }
  }, {
    key: 'populate',
    value: function populate(field) {
      if (!(field in this.options.foreignKeys)) {
        throw new Error('Cado#Populate: Unknown foreign key ' + field);
      }
      var collection = this.loki.getCollection(this.options.foreignKeys[field]);
      if (!collection) {
        throw new Error('Cado#Populate: Collection is not exists.');
      }
      return collection.get(this[field]);
    }
  }, {
    key: 'isAvailable',
    value: function isAvailable(method) {
      if (this._isRemoved) {
        throw new Error('Cado#' + method + ': Record has been removed.');
      }

      if (this._isNew) {
        throw new Error('Cado#' + method + ': Record must be save.');
      }

      if (!_lodash2.default.isNumber(this.$loki)) {
        throw new Error('Cado#' + method + ': Record $loki must be integer.');
      }
    }
  }, {
    key: 'update',
    value: function update(updateObject) {
      this.isAvailable('Update');

      updateObject = _lodash2.default.omit(updateObject, ['$loki', 'meta']);
      this.constructor.findAndUpdate({ $loki: this.$loki }, updateObject);
      this.refresh(updateObject);

      return this;
    }
  }, {
    key: 'remove',
    value: function remove() {
      this.isAvailable('Remove');

      this.constructor.findAndRemove({ $loki: this.$loki });
      this._isRemoved = true;

      return this;
    }
  }, {
    key: 'reload',
    value: function reload() {
      this.isAvailable('Reload');

      var instance = this.constructor.findById(this.$loki);
      this.refresh(instance);

      if (!instance) {
        this._isRemoved = true;
      }

      return this;
    }
  }, {
    key: 'inspect',
    value: function inspect() {
      if (this._isRemoved) {
        throw new Error('Cado#Inspect: Record has been removed.');
      }

      return _lodash2.default.pick(this, Object.keys(this));
    }
  }, {
    key: 'toString',
    value: function toString() {
      return JSON.stringify(this.inspect());
    }
  }, {
    key: 'toJSON',
    value: function toJSON() {
      return this.inspect();
    }
  }, {
    key: 'toObject',
    value: function toObject() {
      return this.inspect();
    }
  }, {
    key: 'id',
    get: function get() {
      return this.$loki;
    }
  }], [{
    key: 'initialize',
    value: function initialize(_ref) {
      var name = _ref.name,
          definition = _ref.definition,
          options = _ref.options,
          loki = _ref.loki;

      this.options = options;
      this.schema = this.buildSchema(definition);
      this.loki = loki;
      this.collection = loki.getCollection(name) || loki.addCollection(name, _lodash2.default.defaults(options.indexes || {}, {
        autoupdate: false,
        clone: true
      }));
      if (_lodash2.default.isObject(options.statics)) _lodash2.default.extend(this, options.statics);
      if (_lodash2.default.isObject(options.methods)) _lodash2.default.extend(this.prototype, options.methods);
    }
  }, {
    key: 'buildSchema',
    value: function buildSchema(definition) {
      var _this2 = this;

      _lodash2.default.mapKeys(definition, function (value, key) {
        if (_lodash2.default.isObject(value) && value.isJoi) {
          definition[key] = value;
        } else if (_lodash2.default.isPlainObject(value)) {
          definition[key] = _this2.buildSchema(value);
        } else {
          throw new Error('Cado#Schema: You must provide a joi schema.');
        }
      });
      return _joi2.default.object().keys(definition);
    }
  }, {
    key: 'validate',
    value: function validate(record) {
      return _joi2.default.validate(record, this.schema, { stripUnknown: true });
    }
  }, {
    key: 'query',
    value: function query(method) {
      var _collection,
          _this3 = this;

      var docs = void 0;

      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      var records = (_collection = this.collection)[method].apply(_collection, args);
      if (_lodash2.default.isArray(records)) {
        docs = records.map(function (record) {
          return new _this3(record, { _isNew: false });
        });
      } else if (records && _lodash2.default.isPlainObject(records)) {
        docs = new this(records, { _isNew: false });
      }
      return docs;
    }
  }, {
    key: 'create',
    value: function create(records) {
      var _this4 = this;

      if (_lodash2.default.isObject(records)) records = [records];

      records = records.map(function (record) {
        var _validate = _this4.validate(record),
            error = _validate.error,
            value = _validate.value;

        if (error) {
          throw new Error(_lodash2.default.first(error.details).message);
        }
        return value;
      });

      if (records.length === 1) records = _lodash2.default.first(records);
      return this.query('insert', records);
    }
  }, {
    key: 'find',
    value: function find(query) {
      return this.query('find', query);
    }
  }, {
    key: 'findAll',
    value: function findAll() {
      return this.find.apply(this, arguments);
    }
  }, {
    key: 'findOne',
    value: function findOne(query) {
      return this.query('findOne', query);
    }
  }, {
    key: 'findBy',
    value: function findBy(field, value) {
      return this.query('by', field, value);
    }
  }, {
    key: 'findById',
    value: function findById(id) {
      return this.query('get', id);
    }
  }, {
    key: 'findAndUpdate',
    value: function findAndUpdate(filterObject, updateObject) {
      var _this5 = this;

      return this.findAndUpdateByFunction(filterObject, function (doc) {
        _lodash2.default.mapKeys(updateObject, function (value, key) {
          doc[key] = value;
        });

        var _validate2 = _this5.validate(doc),
            error = _validate2.error;

        if (error) {
          throw new Error(_lodash2.default.first(error.details).message);
        }
      });
    }
  }, {
    key: 'findAndUpdateByFunction',
    value: function findAndUpdateByFunction(filterObject, updateFunction) {
      return this.query('findAndUpdate', filterObject, updateFunction);
    }
  }, {
    key: 'findAndRemove',
    value: function findAndRemove(filterObject) {
      return this.query('findAndRemove', filterObject);
    }
  }, {
    key: 'count',
    value: function count(query) {
      return this.query('count', query);
    }
  }, {
    key: 'clear',
    value: function clear() {
      this.query('clear');
    }
  }]);

  return Model;
}();

exports.default = Model;