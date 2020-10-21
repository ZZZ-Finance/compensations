const Compensation = artifacts.require("Compensation");
const Token = artifacts.require("Token");

const { expect } = require("chai");
const Web3Utils = require("web3-utils");
const BigNumber = web3.BigNumber;

require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

contract("Compensation", function (accounts) {
  class Helper {
    constructor(totalNapsCompensation = "1100000000000000000000000") {
      return (async () => {
        this.token = await Token.new(
          "Test Token",
          "TEST",
          "2100000000000000000000000"
        );
        this.owner = accounts[0];
        this.contract = await Compensation.new(
          this.token.address,
          totalNapsCompensation,
          "10",
          { from: this.owner }
        ).should.be.fulfilled;

        await this.token.approve(this.contract.address, totalNapsCompensation, {
          from: this.owner,
        }).should.be.fulfilled;

        return this;
      })();
    }

    async refill() {
      return await this.contract.refill({ from: owner }).should.be.fulfilled;
    }

    async getContractBalance() {
      return Number(await this.token.balanceOf(this.contract.address));
    }

    async startNextRound() {
      await this.contract.startnextround({
        from: this.owner,
      }).should.be.fulfilled;
      return Number(await this.contract.currentRound());
    }

    async getTotalAvailableTokens() {
      return Number(
        await this.contract.totalAvailableTokens().should.be.fulfilled
      );
    }

    async claimCompensation(user) {
      return await this.contract.claimCompensation({ from: user });
    }

    async getCompensationPerRound() {
      return Number(
        await this.contract.compensationPerRound().should.be.fulfilled
      );
    }

    async getUserRoundClaimable(user) {
      const tokenClaimLimit = await this.tokenClaimLimit(user);
      const totalRounds = await this.contract.totalRounds();
      const currentRound = await this.contract.currentRound();
      return (tokenClaimLimit / totalRounds) * currentRound;
    }

    async getCompensationRounds() {
      return Number(await this.contract.totalRounds());
    }

    async tokenClaimLimit(user) {
      return Number(await this.contract.tokenClaimLimit(user));
    }
    async tokensClaimed(user) {
      return Number(await this.contract.tokensClaimed(user));
    }

    async currentRound() {
      return Number(await this.contract.currentRound());
    }

    async getTotalCompensationAmount() {
      return Number(await this.contract.totalTokensCompensation());
    }

    async addAddressforCompensation(user, amount) {
      return await this.contract.addAddressforCompensation(user, amount, {
        from: this.owner,
      });
    }

    async addMultipleAddressesforCompensation(users, amounts) {
      return await this.contract.addMultipleAddressesforCompensation(
        users,
        amounts,
        {
          from: this.owner,
        }
      );
    }
  }

  const owner = accounts[0];

  const users = {
    one: accounts[1],
    two: accounts[2],
    three: accounts[3],
    four: accounts[4],
    five: accounts[5],
    six: accounts[6],
  };

  const amountOfUsers = Object.keys(users).length;
  const CLAIM_ERROR_TEXT = "No claim available.";
  const MULTIPLE_ADDRESS_CLAIM_LIST_ARRAY_ERROR_TEXT =
    "Length of 2 arrays must be the same.";

  describe("deployment and initialization", function () {
    beforeEach(async function () {
      this.helper = await new Helper();
    });

    it("should deploy and initialize the Compensation contract", async function () {
      this.helper.contract.should.exist;
    });
  });

  describe("Owner interaction", function () {
    beforeEach(async function () {
      this.roundNapAmount = "3000000000000";
      this.helper = await new Helper();
    });

    it("should allow the owner to add compensation addresses", async function () {
      const userClaimable = "214000000000";
      // Check the initial token claim limit
      const initialTokenClaimLimit = await this.helper.tokenClaimLimit(
        users.one
      );
      initialTokenClaimLimit.should.be.bignumber.equal(0);

      // Add the address and compensation amount
      await this.helper.addAddressforCompensation(
        users.one,
        userClaimable
      ).should.be.fulfilled;

      // Confirm that the token claim limit has increased as expected
      const newTokenClaimLimit = await this.helper.tokenClaimLimit(users.one);
      newTokenClaimLimit.should.be.bignumber.equal(userClaimable);
    });

    it("should allow the owner to refill the contract", async function () {
      // Load initial token amounts
      const initialTotalAvailableTokens = await this.helper.getTotalAvailableTokens();
      const initialCompensationBalance = Number(
        await this.helper.token.balanceOf(this.helper.contract.address)
      );

      initialCompensationBalance.should.equal(0);

      const initialOwnerBalance = Number(
        await this.helper.token.balanceOf(owner)
      );

      // Refill the contract with tokens and get transaction logs
      await this.helper.refill();

      // Load current token balances
      const afterTotalAvailableTokens = await this.helper.getTotalAvailableTokens();
      const afterCompensationBalance = await this.helper.getContractBalance();
      const paymentPerRound = await this.helper.getCompensationPerRound();
      const afterOwnerBalance = Number(
        await this.helper.token.balanceOf(owner)
      );

      // Check that token amounts have updated as expected
      afterTotalAvailableTokens.should.be.bignumber.equal(
        initialTotalAvailableTokens + paymentPerRound
      );
      afterCompensationBalance.should.be.bignumber.equal(
        initialCompensationBalance + paymentPerRound
      );
      afterOwnerBalance.should.be.bignumber.equal(
        initialOwnerBalance - paymentPerRound
      );
    });

    it("should allow owner to correct incorrect compensation amounts", async function () {
      // Two people getting added
      const whiteListedUsers = [users.one, users.two];

      const incorrectCompensationAmount = 1000;
      const correctCompensationAmount = 500;

      // Whoops we set up wrong amounts for users
      const addCompensationPromises = whiteListedUsers.map(
        async (address) =>
          await this.helper.addAddressforCompensation(
            address,
            incorrectCompensationAmount
          ).should.be.fulfilled
      );
      await Promise.all(addCompensationPromises);

      // Get the claim limits for users
      const inCorrectClaimAmountPromises = whiteListedUsers.map(
        async (address) => await this.helper.tokenClaimLimit(address)
      );
      const inCorrectClaimAmounts = await Promise.all(
        inCorrectClaimAmountPromises
      );

      // Make sure incorrect amounts are avalaible in the contract.
      inCorrectClaimAmounts.forEach((claimAmount) =>
        claimAmount.should.be.equal(incorrectCompensationAmount)
      );

      // Can we fix the situation?
      const fixCompensationPromises = whiteListedUsers.map(
        async (address) =>
          await this.helper.addAddressforCompensation(
            address,
            correctCompensationAmount
          ).should.be.fulfilled
      );
      await Promise.all(fixCompensationPromises);

      // Get the new claim limits
      const correctClaimAmountPromises = whiteListedUsers.map(
        async (address) => await this.helper.tokenClaimLimit(address)
      );
      const correctClaimAmounts = await Promise.all(correctClaimAmountPromises);

      // Check if the limit got reduced
      correctClaimAmounts.forEach((claimAmount) =>
        claimAmount.should.be.equal(correctCompensationAmount)
      );
    });
  });

  describe("User interactions", function () {
    beforeEach(async function () {
      this.helper = await new Helper();
    });

    it.only("should allow adding the multiple addresses at the same time", async function () {
      const _addresses = [users.one, users.two];
      const _amounts = [100, 200];

      await this.helper.addMultipleAddressesforCompensation(
        _addresses,
        _amounts
      ).should.be.fulfilled;
    });

    it("should not allow adding the multiple addresses when any array is missing one or more items", async function () {
      const _addresses = [users.one, users.two, users.three];
      const _amounts = [100, 200];

      const event = await this.helper.addMultipleAddressesforCompensation(
        _addresses,
        _amounts
      ).should.not.be.fulfilled;

      event.reason.should.be.equal(
        MULTIPLE_ADDRESS_CLAIM_LIST_ARRAY_ERROR_TEXT
      );
    });

    it("should not allow claims before round started", async function () {
      const overflowingCompensationAmount = 1;
      const initialTotalAvailableTokens = await this.helper.getContractBalance();

      // Make sure we are actually inserting a greater amount
      overflowingCompensationAmount.should.be.greaterThan(
        initialTotalAvailableTokens
      );

      await this.helper.addAddressforCompensation(
        users.one,
        overflowingCompensationAmount
      );

      await this.helper.claimCompensation(users.one).should.not.be.fulfilled;
    });

    it("should allow claims and update balances correctly for multiple rounds", async function () {
      const compensationAmount = "3500000000000";
      await this.helper.addAddressforCompensation(
        users.one,
        compensationAmount
      );

      const tokensClaimedByUser = await this.helper.tokensClaimed(users.one);
      const tokenClaimLimit = await this.helper.tokenClaimLimit(users.one);
      tokenClaimLimit.should.equal(parseInt(compensationAmount));
      tokensClaimedByUser.should.equal(0);
      await this.helper.startNextRound();
      await this.helper.claimCompensation(users.one).should.be.fulfilled;
      const userBalance = Number(await this.helper.token.balanceOf(users.one));
      userBalance.should.equal(
        await this.helper.getUserRoundClaimable(users.one)
      );

      const tokensClaimedByUserAfterFirstRound = await this.helper.tokensClaimed(
        users.one
      );
      tokensClaimedByUserAfterFirstRound.should.equal(userBalance);
      // Do another round
      await this.helper.startNextRound();
      await this.helper.claimCompensation(users.one).should.be.fulfilled;

      const userBalanceAfterSecondRound = Number(
        await this.helper.token.balanceOf(users.one)
      );
      userBalanceAfterSecondRound.should.equal(userBalance * 2);
    });

    it("should not allow non white-listed user to claim", async function () {
      const initialUserBalance = Number(
        await this.helper.token.balanceOf(users.one)
      );

      await this.helper.startNextRound();
      const roundBalance = await this.helper.getContractBalance();
      // Try to claim from the contract
      const event = await this.helper.claimCompensation(users.one).should.not.be
        .fulfilled;

      event.reason.should.be.equal(CLAIM_ERROR_TEXT);

      const afterUserBalance = Number(
        await this.helper.token.balanceOf(users.one)
      );
      const afterTotalAvailableTokens = await this.helper.getContractBalance();

      afterUserBalance.should.be.bignumber.equal(initialUserBalance);
      afterTotalAvailableTokens.should.be.bignumber.equal(roundBalance);
    });

    it("should allow multiple users to claim ", async function () {
      // Two users that make up the total amount.
      const claimers = [
        { address: users.one, compensation: 500000000 },
        { address: users.two, compensation: 500000000 },
      ];

      // Add the overflowing compensation amounts
      const addCompensationPromises = claimers.map(
        async ({ address, compensation }) =>
          await this.helper.addAddressforCompensation(address, compensation)
      );

      await Promise.all(addCompensationPromises);

      // Start a round
      await this.helper.startNextRound();
      // Get the new claim limits
      const claimAmountPromises = claimers.map(async ({ address }) =>
        Number(await this.helper.contract.tokenClaimLimit(address))
      );
      const claimAmounts = await Promise.all(claimAmountPromises);

      claimAmounts.forEach((claimAmount, index) =>
        claimAmount.should.be.equal(claimers[index].compensation)
      );

      // Make the claims
      const claimPromises = claimers.map(
        async ({ address }) =>
          await this.helper.claimCompensation(address).should.be.fulfilled
      );

      const transactions = await Promise.all(claimPromises);

      const logs = transactions.map((tx) => tx.logs);

      // Get the succesfull claim events
      const claimEvents = logs
        .reduce((events, log) => {
          if ((log) => log.find((e) => e.event === "Claim")) {
            events.push(log);
          }
          return events;
        }, [])
        .flatMap((e) => e);

      claimEvents.length.should.be.equal(2);
    });

    it("should not allow one user to make claim more than once", async function () {
      const compensationAmount = "35015030510";
      // Add the address and compensation amount
      await this.helper.addAddressforCompensation(
        users.one,
        compensationAmount
      );

      // Just for fun make the claim amount dynamic
      const MIN_CLAIMS = 2;
      const MAX_CLAIMS = 12;
      const ITERATION_AMOUNT =
        Math.floor(Math.random() * (MAX_CLAIMS - MIN_CLAIMS + 1)) + MIN_CLAIMS;

      await this.helper.startNextRound();

      // Get initial contract state
      const initialContractBalance = await this.helper.getContractBalance();

      // Initial use state
      const initialUserTokensClaimed = await this.helper.tokensClaimed(
        users.one
      );
      const initialUserBalance = Number(
        await this.helper.token.balanceOf(users.one)
      );

      // Generate an array from the random number.
      const claimIterations = Array.from(Array(ITERATION_AMOUNT).keys());

      // Call claim in the range of MIN_CLAIMS - MAX-CLAIMS
      const transactionPromises = claimIterations.map(async (iteration) => {
        if (iteration === 0) {
          return await this.helper.claimCompensation(users.one).should.be
            .fulfilled;
        } else {
          return await this.helper.claimCompensation(users.one).should.not.be
            .fulfilled;
        }
      });

      const transactions = await Promise.all(transactionPromises);

      // Insert logs of the succesfull events, for rejected transactions just push the object for later parsing.
      const events = transactions
        .filter(Boolean)
        .reduce((events, currentTx) => {
          if (currentTx.logs) {
            events.push(currentTx.logs.find((e) => e.event === "Claim"));
          } else {
            events.push(currentTx);
          }
          return events;
        }, []);

      // Events should be the length of the random claim amounts
      events.length.should.be.equal(claimIterations.length);

      // Get the total amount of succesfull claims
      const claimEvents = events.filter((e) => e.event === "Claim");

      // And the amount of rejected transactions.
      const errorEvents = events.filter(
        (e) => !e.transactionHash && e.reason.includes(CLAIM_ERROR_TEXT)
      );

      // Make sure error events are actually less than the original claim count since one should succeed.
      errorEvents.length.should.be.equal(
        claimIterations.length - claimEvents.length
      );

      // We should only have one succesfull claim event
      claimEvents.length.should.be.equal(1);

      // Since we are here there can only be one claim in the array.
      const claimEvent = claimEvents[0];

      // Claim event should have the receiver declared as the transaction initiator
      claimEvent.args._receiver.should.be.equal(users.one);

      // Initiator should have the claimable amount of a single transaction.
      const claimAmountPerRound = await this.helper.getUserRoundClaimable(
        users.one
      );
      Number(claimEvent.args._amount).should.be.bignumber.equal(
        claimAmountPerRound
      );

      // Load after contract state
      const afterUserTokensClaimed = await this.helper.tokensClaimed(users.one);

      // Load after user state
      const afterCompensationBalance = await this.helper.getContractBalance();

      const afterUserBalance = Number(
        await this.helper.token.balanceOf(users.one)
      );

      // Check that contract state has updated as expected
      afterCompensationBalance.should.be.bignumber.equal(
        initialContractBalance - claimAmountPerRound
      );
      afterUserTokensClaimed.should.be.bignumber.equal(
        initialUserTokensClaimed + claimAmountPerRound
      );
      afterUserBalance.should.be.bignumber.equal(
        initialUserBalance + claimAmountPerRound
      );
    });

    it("should empty the whole comp fund", async function () {
      const claimers = [
        { user: accounts[1], claimable: "200000000000000000000000" },
        { user: accounts[2], claimable: "200000000000000000000000" },
        { user: accounts[3], claimable: "200000000000000000000000" },
        { user: accounts[4], claimable: "200000000000000000000000" },
        { user: accounts[5], claimable: "200000000000000000000000" },
        { user: accounts[6], claimable: "100000000000000000000000" },
      ];

      const totalClaimables = claimers.reduce(
        (acc, curr) => acc + parseInt(curr.claimable),
        0
      );

      const totalCompensationAmount = await this.helper.getTotalCompensationAmount();
      totalClaimables.should.equal(totalCompensationAmount);

      const totalRounds = await this.helper.getCompensationRounds();
      claimers.map(({ user, claimable }) =>
        this.helper.addAddressforCompensation(user, claimable)
      );

      for (let i = 0; i < totalRounds; i++) {
        await this.helper.startNextRound();
        const claimPromises = claimers.map(
          ({ user }) => this.helper.claimCompensation(user).should.be.fulfilled
        );
        await Promise.all(claimPromises);
      }

      const contractBalanceAfterClaims = await this.helper.getContractBalance();
      contractBalanceAfterClaims.should.equal(0);

      const promises = claimers.map(async ({ user }) => {
        return Number(await this.helper.token.balanceOf(user));
      });
      const userBalances = await Promise.all(promises);

      userBalances.forEach((balance, index) => {
        balance.should.equal(parseInt(claimers[index].claimable));
      });
    });
  });
});
