// SPDX-License-Identifier: <SPDX-License>
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {

    mapping(address => uint256) balances;

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply
    )
        ERC20(_name, _symbol)
        public
    {
        balances[msg.sender] += _totalSupply;
    }
}
