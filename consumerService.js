const { server } = require('./consumerCep.js')

server.listen(8080, () => {
  console.log('Address Matching Service listening on http://localhots:8080')
})
