// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error Marketplace__NotValidPrice(uint256 price);
error Marketplace__NotApproved(uint256 tokenId, address marketplace_contract);
error Marketplace__NotOwner(address nftAddress, uint256 tokenId, address user);
error Marketplace__AlreadyListed(address nftAddress, uint256 tokenId);
error Marketplace__NotListed(address nftAddress, uint256 tokenId);
error Marketplace__TokenDoesNotExist(address nftAddress, uint256 tokenId);
error Marketplace__NotEnoughMoneyToWithdraw();

contract Marketplace is ReentrancyGuard {
  struct Listing {
    uint256 price;
    address seller;
  }

  event ItemListed(
    address nftAddress,
    uint256 tokenId,
    uint256 price,
    address seller
  );
  event ItemBought(
    address nftAddress,
    uint256 tokenId,
    address seller,
    address buyer,
    uint256 pricePaid
  );
  event ListingCancelled(address nftAddress, uint256 tokenId, address owner);
  event UpdatedListing(address nftAddress, uint256 tokenId, uint256 price);

  mapping(address => mapping(uint256 => Listing)) private listings;
  mapping(address => uint256) private proceeds;

  /* ========================= MODIFIERS ========================= */
  modifier isOwner(
    address nftAddress,
    uint256 tokenId,
    address user
  ) {
    IERC721 nft = IERC721(nftAddress);
    if (nft.ownerOf(tokenId) != user)
      revert Marketplace__NotOwner(nftAddress, tokenId, user);
    _;
  }

  modifier isListed(address nftAddress, uint256 tokenId) {
    if (listings[nftAddress][tokenId].price <= 0)
      revert Marketplace__NotListed(nftAddress, tokenId);
    _;
  }

  modifier notListed(address nftAddress, uint256 tokenId) {
    if (listings[nftAddress][tokenId].price > 0)
      revert Marketplace__AlreadyListed(nftAddress, tokenId);
    _;
  }

  /* ============================================================ */

  /* =========================== MAIN =========================== */
  function listItem(
    address nftAddress,
    uint256 tokenId,
    uint256 price
  )
    external
    isOwner(nftAddress, tokenId, msg.sender)
    notListed(nftAddress, tokenId)
  {
    if (price <= 0) revert Marketplace__NotValidPrice(price);

    IERC721 nft = IERC721(nftAddress);
    if (nft.getApproved(tokenId) != address(this))
      revert Marketplace__NotApproved(tokenId, address(this));

    listings[nftAddress][tokenId] = Listing(price, msg.sender);
    emit ItemListed(nftAddress, tokenId, price, msg.sender);
  }

  function buyItem(
    address nftAddress,
    uint256 tokenId
  ) external payable isListed(nftAddress, tokenId) nonReentrant {
    Listing memory listedItem = listings[nftAddress][tokenId];

    if (msg.value < listedItem.price)
      revert Marketplace__NotValidPrice(listedItem.price);

    proceeds[listedItem.seller] += msg.value;

    delete (listings[nftAddress][tokenId]);

    IERC721(nftAddress).safeTransferFrom(
      listedItem.seller,
      msg.sender,
      tokenId
    );

    emit ItemBought(
      nftAddress,
      tokenId,
      listedItem.seller,
      msg.sender,
      msg.value
    );
  }

  function cancelListing(
    address nftAddress,
    uint256 tokenId
  )
    external
    isOwner(nftAddress, tokenId, msg.sender)
    isListed(nftAddress, tokenId)
  {
    delete (listings[nftAddress][tokenId]);
    emit ListingCancelled(nftAddress, tokenId, msg.sender);
  }

  function updateListing(
    address nftAddress,
    uint256 tokenId,
    uint256 newPrice
  )
    external
    isOwner(nftAddress, tokenId, msg.sender)
    isListed(nftAddress, tokenId)
  {
    if (newPrice <= 0) revert Marketplace__NotValidPrice(newPrice);

    listings[nftAddress][tokenId].price = newPrice;
    emit UpdatedListing(nftAddress, tokenId, newPrice);
  }

  function withdrawProceeds() external nonReentrant {
    uint256 proceed = proceeds[msg.sender];
    if (proceed <= 0) revert Marketplace__NotEnoughMoneyToWithdraw();

    proceeds[msg.sender] = 0;

    (bool success, ) = payable(msg.sender).call{value: proceed}("");
    require(success, "Transfer failed");
  }

  /* ============================================================ */

  function getListing(
    address nftAddress,
    uint256 tokenId
  ) external view returns (Listing memory) {
    return listings[nftAddress][tokenId];
  }

  function getProceeds(address seller) external view returns (uint256) {
    return proceeds[seller];
  }
}
