// SPDX-License-Identifier: <SPDX-License>
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Compensation is Ownable {
	using SafeMath for uint;
	using SafeERC20 for IERC20;

	uint256 public totalAvailableTokens;
	mapping(address => uint256) public tokenClaimLimit;
	mapping(address => uint256) public tokensClaimed;
	IERC20 public CompToken;

	event Refill(address _owner, uint256 _amount, uint256 _totalAvailable);
	event Claim(address _receiver, uint256 _amount);

	constructor(address _token)
		public
	{
		CompToken = IERC20(_token);
	}

	/**
	* @dev adds an address for compensation
	* @param _address address is the address to be compensated
	* @param _totalCompensationAmount uint256 is the total amount of tokens claimable by this address
	*/
	function addAddressforCompensation(
		address _address,
		uint256 _totalCompensationAmount
	)
		public
		onlyOwner
	{
		tokenClaimLimit[_address] = _totalCompensationAmount;
	}

	/**
	* @dev enables claims of available tokens as compensation
	*/
	function claimCompensation()
		public
	{
		uint256 claimAmount = tokenClaimLimit[msg.sender].sub(tokensClaimed[msg.sender]);
		require(claimAmount > 0, "No claim available.");

		// Can't claim more tokens than are available on the contract
		if(claimAmount > totalAvailableTokens) {
			claimAmount = totalAvailableTokens;
		}

		// Update user's claimed balance and the total available balance, then transfer tokens
		tokensClaimed[msg.sender] = tokensClaimed[msg.sender].add(claimAmount);
		totalAvailableTokens = totalAvailableTokens.sub(claimAmount);
		CompToken.transfer(msg.sender, claimAmount);
		emit Claim(msg.sender, claimAmount);
	}

	/**
	* @dev refills the contract with additional compensation tokens
	* @param _amount uint256 is the amount of additional tokens to add to the compensation pool
	*/
	function refill(uint256 _amount)
		public
		payable
		onlyOwner
	{
		require(
			CompToken.transferFrom(msg.sender, address(this), _amount),
			"Transfer failed. Have the tokens been approved to the contract?"
		);
		totalAvailableTokens = totalAvailableTokens.add(_amount);
		emit Refill(msg.sender, _amount, totalAvailableTokens);
	}
}
