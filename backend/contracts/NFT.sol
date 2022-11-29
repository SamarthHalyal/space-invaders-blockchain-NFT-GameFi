// SPDX-License-Identifier: MIT
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

pragma solidity ^0.8.7;

error NFT__WithdrawFailed();

// https://blog.etereo.io/uploading-nft-images-to-ipfs-ca01a1726932
contract NFT is ERC721URIStorage, Ownable {
  uint256 private currentTokenId;

  event NFTMinted(uint256 tokenId, address minter);
  event Withdrawn(uint256 amount);

  constructor() ERC721("SpaceShip", "SS") {}

  function mintNFT(string calldata tokenURI) public returns (uint256) {
    uint256 tokenId = currentTokenId;
    _safeMint(msg.sender, tokenId);
    _setTokenURI(tokenId, tokenURI);

    emit NFTMinted(tokenId, msg.sender);
    currentTokenId = currentTokenId + 1;
    return tokenId;
  }

  function withdraw() public payable onlyOwner {
    uint256 amount = address(this).balance;
    (bool success, ) = payable(msg.sender).call{value: amount}("");
    require(success, "Withdraw failed!");

    emit Withdrawn(amount);
  }

  function getCurrentTokenId() public view returns (uint256) {
    return currentTokenId;
  }
}
