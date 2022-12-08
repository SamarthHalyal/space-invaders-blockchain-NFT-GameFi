// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

error Marketplace__TokenDoesNotExist(uint256 tokenId);
error Marketplace__NotOwner(uint256 tokenId, address user);

error Marketplace__AlreadyListed(uint256 tokenId);
error Marketplace__NotListed(uint256 tokenId);
error Marketplace__NotValidPrice(uint256 price);

error Marketplace__AlreadyOnAuction(uint256 tokenId);
error Marketplace__NotOnAuction(uint256 tokenId);
error Marketplace__NotValidBid(uint256 lastBid, uint256 bid);
error Marketplace__NotValidEndTime(uint256 currTime, uint256 endTime);

error Marketplace__NotEnoughMoneyToWithdraw();

contract Marketplace is ERC721URIStorage, AutomationCompatibleInterface  {
  constructor() ERC721("SpaceShip", "SS"){}

  struct Item{
    string status;// created, listed, on auction, bought
    uint256 tokenId;
    address owner;
    // Listing Item
    uint256 listingPrice;
    // Auction Item
    uint256 basePrice;
    uint256 endTime;
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
    if(items.length == 0 || keccak256(bytes(items[tokenId].status)) != keccak256(bytes("On Auction")))
      revert Marketplace__NotOnAuction(tokenId);
    _;
  }

  modifier notOnAuction(uint256 tokenId){
    if(items.length > 0 && keccak256(bytes(items[tokenId].status)) == keccak256(bytes("On Auction")))
      revert Marketplace__AlreadyOnAuction(tokenId);
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
    notOnAuction(tokenId)
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
    uint256 endTime
  ) public
    exist(tokenId)
    isOwner(tokenId,msg.sender) 
    notListed(tokenId)
    notOnAuction(tokenId)
  {
    if(basePrice <= 0) revert Marketplace__NotValidPrice(basePrice);
    if(endTime <= block.timestamp) revert Marketplace__NotValidEndTime(block.timestamp, endTime);

    items[tokenId].status = "On Auction";
    items[tokenId].basePrice = basePrice;
    items[tokenId].endTime = endTime;

    _transfer(msg.sender, address(this), tokenId);
  }

  function bid(uint256 tokenId) public payable onAuction(tokenId){
    if(bidders[tokenId].length > 0){
      Bidder memory lastBidder = bidders[tokenId][bidders[tokenId].length - 1];
      if(lastBidder.bid >= msg.value){
        revert Marketplace__NotValidBid(lastBidder.bid, msg.value);
      }
    }

    bidders[tokenId].push(Bidder(msg.sender, msg.value));
  }

  function checkUpkeep(bytes calldata /*checkData*/) 
    external view override 
    returns(bool upkeepNeeded, bytes memory performData)
  {
    uint256 totalClosedAuctionItems = 0;
    for(uint256 tokenId=0; tokenId<_tokenId; tokenId++){
      if(
        keccak256(bytes(items[tokenId].status)) == keccak256(bytes("On Auction")) &&
        items[tokenId].endTime <= block.timestamp
      ){
        upkeepNeeded = true;
        totalClosedAuctionItems += 1;
      }
    }

    uint256 counter = 0;
    uint256[] memory closedAuctionItemIds = new uint256[](totalClosedAuctionItems);
    for(uint256 tokenId=0; tokenId<_tokenId; tokenId++){
      if(
        keccak256(bytes(items[tokenId].status)) == keccak256(bytes("On Auction")) &&
        items[tokenId].endTime <= block.timestamp
      ){
        closedAuctionItemIds[counter++] = tokenId;
      }
    }
    
    return (upkeepNeeded, abi.encode(closedAuctionItemIds));
  }

  function performUpkeep(bytes calldata performData) external override {
    uint256[] memory closedAuctionItemIds = abi.decode(performData, (uint256[]));

    for(uint256 index=0;index<closedAuctionItemIds.length;index++){
      _closeAuction(closedAuctionItemIds[index]);
    }
  }

  function _closeAuction(uint256 tokenId) internal {
    uint256 totalBidders = bidders[tokenId].length;
    if(totalBidders == 0){
      _transfer(address(this), items[tokenId].owner, tokenId);
      items[tokenId].status = "Created";
      return;
    }
  
    for(uint256 index=0;index<totalBidders-1;index++){
      Bidder memory bidder = bidders[tokenId][index];
      proceeds[bidder.bidderAddress] += bidder.bid;
    }

    Bidder memory winner = bidders[tokenId][totalBidders-1];

    proceeds[items[tokenId].owner] += winner.bid;

    itemsCount[items[tokenId].owner] -= 1;
    itemsCount[winner.bidderAddress] += 1;

    _transfer(address(this), winner.bidderAddress, tokenId);
    
    items[tokenId].status = "Bought";
    items[tokenId].owner = winner.bidderAddress;
  }
  /* ======================================================================= */
  function withdrawProceeds() external {
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

  function getBidders(uint256 tokenId) public view returns (Bidder[] memory){
    return bidders[tokenId];
  }

  function getProceeds(address seller) external view returns (uint256) {
    return proceeds[seller];
  }
}
