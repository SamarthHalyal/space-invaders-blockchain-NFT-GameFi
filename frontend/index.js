import { MARKETPLACE_ADDRESS, PINATA_JWT_TOKEN, debug } from "./const.js";

let accounts = [];
let deployer = null;
let NFT, Marketplace, Auction;
let uploadedFileHash;
let clickedTokenID, clickedBasePrice;
let nftItemsMainArray;

const loadWeb3 = async () => {
  if (window.ethereum) {
    debug("found window.ethereum...");
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      window.web3 = new Web3(ethereum);
      accounts = await ethereum.enable();
      deployer = accounts[0];

      window.ethereum.on("accountsChanged", function (accounts) {
        // Time to reload your interface with accounts[0]!
        deployer = accounts[0];
      });

      return true;
    } catch (error) {
      debug("error occured in loading window.ethereum, ", error);
    }
  } else if (window.web3) {
    debug("found window.web3...");
    window.web3 = new Web3(web3.currentProvider);
    accounts = web3.eth.accounts;
    deployer = accounts[0];

    window.ethereum.on("accountsChanged", function (accounts) {
      // Time to reload your interface with accounts[0]!
      console.log(accounts[0]);
    });

    return true;
  } else {
    debug(
      "Non-Ethereum browser detected. You should consider trying MetaMask!"
    );
  }
  return false;
};

const loadContracts = async () => {
  Marketplace = new web3.eth.Contract(marketplace_ABI, MARKETPLACE_ADDRESS);

  await Marketplace.methods
    .getItems()
    .call({ from: deployer })
    .then(async function (nftsArray) {
      nftItemsMainArray = nftsArray;
      // fill the nft slider
      for (let index in nftsArray) {
        let nftItem = nftsArray[index];
        let currentURL = "";
        await Marketplace.methods
          .tokenURI(nftItem[1])
          .call({ from: deployer })
          .then(function (url) {
            currentURL = url;
          });
        document.getElementById("image-src-n").src =
          "https://gateway.pinata.cloud/ipfs/" + currentURL;
        document.getElementById("image-src-n").id = "image-src-" + index;

        document.getElementById("nft-name-n").innerHTML = nftItem[1];
        document.getElementById("nft-name-n").id = "nft-name-" + index;

        document.getElementById(
          "info-n"
        ).innerHTML = `Status: ${nftItem[0]}<br>Owner: ${nftItem[2]}<br>Base Price: ${nftItem[4]}`;
        document.getElementById("info-n").id = "nft-name-" + index;

        document.getElementById("nft-n").id = "nft-" + index;

        var equip_id = "equip-btn-" + index;
        document.getElementById("equip-btn-n").id = equip_id;
        document.getElementById(equip_id).addEventListener("click", () => {
          clickedTokenID = nftItem[1];
        });

        var listing_id = "listing-btn-" + index;
        document.getElementById("listing-btn-n").id = listing_id;
        document
          .getElementById(listing_id)
          .addEventListener("click", async () => {
            clickedTokenID = nftItem[1];
            let currentURL1 = "";
            await Marketplace.methods
              .tokenURI(clickedTokenID)
              .call({ from: deployer })
              .then(function (url) {
                currentURL1 = url;
              });
            document.getElementById("image-listing-src").src =
              "https://gateway.pinata.cloud/ipfs/" + currentURL1;
            document.getElementById(
              "listing-info"
            ).innerHTML = `Status: ${nftItem[0]}<br>Owner: ${nftItem[2]}<br>Listing Price: ${nftItem[3]}`;
          });

        var auction_id = "auction-btn-" + index;
        document.getElementById("auction-btn-n").id = auction_id;
        document
          .getElementById(auction_id)
          .addEventListener("click", async () => {
            clickedTokenID = nftItem[1];
            clickedBasePrice = nftItem[4];
            let currentURL2 = "";
            await Marketplace.methods
              .tokenURI(clickedTokenID)
              .call({ from: deployer })
              .then(function (url) {
                currentURL2 = url;
              });
            document.getElementById("image-auction-src").src =
              "https://gateway.pinata.cloud/ipfs/" + currentURL2;
            document.getElementById(
              "auction-info"
            ).innerHTML = `Status: ${nftItem[0]}<br>Owner: ${nftItem[2]}`;
          });
      }
    });
};

