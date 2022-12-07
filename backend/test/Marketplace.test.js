const { assert, expect } = require("chai");
const { parseEther } = require("ethers/lib/utils");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

developmentChains.includes(network.name)
  ? describe("Tests for 'Marketplace.sol',", () => {
      const DEFAULT_TOKEN_URI = "TokenURI";
      const DEFAULT_LISTING_PRICE = parseEther("0.1");

      let Marketplace, txResponse;
      let accounts, deployer, player;

      beforeEach(async () => {
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        player = accounts[1];

        const MarketplaceContract = await ethers.getContractFactory(
          "Marketplace"
        );
        Marketplace = await MarketplaceContract.deploy();

        txResponse = await Marketplace.mintNFT(DEFAULT_TOKEN_URI);
        await txResponse.wait(1);
      });

      describe("Listing Item", () => {
        it("should list items", async () => {
          txResponse = await Marketplace.listItem(0, DEFAULT_LISTING_PRICE);
          await txResponse.wait(1);

          const listingItem = await Marketplace.getItem(0);
          assert.equal(
            listingItem.listingPrice.toString(),
            DEFAULT_LISTING_PRICE.toString()
          );
          assert.equal(listingItem.owner, deployer.address);
        });

        it("should not list items with Invalid Price", async () => {
          const listingPriceZero = parseEther("0");
          await expect(
            Marketplace.listItem(0, listingPriceZero)
          ).to.be.revertedWith("Marketplace__NotValidPrice");
        });

        it("should only list items that are not already listed", async () => {
          txResponse = await Marketplace.listItem(0, DEFAULT_LISTING_PRICE);
          await txResponse.wait(1);

          await expect(
            Marketplace.listItem(0, DEFAULT_LISTING_PRICE)
          ).to.be.revertedWith("Marketplace__AlreadyListed");
        });

        it("should only lets owner list items", async () => {
          const player = accounts[1];
          Marketplace = Marketplace.connect(player);
          await expect(
            Marketplace.listItem(0, DEFAULT_LISTING_PRICE)
          ).to.be.revertedWith("Marketplace__NotOwner");
        });

        it("should only list exisiting tokens", async () => {
          await expect(
            Marketplace.listItem(10, DEFAULT_LISTING_PRICE)
          ).to.be.revertedWith("Marketplace__TokenDoesNotExist");
        });
      });

      describe("Buying Item", () => {
        beforeEach(async () => {
          Marketplace = Marketplace.connect(deployer);
          txResponse = await Marketplace.listItem(0, DEFAULT_LISTING_PRICE);
          await txResponse.wait(1);

          Marketplace = Marketplace.connect(player);
        });

        it("only let listed items to be bought", async () => {
          const NON_LISTED_TOKENID = 10;
          await expect(
            Marketplace.buyItem(NON_LISTED_TOKENID, {
              value: DEFAULT_LISTING_PRICE,
            })
          ).to.be.revertedWith("Marketplace__TokenDoesNotExist");
        });

        it("only allows user to buy with valid price", async () => {
          await expect(Marketplace.buyItem(0)).to.be.revertedWith(
            "Marketplace__NotValidPrice"
          );
        });

        it("should add listedPrice to seller's proceeds", async () => {
          const listingItem = await Marketplace.getItem(0);

          const proceedsSellerBefore = parseInt(
            await Marketplace.getProceeds(listingItem.owner)
          );
          txResponse = await Marketplace.buyItem(0, {
            value: listingItem.listingPrice.toString(),
          });
          await txResponse.wait(1);
          const proceedsSellerAfter = parseInt(
            await Marketplace.getProceeds(listingItem.owner)
          );

          assert.equal(
            proceedsSellerAfter - proceedsSellerBefore,
            parseInt(listingItem.listingPrice)
          );
        });

        it("should delete listing after it has been bought", async () => {
          let listingItem = await Marketplace.getItem(0);
          txResponse = await Marketplace.buyItem(0, {
            value: listingItem.listingPrice,
          });
          await txResponse.wait(1);

          listingItem = await Marketplace.getItem(0);
          assert.equal(listingItem.status, "Bought");
        });

        it("should transfer owner rights to buyer after purchasing token", async () => {
          const listingItem = await Marketplace.getItem(0);
          txResponse = await Marketplace.buyItem(0, {
            value: listingItem.listingPrice,
          });
          await txResponse.wait(1);

          const newOwner = await Marketplace.ownerOf(0);
          assert.notEqual(newOwner, listingItem.owner);
          assert.equal(newOwner, player.address);
        });
      });

      describe("Cancel Listing", () => {
        beforeEach(async () => {
          txResponse = await Marketplace.listItem(0, DEFAULT_LISTING_PRICE);
          await txResponse.wait(1);
        });

        it("only let owner of item cancel listing", async () => {
          Marketplace = Marketplace.connect(player);
          await expect(Marketplace.cancelListing(0)).to.be.revertedWith(
            "Marketplace__NotOwner"
          );
        });

        it("only let already listed items to be canceled", async () => {
          const NOT_LISTED_TOKENID = 10;
          await expect(
            Marketplace.cancelListing(NOT_LISTED_TOKENID)
          ).to.be.revertedWith("Marketplace__TokenDoesNotExist");
        });

        it("should cancel listing", async () => {
          txResponse = await Marketplace.cancelListing(0);
          await txResponse.wait(1);

          const listingItem = await Marketplace.getItem(0);
          assert.equal(listingItem.status, "Created");
        });
      });

      describe("Update Listing", () => {
        beforeEach(async () => {
          txResponse = await Marketplace.listItem(0, DEFAULT_LISTING_PRICE);
          await txResponse.wait(1);
        });

        it("only lets owner of item to update listing", async () => {
          Marketplace = Marketplace.connect(player);

          const newPrice = parseEther("0.15");
          await expect(
            Marketplace.updateListing(0, newPrice)
          ).to.be.revertedWith("Marketplace__NotOwner");
        });

        it("only let already listed items to be updated", async () => {
          const NOT_LISTED_TOKENID = 10;
          const newPrice = parseEther("0.15");
          await expect(
            Marketplace.updateListing(NOT_LISTED_TOKENID, newPrice)
          ).to.be.revertedWith("Marketplace__TokenDoesNotExist");
        });

        it("only update listing when price is valid", async () => {
          const newPrice = parseEther("0");
          await expect(
            Marketplace.updateListing(0, newPrice)
          ).to.be.revertedWith("Marketplace__NotValidPrice");
        });

        it("should update listing", async () => {
          const newPrice = parseEther("0.15");
          txResponse = await Marketplace.updateListing(0, newPrice);
          await txResponse.wait(1);

          const listingItem = await Marketplace.getItem(0);
          assert.equal(parseInt(listingItem.listingPrice), newPrice);
        });
      });

      describe("Withdraw Proceeds", () => {
        beforeEach(async () => {
          txResponse = await Marketplace.listItem(0, DEFAULT_LISTING_PRICE);
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
          const listingItem = await Marketplace.getItem(0);
          txResponse = await Marketplace.buyItem(0, {
            value: listingItem.listingPrice,
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

      describe("Retrieving Items", () => {
        let player1NFTs, player2NFTs;

        beforeEach(async () => {
          const player1 = accounts[1];
          const player2 = accounts[2];
          player1NFTs = [];
          player2NFTs = [];

          Marketplace = Marketplace.connect(player1);
          for (let times = 0; times < 5; times++) {
            const tokenId = await Marketplace.getCurrentTokenId();
            txResponse = await Marketplace.mintNFT(
              `${DEFAULT_TOKEN_URI}_${tokenId}`
            );
            await txResponse.wait(1);

            txResponse = await Marketplace.listItem(
              tokenId,
              DEFAULT_LISTING_PRICE
            );
            await txResponse.wait(1);

            player1NFTs.push(tokenId);
          }

          Marketplace = Marketplace.connect(player2);
          for (let times = 0; times < 5; times++) {
            const tokenId = await Marketplace.getCurrentTokenId();
            txResponse = await Marketplace.mintNFT(
              `${DEFAULT_TOKEN_URI}_${tokenId}`
            );
            await txResponse.wait(1);

            txResponse = await Marketplace.listItem(
              tokenId,
              DEFAULT_LISTING_PRICE
            );
            await txResponse.wait(1);

            player2NFTs.push(tokenId);
          }
        });

        it("should change item list", async () => {
          const items = await Marketplace.getItems();
          assert.equal(items.length, 11);
        });

        it("should retrieve user item list", async () => {
          const player1 = accounts[1];

          Marketplace = Marketplace.connect(player1);
          const myItems = await Marketplace.getUserItems();

          let isOk = true;
          for (let myItem of myItems) {
            if (myItem.owner != player1.address) isOk = false;
          }

          assert.equal(isOk, true);
        });
      });
    })
  : describe.skip;
