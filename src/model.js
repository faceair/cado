import _ from 'lodash';
import Joi from 'joi';
import Observed from 'observed';

export default class Model {
  constructor(record, options = {}) {
    _.mapKeys(_.defaults(options, {
      _isNew: true,
      _isRemoved: false,
      _hasChangedFields: new Set(),
    }), (value, key) => {
      Object.defineProperty(this, key, { writable: true, enumerable: false, value });
    });

    this.refresh(record, options);

    Observed(this).on('change', change => this.constructor.dataObserver(change, this));
  }

  static initialize({ name, definition, options, loki }) {
    this.options = options;
    this.definition = definition;
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
        throw new Error('Cado#Schema:You must provide a joi schema.');
      }
    });
    return Joi.object().keys(definition);
  }

  static dataObserver(change, instance) {
    console.log(change);
    if (change.type === 'update' && !change.name.startsWith('_')) {
      instance._hasChangedFields.add(change.name);
      if (this.options.autoSave === true) {
        instance.save.apply(instance);
      }
    }
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
    return _.extend(this, record, _.pick(options, ['_isNew', '_isRemoved', '_hasChangedFields']));
  }

  save() {
    if (this._isNew) {
      const instance = this.constructor.create(this);
      this.refresh(instance, {
        _isNew: false,
        _hasChangedFields: new Set(),
      });
    } else if (this._hasChangedFields.size) {
      const updateObject = _.pick(this, Array.from(this._hasChangedFields));
      this.constructor.findAndUpdate({ $loki: this.$loki }, updateObject);
      this.refresh(updateObject, { _hasChangedFields: new Set() });
    }

    return this;
  }

  populate(field, collectionName) {
    const collection = this.loki.getCollection(collectionName);
    if (!collection) {
      throw new Error('Cado#Populate:Collection is not exists.');
    }
    this[field] = collection.get(this[field]);
  }

  isAvailable(method) {
    if (this._isRemoved) {
      throw new Error(`Cado#${method}:Record has been removed.`);
    }

    if (this._isNew || this._hasChangedFields.size) {
      throw new Error(`Cado#${method}:Record must be save.`);
    }

    if (!_.isNumber(this.$loki)) {
      throw new Error(`Cado#${method}:Record $loki must be integer.`);
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
      throw new Error('Cado#inspect:Record has been removed.');
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
