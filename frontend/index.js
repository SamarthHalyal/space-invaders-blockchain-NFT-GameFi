import {
  MARKETPLACE_ADDRESS,
  PINATA_JWT_TOKEN,
  PINATA_GATEWAY_PREFIX,
  debug,
} from "./const.js";

let accounts, currentUser;
let Marketplace;
let clickedTokenID;
let currItemId = 0;
let selectedToken;
let items = [];

const loadWeb3 = async () => {
  if (window.ethereum) {
    debug("found window.ethereum...");
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      window.web3 = new Web3(ethereum);
      accounts = await ethereum.enable();
      currentUser = accounts[0];

      window.ethereum.on("accountsChanged", function (accounts) {
        // Time to reload your interface with accounts[0]!
        currentUser = accounts[0];
      });

      return true;
    } catch (error) {
      debug("error occured in loading window.ethereum, ", error);
    }
  } else if (window.web3) {
    debug("found window.web3...");
    window.web3 = new Web3(web3.currentProvider);
    accounts = web3.eth.accounts;
    currentUser = accounts[0];

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

const setUp = () => {
  // toggle mobile menu
  $('[data-toggle="toggle-nav"]').on("click", function () {
    $(this)
      .closest("nav")
      .find($(this).attr("data-target"))
      .toggleClass("hidden");
    return false;
  });

  // feather icons
  feather.replace();

  $("#slider").slick({
    dots: true,
    arrows: true,
    infinite: true,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: false,
    autoplaySpeed: 2000,
    centerMode: false,
    customPaging: function (slider, i) {
      return (
        '<div class="bg-white br-round w-2 h-2 opacity-50 mt-5" id=' +
        i +
        "> </div>"
      );
    },
    responsive: [
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  });
};

const loadContracts = async () => {
  Marketplace = new web3.eth.Contract(marketplace_ABI, MARKETPLACE_ADDRESS);
};

const uploadToPinata = async (selectedFile) => {
  const data = new FormData();
  const metadata = JSON.stringify({
    name: selectedFile["name"],
  });
  data.append("pinataMetadata", metadata);
  data.append("file", selectedFile, selectedFile["name"]);

  let fileHash;
  await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT_TOKEN}`,
    },
    body: data,
  }).then(async (response) => {
    response = await response.json();
    fileHash = response.IpfsHash;
  });

  return fileHash;
};

const addNFTCard = async (fileHash, item) => {
  let currId = currItemId;
  if (currId == 0) {
    await $("#slider").slick("slickRemove", 0);
  }
  await $("#slider").slick(
    "slickAdd",
    `<div>
      <a class="block hover-bg-indigo-lightest-10 ease-300" style="text-align: center; padding: 10px;">
        <img src="${PINATA_GATEWAY_PREFIX}/${fileHash}" alt="NFT-Image" style="width: 100%; height: 300px">
        <p id="nft-name-${currId}" class="fw-600 white fs-m3 mt-3">
          ${item?.status}
        </p>
        <div id="nft-info-${currId}" class="indigo fs-s3 italic my-4">Information about NFT</div>
        <div class="inline-flex">
            <button id="listing-btn-${currId}" class="sm-mx-1 button half bg-indigo white hover-opacity-100 hover-scale-up-1 ease-300">LIST</button>
            <button id="auction-btn-${currId}" class="sm-mx-1 button half bg-indigo white hover-opacity-100 hover-scale-up-1 ease-300">AUCTION</button>
            <button id="equip-btn-${currId}" class="sm-mx-1 button half bg-indigo white hover-opacity-100 hover-scale-up-1 ease-300">EQUIP</button>
        </div>
      </a>
    </div>`
  );

  const listButton = document.getElementById(`listing-btn-${currId}`);
  const auctionButton = document.getElementById(`auction-btn-${currId}`);
  const equipButton = document.getElementById(`equip-btn-${currId}`);

  const listPriceInput = document.getElementById("list-amount-input");
  listPriceInput.value = "";

  const basePriceInput = document.getElementById("base_auction_price");
  basePriceInput.value = "";

  const amIOwner = item
    ? item.owner.toLowerCase() == currentUser.toLowerCase()
    : false;

  if (item) {
    if (amIOwner) {
      if (item.status == "Created" || item.status == "Bought") {
        listButton.addEventListener("click", () => {
          selectedToken = currId;
          window.location = "#listing";
        });
        auctionButton.addEventListener("click", () => {
          selectedToken = currId;
          window.location = "#auctions";
        });
        equipButton.addEventListener("change", () => {
          selectedToken = currId;
          // <TODO> change spaceship
        });
      } else if (item.status == "Listed") {
        listButton.innerHTML = "LISTED";
        auctionButton.disabled = true;

        listButton.addEventListener("click", () => {
          selectedToken = currId;
          listPriceInput.value = item.listingPrice;
          window.location = "#listing";
        });
      } else if (item.status == "On Auction") {
        listButton.disabled = true;
        auctionButton.innerHTML = "ON AUCTION";

        auctionButton.addEventListener("click", () => {
          selectedToken = currId;
          basePriceInput.value = item.basePrice;
          window.location = "#auction";
        });
      }
    } else {
      if (item.status == "Created" || item.status == "Bought") {
        listButton.disabled = true;
        auctionButton.disabled = true;
      } else if (item.status == "Listed") {
        listButton.innerHTML = "BUY";
        document.getElementById("list-button").innerHTML = "BUY";
        listButton.addEventListener("click", () => {
          selectedToken = currId;
          listPriceInput.value = item.listingPrice;
          window.location = "#listing";
        });
        auctionButton.disabled = true;
      } else if (item.status == "On Auction") {
        listButton.disabled = true;
        auctionButton.innerHTML = "BID";
        auctionButton.addEventListener("click", () => {
          selectedToken = currId;
          window.location = "#auctions";
        });
      }
    }
  } else {
    listButton.addEventListener("click", () => {
      selectedToken = currId;
      window.location = "#listing";
    });
    auctionButton.addEventListener("click", () => {
      selectedToken = currId;
      window.location = "#auctions";
    });
    equipButton.addEventListener("change", () => {
      selectedToken = currId;
      // <TODO> change spaceship
    });
  }

  items.push(item);
  currItemId += 1;
};
window.onload = async () => {
  setUp();
  const loadedSuccessfully = await loadWeb3();
  if (!loadedSuccessfully) return;

  await loadContracts();
  const callOptions = {
    from: currentUser,
  };

  await Marketplace.methods
    .getItems()
    .call(callOptions)
    .then(async (_items) => {
      for (let item of _items) {
        const tokenURI = await Marketplace.methods
          .tokenURI(item.tokenId)
          .call(callOptions);

        addNFTCard(tokenURI, item);
      }
    });

  document.getElementById("list-button").addEventListener("click", async () => {
    let listing_price = document.getElementById("list-amount-input").value;
    console.log(listing_price, selectedToken);
    if (items[selectedToken].status == "Listed") {
      await Marketplace.methods
        .buyItem(selectedToken)
        .send({ ...callOptions, value: listing_price });
    } else if (items[selectedToken].status != "On Auction") {
      await Marketplace.methods
        .listItem(selectedToken, listing_price)
        .send(callOptions);
      document.getElementById("list-button").innerHTML = "Listed";
      document.getElementById("list-button").disabled = true;
    }
  });

  document.getElementById("mint_nft").addEventListener("click", async () => {
    const selectedFile = document.getElementById("nft-image-input").files[0];
    const fileHash = await uploadToPinata(selectedFile);

    await Marketplace.methods.mintNFT(fileHash).send(callOptions);
    const item = await Marketplace.methods.getItem(currItemId);
    addNFTCard(fileHash);
  });

  document.getElementById("bid_button").addEventListener("click", async () => {
    let biddingAmount = document.getElementById("bid_amount_edit").value;

    await Marketplace.methods
      .bid(selectedToken)
      .send({ ...callOptions, value: biddingAmount });
  });

  document.getElementById("start_bid").addEventListener("click", async () => {
    var h = document.getElementById("timeH").value;
    var m = document.getElementById("timeM").value;
    var s = document.getElementById("timeS").value;
    let action_base_price = document.getElementById("base_auction_price").value;

    let endTime = parseInt(new Date().getTime() / 1000);
    endTime += h * 3600;
    endTime += m * 60;
    endTime += s;

    var duration = new Date().getTime() + (h * 3600000 + m * 60000 + s * 1000);
    var timer = setInterval(async function () {
      let now = new Date().getTime();
      let t = duration - now;
      if (t >= 0) {
        let hours = Math.floor((t % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        let mins = Math.floor((t % (1000 * 60 * 60)) / (1000 * 60));
        let secs = Math.floor((t % (1000 * 60)) / 1000);
        document.getElementById("timeH").value = hours;
        document.getElementById("timeM").value = mins;
        document.getElementById("timeS").value = secs;
      } else {
        clearInterval(timer);
      }
    }, 1000);

    await Marketplace.methods
      .startAuction(selectedToken, action_base_price, endTime)
      .send(callOptions);
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
