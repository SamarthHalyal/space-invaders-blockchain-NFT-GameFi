// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.16;

contract Spaceauction {
    mapping( address => uint ) bidders;
    uint highestBid;
    address highestBidder;

    // To create new bid-- function
    function bid() public payable {
        require(msg.value > 0, "Bid amount cannot be zero!");
        require(msg.value > highestBid, "Bid amount is less than Base Bid Price!");
        bidders[msg.sender] = msg.value;
        highestBid = msg.value;
        highestBidder = msg.sender;
    }

    // get balance-- test function
    function balance(address _address) public view returns(uint) {
        return bidders[_address];
    }

    // To get highest bid-- function
    function getHighestBid() public view returns(uint) {
        return highestBid;
    }

    // To get highest bidder address-- function
    function getHighestBidder() public view returns(address) {
        return highestBidder;
    }
}