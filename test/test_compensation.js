const Compensation = artifacts.require("Compensation");
const Token = artifacts.require("Token");

const Web3Utils = require("web3-utils");
const BigNumber = web3.BigNumber;

const chai = require("chai")
  
  
chai.use(require("chai-as-promised")).use(require("chai-bignumber")(BigNumber)).should();

let assert = chai.assert;

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

    it("should allow owner to correct incorrect compensation amounts", async function () {
       // Two people getting added 
       const whiteListedUsers = [users.one, users.two];

       const incorrectCompensationAmount = 1000;
       const correctCompensationAmount = 500;

       // Whoops we set up wrong amounts for users
       const addCompensationPromises = whiteListedUsers.map(async (address, index) => await this.compensation.addAddressforCompensation(address, incorrectCompensationAmount, { from: owner}).should.be.fulfilled);
       await Promise.all(addCompensationPromises);

       // Get the claim limits for users
       const inCorrectClaimAmountPromises = whiteListedUsers.map(async address => Number(await this.compensation.tokenClaimLimit.call(address)));
       const inCorrectClaimAmounts = await Promise.all(inCorrectClaimAmountPromises);

       // Make sure incorrect amounts are avalaible in the contract.
       inCorrectClaimAmounts.forEach(claimAmount => claimAmount.should.be.equal(incorrectCompensationAmount));

       // Can we fix the situation?
       const fixCompensationPromises = whiteListedUsers.map(async address => await this.compensation.addAddressforCompensation(address, correctCompensationAmount, { from: owner}).should.be.fulfilled);
       await Promise.all(fixCompensationPromises);

      // Get the new claim limits
      const correctClaimAmountPromises = whiteListedUsers.map(async address => Number(await this.compensation.tokenClaimLimit.call(address)));
      const correctClaimAmounts = await Promise.all(correctClaimAmountPromises);

      // Check if the limit got reduced
      correctClaimAmounts.forEach(claimAmount => claimAmount.should.be.equal(correctCompensationAmount));

    })

    it("should not allow adding claims that overflow the contract balance", async function () {
      const overflowingCompensationAmount = 3001;
      const initialTotalAvailableTokens = Number(await this.compensation.totalAvailableTokens.call());

      // Make sure we are actually inserting a greater amount
      overflowingCompensationAmount.should.be.greaterThan(initialTotalAvailableTokens);

      //  Overflowing should not be supported if weighted % claiming is not available since it will lead to unfair distribution of tokens for a single compensation event.
      //  TODO: To fix this issue we should only add compensation amounts for users according to the weighted % per event. (maybe this is the plan?)
      //  TODO: Then the contract balance is never less than total claimables. 
      //  TODO: OR make the test referenced below pass by implementing the functionality in the contract itself.
      // -> Test in line 240 "should allow every user to claim with their weighted percentage".
      await this.compensation.addAddressforCompensation(users.one, overflowingCompensationAmount, { from: owner}).should.not.be.fulfilled;

      const userClaimAmount = await this.compensation.tokenClaimLimit.call(users.one);
      userClaimAmount.should.be.equal(0);

    })
  });

  describe("User interactions", function () {
    beforeEach(async function () {
      this.totalAvailableAmount = 6000;
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

    it("should allow every user to claim with their weighted percentage", async function () {
      const totalCompensationAmount = 10000;
      const initialTotalAvailableTokens = Number(await this.compensation.totalAvailableTokens.call());
      
      // Make sure we have less funds than is promised for total compensation
      initialTotalAvailableTokens.should.be.lessThan(totalCompensationAmount);

      // Two users that make up the total amount.
      const whiteListedUsersAndTheirCompensationAmounts = [{ address: users.one, compensation: 5000 }, { address: users.two, compensation: 5000 }]

      const userWeightedPercentageAmounts = whiteListedUsersAndTheirCompensationAmounts.map(user => {
        // Percentage of total claims that belong to this user
        const userPercentage = user.compensation / totalCompensationAmount;
        // Just a sanity check
        userPercentage.should.be.lessThan(1).and.greaterThan(0);
        // Amount in tokens
        const weightedCompensation = initialTotalAvailableTokens * userPercentage;
        weightedCompensation.should.be.lessThan(totalCompensationAmount);      
        return {
          address: user.address,
          weightedCompensation
        }
      })

      // Add the overflowing compensation amounts
      const addCompensationPromises = whiteListedUsersAndTheirCompensationAmounts.map(async ({ address, compensation }) => await this.compensation.addAddressforCompensation(address, compensation, { from: owner}).should.be.fulfilled);

      await Promise.all(addCompensationPromises);

      // Get the new claim limits
      const claimAmountPromises = whiteListedUsersAndTheirCompensationAmounts.map(async ({ address }) => Number(await this.compensation.tokenClaimLimit.call(address)));
      const claimAmounts = await Promise.all(claimAmountPromises);


      claimAmounts.forEach((claimAmount, index) => claimAmount.should.be.equal(whiteListedUsersAndTheirCompensationAmounts[index].compensation));

      // Make the claims
      const claimPromises = whiteListedUsersAndTheirCompensationAmounts.map(async ({ address }) => await this.compensation.claimCompensation({ from: address}).should.be.fulfilled);

      const transactions = await Promise.all(claimPromises);

      
      const logs = transactions.map(tx => tx.logs);
      
      // Get the succesfull claim events
      const claimEvents = logs.reduce((events, log) => {
        if(log => log.find(e => e.event === 'Claim')) {
          events.push(log);
        } 
        return events;
      }, []).flatMap(e => e);

      claimEvents.length.should.be.equal(2);

      const leftOverClaimLimitPromises = claimEvents.map(async (claimEvent, index) => {
        const userAddress = userWeightedPercentageAmounts[index].address;

        // Claim event should have the receiver declared as the transaction initiator
        claimEvent.args._receiver.should.be.equal(userAddress);

        // Amount the user is able to claim this time so it's possible for every user to do their claims
        const weightedAmountUserShouldBeAbleToClaim = userWeightedPercentageAmounts[index].weightedCompensation;

        // Total amount to be claimed for this user
        const totalAmountUserShouldBeAbleToClaim = whiteListedUsersAndTheirCompensationAmounts[index].compensation;

        // Claim event should return less tokens than the user total compensation is since the contract does not have the full amount.
        weightedAmountUserShouldBeAbleToClaim.should.be.lessThan(totalAmountUserShouldBeAbleToClaim)

        // Initiator should have the claimed their corresponding weighted %;
        Number(claimEvent.args._amount).should.be.bignumber.eql(weightedAmountUserShouldBeAbleToClaim, "Since this is failing, the user is not receiving the weighted percentage of contracts balance. The distribution won't be fair for a single compensation event.")
        return {
          address: userAddress,
          leftOverClaimLimit: await this.compensation.tokenClaimLimit.call(userAddress)
        }
      })

      const leftOverClaimLimitsForUser = await Promise.all(leftOverClaimLimitPromises);

      leftOverClaimLimitsForUser.forEach((leftOverClaimLimitForUser, index) => {
         // Amount the user is able to claim this time so it's possible for every user to do their claims
         const weightedAmountUserShouldBeAbleToClaim = userWeightedPercentageAmounts[index].weightedCompensation;
         // Total amount to be claimed for this user
         const totalAmountUserShouldBeAbleToClaim = whiteListedUsersAndTheirCompensationAmounts[index].compensation;

         // Left over claim limit should be reduced by weighted claim amoount.
         leftOverClaimLimitForUser.should.be.bignumber.equal(totalAmountUserShouldBeAbleToClaim - weightedAmountUserShouldBeAbleToClaim);
      })
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
