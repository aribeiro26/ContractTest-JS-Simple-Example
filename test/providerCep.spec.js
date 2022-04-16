const { Verifier } = require("@pact-foundation/pact");
const { versionFromGitTag } = require("@pact-foundation/absolute-version");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const { server, importData, addressRepository } = require("../providerCep.js");
const path = require("path");

server.listen(8081, () => {
  importData();
  console.log("Address Profile Service listening on http://localhost:8081");
});

// Verify that the provider meets all consumer expectations
describe("Pact Verification", () => {
  it("validates the expectations of Matching Service", () => {
    let opts = {
      provider: "ViaCep Service",
      logLevel: "DEBUG",
      providerBaseUrl: "http://localhost:8081",

      stateHandlers: {
        "Has no address": () => {
          addressRepository.clear();
          return Promise.resolve(`Address removed to the db`);
        },
        "Has some address": () => {
          importData();
          return Promise.resolve(`Address added to the db`);
        },
        "Has an address with ID 1": () => {
          importData();
          return Promise.resolve(`Address added to the db`);
        },
      },

      // Fetch pacts from broker
      // pactBrokerUrl: "https://test.pact.dius.com.au/",

      // Fetch from broker with given tags
      consumerVersionTags: ["master", "test", "prod"],

      // Tag provider version with given tags
      providerVersionTags: ["master"], // in real code, this would be dynamically set by process.env.GIT_BRANCH

      // Find _all_ pacts (not just latest) with tag prod
      //   consumerVersionSelectors: [{
      //     tag: "prod",
      //     all: true
      //   }
      // ],

      // Enables "pending pacts" feature
      enablePending: true,

      // Specific Remote pacts (doesn't need to be a broker)
      // pactUrls: ['https://test.pact.dius.com.au/pacts/provider/address%20Profile%20Service/consumer/Matching%20Service/latest'],
      // Local pacts
      pactUrls: [
        path.resolve(
          process.cwd(),
          "./pacts/matching_service-viacep_service.json"
        ),
      ],

      // If you're NOT using Pactflow, use the username/password option as per below
      // pactBrokerUsername: "dXfltyFMgNOFZAxr8io9wJ37iUpY42M",
      // pactBrokerPassword: "O5AIZWxelWbLvqMd8PkAVycBJh2Psyg1",

      // if you're using Pactflow, you must authenticate using the bearer token option
      // You can obtain the token from https://<your broker>.pact.dius.com.au/settings/api-tokens
      // pactBrokerToken: "<insert your token here"
      publishVerificationResult: true,
      // Your version numbers need to be unique for every different version of your provider
      // see https://docs.pact.io/getting_started/versioning_in_the_pact_broker/ for details.
      // If you use git tags, then you can use @pact-foundation/absolute-version as we do here.
      providerVersion: versionFromGitTag(),
    };

    return new Verifier(opts).verifyProvider().then((output) => {
      console.log("Pact Verification Complete!");
      console.log(output);
    });
  });
});
