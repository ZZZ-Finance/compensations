# Compensation contract for distributing NAP

## Mechanics

Total contract is initialized the number value of NAP (not with the actual tokens) to be compensated and the number of compensation rounds to distribute them.

After the contract is deployed, the `addAddressforCompensation` function should be called to input addresses that are due compensation, as well as the total amount of compensation for that address.

The total compensation per round is determined by number of NAP divided by the number of rounds. The amount an address can claim each round is determined by their total compensation amount, divided by the total number of rounds, multiplied by the current round and subtracting any claims already made.

Once all addresses have been input, the amount of compensation NAP should be sent to the contract - make sure this is the amount input initially in the constructor. After this, calling the `startnextround` function will unlock the first round of compensation.

## An example:

Total compensation rounds: <b>10</b>  
Total NAP to be compensated: <b>1100000</b>

Triggering a round will unlock <b>110000</b> NAP, allowing users to call the `claimCompensation` function once.  
User will receive 10% of their total NAP compensation per round in this case.

Triggering another round will repeat the pattern.

## Extra

Testing coverage can be found in the `test` folder and the contracts, well in the `contracts` folder.

You can run the test suite yourself by:

`git clone git@github.com:ZZZ-Finance/compensations.git`  
`cd compensations`  
`yarn`  

Open up a local ethereum node on port 9545  
`npx ganache-cli -p 9545`  

Run the test suite  
`yarn add global truffle`  
`truffle test`  
