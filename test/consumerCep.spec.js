const path = require("path");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const expect = chai.expect;
const { Pact, Matchers } = require("@pact-foundation/pact");
const LOG_LEVEL = process.env.LOG_LEVEL || "WARN";

chai.use(chaiAsPromised);

describe("Pact", () => {
  const provider = new Pact({
    consumer: "Matching Service",
    provider: "ViaCep Service",
    // port: 1234, // You can set the port explicitly here or dynamically (see setup() below)
    log: path.resolve(process.cwd(), "logs", "mockserver-integration.log"),
    dir: path.resolve(process.cwd(), "pacts"),
    logLevel: LOG_LEVEL,
    spec: 2,
  });

  // Alias flexible matchers for simplicity
  const { eachLike, like, term, iso8601DateTimeWithMillis } = Matchers;

  // Address we want to match :)
  const suitor = {
    id: 1,
    cep: "14808-560",
    logradouro: "Rua Professor Doutor Edmundo Juarez",
    complemento: "",
    bairro: "Jardim Residencial Iedda",
    localidade: "Araraquara",
    uf: "SP",
    ibge: "3503208",
    gia: "1818",
    ddd: "16",
    siafi: "6163",
  };

  const MIN_ADDRESS = 2;

  const cepBodyExpectation = {
    id: like(1),
    cep: like("14808-560"),
    logradouro: like("Rua Professor Doutor Edmundo Juarez"),
    complemento: like(""),
    bairro: like("Jardim Residencial Iedda"),
    localidade: like("Araraquara"),
    uf: like("SP"),
    ibge: like("3503208"),
    gia: like("1818"),
    ddd: like("16"),
    siafi: like("6163"),
  };

  // Define Address list payload, reusing existing object matcher
  const cepListExpectation = eachLike(cepBodyExpectation, {
    min: MIN_ADDRESS,
  });

  // Setup a Mock Server before unit tests run.
  // This server acts as a Test Double for the real Provider API.
  // We then call addInteraction() for each test to configure the Mock Service
  // to act like the Provider
  // It also sets up expectations for what requests are to come, and will fail
  // if the calls are not seen.
  before(() =>
    provider.setup().then((opts) => {
      // Get a dynamic port from the runtime
      process.env.API_HOST = `http://localhost:${opts.port}`;
    })
  );

  // After each individual test (one or more interactions)
  // we validate that the correct request came through.
  // This ensures what we _expect_ from the provider, is actually
  // what we've asked for (and is what gets captured in the contract)
  afterEach(() => provider.verify());

  // Configure and import consumer API
  // Note that we update the API endpoint to point at the Mock Service
  const {
    createMateForDates,
    suggestion,
    getCepById,
  } = require("../consumerCep");

  // Verify service client works as expected.
  //
  // Note that we don't call the consumer API endpoints directly, but
  // use unit-style tests that test the collaborating function behaviour -
  // we want to test the function that is calling the external service.
  describe("when a call to list all address from the Address Service is made", () => {
    describe("and the user is authenticated", () => {
      describe("and there are address in the database", () => {
        before(() =>
          provider.addInteraction({
            state: "Has some address",
            uponReceiving: "a request for all address",
            withRequest: {
              method: "GET",
              path: "/ws/14808560",
            },
            willRespondWith: {
              status: 200,
              headers: {
                "Content-Type": "application/json; charset=utf-8",
              },
              body: cepListExpectation,
            },
          })
        );

        it("returns a list of address", (done) => {
          const suggestedMates = suggestion(suitor);

          expect(suggestedMates).to.eventually.have.deep.property(
            "suggestions[0].score",
            94
          );
          expect(suggestedMates)
            .to.eventually.have.property("suggestions")
            .with.lengthOf(MIN_ADDRESS)
            .notify(done);
        });
      });
    });
  });

  describe("when a call to the Address Service is made to retreive a single address by ID", () => {
    describe("and there is an address in the DB with ID 1", () => {
      before(() =>
        provider.addInteraction({
          state: "Has an address with ID 1",
          uponReceiving: "a request for an address with ID 1",
          withRequest: {
            method: "GET",
            path: term({ generate: "/ws/1", matcher: "/ws/[0-9]+" }),
          },
          willRespondWith: {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
            },
            body: cepBodyExpectation,
          },
        })
      );

      it("returns the address", (done) => {
        const suggestedMates = getCepById(11);

        expect(suggestedMates)
          .to.eventually.have.deep.property("id", 1)
          .notify(done);
      });
    });

    describe("and there no address in the database", () => {
      before(() =>
        provider.addInteraction({
          state: "Has no address",
          uponReceiving: "a request for an address with ID 100",
          withRequest: {
            method: "GET",
            path: "/ws/100",
          },
          willRespondWith: {
            status: 404,
          },
        })
      );

      it("returns a 404", (done) => {
        // uncomment below to test a failed verify
        // const suggestedMates = getCepById(123)
        const suggestedMates = getCepById(100);

        expect(suggestedMates).to.eventually.be.a("null").notify(done);
      });
    });
  });

  describe("when a call to the Address Service is made to create a new mate", () => {
    before(() =>
      provider.addInteraction({
        uponReceiving: "a request to create a new mate",
        withRequest: {
          method: "POST",
          path: "/ws",
          body: like(suitor),
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
          body: like(suitor),
        },
      })
    );

    it("creates a new mate", (done) => {
      expect(createMateForDates(suitor)).to.eventually.be.fulfilled.notify(
        done
      );
    });
  });

  // Write pact files
  after(() => {
    return provider.finalize();
  });
});
