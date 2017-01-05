import Cado from '../src/cado';

const cado = new Cado({
  filename: `${__dirname}/test.db`,
  autoloadCallback: () => {
    const User = cado.model('user', {
      name: {
        type: true,
      },
      phone: {
        type: true,
      },
      address: {
        type: true,
      },
    }, {
      autoSave: true,
    });

    const user = new User({
      name: 'faceair',
      phone: '1388888888',
      address: 'XXX',
    });

    const newUser = user.save();

    console.log(newUser);

    newUser.phone = '3333333333';

    console.log(newUser);
    console.log(User.findById(newUser.id));

    setTimeout(() => {
      console.log(newUser);
      console.log(User.findById(newUser.id));
    }, 3000);
  },
});

