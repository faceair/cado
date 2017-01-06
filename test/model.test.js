import assert from 'assert';
import Joi from 'joi';
import Cado from '../src/cado';

describe('Model', () => {
  const cado = new Cado({
    filename: `${__dirname}/test.db`,
  });
  const User = cado.model('user', {
    name: Joi.string(),
    phone: Joi.string(),
    address: Joi.string(),
    isSmart: Joi.boolean().default(true),
  });

  describe('#constructor', () => {
    it('init success', () => {
      const user = new User({
        name: 'faceair',
        phone: '1388888888',
        address: 'XXX',
      });
      assert.ok(user);
    });
  });

  describe('#save', () => {
    it('save success', () => {
      const user = new User({
        name: 'faceair',
        phone: '1388888888',
        address: 'XXX',
      });
      user.save();
      assert.ok(user.id);
    });
    it('save faild with joi validate error', () => {
      const user = new User({
        name: 'faceair',
        phone: '1388888888',
        address: 'XXX',
        isSmart: 'Yes',
      });
      assert.throws(
        () => {
          user.save();
          assert.ok(!user.id);
        },
        Error,
      );
    });
    it('save faild with joi validate error', () => {
      const user = new User({
        name: 'faceair',
        phone: '1388888888',
        address: 'XXX',
        isSmart: 'Yes',
      });
      assert.throws(
        () => {
          user.save();
          assert.ok(!user.id);
        },
        Error,
      );
    });
  });
});
