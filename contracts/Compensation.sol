// SPDX-License-Identifier: <SPDX-License>
pragma solidity ^0.6.0;

interface IERC20 {
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
    event Transfer(address indexed from, address indexed to, uint256 value);

    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint8);

    function totalSupply() external view returns (uint256);

    function balanceOf(address owner) external view returns (uint256);

    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function approve(address spender, uint256 value) external returns (bool);

    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);
}

library SafeMath {
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");
        return c;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath: subtraction overflow");
    }

    function sub(
        uint256 a,
        uint256 b,
        string memory errorMessage
    ) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;
        return c;
    }

    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }

        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
        return c;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath: division by zero");
    }

    function div(
        uint256 a,
        uint256 b,
        string memory errorMessage
    ) internal pure returns (uint256) {
        require(b > 0, errorMessage);
        uint256 c = a / b;
        return c;
    }

    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        return mod(a, b, "SafeMath: modulo by zero");
    }

    function mod(
        uint256 a,
        uint256 b,
        string memory errorMessage
    ) internal pure returns (uint256) {
        require(b != 0, errorMessage);
        return a % b;
    }
}

library Address {
    function isContract(address account) internal view returns (bool) {
        bytes32 codehash;


            bytes32 accountHash
         = 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            codehash := extcodehash(account)
        }
        return (codehash != 0x0 && codehash != accountHash);
    }

    function toPayable(address account)
        internal
        pure
        returns (address payable)
    {
        return address(uint160(account));
    }

    function sendValue(address payable recipient, uint256 amount) internal {
        require(
            address(this).balance >= amount,
            "Address: insufficient balance"
        );
        // solhint-disable-next-line avoid-call-value
        (bool success, ) = recipient.call{value: amount}("");
        require(
            success,
            "Address: unable to send value, recipient may have reverted"
        );
    }
}

library SafeERC20 {
    using SafeMath for uint256;
    using Address for address;

    function safeTransfer(
        IERC20 token,
        address to,
        uint256 value
    ) internal {
        callOptionalReturn(
            token,
            abi.encodeWithSelector(token.transfer.selector, to, value)
        );
    }

    function safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 value
    ) internal {
        callOptionalReturn(
            token,
            abi.encodeWithSelector(token.transferFrom.selector, from, to, value)
        );
    }

    function safeApprove(
        IERC20 token,
        address spender,
        uint256 value
    ) internal {
        // safeApprove should only be called when setting an initial allowance,
        // or when resetting it to zero. To increase and decrease it, use
        // 'safeIncreaseAllowance' and 'safeDecreaseAllowance'
        // solhint-disable-next-line max-line-length
        require(
            (value == 0) || (token.allowance(address(this), spender) == 0),
            "SafeERC20: approve from non-zero to non-zero allowance"
        );
        callOptionalReturn(
            token,
            abi.encodeWithSelector(token.approve.selector, spender, value)
        );
    }

    function safeIncreaseAllowance(
        IERC20 token,
        address spender,
        uint256 value
    ) internal {
        uint256 newAllowance = token.allowance(address(this), spender).add(
            value
        );
        callOptionalReturn(
            token,
            abi.encodeWithSelector(
                token.approve.selector,
                spender,
                newAllowance
            )
        );
    }

    function safeDecreaseAllowance(
        IERC20 token,
        address spender,
        uint256 value
    ) internal {
        uint256 newAllowance = token.allowance(address(this), spender).sub(
            value,
            "SafeERC20: decreased allowance below zero"
        );
        callOptionalReturn(
            token,
            abi.encodeWithSelector(
                token.approve.selector,
                spender,
                newAllowance
            )
        );
    }

    function callOptionalReturn(IERC20 token, bytes memory data) private {
        // We need to perform a low level call here, to bypass Solidity's return data size checking mechanism, since
        // we're implementing it ourselves.

        // A Solidity high level call has three parts:
        //  1. The target address is checked to verify it contains contract code
        //  2. The call itself is made, and success asserted
        //  3. The return value is decoded, which in turn checks the size of the returned data.
        // solhint-disable-next-line max-line-length
        require(address(token).isContract(), "SafeERC20: call to non-contract");

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = address(token).call(data);
        require(success, "SafeERC20: low-level call failed");

        if (returndata.length > 0) {
            // Return data is optional
            // solhint-disable-next-line max-line-length
            require(
                abi.decode(returndata, (bool)),
                "SafeERC20: ERC20 operation did not succeed"
            );
        }
    }
}

