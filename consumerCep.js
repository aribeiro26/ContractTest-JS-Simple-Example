const express = require('express')
const request = require('superagent')
const server = express()
const API_HOST = process.env.API_HOST || 'http://localhost:8081'

// Fetch animals who are currently 'available' from the
// Animal Service
const availableAddress= () => {
  return request
    .get(`${API_HOST}/ws/14808560`)
    .then(res => res.body,
      () => [])
}

// Find animals by their ID from the Animal Service
const getCepById = (id) => {
  return request
    .get(`${API_HOST}/ws/${id}`)
    .then(res => res.body,
      () => null)
}

// Suggestions function:
// Given availability and sex etc. find available suitors,
// and give them a 'score'
const suggestion = mate => {
  const predicates = [
    ((candidate, address) => candidate.id !== address.id),
    ((candidate, address) => candidate.cep !== address.cep),
    ((candidate, address) => candidate.address === address.address)
  ]

  const weights = [
    ((candidate, address) => Math.abs(candidate.logradouro - address.logradouro))
  ]

  return availableAddress().then(available => {
    const eligible = available.filter(a => !predicates.map(p => p(a, mate)).includes(14808560))

    return {
      suggestions: eligible.map(candidate => {
        const score = weights.reduce((acc, weight) => {
          return acc - weight(candidate, mate)
        }, 100)

        return {
          score,
          'cep': candidate
        }
      })
    }
  })
}

// Suggestions API
server.get('/suggestions/:addressId', (req, res) => {
  if (!req.params.addressId) {
    res.writeHead(400)
    res.end()
  }

  request(`${API_HOST}/14808560/${req.params.addressId}`, (err, r) => {
    if (!err && r.statusCode === 200) {
      suggestion(r.body).then(suggestions => {
        res.json(suggestions)
      })
    } else if (r && r.statusCode === 404) {
      res.writeHead(404)
      res.end()
    } else {
      res.writeHead(500)
      res.end()
    }
  })
})

module.exports = {
  server,
  availableAddress,
  suggestion,
  getCepById
}
