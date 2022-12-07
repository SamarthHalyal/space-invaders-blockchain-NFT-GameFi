import {
  AUCTION_ABI,
  AUCTION_ADDRESS,
  MARKETPLACE_ABI,
  PINATA_JWT_TOKEN,
  MARKETPLACE_ADDRESS,
  NFT_ABI,
  NFT_ADDRESS,
  debug,
} from "./const.js";

import { uploadToPinata } from "./utils.js";

let accounts = [];
let deployer = null;
let NFT, Marketplace, Auction;

const loadWeb3 = async () => {
  if (window.ethereum) {
    debug("found window.ethereum...");
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      window.web3 = new Web3(ethereum);
      accounts = await ethereum.enable();
      deployer = accounts[0];

      return true;
    } catch (error) {
      debug("error occured in loading window.ethereum, ", error);
    }
  } else if (window.web3) {
    debug("found window.web3...");
    window.web3 = new Web3(web3.currentProvider);
    accounts = web3.eth.accounts;
    deployer = accounts[0];

    return true;
  } else {
    debug(
      "Non-Ethereum browser detected. You should consider trying MetaMask!"
    );
  }
  return false;
};

const loadContracts = async () => {
  NFT = new web3.eth.Contract(NFT_ABI, NFT_ADDRESS);
  Marketplace = new web3.eth.Contract(MARKETPLACE_ABI, MARKETPLACE_ADDRESS);
  Auction = new web3.eth.Contract(AUCTION_ABI, AUCTION_ADDRESS);
};

