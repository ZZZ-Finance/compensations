# Compensation contract for distributing NAP

## Mechanics

Total contract is initialized the number value of NAP (not with the actual tokens) to be compensated and the number of compensation rounds to distribute them.

A single round will not have the total amount of NAP to be compensated.  
Instead starting a compensation round will require the following NAP amount `total naps to be compensated / compensation rounds` to be sent to the contract.

## An example:

Total compensation rounds: <b>10</b>  
Total NAP to be compensated: <b>1100000</b>

Triggering a round will transfer <b>110000</b> NAP to the contract and users will be given rights to call the `claimCompensation` function once.  
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
