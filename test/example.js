import Cado from '../src/cado';

const cado = new Cado({
  filename: `${__dirname}/test.db`,
  autoloadCallback: () => {
    const User = cado.model('user', {
      name: {
        string: true,
      },
      phone: {
        string: true,
      },
      address: {
        string: true,
      },
    });

    const user = new User({
      name: 'faceair',
      phone: '1388888888',
      address: 'XXX',
    });

    const newUser = user.save();

    console.log(newUser);
    console.log(newUser.id);
  },
});

