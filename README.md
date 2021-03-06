# Pact JS End-to-End Example

Using a simple address dating API, we demonstrate the following Pact features:

* Consumer testing and pact file generation, including advanced features like:
    * [Flexible matching](https://docs.pact.io/documentation/javascript/flexible_matching.html)
    * [Provider states](https://docs.pact.io/documentation/provider_states.html)
* Sharing Pacts by publishing to and retrieving from a [Pact Broker](https://github.com/bethesque/pact_broker)
* Provider side verification

This comprises a complete E2E example that can be used as a basis for projects.

<!-- TOC depthFrom:2 depthTo:6 withLinks:1 updateOnSave:1 orderedList:0 -->

- [The Example Project](#the-example-project)
	- [Provider (Profile API)](#provider-profile-api)
	- [Consumer (Matching API)](#consumer-matching-api)
- [Running the tests](#running-the-tests)
- [Running the API](#running-the-api)
	- [Address Profile API](#Address-profile-api)
		- [GET /Addresss](#get-Addresss)
		- [GET /Addresss/:id](#get-Addresssid)
		- [GET /Addresss/available](#get-Addresssavailable)
		- [POST /Addresss](#post-Addresss)
	- [Matching service](#matching-service)
		- [GET /suggestions/:id](#get-suggestionsid)
- [Viewing contracts with the Pact Broker](#viewing-contracts-with-the-pact-broker)
- [Running with Vagrant](#running-with-vagrant)

<!-- /TOC -->

## The Example Project

[Matching API] -> [Profile API]+\(DB\)

### Provider (Profile API)

Provides Address profile information, including interests, zoo location and other personal details.

### Consumer (Matching API)

Given an Address profile, recommends a suitable partner based on similar interests.

## Running the tests

1. `npm install`
1. `npm run test:consumer` - Run consumer tests
1. `npm run test:publish` - Publish contracts to the broker
1. `npm run test:provider` - Run provider tests

## Running the API

If you want to experiment with the API to get an understanding:

1. `npm run api` - Runs the both provider and consumer API

or individually :

1. `npm run provider` - Runs the provider API (Address service)
1. `npm run consumer` - Runs the consumer API (matching service)

### Address Profile API

The APIs are described below, including a bunch of cURL statements to invoke them.
There is also a [Postman Collection](https://raw.githubusercontent.com/pact-foundation/pact-js/master/examples/e2e/pact-js-e2e.postman_collection).

#### GET /Addresss

```
curl -X GET "http://localhost:8081/Addresss"
```

#### GET /Addresss/:id

```
curl -X GET "http://localhost:8081/Addresss/1"
```

#### GET /Addresss/available

```
curl -X GET http://localhost:8081/Addresss/available
```

#### POST /Addresss

```
curl -X POST -H "Content-Type: application/json" -d '{
  "first_name": "aoeu",
  "last_name": "aoeu",
  "age":  21,
  "gender": "M",
  "location": {
    "description": "Melbourne Zoo",
    "country": "Australia",
    "post_code": 3000
  },
  "eligibility": {
    "available": true,
    "previously_married": false
  },
  "interests": [
    "walks in the garden/meadow",
    "munching on a paddock bomb",
    "parkour"
  ]
}' "http://localhost:8081/Addresss"
```

### Matching service
#### GET /suggestions/:id

```
curl -X GET http://localhost:8080/suggestions/1
```

## Viewing contracts with the Pact Broker

A test [Pact Boker](https://github.com/bethesque/pact_broker) is running at https://test.pact.dius.com.au:

* Username: `dXfltyFMgNOFZAxr8io9wJ37iUpY42M`
* Password: `O5AIZWxelWbLvqMd8PkAVycBJh2Psyg1`

Or use the API:

```
curl -v -u 'dXfltyFMgNOFZAxr8io9wJ37iUpY42M:O5AIZWxelWbLvqMd8PkAVycBJh2Psyg1' https://test.pact.dius.com.au
```

## Running with Vagrant

We have created a [Vagrantfile](Vagrantfile) to be able to test out the project
in an isolated and repeatable way.

```
vagrant up
vagrant ssh
cd /vagrant
npm i
npm run test:consumer
npm run test:provider
```
