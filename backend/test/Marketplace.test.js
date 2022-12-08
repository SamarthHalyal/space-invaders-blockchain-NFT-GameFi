const { assert, expect } = require("chai");
const { parseEther } = require("ethers/lib/utils");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

developmentChains.includes(network.name)
  ? describe("Tests for 'Marketplace.sol',", () => {
      const DEFAULT_TOKEN_URI = "TokenURI";
      const DEFAULT_LISTING_PRICE = parseEther("0.1");
      const DEFAULT_BASE_PRICE = parseEther("0.1");
      const currentDateObj = new Date();
      let DEFAULT_END_TIME = parseInt(
        currentDateObj.setDate(currentDateObj.getDate() + 1) / 1000
      );
      let currentBlockTime;

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
      });

      describe("Testing NFT", () => {
        it("should mint one NFT", async () => {
          const tokenId = await Marketplace.getCurrentTokenId();
          txResponse = await Marketplace.mintNFT(DEFAULT_TOKEN_URI);
          await txResponse.wait(1);

          assert.equal(await Marketplace.tokenURI(tokenId), DEFAULT_TOKEN_URI);
          assert.equal(await Marketplace.ownerOf(tokenId), deployer.address);
        });

        it("should mint multiple NFTs", async () => {
          for (let index = 0; index < 5; index++) {
            const tokenId = await Marketplace.getCurrentTokenId();
            txResponse = await Marketplace.mintNFT(DEFAULT_TOKEN_URI);
            await txResponse.wait(1);

            assert.equal(
              await Marketplace.tokenURI(tokenId),
              DEFAULT_TOKEN_URI
            );
            assert.equal(await Marketplace.ownerOf(tokenId), deployer.address);
          }
        });

        it("should mint multiple NFT with different owners", async () => {
          const player1 = accounts[1];
          const player2 = accounts[2];

          Marketplace = Marketplace.connect(player1);
          const tokenId1 = await Marketplace.getCurrentTokenId();
          txResponse = await Marketplace.mintNFT(DEFAULT_TOKEN_URI);
          await txResponse.wait(1);

          Marketplace = Marketplace.connect(player2);
          const tokenId2 = await Marketplace.getCurrentTokenId();
          txResponse = await Marketplace.mintNFT(DEFAULT_TOKEN_URI);
          await txResponse.wait(1);

          assert.equal(await Marketplace.ownerOf(tokenId1), player1.address);
          assert.equal(await Marketplace.ownerOf(tokenId2), player2.address);
        });
      });

      describe("Testing Maretplace", () => {
        describe("Listing Item", () => {
          let tokenId;

          beforeEach(async () => {
            tokenId = await Marketplace.getCurrentTokenId();
            txResponse = await Marketplace.mintNFT(DEFAULT_TOKEN_URI);
            await txResponse.wait(1);
          });

          it("should list items", async () => {
            txResponse = await Marketplace.listItem(
              tokenId,
              DEFAULT_LISTING_PRICE
            );
            await txResponse.wait(1);

            const listingItem = await Marketplace.getItem(0);

            assert.equal(listingItem.status, "Listed");
            assert.equal(
              listingItem.listingPrice.toString(),
              DEFAULT_LISTING_PRICE.toString()
            );
            assert.equal(listingItem.owner, deployer.address);
          });

          it("should only list exisiting tokens", async () => {
            const NON_LISTED_TOKENID = 10;
            await expect(
              Marketplace.listItem(NON_LISTED_TOKENID, DEFAULT_LISTING_PRICE)
            ).to.be.revertedWith("Marketplace__TokenDoesNotExist");
          });

          it("should only lets owner list items", async () => {
            const player = accounts[1];
            Marketplace = Marketplace.connect(player);
            await expect(
              Marketplace.listItem(tokenId, DEFAULT_LISTING_PRICE)
            ).to.be.revertedWith("Marketplace__NotOwner");
          });

          it("should only list items that are not already listed", async () => {
            txResponse = await Marketplace.listItem(
              tokenId,
              DEFAULT_LISTING_PRICE
            );
            await txResponse.wait(1);

            await expect(
              Marketplace.listItem(tokenId, DEFAULT_LISTING_PRICE)
            ).to.be.revertedWith("Marketplace__AlreadyListed");
          });

          it("should only list items that are not already on auction", async () => {
            txResponse = await Marketplace.startAuction(
              tokenId,
              DEFAULT_BASE_PRICE,
              DEFAULT_END_TIME
            );
            await txResponse.wait(1);

            await expect(
              Marketplace.listItem(tokenId, DEFAULT_LISTING_PRICE)
            ).to.be.revertedWith("Marketplace__AlreadyOnAuction");
          });

          it("should not list items with Invalid Price", async () => {
            const listingPriceZero = parseEther("0");
            await expect(
              Marketplace.listItem(tokenId, listingPriceZero)
            ).to.be.revertedWith("Marketplace__NotValidPrice");
          });

          it("should transfer owner rights to marketplace after listing token", async () => {
            txResponse = await Marketplace.listItem(
              tokenId,
              DEFAULT_LISTING_PRICE
            );
            await txResponse.wait(1);

            const newOwner = await Marketplace.ownerOf(tokenId);
            assert.equal(newOwner, Marketplace.address);
          });
        });

        describe("Buying Item", () => {
          let tokenId;
          let buyer;

          beforeEach(async () => {
            tokenId = await Marketplace.getCurrentTokenId();
            txResponse = await Marketplace.mintNFT(DEFAULT_TOKEN_URI);
            await txResponse.wait(1);

            txResponse = await Marketplace.listItem(
              tokenId,
              DEFAULT_LISTING_PRICE
            );
            await txResponse.wait(1);

            buyer = accounts[1];
            Marketplace = Marketplace.connect(buyer);
          });

          it("should let buy NFT", async () => {
            const listingItem = await Marketplace.getItem(tokenId);

            txResponse = await Marketplace.buyItem(tokenId, {
              value: listingItem.listingPrice.toString(),
            });
            await txResponse.wait(1);

            const boughtItem = await Marketplace.getItem(tokenId);

            assert.equal(boughtItem.status, "Bought");
            assert.equal(boughtItem.owner, buyer.address);
          });

          it("only let existing items to be bought", async () => {
            const NON_LISTED_TOKENID = 10;
            await expect(
              Marketplace.buyItem(NON_LISTED_TOKENID, {
                value: DEFAULT_LISTING_PRICE,
              })
            ).to.be.revertedWith("Marketplace__TokenDoesNotExist");
          });

          it("only let listed items to be bought", async () => {
            const tokenId2 = await Marketplace.getCurrentTokenId();

            txResponse = await Marketplace.mintNFT(DEFAULT_TOKEN_URI);
            await txResponse.wait(1);

            await expect(
              Marketplace.buyItem(tokenId2, {
                value: DEFAULT_LISTING_PRICE,
              })
            ).to.be.revertedWith("Marketplace__NotListed");
          });

          it("only allows user to buy with valid price", async () => {
            await expect(Marketplace.buyItem(tokenId)).to.be.revertedWith(
              "Marketplace__NotValidPrice"
            );
          });

          it("should add listedPrice to seller's proceeds", async () => {
            const listingItem = await Marketplace.getItem(tokenId);

            const proceedsSellerBefore = parseInt(
              await Marketplace.getProceeds(listingItem.owner)
            );
            txResponse = await Marketplace.buyItem(tokenId, {
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

          it("should transfer owner rights to buyer after purchasing token", async () => {
            const listingItem = await Marketplace.getItem(tokenId);
            txResponse = await Marketplace.buyItem(tokenId, {
              value: listingItem.listingPrice,
            });
            await txResponse.wait(1);

            const newOwner = await Marketplace.ownerOf(tokenId);
            assert.equal(newOwner, player.address);
          });
        });

        describe("Cancel Listing", () => {
          let tokenId;
          beforeEach(async () => {
            tokenId = await Marketplace.getCurrentTokenId();
            txResponse = await Marketplace.mintNFT(DEFAULT_TOKEN_URI);
            await txResponse.wait(1);

            txResponse = await Marketplace.listItem(
              tokenId,
              DEFAULT_LISTING_PRICE
            );
            await txResponse.wait(1);
          });

          it("should cancel listing", async () => {
            txResponse = await Marketplace.cancelListing(tokenId);
            await txResponse.wait(1);

            const listingItem = await Marketplace.getItem(tokenId);
            assert.equal(listingItem.status, "Created");
          });

          it("only let existing items to be canceled", async () => {
            const NOT_EXISTING_TOKENID = 10;
            await expect(
              Marketplace.cancelListing(NOT_EXISTING_TOKENID)
            ).to.be.revertedWith("Marketplace__TokenDoesNotExist");
          });

          it("only lets already listed items to be cancelled", async () => {
            const tokenId2 = await Marketplace.getCurrentTokenId();
            txResponse = await Marketplace.mintNFT(DEFAULT_TOKEN_URI);
            await txResponse.wait(1);

            await expect(
              Marketplace.cancelListing(tokenId2)
            ).to.be.revertedWith("Marketplace__NotListed");
          });

          it("only let owner of item cancel listing", async () => {
            Marketplace = Marketplace.connect(accounts[1]);
            await expect(Marketplace.cancelListing(tokenId)).to.be.revertedWith(
              "Marketplace__NotOwner"
            );
          });

          it("should transfer back owner rights to owner", async () => {
            txResponse = await Marketplace.cancelListing(tokenId);
            await txResponse.wait(1);

            const newOwner = await Marketplace.ownerOf(tokenId);
            assert.equal(newOwner, deployer.address);
          });
        });

        describe("Update Listing", () => {
          let tokenId;
          beforeEach(async () => {
            tokenId = await Marketplace.getCurrentTokenId();

            txResponse = await Marketplace.mintNFT(DEFAULT_TOKEN_URI);
            await txResponse.wait(1);

            txResponse = await Marketplace.listItem(0, DEFAULT_LISTING_PRICE);
            await txResponse.wait(1);
          });

          it("should update listing", async () => {
            const newPrice = parseEther("0.15");
            txResponse = await Marketplace.updateListing(tokenId, newPrice);
            await txResponse.wait(1);

            const listingItem = await Marketplace.getItem(tokenId);
            assert.equal(parseInt(listingItem.listingPrice), newPrice);
          });

          it("only let existing items to be updated", async () => {
            const NOT_EXISTING_TOKENID = 10;
            const newPrice = parseEther("0.15");
            await expect(
              Marketplace.updateListing(NOT_EXISTING_TOKENID, newPrice)
            ).to.be.revertedWith("Marketplace__TokenDoesNotExist");
          });

          it("only lets owner of item to update listing", async () => {
            Marketplace = Marketplace.connect(accounts[1]);

            const newPrice = parseEther("0.15");
            await expect(
              Marketplace.updateListing(tokenId, newPrice)
            ).to.be.revertedWith("Marketplace__NotOwner");
          });

          it("only let already listed items to be updated", async () => {
            const tokenId2 = await Marketplace.getCurrentTokenId();
            txResponse = await Marketplace.mintNFT(DEFAULT_TOKEN_URI);
            await txResponse.wait(1);

            const newPrice = parseEther("0.15");
            await expect(
              Marketplace.updateListing(tokenId2, newPrice)
            ).to.be.revertedWith("Marketplace__NotListed");
          });

          it("only update listing when price is valid", async () => {
            const newPrice = parseEther("0");
            await expect(
              Marketplace.updateListing(tokenId, newPrice)
            ).to.be.revertedWith("Marketplace__NotValidPrice");
          });
        });
      });

      describe("Testing Auction", () => {
        let tokenId;
        beforeEach(async () => {
          tokenId = await Marketplace.getCurrentTokenId();
          txResponse = await Marketplace.mintNFT(DEFAULT_TOKEN_URI);
          await txResponse.wait(1);
        });

        describe("Starting Auction", () => {
          it("should start auction", async () => {
            txResponse = await Marketplace.startAuction(
              tokenId,
              DEFAULT_BASE_PRICE,
              DEFAULT_END_TIME
            );
            await txResponse.wait(1);

            const auctionItem = await Marketplace.getItem(tokenId);
            assert.equal(auctionItem.status, "On Auction");
            assert.equal(
              auctionItem.basePrice.toString(),
              DEFAULT_BASE_PRICE.toString()
            );
            assert.equal(auctionItem.endTime, DEFAULT_END_TIME);
          });

          it("only lets existing items to be in auction", async () => {
            const NOT_EXISTING_TOKENID = 10;
            await expect(
              Marketplace.startAuction(
                NOT_EXISTING_TOKENID,
                DEFAULT_BASE_PRICE,
                DEFAULT_END_TIME
              )
            ).to.be.revertedWith("Marketplace__TokenDoesNotExist");
          });

          it("only lets owner of token to start auction", async () => {
            Marketplace = Marketplace.connect(accounts[1]);
            await expect(
              Marketplace.startAuction(
                tokenId,
                DEFAULT_BASE_PRICE,
                DEFAULT_END_TIME
              )
            ).to.be.revertedWith("Marketplace__NotOwner");
          });

          it("only lets not listed items to be in auction", async () => {
            txResponse = await Marketplace.listItem(
              tokenId,
              DEFAULT_LISTING_PRICE
            );
            await txResponse.wait(1);

            await expect(
              Marketplace.startAuction(
                tokenId,
                DEFAULT_BASE_PRICE,
                DEFAULT_END_TIME
              )
            ).to.be.revertedWith("Marketplace__AlreadyListed");
          });

          it("does not let start auction which are already on auction", async () => {
            txResponse = await Marketplace.startAuction(
              tokenId,
              DEFAULT_BASE_PRICE,
              DEFAULT_END_TIME
            );
            await txResponse.wait(1);

            await expect(
              Marketplace.startAuction(
                tokenId,
                DEFAULT_BASE_PRICE,
                DEFAULT_END_TIME
              )
            ).to.be.revertedWith("Marketplace__AlreadyOnAuction");
          });

          it("only lets start auction on valid base price", async () => {
            const NON_VALID_PRICE = parseEther("0.0");

            await expect(
              Marketplace.startAuction(
                tokenId,
                NON_VALID_PRICE,
                DEFAULT_END_TIME
              )
            ).to.be.revertedWith("Marketplace__NotValidPrice");
          });

          it("only lets start auction on valid end time", async () => {
            const dateObj = new Date();
            const NON_VALID_END_TIME = parseInt(
              currentDateObj.setDate(dateObj.getDate() - 1) / 1000
            );

            await expect(
              Marketplace.startAuction(
                tokenId,
                DEFAULT_BASE_PRICE,
                NON_VALID_END_TIME
              )
            ).to.be.revertedWith("Marketplace__NotValidEndTime");
          });

          it("should transfer owner rights to marketplace after starting auction", async () => {
            txResponse = await Marketplace.startAuction(
              tokenId,
              DEFAULT_BASE_PRICE,
              DEFAULT_END_TIME
            );
            await txResponse.wait(1);

            const newOwner = await Marketplace.ownerOf(tokenId);
            assert.equal(newOwner, Marketplace.address);
          });
        });

        describe("Bidding on Auction", () => {
          let bidder;
          const bidPrice = DEFAULT_BASE_PRICE.add(parseEther("0.1"));

          beforeEach(async () => {
            txResponse = await Marketplace.startAuction(
              tokenId,
              DEFAULT_BASE_PRICE,
              DEFAULT_END_TIME
            );
            await txResponse.wait(1);

            bidder = accounts[1];
            Marketplace = Marketplace.connect(bidder);
          });

          it("should let bid on auction", async () => {
            txResponse = await Marketplace.bid(tokenId, {
              value: bidPrice,
            });
            await txResponse.wait(1);

            const bidders = await Marketplace.getBidders(tokenId);
            assert.equal(bidders.length, 1);
            assert.equal(bidders[0].bidderAddress, bidder.address);
          });

          it("only let bid on items already on auction", async () => {
            const tokenId2 = await Marketplace.getCurrentTokenId();
            txResponse = await Marketplace.mintNFT(DEFAULT_TOKEN_URI);
            await txResponse.wait(1);

            await expect(
              Marketplace.bid(tokenId2, {
                value: bidPrice,
              })
            ).to.be.revertedWith("Marketplace__NotOnAuction");
          });

          it("only let bid with valid price", async () => {
            txResponse = await Marketplace.bid(tokenId, {
              value: bidPrice,
            });
            await txResponse.wait(1);

            await expect(
              Marketplace.bid(tokenId, {
                value: bidPrice,
              })
            ).to.be.revertedWith("Marketplace__NotValidBid");
          });

          it("should let multiple bidders bid", async () => {
            let _bidPrice = bidPrice;
            for (let index = 1; index <= 5; index++) {
              _bidPrice = _bidPrice.add(parseEther("0.1"));
              const bidder = accounts[index];
              Marketplace = Marketplace.connect(bidder);
              txResponse = await Marketplace.bid(tokenId, {
                value: _bidPrice,
              });
              await txResponse.wait(1);
            }
            const bidders = await Marketplace.getBidders(tokenId);
            assert.equal(bidders.length, 5);
          });
        });

        describe("checkUpkeep", () => {
          const abi = new ethers.utils.AbiCoder();

          beforeEach(async () => {
            txResponse = await Marketplace.startAuction(
              tokenId,
              DEFAULT_BASE_PRICE,
              DEFAULT_END_TIME
            );
            await txResponse.wait(1);
          });

          it("should return false when auction is still on", async () => {
            const { upkeepNeeded, performData } = await Marketplace.checkUpkeep(
              "0x"
            );
            assert.equal(upkeepNeeded, false);
          });

          it("should return true when auction end time has reached", async () => {
            const duration =
              DEFAULT_END_TIME - parseInt(new Date().getTime() / 1000);
            currentBlockTime = DEFAULT_END_TIME;
            await network.provider.send("evm_increaseTime", [duration]);
            await network.provider.request({ method: "evm_mine", params: [] });

            let [upkeepNeeded, performData] = await Marketplace.checkUpkeep(
              "0x"
            );
            performData = abi.decode(["uint256[]"], performData);
            assert.equal(upkeepNeeded, true);
            assert.equal(performData[0].toString(), tokenId);
          });
        });

        describe("performUpkeep", () => {
          const bidPrice = DEFAULT_BASE_PRICE.add(parseEther("0.1"));
          let bidder;

          beforeEach(async () => {
            txResponse = await Marketplace.startAuction(
              tokenId,
              DEFAULT_BASE_PRICE,
              currentBlockTime + 10000
            );
            await txResponse.wait(1);

            bidder = accounts[1];
          });

          it("should close auction those are ended", async () => {
            Marketplace = Marketplace.connect(bidder);
            txResponse = await Marketplace.bid(tokenId, {
              value: bidPrice,
            });
            await txResponse.wait(1);

            const userProceedsBefore = await Marketplace.getProceeds(
              deployer.address
            );

            await network.provider.send("evm_setNextBlockTimestamp", [
              currentBlockTime + 20000,
            ]);
            currentBlockTime += 20000;
            await network.provider.send("evm_mine");

            let [upkeepNeeded, performData] = await Marketplace.checkUpkeep(
              "0x"
            );
            await Marketplace.performUpkeep(performData);

            const item = await Marketplace.getItem(tokenId);
            assert.equal(item.status, "Bought");
            assert.equal(item.owner, bidder.address);

            const userProceedsAfter = await Marketplace.getProceeds(
              deployer.address
            );
            assert.equal(
              userProceedsAfter - userProceedsBefore,
              parseInt(bidPrice)
            );
          });

          it("should revert ownership to owner if no bidders", async () => {
            await network.provider.send("evm_setNextBlockTimestamp", [
              currentBlockTime + 20000,
            ]);
            currentBlockTime += 20000;
            await network.provider.send("evm_mine");

            let [upkeepNeeded, performData] = await Marketplace.checkUpkeep(
              "0x"
            );
            await Marketplace.performUpkeep(performData);

            const item = await Marketplace.getItem(tokenId);
            assert.equal(item.status, "Created");
            assert.equal(item.owner, deployer.address);
          });

          it("should give back money to lost bidders", async () => {
            let _bidPrice = bidPrice;
            const totalBidders = 3;
            const bidders = [];
            for (let index = 1; index < totalBidders; index++) {
              const _bidder = accounts[index];
              _bidPrice = _bidPrice.add(parseEther("0.1"));

              Marketplace = Marketplace.connect(_bidder);
              txResponse = await Marketplace.bid(tokenId, {
                value: _bidPrice,
              });
              await txResponse.wait(1);

              if (index != totalBidders - 1)
                bidders.push({
                  address: _bidder.address,
                  bid: parseInt(_bidPrice),
                });
            }

            await network.provider.send("evm_setNextBlockTimestamp", [
              currentBlockTime + 20000,
            ]);
            currentBlockTime += 20000;

            await network.provider.send("evm_mine");

            let [upkeepNeeded, performData] = await Marketplace.checkUpkeep(
              "0x"
            );
            await Marketplace.performUpkeep(performData);

            for (let _bidder of bidders) {
              const proceeds = await Marketplace.getProceeds(_bidder.address);
              assert.equal(proceeds.toString(), _bidder.bid);
            }
          });
        });
      });

      describe("Withdraw Proceeds", () => {
        beforeEach(async () => {
          txResponse = await Marketplace.mintNFT(DEFAULT_TOKEN_URI);
          await txResponse.wait(1);

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
          assert.equal(items.length, 10);
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
