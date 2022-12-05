window.onload = () => {
  let deployerArray = [];
  var node,
      NFT,
      accounts,
      deployer,
      MarketPlace,
      Auction,
      highest_bidder,
      highest_bid;
  const createNFTButton = document.getElementById("create-nft-button");
  const getNFTButton = document.getElementById("deploy-marketplace-button");
  const bidButton = document.getElementById("bid-button");
  const startBid = document.getElementById("start-bid-button");

  function myclick() {
      var myLink = document.getElementById("tab_3");
      myLink.onclick = function() {
          var script = document.createElement("script");
          script.type = "text/javascript";
          script.src = "sketch.js";
          console.log("GAMELINKCLiCKMYCLICK");

          document.getElementsByTagName("head")[0].appendChild(script);
          return false;
      };
      document.getElementById("tab_3").click();
  }

  async function startApp() {
      var AuctionAddress = "0x94Cf6DFC5A992A987e4dF86B4E2AE4fA23897784";
      Auction = new web3.eth.Contract(auction_abi, AuctionAddress);

      var MarketPlaceAddress = "0xB0a782Fa7B16397443F93626DE73Ce96BBdD950c";
      MarketPlace = new web3.eth.Contract(
          marketplace_abi,
          MarketPlaceAddress
      );

      var NFTAddress = "0xcf163e8bE1D2673388211AEC5EdEE53Dd913ECE1";
      NFT = new web3.eth.Contract(NFT_abi, NFTAddress);

      console.log("Created contract handles.");
  }

  // window.addEventListener("load", async () => {
  //   // Modern dapp browsers...
  //   if (window.ethereum) {
  //     await window.ethereum.request({ method: "eth_requestAccounts" });
  //     window.web3 = new Web3(ethereum);
  //     try {
  //       // Request account access if needed
  //       accounts = await ethereum.enable();
  //       // Acccounts now exposed
  //       deployer = accounts[0];
  //       startApp();
  //     } catch (error) {
  //       // User denied account access...
  //     }
  //   }
  //   // Legacy dapp browsers...
  //   else if (window.web3) {
  //     console.log("2");
  //     window.web3 = new Web3(web3.currentProvider);
  //     // Acccounts always exposed
  //     accounts = web3.eth.accounts;
  //     deployer = accounts[0];
  //     startApp();
  //   }
  //   // Non-dapp browsers...
  //   else {
  //     console.log(
  //       "Non-Ethereum browser detected. You should consider trying MetaMask!"
  //     );
  //   }
  // });

  createNFTButton.addEventListener("click", async () => {
      console.log("NFT Button Clicked");

      // Request account access if needed
      accounts = await ethereum.enable();
      // Acccounts now exposed
      deployer = accounts[0];

      await NFT.methods
          .mintNFT("TokenURI")
          .send({
              from: deployer
          })
          .then(function(receipt) {
              console.log(receipt);
          });
      document.getElementById("deployer").innerHTML = deployer;
      deployerArray.push(deployer);
      let htmlCode = ``;
      deployerArray.forEach(function(element) {
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

  getNFTButton.addEventListener("click", async () => {
      var listing_price = document.getElementById("listing-price");

      console.log("Listing Price: ", listing_price);

      // Request account access if needed
      accounts = await ethereum.enable();
      // Acccounts now exposed
      deployer = accounts[0];

      await MarketPlace.methods
          .listItem(deployer, 0, listing_price)
          .send({
              from: deployer,
              value: listing_price
          })
          .then(function(receipt) {
              console.log(receipt);
          });
  });

  bidButton.addEventListener("click", async () => {
      console.log("Bid Button Clicked");
      // Request account access if needed
      accounts = await ethereum.enable();
      // Acccounts now exposed
      deployer = accounts[0];
      const bidAmount = document.getElementById("bid-amount");
      await Auction.methods
          .bid()
          .send({
              from: deployer,
              value: bidAmount
          })
          .then(function(receipt) {
              console.log(receipt);
          });
      document.getElementById("deployer").innerHTML = deployer;
      deployerArray.push(deployer);
      let htmlCode = ``;
      deployerArray.forEach(function(element) {
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

  startBid.addEventListener("click", () => {
      document.getElementById("expiry") = "BIDDING ONGOING";
      var h = document.getElementById("timeH");
      var m = document.getElementById("timeM");
      var s = document.getElementById("timeS");

      var endDate =
          new Date().getTime() + (h * 3600000 + m * 60000 + s * 1000);
      var timer = setInterval(async function() {
          let now = new Date().getTime();
          let t = endDate - now;
          if (t >= 0) {
              let days = Math.floor(t / (1000 * 60 * 60 * 24));
              let hours = Math.floor(
                  (t % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
              );
              let mins = Math.floor((t % (1000 * 60 * 60)) / (1000 * 60));
              let secs = Math.floor((t % (1000 * 60)) / 1000);
              document.getElementById("timeH") = hours;
              document.getElementById("timeM") = mins;
              document.getElementById("timeS") = secs;
              if (hours == 0 && mins == 0 && secs == 0) {
                  winner = true;
              }
          } else {
              if (winner == true) {
                  document.getElementById("expiry") = "BIDDING CLOSED";
                  // Request account access if needed
                  accounts = await ethereum.enable();
                  // Acccounts now exposed
                  deployer = accounts[0];

                  let txResponse = await Auction.methods
                      .getHighestBid()
                      .call({
                          from: deployer
                      })
                      .then(function(result) {
                          highest_bid = result;
                          console.log(result);
                      });

                  txResponse = await Auction.methods
                      .getHighestBidder()
                      .call({
                          from: deployer
                      })
                      .then(function(result) {
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
}