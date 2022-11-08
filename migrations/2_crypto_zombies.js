var CryptoZombies = artifacts.require("./zombiefactory.sol");
var CryptoZombies1 = artifacts.require("./zombiefeeding.sol");
var CryptoZombies2 = artifacts.require("./zombiehelper.sol");
var CryptoZombies3 = artifacts.require("./zombieownership.sol");
var CryptoZombies4 = artifacts.require("./zombieattack.sol");
var CryptoZombies5 = artifacts.require("./safemath");
module.exports = function(deployer) {
  deployer.deploy(CryptoZombies);
  deployer.deploy(CryptoZombies1);
  deployer.deploy(CryptoZombies2);
  deployer.deploy(CryptoZombies3);
  deployer.deploy(CryptoZombies4);
  deployer.deploy(CryptoZombies5);
};
