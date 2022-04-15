const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const Repository = require('./repository')

const server = express()
server.use(cors())
server.use(bodyParser.json())
server.use(bodyParser.urlencoded({
  extended: true
}))
server.use((req, res, next) => {
  res.header('Content-Type', 'application/json; charset=utf-8')
  next()
})

const addressRepository = new Repository()

// Load default data into a repository
const importData = () => {
  const data = require('./data/CepData.json')
  data.reduce((a, v) => {
    v.id = a + 1
    addressRepository.insert(v)
    return a + 1
  }, 0)
}

// List all address with 'available' eligibility
const availableAddress = () => {
  return addressRepository.fetchAll().filter(a => {
    return a.cep
  })
}

// Get all address
server.get('/ws', (req, res) => {
  res.json(addressRepository.fetchAll())
})

// Get all available address
server.get('/ws/14808560', (req, res) => {
  res.json(availableAddress())
})

// Find an address by ID
server.get('/ws/:id', (req, res) => {
  const response = addressRepository.getById(req.params.id)
  if (response) {
    res.end(JSON.stringify(response))
  } else {
    res.writeHead(404)
    res.end()
  }
})

// Register a new Address for the service
server.post('/ws', (req, res) => {
  const address = req.body

  // Really basic validation
  if (!address || !address.cep) {
    res.writeHead(400)
    res.end()

    return
  }

  address.id = addressRepository.fetchAll().length
  addressRepository.insert(address)

  res.writeHead(200)
  res.end()
})

module.exports = {
  server,
  importData,
  addressRepository
}
