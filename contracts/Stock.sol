// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Stock is ERC20 {

    address issuer;

    constructor(
        string memory name,
        string memory symbol,
        address wallet,
        uint256 amount,
        address _issuer
    ) ERC20(name, symbol) {
        issuer = _issuer;
        _mint(wallet, amount);
    }

    modifier isIssuer() { require(msg.sender == issuer, "Stock: !issuer"); _; }

    function mint(address wallet, uint256 amount) external isIssuer {
        _mint(wallet, amount);
    }

    function burn(address wallet, uint256 amount) external isIssuer {
        _burn(wallet, amount);
    }

}
