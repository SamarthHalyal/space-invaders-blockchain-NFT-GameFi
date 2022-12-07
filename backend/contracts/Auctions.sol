// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.7;

import "./Marketplace.sol";

contract Auctions {
    struct Auction{
        address owner;
        address nftAddress;
        uint256 tokenId;
        uint256 basePrice;
        uint256 duration;
    }
    Auction[] public auctions;

    mapping( address => uint ) bidders;
    uint highestBid;
    address highestBidder;

    event AuctionStarted(
        address owner, 
        address nftAddress,
        uint256 tokenId,
        uint256 basePrice,
        uint256 duration
    );

    
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