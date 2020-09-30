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

  const users = {
    one: accounts[1],
    two: accounts[2],
    three: accounts[3],
    four: accounts[4],
    five: accounts[5],
    six: accounts[6]
  }

  const amountOfUsers = Object.keys(users).length;

  const CLAIM_ERROR_TEXT = "No claim available."

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
      this.totalAvailableAmount = 3000;
      this.totalClaimablePerUser = 500;

      // Deploy token
      this.symbol = "TEST";
      this.totalSupply = 10000000000;
      this.token = await Token.new("Test Token", this.symbol, this.totalSupply, { from: owner });

      // Deploy compensation contract
      this.compensation = await Compensation.new(this.token.address, { from: owner });
    });

    it("should allow the owner to add compensation addresses", async function () {
      // Check the initial token claim limit
      const initialTokenClaimLimit = Number(await this.compensation.tokenClaimLimit.call(users.one));
      initialTokenClaimLimit.should.be.bignumber.equal(0);

      // Add the address and compensation amount
      await this.compensation.addAddressforCompensation(users.one, this.totalClaimablePerUser, {
        from: owner
      }).should.be.fulfilled;

      // Confirm that the token claim limit has increased as expected
      const newTokenClaimLimit = Number(await this.compensation.tokenClaimLimit.call(users.one));
      newTokenClaimLimit.should.be.bignumber.equal(this.totalClaimablePerUser);
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

  describe("User interactions", function () {
    beforeEach(async function () {
      this.totalAvailableAmount = 3000;
      // This will only function if the result is a whole number.
      this.totalClaimablePerUser = this.totalAvailableAmount / amountOfUsers;

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

    });

    it("should allow white-listed user to make compensation claim", async function () {

      // Add the address and compensation amount
      await this.compensation.addAddressforCompensation(users.one, this.totalClaimablePerUser, {
        from: owner
      });

      // Load initial contract values
      const initialTotalAvailableTokens = Number(await this.compensation.totalAvailableTokens.call());
      const initialUserTokensClaimed = Number(await this.compensation.tokensClaimed.call(users.one));
      // Load initial balances
      const initialCompensationBalance = Number(await this.token.balanceOf(this.compensation.address));
      const initialUserBalance = Number(await this.token.balanceOf(users.one));

      // Get the logs of a user generated compensation claim transaction
      const { logs } = await this.compensation.claimCompensation({ from: users.one}).should.be.fulfilled;

      // Confirm that claim event was logged with expected values
      const claimEvent = logs.find(
        e => e.event === "Claim"
      );
      claimEvent.args._receiver.should.be.equal(users.one);
      Number(claimEvent.args._amount).should.be.bignumber.equal(this.totalClaimablePerUser);

      // Load after contract values
      const afterTotalAvailableTokens = Number(await this.compensation.totalAvailableTokens.call());
      const afterUserTokensClaimed = Number(await this.compensation.tokensClaimed.call(users.one));
      // Load after balances
      const afterCompensationBalance = Number(await this.token.balanceOf(this.compensation.address));
      const afterUserBalance = Number(await this.token.balanceOf(users.one));

      // Check that contract values have updated as expected
      afterTotalAvailableTokens.should.be.bignumber.equal(initialTotalAvailableTokens - this.totalClaimablePerUser);
      afterUserTokensClaimed.should.be.bignumber.equal(initialUserTokensClaimed + this.totalClaimablePerUser);
      // Check that balances have updated as expected
      afterCompensationBalance.should.be.bignumber.equal(initialCompensationBalance - this.totalClaimablePerUser);
      afterUserBalance.should.be.bignumber.equal(initialUserBalance + this.totalClaimablePerUser);
    });

    it("should not allow non white-listed user to claim", async function () {

      const initialTotalAvailableTokens = Number(await this.compensation.totalAvailableTokens.call());

      const initialUserBalance = Number(await this.token.balanceOf(users.one));

      // Try to claim from the contract
      const event = await this.compensation.claimCompensation({ from: users.one}).should.not.be.fulfilled;

      event.reason.should.be.equal(CLAIM_ERROR_TEXT);

      const afterUserBalance = Number(await this.token.balanceOf(users.one));
      const afterTotalAvailableTokens = Number(await this.compensation.totalAvailableTokens.call());

      afterUserBalance.should.be.bignumber.equal(initialUserBalance);
      afterTotalAvailableTokens.should.be.bignumber.equal(initialTotalAvailableTokens);

    })

    it("should not allow one user to make claim more than once", async function () {

      // Add the address and compensation amount
      await this.compensation.addAddressforCompensation(users.one, this.totalClaimablePerUser, {
        from: owner
      });
      
      // Just for fun make the claim amount dynamic
      const MIN_CLAIMS = 2;
      const MAX_CLAIMS = 12;
      const ITERATION_AMOUNT = Math.floor(Math.random() * (MAX_CLAIMS - MIN_CLAIMS + 1)) + MIN_CLAIMS;

      // Get initial contract state
      const initialTotalAvailableTokens = Number(await this.compensation.totalAvailableTokens.call());
      const initialCompensationBalance = Number(await this.token.balanceOf(this.compensation.address));
      
      // Get initial user state 
      const initialUserTokensClaimed = Number(await this.compensation.tokensClaimed.call(users.one));
      const initialUserBalance = Number(await this.token.balanceOf(users.one));

      // Generate an array from the random number.
      const claimIterations = Array.from(Array(ITERATION_AMOUNT).keys());

      // Call claim in the range of MIN_CLAIMS - MAX-CLAIMS
      const transactionPromises = claimIterations.map(async (iteration) => { 
        if (iteration === 0) {
          return await this.compensation.claimCompensation({ from: users.one}).should.be.fulfilled; 
        } else {
          return await this.compensation.claimCompensation({ from: users.one}).should.not.be.fulfilled; 
        }
      })

      const transactions = await Promise.all(transactionPromises);

      // Insert logs of the succesfull events, for rejected transactions just push the object for later parsing.
      const events = transactions.filter(Boolean).reduce((events, currentTx) => {
        if(currentTx.logs) {
          events.push(currentTx.logs.find(e => e.event === "Claim"));
        } else {
          events.push(currentTx);
        }
        return events;
      }, [])

      // Events should be the length of the random claim amounts
      events.length.should.be.equal(claimIterations.length);

      // Get the total amount of succesfull claims
      const claimEvents = events.filter(
        e => e.event === "Claim"
      );

      // And the amount of rejected transactions.
      const errorEvents = events.filter(
        e =>  !e.transactionHash && e.reason.includes(CLAIM_ERROR_TEXT)
      );

      // Make sure error events are actually less than the original claim count since one should succeed.
      errorEvents.length.should.be.equal(claimIterations.length - claimEvents.length);

      // We should only have one succesfull claim event
      claimEvents.length.should.be.equal(1);

      // Since we are here there can only be one claim in the array.
      const claimEvent = claimEvents[0];

      // Claim event should have the receiver declared as the transaction initiator
      claimEvent.args._receiver.should.be.equal(users.one);

      // Initiator should have the claimable amount of a single transaction.
      Number(claimEvent.args._amount).should.be.bignumber.equal(this.totalClaimablePerUser);

      // Load after contract state
      const afterTotalAvailableTokens = Number(await this.compensation.totalAvailableTokens.call());
      const afterUserTokensClaimed = Number(await this.compensation.tokensClaimed.call(users.one));

      // Load after user state
      const afterCompensationBalance = Number(await this.token.balanceOf(this.compensation.address));
      const afterUserBalance = Number(await this.token.balanceOf(users.one));

      // Check that contract state has updated as expected
      afterTotalAvailableTokens.should.be.bignumber.equal(initialTotalAvailableTokens - this.totalClaimablePerUser);
      afterUserTokensClaimed.should.be.bignumber.equal(initialUserTokensClaimed + this.totalClaimablePerUser);

      // Check that user state has updated as expected
      afterCompensationBalance.should.be.bignumber.equal(initialCompensationBalance - this.totalClaimablePerUser);
      afterUserBalance.should.be.bignumber.equal(initialUserBalance + this.totalClaimablePerUser);
    })

    it("should distribute rewards to multiple users", async function () {

      // Generate an array for ease-of-access later on
      const whiteListedUsers = Object.entries(users);

      const initialTotalAvailableTokens = Number(await this.compensation.totalAvailableTokens.call());

      // Fetch the initial state for the users who are claiming
      const initialUserTokensClaimedForUsersPromises = whiteListedUsers.map(async ([user, userAddress]) => ({ [user]: Number(await this.compensation.tokensClaimed.call(userAddress)) }));
      const initialUserBalancesPromises = whiteListedUsers.map(async ([user, userAddress]) => ({ [user]: Number(await this.token.balanceOf(userAddress))}));

      const initialUserTokensClaimedForUsers = await Promise.all(initialUserTokensClaimedForUsersPromises);
      const initialUserBalances = await Promise.all(initialUserBalancesPromises);

      // Add all the whitelisted addresses and their corresponding claims
      const whitelistingPromises = whiteListedUsers.map(async ([, userAddress]) => 
        await this.compensation.addAddressforCompensation(userAddress, this.totalClaimablePerUser, {
          from: owner
        }).should.be.fulfilled
      )

      await Promise.all(whitelistingPromises);

      // Make the claims
      const claimPromises = whiteListedUsers.map(async ([, userAddress]) => await this.compensation.claimCompensation({ from: userAddress}).should.be.fulfilled);
      
      const transactions = await Promise.all(claimPromises);

      // Get each claim event
      const claimEvents = transactions.filter(tx => !!tx.logs.find(e => e.event === "Claim"));

      // Should equal the amount of whitelisted users
      claimEvents.length.should.be.equal(whiteListedUsers.length);

      // Make sure we drained the fund accordingly
      const afterCompensationBalance = Number(await this.token.balanceOf(this.compensation.address));
      afterCompensationBalance.should.be.bignumber.equal(initialTotalAvailableTokens - (this.totalClaimablePerUser * amountOfUsers));

      // Check the balances after transactions
      whiteListedUsers.forEach(async ([user, userAddress]) => {
        const initialUserTokensClaimed = initialUserTokensClaimedForUsers.find(entry => !!entry[user]);
        const afterUserTokensClaimed = Number(await this.compensation.tokensClaimed.call(userAddress));
  
        // Make sure contract state is kept in track with earlier token claims.
        afterUserTokensClaimed.should.be.bignumber.equal(initialUserTokensClaimed + this.totalClaimablePerUser);
  
        const initialUserBalance = initialUserBalances.find(entry => !!entry[user]);
        const afterUserBalance = Number(await this.token.balanceOf(userAddress));
  
        // Check that the account balance is increased equally to the claim amount.
        afterUserBalance.should.be.bignumber.equal(initialUserBalance + this.totalClaimablePerUser);
      })
    })
  });
});
