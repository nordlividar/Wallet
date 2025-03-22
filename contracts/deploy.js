const { ethers, upgrades } = require("hardhat");

async function main() {
  // Get the contract factory
  const WorldPulse = await ethers.getContractFactory("WorldPulse");
  
  // Deploy the proxy (upgradeable contract)
  const worldPulse = await upgrades.deployProxy(WorldPulse, [], { initializer: "initialize" });
  
  // Wait for the deployment transaction to be mined
  await worldPulse.waitForDeployment();
  
  // Get the deployed contract address
  const address = await worldPulse.getAddress();
  console.log("WorldPulse deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});