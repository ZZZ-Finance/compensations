// SPDX-License-Identifier: <SPDX-License>
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Compensation is Ownable {
	using SafeMath for uint;
	using SafeERC20 for IERC20;

	uint public totalTokenCompensation;            // The total Tokens for compensation.
	uint public compTokensAdded = 0;               // The amount of tokens added so far for compensation.
	uint public currentRoundTokenCompensation;     // The amount of tokens added in this round of compensation.
	uint public compensationRounds = 0;            // The number of times compensation funds have been added. Each add = 1 round.
	address compensationAddress;
	mapping (address => bool) public eligibleforCompensation;      // Checks if the address is eligble for compesnation.
	//mapping (address => bool) CanClaimCompensation;         // Checks if the address has pending compensation ready to be claimed; (DEACTIVATED)
	mapping (address => uint) public totalCompensationforAddress;  // Total Tokens that the address is owed for compensation.
	mapping (address => uint) public compensationClaimedbyAddress; // Tokens that have been claimed in compensation so far for an address.
	mapping (address => uint) public compensationsClaimed;         // The number of rounds of compensation this address has claimed.
	IERC20 public CompToken = IERC20(address(0));       // The address of the token that will be the compensation.

	constructor(
		address _tokenToBeCompensated,
		uint _totalTokenCompensation
	)
		public
	{
		CompToken = IERC20(_tokenToBeCompensated);
		totalTokenCompensation = _totalTokenCompensation;
	}

	// Defines the address for the deployed Compensation Contract. Must be done first before adding funds.
	function DefineCompensationContractAddress(address _address)
		public
		onlyOwner
	{
		compensationAddress = _address;
	}

	// Adds an address for compensation, as well as the total amount of compensation they are eliglble for.
	function AddAddressforCompensation(
		address _address,
		uint _compensationAmount
	)
		public
		onlyOwner
	{
		eligibleforCompensation[_address] = true;
		totalCompensationforAddress[_address] = _compensationAmount;
		compensationsClaimed[_address] = 0;
	}

	/* Checks an address, returning:
		- Are they on the list of eligible addresses for compensation?
		- Is their compensation funds they can currently claim? (DEACTIVATED)
		- The total amount of tokens they will be eligble for compensation.
		- The amount of tokens they have claimed in compensation so far.
	*/
	function checkAddress(address _address)
		public
		view
		returns (bool, uint, uint)
	{
		return (
			eligibleforCompensation[_address],
			totalCompensationforAddress[_address],
			compensationClaimedbyAddress[_address]
		);
	}

	// Claims any pending compensations for the address calling the function.
	function claimCompensation ()
		public
	{
		require(compensationRounds != 0, "Compensation funds have not been added yet.");
		require(eligibleforCompensation[msg.sender] = true, "Address is eligible for compensation.");
		require(
			compensationClaimedbyAddress[msg.sender] <= totalCompensationforAddress[msg.sender],
			"Address has claimed its total compensation."
		);

		uint compensationRoundsEligible = compensationRounds.sub(compensationsClaimed[msg.sender]);
		require(
			compensationRoundsEligible != 0,
			"You have already claimed for compensations up to this round - wait for further rounds."
		);

		uint dividingFactor = totalTokenCompensation.div(currentRoundTokenCompensation);
		uint _totalCompensationforAddress;
		totalCompensationforAddress[msg.sender] = _totalCompensationforAddress;
		uint claimableCompensation = _totalCompensationforAddress.div(dividingFactor).mul(compensationRoundsEligible);
		CompToken.transfer(msg.sender, claimableCompensation);

		compensationsClaimed[msg.sender] = compensationRounds;
		compensationClaimedbyAddress[msg.sender] = compensationClaimedbyAddress[msg.sender] + claimableCompensation;
	}

	// Adds a round of compensation funds. IMPORTANT: Each round the same amount MUST be added.
	function addCompensationfund(uint _amountAdding)
		public
		payable
		onlyOwner
	{
		require(
			totalTokenCompensation >= _amountAdding.add(compTokensAdded),
			"Amount Added would exceed Total Token Compensation"
		);
		currentRoundTokenCompensation = _amountAdding;
		compTokensAdded = compTokensAdded + _amountAdding;
		CompToken.transfer(compensationAddress, _amountAdding);
		compensationRounds++;
	}
}
