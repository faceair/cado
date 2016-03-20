Cado = require './cado'

cado = new Cado
  host: '127.0.0.1'
  port: 3306
  user: 'root'
  password: ''
  database: 'cado'

User = cado.model 'user',
  name:
    string: true
  phone:
    string: true
  address:
    string: true

user = new User
  name: 'faceair'
  phone: '1388888888'
  address: 'XXX'

user.save()
.then (user) ->
  console.log(user)
  User.findById user.id
.then (user) ->
  console.log(user)
  user.update
    phone: '123456789'
.then (user) ->
  console.log(user)
  user.destroy()
.then ->
  User.findAll
    id: user.id
.then (results) ->
  console.log(results)
.catch (err) ->
  throw err
