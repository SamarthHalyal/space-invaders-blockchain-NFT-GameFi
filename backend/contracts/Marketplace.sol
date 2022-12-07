// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

error Marketplace__NotValidPrice(uint256 price);
error Marketplace__NotOwner(uint256 tokenId, address user);
error Marketplace__AlreadyListed(uint256 tokenId);
error Marketplace__NotListed(uint256 tokenId);
error Marketplace__TokenDoesNotExist(uint256 tokenId);
error Marketplace__NotEnoughMoneyToWithdraw();
error Marketplace__NotValidDuration(uint256 duration);
error Marketplace__NotOnAuction(uint256 tokenId);
error Marketplace__NotValidBid(uint256 bid);

contract Marketplace is Ownable, ERC721URIStorage, ReentrancyGuard {
  constructor() ERC721("SpaceShip", "SS"){}

  struct Item{
    string status;// created, listed, on auction, bought
    uint256 tokenId;
    address owner;
    // Listing Item
    uint256 listingPrice;
    // Auction Item
    uint256 basePrice;
    uint256 duration;
  }

  struct Bidder{
    address bidderAddress;
    uint256 bid;
  }
  
  uint256 private _tokenId;

  Item[] private items;
  mapping(address => uint256) itemsCount;
  mapping(uint256 => Bidder[]) bidders;

  mapping(address => uint256) private proceeds;
  /* ========================= MODIFIERS ========================= */
  modifier exist(uint256 tokenId){
    if(items.length == 0 || tokenId >= items.length){
      revert Marketplace__TokenDoesNotExist(tokenId);
    }
    _;
  }

  modifier isOwner(
    uint256 tokenId,
    address user
  ) {
    if (items[tokenId].owner != user)
      revert Marketplace__NotOwner(tokenId, user);
    _;
  }

  modifier isListed(uint256 tokenId) {
    if (items.length == 0 || keccak256(bytes(items[tokenId].status)) != keccak256(bytes("Listed")))
      revert Marketplace__NotListed(tokenId);
    _;
  }

  modifier notListed(uint256 tokenId) {
    if (items.length > 0 && keccak256(bytes(items[tokenId].status)) == keccak256(bytes("Listed")))
      revert Marketplace__AlreadyListed(tokenId);
    _;
  }

  modifier onAuction(uint256 tokenId){
    if(items.length > 0 && keccak256(bytes(items[tokenId].status)) == keccak256(bytes("On Auction")))
      revert Marketplace__NotOnAuction(tokenId);
    _;
  }
  /* ============================================================ */

  /* ============================= NFT ========================== */
  function mintNFT(string calldata tokenURI) public {
    _safeMint(msg.sender, _tokenId);
    _setTokenURI(_tokenId, tokenURI);

    items.push(Item(
      "Created", 
      _tokenId,
      msg.sender,
      0,
      0,
      0
    ));
    itemsCount[msg.sender] += 1;

    _tokenId = _tokenId + 1;
  }

  function getCurrentTokenId() public view returns (uint256){
    return _tokenId;
  }

  /* =========================== LISTING =========================== */
  function listItem(
    uint256 tokenId,
    uint256 price
  )
    external
    exist(tokenId)
    isOwner(tokenId, msg.sender)
    notListed(tokenId)
  {
    if (price <= 0) revert Marketplace__NotValidPrice(price);

    items[tokenId].status = "Listed";
    items[tokenId].listingPrice = price;

    _transfer(msg.sender, address(this), tokenId);
  }

  function buyItem(
    uint256 tokenId
  ) external payable 
    exist(tokenId)
    isListed(tokenId) 
    nonReentrant
  {
    if (msg.value < items[tokenId].listingPrice)
      revert Marketplace__NotValidPrice(items[tokenId].listingPrice);

    proceeds[items[tokenId].owner] += msg.value;

    _transfer(address(this), msg.sender, tokenId);

    itemsCount[items[tokenId].owner] -= 1;
    itemsCount[msg.sender] += 1;

    items[tokenId].status = "Bought";
    items[tokenId].owner = msg.sender;
  }

  function cancelListing(
    uint256 tokenId
  )
    external
    exist(tokenId)
    isOwner(tokenId, msg.sender)
    isListed(tokenId)
  {
    items[tokenId].status = "Created";
    _transfer(address(this), msg.sender, tokenId);
  }

  function updateListing(
    uint256 tokenId,
    uint256 newPrice
  )
    external
    exist(tokenId)
    isOwner(tokenId, msg.sender)
    isListed(tokenId)
  {
    if (newPrice <= 0) revert Marketplace__NotValidPrice(newPrice);
    items[tokenId].listingPrice = newPrice;
  }

  /* ========================== AUCTION ============================= */ 
  function startAuction(
    uint256 tokenId, 
    uint256 basePrice, 
    uint256 duration
  ) public
    isOwner(tokenId,msg.sender) 
    notListed(tokenId)
  {
    if(basePrice <= 0) revert Marketplace__NotValidPrice(basePrice);
    if(duration <= 0) revert Marketplace__NotValidDuration(duration);

    items[tokenId].status = "On Auction";
    items[tokenId].basePrice = basePrice;
    items[tokenId].duration = duration;

    _transfer(msg.sender, address(this), tokenId);
  }

  function bid(uint256 tokenId) public payable onAuction(tokenId){
    Bidder memory lastBidder = bidders[tokenId][bidders[tokenId].length - 1];
    if(lastBidder.bid <= msg.value){
      revert Marketplace__NotValidBid(msg.value);
    }

    bidders[tokenId].push(Bidder(msg.sender, msg.value));
  }

  function withdrawProceeds() external nonReentrant {
    uint256 proceed = proceeds[msg.sender];
    if (proceed <= 0) revert Marketplace__NotEnoughMoneyToWithdraw();

    proceeds[msg.sender] = 0;

    (bool success, ) = payable(msg.sender).call{value: proceed}("");
    require(success, "Transfer failed");
  }

  /* ============================================================ */

  function getUserItems() public view returns (Item[] memory){
    Item[] memory userItems = new Item[](itemsCount[msg.sender]);

    uint256 counter = 0;
    for(uint i=0; i<items.length; i++){
      if(items[i].owner == msg.sender){
        userItems[counter] = items[i];
        counter+=1;
      }
    }
    return userItems;
  }

  function getItems() public view returns (Item[] memory){
    return items;
  }

  function getItem(uint256 tokenId) public view returns (Item memory){
    return items[tokenId];
  }

  function getProceeds(address seller) external view returns (uint256) {
    return proceeds[seller];
  }
}
