const { assert, expect } = require("chai");
const { parseEther } = require("ethers/lib/utils");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

developmentChains.includes(network.name)
  ? describe("Tests for 'Nft.sol',", () => {
      const DEFAULT_TOKEN_URI = "TokenURI";

      let txResponse;
      let NFT, accounts, deployer;
      beforeEach(async () => {
        accounts = await ethers.getSigners();
        deployer = accounts[0];

        const NFTContract = await ethers.getContractFactory("NFT");
        NFT = await NFTContract.deploy();
      });

      describe("mintNFT", () => {
        it("should mint one NFT", async () => {
          txResponse = await NFT.mintNFT(DEFAULT_TOKEN_URI);
          await txResponse.wait(1);

          assert.equal(await NFT.getCurrentTokenId(), 1);
          assert.equal(await NFT.tokenURI(0), DEFAULT_TOKEN_URI);
          assert.equal(await NFT.ownerOf(0), deployer.address);
        });

        it("should mint multiple NFT", async () => {
          // Minting first NFT
          txResponse = await NFT.mintNFT(DEFAULT_TOKEN_URI);
          await txResponse.wait(1);

          // Minting second NFT
          txResponse = await NFT.mintNFT(DEFAULT_TOKEN_URI);
          await txResponse.wait(1);

          assert.equal(await NFT.getCurrentTokenId(), 2);
          assert.equal(await NFT.tokenURI(1), DEFAULT_TOKEN_URI);
          assert.equal(await NFT.ownerOf(1), deployer.address);
        });

        it("should mint multiple NFT with different owners", async () => {
          const player1 = accounts[1];
          const player2 = accounts[2];

          // Minting NFT with first player
          NFT = NFT.connect(player1);
          txResponse = await NFT.mintNFT(DEFAULT_TOKEN_URI);
          await txResponse.wait(1);
          assert.equal(await NFT.ownerOf(0), player1.address);

          // Minting NFT with second player
          NFT = NFT.connect(player2);
          txResponse = await NFT.mintNFT(DEFAULT_TOKEN_URI);
          await txResponse.wait(1);
          assert.equal(await NFT.ownerOf(1), player2.address);
        });

        it("should emit an event when minting NFT", async () => {
          await expect(NFT.mintNFT(DEFAULT_TOKEN_URI)).to.emit(
            NFT,
            "NFTMinted"
          );
        });
      });

      describe("withdraw", () => {
        beforeEach(async () => {
          txResponse = await deployer.call({
            to: NFT.address,
            value: parseEther("1.0"),
          });
        });

        it("withdraw amount of NFT", async () => {
          txResponse = await NFT.withdraw();
          await txResponse.wait(1);

          // TODO check if amount received
        });

        it("should emit event when withdrawn money", async () => {
          await expect(NFT.withdraw()).to.emit(NFT, "Withdrawn");
        });

        it("only let owner of the contract withdraw", async () => {
          const player = accounts[1];
          NFT = NFT.connect(player);

          await expect(NFT.withdraw()).to.be.reverted;
        });
      });
    })
  : describe.skip;
