import _ from 'lodash';

export default class Model {
  constructor(record, options = {}) {
    _.extend(this, _.defaults(options, {
      is_new: true,
      is_destroy: false,
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
          const data = {};
          data[key] = value;
          this.update(data);
        },
      });
    });
  }

  static query(method, ...args) {
    let records = this.collection[method](...args);
    if (_.isArray(records)) {
      records = records.map(record => new this(record, { is_new: false }));
    } else if (!_.isNull(records) && _.isObject(records)) {
      records = new this(records, { is_new: false });
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
    if (!this.is_new) {
      throw new Error('Cado#save:Record has been save.');
    }

    const { record } = this.constructor.create(this.record);
    this.refresh(record, {
      is_new: false,
    });

    return this;
  }

  isAvailable(method) {
    if (this.is_new) {
      throw new Error(`Cado#${method}:Record must be save.`);
    }

    if (!_.isNumber(this.id)) {
      throw new Error(`Cado#${method}:Record id must be integer.`);
    }

    if (this.is_destroy) {
      throw new Error(`Cado#${method}:Record has been destroy.`);
    }
  }

  update(values) {
    this.isAvailable('update');

    const { record } = this.constructor.findAndUpdate({ id: this.id }, values);
    this.refresh(record);

    return this;
  }

  destroy() {
    this.isAvailable('destroy');

    this.constructor.findAndRemove({ id: this.id });
    this.is_destroy = true;

    return this;
  }

  reload() {
    this.isAvailable('reload');

    const { record } = this.constructor.findById(this.id);
    this.refresh(record);

    return this;
  }

  inspect() {
    if (this.is_destroy) {
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
