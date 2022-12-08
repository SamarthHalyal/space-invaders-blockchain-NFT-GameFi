# Team Space-Invaders

Blockchain Semester Final Project

Project link: https://github.com/SamarthHalyal/space-invaders-blockchain-NFT-GameFi.git

## Team Members:

- Samarth Halyal
  **cwid: 885208629**
  samarthhalyal@csu.fullerton.edu
- Pallavi Khedle
  **cwid: 885190496**
  pallavi.k@csu.fullerton.edu
- Harin Khakhi
  **cwid: 885185769**
  harin.khakhi@csu.fullerton.edu
- Vinay Shah
  **cwid: 885210930**
  vinayshah12@csu.fullerton.edu

## Space-Invaders

We are creating project from scratch without any base code repository. Instead of considering these as improvements we have implemented following points.

1. Working game made from scratch
2. Spaceship as NFT
3. NFT Market Place
   1. Minting Spaceships
   2. Listing Spaceships to Marketplace
   3. Update/Cancel Listings
   4. Buy Spaceships from Marketplace
4. Uploading NFT Images/Metadata to IPFS
5. Auction for NFTs
   1. Start Multiple Auction
   2. Bid on Auctions
   3. Automated timer (in Backend) to close Auction - Chainlink Keepers
6. Tuffy Verse integration
7. 100% test coverage (47 total tests)
8. Deploying to multiple testnets (goerli)
9. Interactive UI combining all parts
10. Deployed frontend to public server (vercel)

Following code has to be run to start the project

Downloading

```
git clone https://github.com/SamarthHalyal/space-invaders-blockchain-NFT-GameFi.git
```

Backend

```
yarn install
yarn hardhat deploy --network localhost
```

if you want to deploy it to public testnets,

```
yarn hardhat deploy --network goerli
```

Frontend
you just need to start local http server
there are multiple options,

```
npm install
npm run start
```
