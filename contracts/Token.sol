// SPDX-License-Identifier: <SPDX-License>
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {

    constructor(string memory _name, string memory _symbol, uint256 _initialSupply)
        public
        ERC20(_name, _symbol)
    {
        _mint(msg.sender, _initialSupply);
    }
}