window.onload = async () => {
  const loadedSuccessfully = await loadWeb3();
  if (!loadedSuccessfully) return;

  await loadContracts();
  const callOptions = {
    from: deployer,
  };
  document
    .getElementById("nft-image-input")
    .addEventListener("change", function () {
      console.log(this);
      const selectedFile = this.files[0];

      const data = new FormData();
      const metadata = JSON.stringify({
        name: selectedFile["name"],
      });
      data.append("pinataMetadata", metadata);
      data.append("file", selectedFile, selectedFile["name"]);

      fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PINATA_JWT_TOKEN}`,
        },
        body: data,
      }).then(async (response) => {
        response = await response.json();
        console.log(response);
      });
    });

  document
    .getElementById("create-nft-button")
    .addEventListener("click", async () => {
      debug("Create NFT button clicked...");
      const imageFile = "image";
      const tokenID = await NFT.methods.getCurrentTokenId().call(callOptions);
      const tokenURI = await uploadToPinata(imageFile);

      await NFT.methods
        .mintNFT(tokenURI)
        .send(callOptions)
        .then(function (receipt) {
          debug("NFT Minted...");
          debug(receipt);
        });

      await NFT.methods
        .approve(MARKETPLACE_ADDRESS, tokenID)
        .send(callOptions)
        .then((receipt) => {
          debug("NFT Approved...");
          debug(receipt);
        });
    });

  document
    .getElementById("list-to-marketplace-button")
    .addEventListener("click", async () => {
      debug("List to Marketplace button clicked...");

      var listing_price = document.getElementById("nft-listprice-input");
      debug("Listing Price: ", listing_price);

      // <TODO> dont do it this way, use getElementById somehow
      const tokenID = await NFT.methods.getCurrentTokenId().call(callOptions);
      await Marketplace.methods
        .listItem(NFT_ADDRESS, tokenID, listing_price)
        .send(callOptions)
        .then((receipt) => {
          debug(receipt);
        });
    });

  document
    .getElementById("buy-nft-button")
    .addEventListener("click", async () => {
      debug("Buy NFT button clicked...");

      // <TODO> dont do it this way, use getElementById somehow
      const tokenID = await NFT.methods.getCurrentTokenId().call(callOptions);
      // <TODO> dont do it this way, use getElementById somehow
      const listingPrice = "0.1";

      await Marketplace.methods
        .buyItem(NFT_ADDRESS, tokenID)
        .send({ ...callOptions, value: listingPrice })
        .then((receipt) => {
          debug(receipt);
        });
    });

  document
    .getElementById("cancel-listing-button")
    .addEventListener("click", async () => {
      debug("Cancel Listing button clicked...");

      // <TODO> dont do it this way, use getElementById somehow
      const tokenID = await NFT.methods.getCurrentTokenId().call(callOptions);

      await Marketplace.methods
        .cancelListing(NFT_ADDRESS, tokenID)
        .send(callOptions)
        .then((receipt) => {
          debug(receipt);
        });
    });

  document
    .getElementById("update-listing-button")
    .addEventListener("click", async () => {
      debug("Update Listing button clicked...");

      var new_listing_price = document.getElementById(
        "nft-new-listprice-input"
      );
      debug("Listing Price: ", new_listing_price);

      // <TODO> dont do it this way, use getElementById somehow
      const tokenID = await NFT.methods.getCurrentTokenId().call(callOptions);
      await Marketplace.methods
        .updateListing(NFT_ADDRESS, tokenID, new_listing_price)
        .send(callOptions)
        .then((receipt) => {
          debug(receipt);
        });
    });

  document
    .getElementById("withdraw-proceeds-button")
    .addEventListener("click", async () => {
      debug("Withdraw Proceed button clicked...");

      await Marketplace.methods
        .withdrawProceeds()
        .send(callOptions)
        .then((receipt) => {
          debug(receipt);
        });
    });

  const bidButton = document.getElementById("bid-button");
  const startBidButton = document.getElementById("start-bid-button");

  bidButton.addEventListener("click", async () => {
    const bidAmount = document.getElementById("bid-amount");
    await Auction.methods
      .bid()
      .send({
        from: deployer,
        value: bidAmount,
      })
      .then(function (receipt) {
        console.log(receipt);
      });
    document.getElementById("deployer").innerHTML = deployer;
    deployerArray.push(deployer);
    let htmlCode = ``;
    deployerArray.forEach(function (element) {
      htmlCode =
        htmlCode +
        `<div class="card" align='center' style='border-width:0px;'>
      <div class="card-body"  >
        <h5 class="card-title">Deployer Name</h5>
        <h6 class="card-subtitle mb-2 text-muted">${element}</h6>
      </div>
    </div>`;
    });

    document.getElementById("deployer").innerHTML = htmlCode;
  });
  var highest_bidder, highest_bid;
  startBidButton.addEventListener("click", () => {
    // document.getElementById("expiry") = "BIDDING ONGOING";
    var h = document.getElementById("timeH");
    var m = document.getElementById("timeM");
    var s = document.getElementById("timeS");

    var endDate = new Date().getTime() + (h * 3600000 + m * 60000 + s * 1000);
    var timer = setInterval(async function () {
      let now = new Date().getTime();
      let t = endDate - now;
      if (t >= 0) {
        let days = Math.floor(t / (1000 * 60 * 60 * 24));
        let hours = Math.floor((t % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        let mins = Math.floor((t % (1000 * 60 * 60)) / (1000 * 60));
        let secs = Math.floor((t % (1000 * 60)) / 1000);
        // document.getElementById("timeH") = hours;
        // document.getElementById("timeM") = mins;
        // document.getElementById("timeS") = secs;
        if (hours == 0 && mins == 0 && secs == 0) {
          winner = true;
        }
      } else {
        if (winner == true) {
          // document.getElementById("expiry") = "BIDDING CLOSED";
          // Request account access if needed
          accounts = await ethereum.enable();
          // Acccounts now exposed
          deployer = accounts[0];

          let txResponse = await Auction.methods
            .getHighestBid()
            .call({
              from: deployer,
            })
            .then(function (result) {
              highest_bid = result;
              console.log(result);
            });

          txResponse = await Auction.methods
            .getHighestBidder()
            .call({
              from: deployer,
            })
            .then(function (result) {
              highest_bidder = result;
              console.log(result);
            });
          winner = false;
          document.getElementById("highest-bidder").innerHTML =
            "Highest Bidder: " + highest_bidder;
          document.getElementById("highest-bid").innerHTML =
            "Highest Bid: " + highest_bid + " Eth";
        }
      }
    }, 1000);
  });
};
