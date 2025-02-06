// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26; 

contract piggybank {

    event DepositedSuccessfully(uint256 indexed amount);
    event WithdrawalSuccessful(uint256 amt);

    address public owner;
    uint256 deadline = block.timestamp + 8 days;
    mapping(address => bool) public deposited;
    mapping(address => bool) public withdrawn;

    constructor(address _owner)  {
        owner = _owner;
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "Only owner allowed");
        _;
    }

    function deposit() payable public onlyOwner {
        uint amount = 0.0001 ether;
        require(msg.sender != address(0), "No zero Address");
        require(amount > 0);

       (bool success, ) = payable(address(this)).call{value: amount}("");
        require(success, "Deposited successful");

        deposited[msg.sender] = true;

        emit DepositedSuccessfully(amount);

    }

    function withdraw() public {
         require(msg.sender != address(0), "No zero Address");
         require(address(this).balance > 0);
         require(withdrawn[msg.sender] == true, "you have withdrawn your money");
         if(block.timestamp == deadline){
            (bool success, ) = payable(owner).call{value: address(this).balance}("");
            require(success, "Withdrawal successful");
            withdrawn[msg.sender] = true;
         }

         emit WithdrawalSuccessful(address(this).balance);

    }

}