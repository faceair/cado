import _ from 'lodash';

export default class Model {
  constructor(record, options = {}) {
    _.extend(this, _.defaults(options, {
      _isNew: true,
      _isRemoved: false,
      _hasChangedFields: new Set(),
    }));

    this.refresh(record);
    Object.seal(this);
  }

  static initialize({ collection_name, schema, loki }) {
    this.loki = loki;
    this.schema = schema;
    this.collection = loki.getCollection(collection_name) || loki.addCollection(collection_name);

    _.mapKeys(schema, ($, key) => {
      Object.defineProperty(this.prototype, key, {
        enumerable: true,
        configurable: false,
        get() {
          return this.record[key];
        },
        set(value) {
          this._hasChangedFields.add(key);
          this.record[key] = value;
        },
      });
    });
  }

  static query(method, ...args) {
    let records = this.collection[method](...args);
    if (_.isArray(records)) {
      records = records.map(record => new this(record, { _isNew: false }));
    } else if (!_.isNull(records) && _.isObject(records)) {
      records = new this(records, { _isNew: false });
    }
    return records;
  }

  static create(docs) {
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
      const { record } = this.constructor.findAndUpdate({ $loki: this.$loki }, updateObject);
      this.refresh(record, { _hasChangedFields: new Set() });
    }

    return this;
  }

  isAvailable(method) {
    if (this._isRemoved) {
      throw new Error(`Cado#${method}:Record has been destroy.`);
    }

    if (this._isNew || this._hasChangedFields.size) {
      throw new Error(`Cado#${method}:Record must be save.`);
    }

    if (!_.isNumber(this.$loki)) {
      throw new Error(`Cado#${method}:Record $loki must be integer.`);
    }
  }

  update(values) {
    this.isAvailable('update');

    const { record } = this.constructor.findAndUpdate({ $loki: this.$loki }, values);
    this.refresh(record, { _hasChangedFields: new Set() });

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

    const { record } = this.constructor.findById(this.$loki);
    this.refresh(record);

    return this;
  }

  inspect() {
    if (this._isRemoved) {
      throw new Error('Cado#inspect:Record has been destroy.');
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
