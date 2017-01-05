import _ from 'lodash';
import Joi from 'joi';

export default class Model {
  constructor(record, extra = {}) {
    _.extend(this, _.defaults(extra, {
      _isNew: true,
      _isRemoved: false,
      _hasChangedFields: new Set(),
    }));

    this.refresh(record);
    Object.seal(this);
  }

  static initialize({ name, definition, options, loki }) {
    this.schema = this.buildSchema(definition);
    this.loki = loki;
    this.collection = loki.getCollection(name) ||
      loki.addCollection(name, _.defaults(options.indexes || {}, {
        autoupdate: false,
        clone: true,
      }));

    _.mapKeys(definition, ($, key) => {
      Object.defineProperty(this.prototype, key, {
        enumerable: true,
        configurable: false,
        get() {
          return this.record[key];
        },
        set(value) {
          this._hasChangedFields.add(key);
          this.record[key] = value;
          if (options.autoSave === true) {
            process.nextTick(() => this.save.apply(this));
          }
        },
      });
    });
  }

  static buildSchema(definition) {
    _.mapKeys(definition, (value, key) => {
      if (_.isObject(value) && value.isJoi) {
        definition[key] = value;
      } else if (_.isPlainObject(value)) {
        definition[key] = this.buildSchema(value);
      } else {
        throw new Error('Cado#Schema:You must provide a joi schema.');
      }
    });
    return Joi.object().keys(definition);
  }

  static validate(record) {
    return Joi.validate(record, this.schema, { stripUnknown: true });
  }

  static query(method, ...args) {
    let records = this.collection[method](...args);
    if (_.isArray(records)) {
      records = records.map(record => new this(record, { _isNew: false }));
    } else if (records && _.isPlainObject(records)) {
      records = new this(records, { _isNew: false });
    }
    return records;
  }

  static create(docs) {
    if (_.isPlainObject(docs)) docs = [docs];

    docs = docs.map((doc) => {
      const { error, value } = this.validate(doc);
      if (error) {
        throw new Error(_.first(error.details).message);
      }
      return value;
    });

    if (docs.length === 1) docs = _.first(docs);
    return this.query('insert', docs);
  }

  static find(query) {
    return this.query('find', query);
  }

  static findAll(...args) {
    return this.find(...args);
  }

  static findOne(query) {
    return this.query('findOne', query);
  }

  static findBy(field, value) {
    return this.query('by', field, value);
  }

  static findById(id) {
    return this.query('get', id);
  }

  static findAndUpdate(filterObject, updateObject) {
    return this.findAndUpdateByFunction(filterObject, (doc) => {
      _.mapKeys(updateObject, (value, key) => {
        doc[key] = value;
      });
    });
  }

  static findAndUpdateByFunction(filterObject, updateFunction) {
    return this.query('findAndUpdate', filterObject, updateFunction);
  }

  static findAndRemove(filterObject) {
    return this.query('findAndRemove', filterObject);
  }

  static count(query) {
    return this.query('count', query);
  }

  static clear() {
    this.query('clear');
  }

  get id() {
    return this.record.$loki;
  }

  refresh(record, options = {}) {
    if (_.isUndefined(this.record)) {
      Object.defineProperty(this, 'record', {
        enumerable: false,
        configurable: true,
        writable: true,
        value: record,
      });
    } else {
      this.record = record;
    }

    _.extend(this, options);
    return this;
  }

  save() {
    if (this._isNew) {
      const { record } = this.constructor.create(this.record);
      this.refresh(record, {
        _isNew: false,
        _hasChangedFields: new Set(),
      });
    } else {
      const updateObject = _.pick(this.record, Array.from(this._hasChangedFields));
      this.constructor.findAndUpdate({ $loki: this.record.$loki }, updateObject);
      this.updateRecord(updateObject);
    }

    return this;
  }

  isAvailable(method) {
    if (this._isRemoved) {
      throw new Error(`Cado#${method}:Record has been removed.`);
    }

    if (this._isNew || this._hasChangedFields.size) {
      throw new Error(`Cado#${method}:Record must be save.`);
    }

    if (!_.isNumber(this.record.$loki)) {
      throw new Error(`Cado#${method}:Record $loki must be integer.`);
    }
  }

  update(updateObject) {
    this.isAvailable('update');

    this.constructor.findAndUpdate({ $loki: this.record.$loki }, updateObject);
    this.updateRecord(updateObject);

    return this;
  }

  updateRecord(updateObject) {
    _.extend(this.record, updateObject);
    this._hasChangedFields = new Set();
    return this;
  }

  remove() {
    this.isAvailable('destroy');

    this.constructor.findAndRemove({ $loki: this.record.$loki });
    this._isRemoved = true;

    return this;
  }

  reload() {
    this.isAvailable('reload');

    const { record } = this.constructor.findById(this.record.$loki);
    this.refresh(record);

    return this;
  }

  inspect() {
    if (this._isRemoved) {
      throw new Error('Cado#inspect:Record has been removed.');
    }

    return _.omit(this.record, ['meta']);
  }

  toString() {
    return JSON.stringify(this.inspect());
  }

  toJSON() {
    return this.inspect();
  }

  toObject() {
    return this.inspect();
  }
}
