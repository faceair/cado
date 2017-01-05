import _ from 'lodash';
import Joi from 'joi';

export default class Model {
  constructor(record, options = {}) {
    _.mapKeys(_.defaults(options, {
      _isNew: true,
      _isRemoved: false,
    }), (value, key) => {
      Object.defineProperty(this, key, { writable: true, enumerable: false, value });
    });

    this.refresh(record, options);
  }

  static initialize({ name, definition, options, loki }) {
    this.options = options;
    this.schema = this.buildSchema(definition);
    this.loki = loki;
    this.collection = loki.getCollection(name) ||
      loki.addCollection(name, _.defaults(options.indexes || {}, {
        autoupdate: false,
        clone: true,
      }));
  }

  static buildSchema(definition) {
    _.mapKeys(definition, (value, key) => {
      if (_.isObject(value) && value.isJoi) {
        definition[key] = value;
      } else if (_.isPlainObject(value)) {
        definition[key] = this.buildSchema(value);
      } else {
        throw new Error('Cado#Schema: You must provide a joi schema.');
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
    if (_.isObject(docs)) docs = [docs];

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
      const { error } = this.validate(doc);
      if (error) {
        throw new Error(_.first(error.details).message);
      }
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
    return this.$loki;
  }

  refresh(record, options = {}) {
    if (record instanceof this.constructor) {
      this.$loki = record.$loki;
      record = record.toObject();
    }
    return _.extend(this, record, _.pick(options, ['_isNew', '_isRemoved']));
  }

  save() {
    if (this._isNew) {
      const instance = this.constructor.create(this);
      this.refresh(instance, {
        _isNew: false,
      });
    } else {
      const updateObject = _.omit(this.toObject(), ['$loki', 'meta']);
      this.constructor.findAndUpdate({ $loki: this.$loki }, updateObject);
      this.refresh(updateObject);
    }

    return this;
  }

  populate(field) {
    if (!(field in this.options.foreignKeys)) {
      throw new Error(`Cado#Populate: Unknown foreign key ${field}`);
    }
    const collection = this.loki.getCollection(this.options.foreignKeys[field]);
    if (!collection) {
      throw new Error('Cado#Populate: Collection is not exists.');
    }
    return collection.get(this[field]);
  }

  isAvailable(method) {
    if (this._isRemoved) {
      throw new Error(`Cado#${method}: Record has been removed.`);
    }

    if (this._isNew) {
      throw new Error(`Cado#${method}: Record must be save.`);
    }

    if (!_.isNumber(this.$loki)) {
      throw new Error(`Cado#${method}: Record $loki must be integer.`);
    }
  }

  update(updateObject) {
    this.isAvailable('update');

    this.constructor.findAndUpdate({ $loki: this.$loki }, updateObject);
    this.refresh(updateObject);

    return this;
  }

  remove() {
    this.isAvailable('destroy');

    this.constructor.findAndRemove({ $loki: this.$loki });
    this._isRemoved = true;

    return this;
  }

  reload() {
    this.isAvailable('reload');

    const instance = this.constructor.findById(this.$loki);
    this.refresh(instance);

    return this;
  }

  inspect() {
    if (this._isRemoved) {
      throw new Error('Cado#Inspect: Record has been removed.');
    }

    return _.pick(this, Object.keys(this));
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
