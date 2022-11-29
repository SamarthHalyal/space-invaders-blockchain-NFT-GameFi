const { assert, expect } = require("chai");
const { parseEther } = require("ethers/lib/utils");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

developmentChains.includes(network.name)
  ? describe("Tests for 'Marketplace.sol',", () => {
      const DEFAULT_TOKEN_URI = "TokenURI";
      const DEFAULT_LISTING_PRICE = parseEther("0.1");

      let NFT, Marketplace, txResponse;
      let accounts, deployer, player;

      beforeEach(async () => {
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        player = accounts[1];

        const NFTContract = await ethers.getContractFactory("NFT");
        NFT = await NFTContract.deploy();

        const MarketplaceContract = await ethers.getContractFactory(
          "Marketplace"
        );
        Marketplace = await MarketplaceContract.deploy();

        txResponse = await NFT.mintNFT(DEFAULT_TOKEN_URI);
        await txResponse.wait(1);
        NFT.approve(Marketplace.address, 0);
      });

      describe("Listing Item", () => {
        it("should list items", async () => {
          txResponse = await Marketplace.listItem(
            NFT.address,
            0,
            DEFAULT_LISTING_PRICE
          );
          await txResponse.wait(1);

          const listing = await Marketplace.getListing(NFT.address, 0);
          assert.equal(
            listing.price.toString(),
            DEFAULT_LISTING_PRICE.toString()
          );
          assert.equal(listing.seller, deployer.address);
        });

        it("should emit event when item listed", async () => {
          await expect(
            Marketplace.listItem(NFT.address, 0, DEFAULT_LISTING_PRICE)
          )
            .to.emit(Marketplace, "ItemListed")
            .withArgs(NFT.address, 0, DEFAULT_LISTING_PRICE, deployer.address);
        });

        it("should not list items with Invalid Price", async () => {
          const listingPriceZero = parseEther("0");
          await expect(
            Marketplace.listItem(NFT.address, 0, listingPriceZero)
          ).to.be.revertedWith("Marketplace__NotValidPrice");
        });

        it("should not list items by Non-approved contracts", async () => {
          NFT.approve(ethers.constants.AddressZero, 0);
          await expect(
            Marketplace.listItem(NFT.address, 0, DEFAULT_LISTING_PRICE)
          ).to.be.revertedWith("Marketplace__NotApproved");
        });

        it("should only list items that are not already listed", async () => {
          txResponse = await Marketplace.listItem(
            NFT.address,
            0,
            DEFAULT_LISTING_PRICE
          );
          await txResponse.wait(1);

          await expect(
            Marketplace.listItem(NFT.address, 0, DEFAULT_LISTING_PRICE)
          ).to.be.revertedWith("Marketplace__AlreadyListed");
        });

        it("should only lets owner list items", async () => {
          const player = accounts[1];
          Marketplace = Marketplace.connect(player);
          await expect(
            Marketplace.listItem(NFT.address, 0, DEFAULT_LISTING_PRICE)
          ).to.be.revertedWith("Marketplace__NotOwner");
        });

        it("should only list exisiting tokens", async () => {
          await expect(
            Marketplace.listItem(NFT.address, 10, DEFAULT_LISTING_PRICE)
          );
        });
      });

      describe("Buying Item", () => {
        beforeEach(async () => {
          txResponse = await Marketplace.listItem(
            NFT.address,
            0,
            DEFAULT_LISTING_PRICE
          );
          await txResponse.wait(1);

          Marketplace = Marketplace.connect(player);
        });

        it("only let listed items to be bought", async () => {
          const NON_LISTED_TOKENID = 10;
          await expect(
            Marketplace.buyItem(NFT.address, NON_LISTED_TOKENID, {
              value: DEFAULT_LISTING_PRICE,
            })
          ).to.be.revertedWith("Marketplace__NotListed");
        });

        it("only allows user to buy with valid price", async () => {
          await expect(Marketplace.buyItem(NFT.address, 0)).to.be.revertedWith(
            "Marketplace__NotValidPrice"
          );
        });

        it("should add listedPrice to seller's proceeds", async () => {
          const [listingPrice, seller] = await Marketplace.getListing(
            NFT.address,
            0
          );

          const proceedsSellerBefore = parseInt(
            await Marketplace.getProceeds(seller)
          );
          txResponse = await Marketplace.buyItem(NFT.address, 0, {
            value: listingPrice.toString(),
          });
          await txResponse.wait(1);
          const proceedsSellerAfter = parseInt(
            await Marketplace.getProceeds(seller)
          );
          assert.equal(
            proceedsSellerAfter - proceedsSellerBefore,
            parseInt(listingPrice)
          );
        });

        it("should delete listing after it has been bought", async () => {
          let listing = await Marketplace.getListing(NFT.address, 0);
          txResponse = await Marketplace.buyItem(NFT.address, 0, {
            value: listing.price,
          });
          await txResponse.wait(1);
          listing = await Marketplace.getListing(NFT.address, 0);
          assert.equal(parseInt(listing.price), 0);
          assert.equal(listing.seller, ethers.constants.AddressZero);
        });

        it("should transfer owner rights to buyer after purchasing token", async () => {
          let listing = await Marketplace.getListing(NFT.address, 0);
          txResponse = await Marketplace.buyItem(NFT.address, 0, {
            value: listing.price,
          });
          await txResponse.wait(1);

          const newOwner = await NFT.ownerOf(0);
          assert.notEqual(newOwner, listing.seller);
          assert.equal(newOwner, player.address);
        });

        it("should emit event when item is bought", async () => {
          let listing = await Marketplace.getListing(NFT.address, 0);
          await expect(
            Marketplace.buyItem(NFT.address, 0, { value: listing.price })
          ).to.emit(Marketplace, "ItemBought");
        });
      });

      describe("Cancel Listing", () => {
        beforeEach(async () => {
          txResponse = await Marketplace.listItem(
            NFT.address,
            0,
            DEFAULT_LISTING_PRICE
          );
          await txResponse.wait(1);
        });

        it("only let owner of item cancel listing", async () => {
          Marketplace = Marketplace.connect(player);
          await expect(
            Marketplace.cancelListing(NFT.address, 0)
          ).to.be.revertedWith("Marketplace__NotOwner");
        });

        it("only let already listed items to be canceled", async () => {
          const NOT_LISTED_TOKENID = 10;
          await expect(
            Marketplace.cancelListing(NFT.address, NOT_LISTED_TOKENID)
          ).to.be.revertedWith("ERC721: invalid token ID");
        });

        it("should cancel listing", async () => {
          txResponse = await Marketplace.cancelListing(NFT.address, 0);
          await txResponse.wait(1);

          const listing = await Marketplace.getListing(NFT.address, 0);
          assert.equal(parseInt(listing.price), 0);
          assert.equal(listing.seller, ethers.constants.AddressZero);
        });

        it("should emit event when listing is cancelled", async () => {
          await expect(Marketplace.cancelListing(NFT.address, 0)).to.emit(
            Marketplace,
            "ListingCancelled"
          );
        });
      });

      describe("Update Listing", () => {
        beforeEach(async () => {
          txResponse = await Marketplace.listItem(
            NFT.address,
            0,
            DEFAULT_LISTING_PRICE
          );
          await txResponse.wait(1);
        });

        it("only lets owner of item to update listing", async () => {
          Marketplace = Marketplace.connect(player);

          const newPrice = parseEther("0.15");
          await expect(
            Marketplace.updateListing(NFT.address, 0, newPrice)
          ).to.be.revertedWith("Marketplace__NotOwner");
        });

        it("only let already listed items to be updated", async () => {
          const NOT_LISTED_TOKENID = 10;
          const newPrice = parseEther("0.15");
          await expect(
            Marketplace.updateListing(NFT.address, NOT_LISTED_TOKENID, newPrice)
          ).to.be.revertedWith("ERC721: invalid token ID");
        });

        it("only update listing when price is valid", async () => {
          const newPrice = parseEther("0");
          await expect(
            Marketplace.updateListing(NFT.address, 0, newPrice)
          ).to.be.revertedWith("Marketplace__NotValidPrice");
        });

        it("should update listing", async () => {
          const newPrice = parseEther("0.15");
          txResponse = await Marketplace.updateListing(
            NFT.address,
            0,
            newPrice
          );
          await txResponse.wait(1);

          const listingAfter = await Marketplace.getListing(NFT.address, 0);
          assert.equal(parseInt(listingAfter.price), newPrice);
        });

        it("should emit event when listing updated", async () => {
          const newPrice = parseEther("0.15");
          await expect(
            Marketplace.updateListing(NFT.address, 0, newPrice)
          ).to.emit(Marketplace, "UpdatedListing");
        });
      });

      describe("Withdraw Proceeds", () => {
        beforeEach(async () => {
          txResponse = await Marketplace.listItem(
            NFT.address,
            0,
            DEFAULT_LISTING_PRICE
          );
          await txResponse.wait(1);
        });

        it("should not withdraw if there is no money", async () => {
          await expect(Marketplace.withdrawProceeds()).to.be.revertedWith(
            "Marketplace__NotEnoughMoneyToWithdraw"
          );
        });

        it("should withdraw money", async () => {
          const balanceBefore = parseInt(await deployer.getBalance());

          Marketplace = Marketplace.connect(player);
          let listing = await Marketplace.getListing(NFT.address, 0);
          txResponse = await Marketplace.buyItem(NFT.address, 0, {
            value: listing.price,
          });
          await txResponse.wait(1);
          Marketplace = Marketplace.connect(deployer);

          txResponse = await Marketplace.withdrawProceeds();
          const receipt = await txResponse.wait(1);
          const gasUsed = ethers.utils.formatEther(
            receipt.gasUsed.mul(receipt.effectiveGasPrice)
          );

          const balanceAfter = parseInt(await deployer.getBalance());

          // TODO figure out why not working
          // const valueShouldBe =
          //   parseInt(listing.price) - parseInt(parseEther(gasUsed));
          // assert.equal(balanceAfter - balanceBefore, valueShouldBe);
        });
      });
    })
  : describe.skip;
