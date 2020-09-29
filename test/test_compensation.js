const Compensation = artifacts.require("Compensation");
const Token = artifacts.require("Token");

const Web3Utils = require("web3-utils");
const BigNumber = web3.BigNumber;

require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

contract("Compensation", function (accounts) {
  const defaultAccount = accounts[0];
  const userOne = accounts[1];

  describe("deployment and initialization", function () {
    beforeEach(async function () {
      // Deploy token
      this.symbol = "TEST";
      this.totalSupply = 10000000000;
      this.token = await Token.new("Test Token", this.symbol, this.totalSupply);

      // Deploy compensation contract
      this.compensation = await Compensation.new(this.token.address);
    });

    it("should deploy and initialize the Compensation contract", async function () {
      this.compensation.should.exist;
    });
  });
});
