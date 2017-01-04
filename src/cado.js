import _ from 'lodash';
import Loki from 'lokijs';
import Model from './model';

export default class Cado {
  constructor(config) {
    this.models = {};
    if (config) {
      this.connect(config);
    }
  }

  connect(config) {
    if (!this.loki) {
      this.loki = new Loki(config.filename, _.defaults(config, {
        env: 'NODEJS',
        autosave: true,
        autoload: true,
      }));
    }
    this.config = config;
    return this;
  }

  model(name, schema) {
    if (!this.loki) {
      throw new Error('Cado#model: not connected to the server');
    }

    if (this.models[name]) {
      if (schema) {
        throw new Error(`Cado#model: ${name} already exists`);
      } else {
        return this.models[name];
      }
    }

    class SubModel extends Model {}

    SubModel.initialize({
      schema,
      collection_name: name.toLowerCase(),
      loki: this.loki,
    });

    this.models[name] = SubModel;

    return SubModel;
  }
}