abstract contract Context {
    function _msgSender() internal virtual view returns (address payable) {
        return msg.sender;
    }

    function _msgData() internal virtual view returns (bytes memory) {
        this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return msg.data;
    }
}

contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    constructor() internal {
        address msgSender = _msgSender();
        _owner = msgSender;
        emit OwnershipTransferred(address(0), msgSender);
    }

    function owner() public view returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        require(_owner == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    function renounceOwnership() public virtual onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(
            newOwner != address(0),
            "Ownable: new owner is the zero address"
        );
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

contract Compensation is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint256 public compensationPerRound;
    uint256 public currentRound;
    uint256 public totalRounds;
    uint256 public totalTokensCompensation;
    uint256 public totalAvailableTokens;
    mapping(address => uint256) public tokenClaimLimit;
    mapping(address => uint256) public tokensClaimed;
    IERC20 public CompToken;

    event Refill(
        address _owner,
        uint256 compensationPerRound,
        uint256 _totalAvailable
    );
    event Claim(address _receiver, uint256 _amount);
    event NextRound(uint256 currentRound);

    constructor(
        address _token,
        uint256 _totalTokensCompensation,
        uint256 _totalRounds
    ) public {
        CompToken = IERC20(_token);
        totalRounds = _totalRounds;
        totalTokensCompensation = _totalTokensCompensation;
        compensationPerRound = _totalTokensCompensation.div(_totalRounds);
    }

    /**
     * @dev adds an address for compensation
     * @param _address address is the address to be compensated
     * @param _totalCompensationAmount uint256 is the total amount of tokens claimable by this address
     */
    function addAddressforCompensation(
        address _address,
        uint256 _totalCompensationAmount
    ) public onlyOwner {
        require(tokenClaimLimit[_address] == 0, "Address has already been added for compensation.");
        tokenClaimLimit[_address] = _totalCompensationAmount;
    }

    /**
     * @dev adds multiple addresses for compensation
     * @param _addresses array of address is the addresses to be compensated
     * @param _totalCompensationAmounts array of uint256 is the total amounts of tokens claimable by these addresses
     */
    function addMultipleAddressesforCompensation(
        address[] memory _addresses,
        uint256[] memory _totalCompensationAmounts
    ) public onlyOwner {
        require(_addresses.length == _totalCompensationAmounts.length, "Length of 2 arrays must be the same.");
        uint8 i = 0;
        for (i; i < _addresses.length; i++) {
            require(tokenClaimLimit[_addresses[i]] == 0, "Address has already been added for compensation.");
            tokenClaimLimit[_addresses[i]] = _totalCompensationAmounts[i];
        }
    } 

    /**
     * @dev enables claims of available tokens as compensation
     */
    function claimCompensation() public {
        uint256 claimAmount = tokenClaimLimit[msg.sender]
            .div(totalRounds)
            .mul(currentRound)
            .sub(tokensClaimed[msg.sender]);
        require(claimAmount > 0, "No claim available.");

        // Can't claim more tokens than are available on the contract
        if (claimAmount > totalAvailableTokens) {
            claimAmount = totalAvailableTokens;
        }

        // Update user's claimed balance and the total available balance, then transfer tokens
        tokensClaimed[msg.sender] = tokensClaimed[msg.sender].add(claimAmount);
        totalAvailableTokens = totalAvailableTokens.sub(claimAmount);
        CompToken.transfer(msg.sender, claimAmount);
        emit Claim(msg.sender, claimAmount);
    }

    /**
     * @dev unlocks another round of compensation tokens to be claimed
     */
    function refill() public payable onlyOwner {
        require(
            CompToken.transferFrom(
                msg.sender,
                address(this),
                compensationPerRound
            ),
            "Transfer failed. Have the tokens been approved to the contract?"
        );
        totalAvailableTokens = totalAvailableTokens.add(compensationPerRound);
        emit Refill(msg.sender, compensationPerRound, totalAvailableTokens);
    }

    /**
     * @dev unlocks another round of tokens for compensation
     */
    function startnextround() public onlyOwner {
        require(
            currentRound != totalRounds,
            "Compensation completed, all rounds have been completed."
        );
        currentRound++;
        refill();
        emit NextRound(currentRound);
    }
}
