const { network } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
	const { deploy, log } = deployments;
	const { deployer } = await getNamedAccounts();

	log("----------------------------------------------------");
	arguments = [];
	const marketplace = await deploy("Marketplace", {
		from: deployer,
		args: arguments,
		log: true,
		waitConfirmations: network.config.blockConfirmations || 1,
	});
};
