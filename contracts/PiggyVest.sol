// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26; 

contract piggybank {

    event DepositedSuccessfully(uint256 indexed amount);
    event WithdrawalSuccessful(uint256 amt, uint256 time);

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
        require(msg.sender != address(0), "No zero Address");
        require(msg.value > 0);
        
        deposited[msg.sender] = true;

        emit DepositedSuccessfully(msg.value);

    }

    function withdraw() public {
         require(msg.sender != address(0), "No zero Address");
         require(address(this).balance > 0);
         require(withdrawn[msg.sender] == true, "you have withdrawn your money");
         require(block.timestamp < deadline, "you can not withdraw at this time");

         if(block.timestamp == deadline){
            (bool success, ) = payable(owner).call{value: address(this).balance}("");
            require(success, "Withdrawal successful");
            withdrawn[msg.sender] = true;
        
         }
        uint contractBalance = address(this).balance;
        emit WithdrawalSuccessful(contractBalance, block.timestamp);

    }

}