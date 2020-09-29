// SPDX-License-Identifier: <SPDX-License>
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Compensation is Ownable {
	using SafeMath for uint;
	using SafeERC20 for IERC20;

	uint public TotalTokenCompensation;            // The total Tokens for compensation.
	uint public CompTokensAdded = 0;               // The amount of tokens added so far for compensation.
	uint public CurrentRoundTokenCompensation;     // The amount of tokens added in this round of compensation.
	uint public CompensationRounds = 0;            // The number of times compensation funds have been added. Each add = 1 round.
	address CompensationAddress;
	mapping (address => bool) public EligibleforCompensation;      // Checks if the address is eligble for compesnation.
	//mapping (address => bool) CanClaimCompensation;         // Checks if the address has pending compensation ready to be claimed; (DEACTIVATED)
	mapping (address => uint) public TotalCompensationforAddress;  // Total Tokens that the address is owed for compensation.
	mapping (address => uint) public CompensationClaimedbyAddress; // Tokens that have been claimed in compensation so far for an address.
	mapping (address => uint) public CompensationsClaimed;         // The number of rounds of compensation this address has claimed.
	IERC20 public CompToken = IERC20(address(0));       // The address of the token that will be the compensation.

	constructor (address TokenToBeCompensated, uint _TotalTokenCompensation) public {
		CompToken = IERC20(TokenToBeCompensated);
		TotalTokenCompensation = _TotalTokenCompensation;
	}

	// Defines the address for the deployed Compensation Contract. Must be done first before adding funds.
	function DefineCompensationContractAddress (address _address) public onlyOwner {
		CompensationAddress = _address;
	}

	// Adds an address for compensation, as well as the total amount of compensation they are eliglble for.
	function AddAddressforCompensation (address _address, uint CompensationAmount) public onlyOwner {
		EligibleforCompensation[_address] = true;
		TotalCompensationforAddress[_address] = CompensationAmount;
		CompensationsClaimed[_address] = 0;
	}

	/* Checks an address, returning:
		- Are they on the list of eligible addresses for compensation?
		- Is their compensation funds they can currently claim? (DEACTIVATED)
		- The total amount of tokens they will be eligble for compensation.
		- The amount of tokens they have claimed in compensation so far.
	*/
	function checkAddress (address _address) public view returns (bool, uint, uint) {
		return (EligibleforCompensation[_address], TotalCompensationforAddress[_address], CompensationClaimedbyAddress[_address]);
	}

	// Claims any pending compensations for the address calling the function.
	function claimCompensation () public {
		require (CompensationRounds != 0, "Compensation funds have not been added yet.");
		require (EligibleforCompensation[msg.sender] = true, "Address is eligible for compensation.");
		require (CompensationClaimedbyAddress[msg.sender] <= TotalCompensationforAddress[msg.sender], "Address has claimed its total compensation.");
		uint CompensationRoundsEligible = CompensationRounds.sub(CompensationsClaimed[msg.sender]);
		require (CompensationRoundsEligible != 0, "You have already claimed for compensations up to this round - wait for further rounds.");
		uint DividingFactor = TotalTokenCompensation.div(CurrentRoundTokenCompensation);
		uint _TotalCompensationforAddress;
		TotalCompensationforAddress[msg.sender] = _TotalCompensationforAddress;
		uint ClaimableCompensation = _TotalCompensationforAddress.div(DividingFactor).mul(CompensationRoundsEligible);
		CompToken.transfer(msg.sender, ClaimableCompensation);
		CompensationsClaimed[msg.sender] = CompensationRounds;
		CompensationClaimedbyAddress[msg.sender] = CompensationClaimedbyAddress[msg.sender] + ClaimableCompensation;
	}

	// Adds a round of compensation funds. IMPORTANT: Each round the same amount MUST be added.
	function addCompensationfund (uint AmountAdding) public payable onlyOwner {
		require (TotalTokenCompensation >= AmountAdding.add(CompTokensAdded), "Amount Added would exceed Total Token Compensation");
		CurrentRoundTokenCompensation = AmountAdding;
		CompTokensAdded = CompTokensAdded + AmountAdding;
		CompToken.transfer(CompensationAddress, AmountAdding);
		CompensationRounds++;
	}
}
