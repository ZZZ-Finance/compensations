const Compensation = artifacts.require("Compensation");
const Token = artifacts.require("Token");

const Web3Utils = require("web3-utils");
const BigNumber = web3.BigNumber;

require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

contract("Compensation", function (accounts) {
  const owner = accounts[0];
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

  describe("Owner interaction", function () {
    beforeEach(async function () {
      this.totalAvailableAmount = 2500;
      this.totalClaimableUserOne = 500;

      // Deploy token
      this.symbol = "TEST";
      this.totalSupply = 10000000000;
      this.token = await Token.new("Test Token", this.symbol, this.totalSupply, { from: owner });

      // Deploy compensation contract
      this.compensation = await Compensation.new(this.token.address, { from: owner });
    });

    it("should allow the owner to add compensation addresses", async function () {
      // Check the initial token claim limit
      const initialTokenClaimLimit = Number(await this.compensation.tokenClaimLimit.call(userOne));
      initialTokenClaimLimit.should.be.bignumber.equal(0);

      // Add the address and compensation amount
      await this.compensation.addAddressforCompensation(userOne, this.totalClaimableUserOne, {
        from: owner
      }).should.be.fulfilled;

      // Confirm that the token claim limit has increased as expected
      const newTokenClaimLimit = Number(await this.compensation.tokenClaimLimit.call(userOne));
      newTokenClaimLimit.should.be.bignumber.equal(this.totalClaimableUserOne);
    });

    it("should allow the owner to refill the contract", async function () {
      // Load initial token amounts
      const initialTotalAvailableTokens = Number(await this.compensation.totalAvailableTokens.call());
      const initialCompensationBalance = Number(await this.token.balanceOf(this.compensation.address));
      const initialOwnerBalance = Number(await this.token.balanceOf(owner));

      // Approve tokens to the contract so that allowances enable refilling
      await this.token.approve(this.compensation.address, this.totalAvailableAmount, {
        from: owner
      }).should.be.fulfilled;

      // Refill the contract with tokens and get transaction logs
      const { logs } = await this.compensation.refill(this.totalAvailableAmount, {
        from: owner
      }).should.be.fulfilled;

      // Confirm that Refill event was logged with expected values
      const refillEvent = logs.find(
        e => e.event === "Refill"
      );
      refillEvent.args._owner.should.be.equal(owner);
      Number(refillEvent.args._amount).should.be.bignumber.equal(this.totalAvailableAmount);
      Number(refillEvent.args._totalAvailable).should.be.bignumber.equal(this.totalAvailableAmount);

      // Load current token balances
      const afterTotalAvailableTokens = Number(await this.compensation.totalAvailableTokens.call());
      const afterCompensationBalance = Number(await this.token.balanceOf(this.compensation.address));
      const afterOwnerBalance = Number(await this.token.balanceOf(owner));

      // Check that token amounts have updated as expected
      afterTotalAvailableTokens.should.be.bignumber.equal(initialTotalAvailableTokens + this.totalAvailableAmount);
      afterCompensationBalance.should.be.bignumber.equal(initialCompensationBalance + this.totalAvailableAmount);
      afterOwnerBalance.should.be.bignumber.equal(initialOwnerBalance - this.totalAvailableAmount);
    });
  });

  describe("User compensation claims", function () {
    beforeEach(async function () {
      this.totalAvailableAmount = 2500;
      this.totalClaimableUserOne = 500;

      // Deploy token
      this.symbol = "TEST";
      this.totalSupply = 10000000000;
      this.token = await Token.new("Test Token", this.symbol, this.totalSupply, { from: owner });

      // Deploy compensation contract
      this.compensation = await Compensation.new(this.token.address, { from: owner });

      // Approve tokens to the contract so that allowances enable refilling
      await this.token.approve(this.compensation.address, this.totalAvailableAmount, {
        from: owner
      }).should.be.fulfilled;

      // Refill the contract with tokens
      await this.compensation.refill(this.totalAvailableAmount, {
        from: owner
      }).should.be.fulfilled;

      // Add the address and compensation amount
      await this.compensation.addAddressforCompensation(userOne, this.totalClaimableUserOne, {
        from: owner
      });
    });


    it("should allow users to make compensation claims", async function () {
      // Load initial contract values
      const initialTotalAvailableTokens = Number(await this.compensation.totalAvailableTokens.call());
      const initialUserTokensClaimed = Number(await this.compensation.tokensClaimed.call(userOne));
      // Load initial balances
      const initialCompensationBalance = Number(await this.token.balanceOf(this.compensation.address));
      const initialUserBalance = Number(await this.token.balanceOf(userOne));

      // Get the logs of a user generated compensation claim transaction
      const { logs } = await this.compensation.claimCompensation({ from: userOne}).should.be.fulfilled;

      // Confirm that claim event was logged with expected values
      const claimEvent = logs.find(
        e => e.event === "Claim"
      );
      claimEvent.args._receiver.should.be.equal(userOne);
      Number(claimEvent.args._amount).should.be.bignumber.equal(this.totalClaimableUserOne);

      // Load after contract values
      const afterTotalAvailableTokens = Number(await this.compensation.totalAvailableTokens.call());
      const afterUserTokensClaimed = Number(await this.compensation.tokensClaimed.call(userOne));
      // Load after balances
      const afterCompensationBalance = Number(await this.token.balanceOf(this.compensation.address));
      const afterUserBalance = Number(await this.token.balanceOf(userOne));

      // Check that contract values have updated as expected
      afterTotalAvailableTokens.should.be.bignumber.equal(initialTotalAvailableTokens - this.totalClaimableUserOne);
      afterUserTokensClaimed.should.be.bignumber.equal(initialUserTokensClaimed + this.totalClaimableUserOne);
      // Check that balances have updated as expected
      afterCompensationBalance.should.be.bignumber.equal(initialCompensationBalance - this.totalClaimableUserOne);
      afterUserBalance.should.be.bignumber.equal(initialUserBalance + this.totalClaimableUserOne);
    });
  });
});
