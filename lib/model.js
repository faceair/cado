'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Model = function () {
  function Model(record) {
    var extra = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, Model);

    _lodash2.default.extend(this, _lodash2.default.defaults(extra, {
      _isNew: true,
      _isRemoved: false,
      _hasChangedFields: new Set()
    }));

    this.refresh(record);
    Object.seal(this);
  }

  _createClass(Model, [{
    key: 'refresh',
    value: function refresh(record) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (_lodash2.default.isUndefined(this.record)) {
        Object.defineProperty(this, 'record', {
          enumerable: false,
          configurable: true,
          writable: true,
          value: record
        });
      } else {
        this.record = record;
      }

      _lodash2.default.extend(this, options);
      return this;
    }
  }, {
    key: 'save',
    value: function save() {
      if (this._isNew) {
        var _constructor$create = this.constructor.create(this.record),
            record = _constructor$create.record;

        this.refresh(record, {
          _isNew: false,
          _hasChangedFields: new Set()
        });
      } else {
        var updateObject = _lodash2.default.pick(this.record, Array.from(this._hasChangedFields));
        this.constructor.findAndUpdate({ $loki: this.record.$loki }, updateObject);
        this.updateRecord(updateObject);
      }

      return this;
    }
  }, {
    key: 'isAvailable',
    value: function isAvailable(method) {
      if (this._isRemoved) {
        throw new Error('Cado#' + method + ':Record has been destroy.');
      }

      if (this._isNew || this._hasChangedFields.size) {
        throw new Error('Cado#' + method + ':Record must be save.');
      }

      if (!_lodash2.default.isNumber(this.record.$loki)) {
        throw new Error('Cado#' + method + ':Record $loki must be integer.');
      }
    }
  }, {
    key: 'update',
    value: function update(updateObject) {
      this.isAvailable('update');

      this.constructor.findAndUpdate({ $loki: this.record.$loki }, updateObject);
      this.updateRecord(updateObject);

      return this;
    }
  }, {
    key: 'updateRecord',
    value: function updateRecord(updateObject) {
      _lodash2.default.extend(this.record, updateObject);
      this._hasChangedFields = new Set();
      return this;
    }
  }, {
    key: 'remove',
    value: function remove() {
      this.isAvailable('destroy');

      this.constructor.findAndRemove({ $loki: this.record.$loki });
      this._isRemoved = true;

      return this;
    }
  }, {
    key: 'reload',
    value: function reload() {
      this.isAvailable('reload');

      var _constructor$findById = this.constructor.findById(this.record.$loki),
          record = _constructor$findById.record;

      this.refresh(record);

      return this;
    }
  }, {
    key: 'inspect',
    value: function inspect() {
      if (this._isRemoved) {
        throw new Error('Cado#inspect:Record has been destroy.');
      }

      return _lodash2.default.omit(this.record, ['meta']);
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
      return this.record.$loki;
    }
  }], [{
    key: 'initialize',
    value: function initialize(_ref) {
      var _this = this;

      var name = _ref.name,
          schema = _ref.schema,
          options = _ref.options,
          loki = _ref.loki;

      this.loki = loki;
      this.schema = schema;
      this.collection = loki.getCollection(name) || loki.addCollection(name, _lodash2.default.defaults(options.indexes || {}, {
        autoupdate: false,
        clone: true
      }));

      _lodash2.default.mapKeys(schema, function ($, key) {
        Object.defineProperty(_this.prototype, key, {
          enumerable: true,
          configurable: false,
          get: function get() {
            return this.record[key];
          },
          set: function set(value) {
            var _this2 = this;

            this._hasChangedFields.add(key);
            this.record[key] = value;
            if (options.autoSave === true) {
              process.nextTick(function () {
                return _this2.save.apply(_this2);
              });
            }
          }
        });
      });
    }
  }, {
    key: 'query',
    value: function query(method) {
      var _collection,
          _this3 = this;

      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      var records = (_collection = this.collection)[method].apply(_collection, args);
      if (_lodash2.default.isArray(records)) {
        records = records.map(function (record) {
          return new _this3(record, { _isNew: false });
        });
      } else if (records && _lodash2.default.isObject(records)) {
        records = new this(records, { _isNew: false });
      }
      return records;
    }
  }, {
    key: 'create',
    value: function create(docs) {
      return this.query('insert', docs);
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
      return this.findAndUpdateByFunction(filterObject, function (doc) {
        _lodash2.default.mapKeys(updateObject, function (value, key) {
          doc[key] = value;
        });
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