window.onload = async () => {
  document.getElementById("bid_amount_edit").disabled = true;
  document.getElementById("bid_button").disabled = true;
  document.getElementById("winner_button").disabled = true;

  const loadedSuccessfully = await loadWeb3();
  if (!loadedSuccessfully) return;

  await loadContracts();
  const callOptions = {
    from: deployer,
  };

  document.getElementById("list_button").addEventListener("click", async () => {
    let listing_price = document.getElementById("list_amount_edit").value;
    await Marketplace.methods
      .listItem(clickedTokenID, listing_price)
      .send(callOptions)
      .then(function (receipt) {
        console.log(receipt);
      });
  });

  document.addEventListener("click", (e) => {
    let element = e.target;
    console.log("click event triggered");
    if (element.id == "auction-btn-0") {
    }
    if (element.id == "auction-btn-1") {
    }
  });

  document
    .getElementById("nft-image-input")
    .addEventListener("change", function () {
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
        uploadedFileHash = response.IpfsHash;

        const nft1Image = document.getElementById("image-src-1");
        nft1Image.src = "https://gateway.pinata.cloud/ipfs/" + uploadedFileHash;
      });
    });

  document.getElementById("mint_nft").addEventListener("click", async () => {
    await Marketplace.methods
      .mintNFT(uploadedFileHash)
      .send(callOptions)
      .then(function (receipt) {
        debug(receipt);
      });
  });

  document.getElementById("bid_button").addEventListener("click", async () => {
    let biddingAmount = document.getElementById("bid_amount_edit").value;

    await Marketplace.methods
      .bid(clickedTokenID)
      .send({ from: deployer, value: biddingAmount })
      .then(function (receipt) {
        debug(receipt);
      });
  });

  document.getElementById("start_bid").addEventListener("click", async () => {
    document.getElementById("bid_amount_edit").disabled = false;
    document.getElementById("bid_button").disabled = false;
    var h = document.getElementById("timeH").value;
    var m = document.getElementById("timeM").value;
    var s = document.getElementById("timeS").value;
    let action_base_price = document.getElementById("base_auction_price").value;

    let endTime = parseInt(new Date().getTime() / 1000);
    endTime += h * 3600;
    endTime += m * 60;
    endTime += s;
    // now pass this

    var duration = new Date().getTime() + (h * 3600000 + m * 60000 + s * 1000);
    var timer = setInterval(async function () {
      let now = new Date().getTime();
      let t = duration - now;
      console.log(t);
      if (t >= 0) {
        let days = Math.floor(t / (1000 * 60 * 60 * 24));
        let hours = Math.floor((t % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        let mins = Math.floor((t % (1000 * 60 * 60)) / (1000 * 60));
        let secs = Math.floor((t % (1000 * 60)) / 1000);
        document.getElementById("timeH").value = hours;
        document.getElementById("timeM").value = mins;
        document.getElementById("timeS").value = secs;
      } else {
        document.getElementById("bid_amount_edit").disabled = true;
        document.getElementById("bid_button").disabled = true;
        document.getElementById("winner_button").disabled = false;
        clearInterval(timer);
      }
    }, 1000);

    await Marketplace.methods
      .startAuction(clickedTokenID, action_base_price, endTime)
      .send(callOptions)
      .then(function (receipt) {
        console.log(receipt);
      });
  });

  document
    .getElementById("winner_button")
    .addEventListener("click", async () => {
      document.getElementById("winner_button").disabled = true;

      await Marketplace.methods
        .getBidders(clickedTokenID)
        .call(callOptions)
        .then(function (bidderArray) {
          let last = 0;
          for (let index in bidderArray) {
            last = index;
          }
          document.getElementById(
            "winner-info"
          ).innerHTML = `Bidder: ${bidderArray[last][0]}<br>Bidding Price: ${bidderArray[last][1]}`;
        });
    });
};
