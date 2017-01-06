'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _lokijs = require('lokijs');

var _lokijs2 = _interopRequireDefault(_lokijs);

var _model = require('./model');

var _model2 = _interopRequireDefault(_model);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Cado = function () {
  function Cado(config) {
    _classCallCheck(this, Cado);

    this.models = {};
    if (config) {
      this.connect(config);
    }
  }

  _createClass(Cado, [{
    key: 'connect',
    value: function connect(config) {
      if (!this.loki) {
        if (!config.filename) {
          throw new Error('Cado#Connect: config.filename is required.');
        }
        this.loki = new _lokijs2.default(config.filename, _lodash2.default.defaults(config, {
          env: 'NODEJS',
          autosave: true,
          autoload: true
        }));
        this.config = config;
      } else {
        throw new Error('Cado#Connect: cado has been already connected.');
      }
      return this;
    }
  }, {
    key: 'model',
    value: function model(name, definition) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      if (!this.loki) {
        throw new Error('Cado#Model: Not connected to the server');
      }

      if (this.models[name]) {
        if (definition) {
          throw new Error('Cado#Model: ' + name + ' already exists');
        } else {
          return this.models[name];
        }
      }

      var SubModel = function (_Model) {
        _inherits(SubModel, _Model);

        function SubModel() {
          _classCallCheck(this, SubModel);

          return _possibleConstructorReturn(this, (SubModel.__proto__ || Object.getPrototypeOf(SubModel)).apply(this, arguments));
        }

        return SubModel;
      }(_model2.default);

      SubModel.initialize({
        name: name,
        definition: definition,
        options: options,
        loki: this.loki
      });

      this.models[name] = SubModel;

      return SubModel;
    }
  }]);

  return Cado;
}();

exports.default = Cado;