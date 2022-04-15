const path = require('path')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const expect = chai.expect
const pact = require('pact')
const MOCK_SERVER_PORT = 1234
const LOG_LEVEL = process.env.LOG_LEVEL || 'WARN'

chai.use(chaiAsPromised)

describe('Pact', () => {
  const provider = pact({
    consumer: 'Matching Service',
    provider: 'ViaCep Service',
    port: MOCK_SERVER_PORT,
    log: path.resolve(process.cwd(), 'logs', 'mockserver-integration.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: LOG_LEVEL,
    spec: 2
  })

  // Alias flexible matchers for simplicity
  const term = pact.Matchers.term
  const like = pact.Matchers.somethingLike
  const eachLike = pact.Matchers.eachLike

  // Address we want to match :)
  const suitor = {
    'id': 1,
    'cep': '14808-560',
    'logradouro': 'Rua Professor Doutor Edmundo Juarez',
    'complemento': '',
    'bairro': 'Jardim Residencial Iedda',
    'localidade': 'Araraquara',
    'uf': 'SP',
    'ibge': '3503208',
    'gia': '1818',
    'ddd': '16',
    'siafi': '6163'    
  }

  const MIN_ADRESS = 1

  const cepBodyExpectation = {    
    'id': like(1),
    'cep': like('14808-560'),
    'logradouro': like('Rua Professor Doutor Edmundo Juarez'),
    'complemento': like(''),
    'bairro': like('Jardim Residencial Iedda'),
    'localidade': like('Araraquara'),
    'uf': like("SP"),
    'ibge': like("3503208"),
    'gia': like("1818"),
    'ddd': like("16"),
    'siafi': like("6163"),    
  }

  // Define Address list payload, reusing existing object matcher
  const cepListExpectation = eachLike(cepBodyExpectation, {
    min: MIN_ADRESS
  })

  // Setup a Mock Server before unit tests run.
  // This server acts as a Test Double for the real Provider API.
  // We call addInteraction() to configure the Mock Service to act like the Provider
  // It also sets up expectations for what requests are to come, and will fail
  // if the calls are not seen.
  before(() => {
    return provider.setup()
      .then(() => {
        provider.addInteraction({
          state: 'Has some dsdrees',
          uponReceiving: 'a request for all address',
          withRequest: {
            method: 'GET',
            path: '/ws/14808560'
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8'
            },
            body: cepListExpectation
          }
        })
      })
      .then(() => {
        provider.addInteraction({
          state: 'Has no Address',
          uponReceiving: 'a request for an address with ID 2',
          withRequest: {
            method: 'GET',
            path: '/ws/2'
          },
          willRespondWith: {
            status: 404
          }
        })
      })
      .then(() => {
        provider.addInteraction({
          state: 'Has an address with ID 1',
          uponReceiving: 'a request for an address with ID 1',
          withRequest: {
            method: 'GET',
            path: '/ws/1'
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8'
            },
            body: cepBodyExpectation
          }
        })
      })
      .catch(e =>{
        console.log('ERROR: ', e)
      })
  })

  // Configure and import consumer API
  // Note that we update the API endpoint to point at the Mock Service
  process.env.API_HOST = `http://localhost:${MOCK_SERVER_PORT}`
  const {
    suggestion,
    getCepById
  } = require('../consumerCep')

  // Verify service client works as expected.
  //
  // Note that we don't call the consumer API endpoints directly, but
  // use unit-style tests that test the collaborating function behaviour -
  // we want to test the function that is calling the external service.
  describe('when a call to list all address from the address Service is made', () => {
    describe('and there are address in the database', () => {
      it('returns a list of address', done => {
        const suggestedMates = suggestion(suitor)

        expect(suggestedMates).to.eventually.have.deep.property('suggestions[0].score', 94)
        expect(suggestedMates).to.eventually.have.property('suggestions').with.lengthOf(MIN_ADRESS).notify(done)
      })
    })
  })
  describe('when a call to the address Service is made to retreive a single address by ID', () => {
    describe('and there is an address in the DB with ID 1', () => {
      it('returns the address', done => {
        const suggestedMates = getCepById(1)

        expect(suggestedMates).to.eventually.have.deep.property('id', 1).notify(done)
      })
    })
    describe('and there no address in the database', () => {
      it('returns a 404', done => {
        const suggestedMates = getCepById(100)

        expect(suggestedMates).to.eventually.be.a('null').notify(done)
      })
    })
  })
  describe('when interacting with Address Service', () => {
    it('should validate the interactions and create a contract', () => {
      // uncomment below to test a failed verify
      // return getCepById(1123).then(provider.verify)
      return provider.verify
    })
  })

  // Write pact files
  after(() => {
    return provider.finalize()
  })
})
