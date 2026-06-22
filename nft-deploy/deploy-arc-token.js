// deploy-arc-token.js — deploys ARC_Token (ERC-20) to Polygon Mainnet
// Usage:
//   1. Compile first: node compile-arc-token.js
//   2. Ensure .env has PRIVATE_KEY and POLYGON_RPC_URL
//   3. node deploy-arc-token.js
//
// Constructor args: (rewardsPool, treasury, team, liquidity, community, oracle)
// For initial deploy, deployer wallet receives all allocations (redistribute later).

require('dotenv').config();
const { ethers } = require('ethers');
const fs   = require('fs');
const path = require('path');

const RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-bor-rpc.publicnode.com';
const PK      = process.env.PRIVATE_KEY;

if (!PK) { console.error('❌  PRIVATE_KEY not set in .env'); process.exit(1); }

const artifactsDir = path.join(__dirname, 'artifacts');
if (!fs.existsSync(path.join(artifactsDir, 'ARC_Token.abi.json'))) {
  console.error('❌  Run node compile-arc-token.js first');
  process.exit(1);
}

const abi      = JSON.parse(fs.readFileSync(path.join(artifactsDir, 'ARC_Token.abi.json'), 'utf8'));
const bytecode = fs.readFileSync(path.join(artifactsDir, 'ARC_Token.bytecode.txt'), 'utf8').trim();

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PK, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log('🦊  Deployer:', wallet.address);
  console.log('💰  Balance :', ethers.formatEther(balance), 'POL');

  const network = await provider.getNetwork();
  console.log('🔗  Network :', network.name, '(chainId', network.chainId.toString() + ')');
  if (network.chainId !== 137n) {
    console.warn('⚠️  Expected Polygon mainnet (137)');
  }

  // Constructor(rewardsPool, treasury, team, liquidity, community, oracle)
  // Initial deploy: deployer holds all allocations, oracle = deployer
  const deployer = wallet.address;
  console.log('\n📊  Allocation targets (initial — all to deployer for later distribution):');
  console.log('   Rewards  40% →', deployer);
  console.log('   Treasury 20% →', deployer);
  console.log('   Team     15% →', deployer);
  console.log('   Liquidity10% →', deployer);
  console.log('   Community10% →', deployer);
  console.log('   Ukraine   5% → 0x165CD37b4C644C2921454429E7F9358d18A45e14 (hardcoded)');
  console.log('   Oracle      →', deployer);

  console.log('\n⚙️  Deploying ARC_Token (1B supply ERC-20) …');
  const factory  = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy(
    deployer,  // rewardsPool
    deployer,  // treasury
    deployer,  // team
    deployer,  // liquidity
    deployer,  // community
    deployer   // oracle
  );
  console.log('📨  TX hash :', contract.deploymentTransaction().hash);
  console.log('⏳  Waiting for confirmation …');

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log('\n🎉  ARC_Token deployed!');
  console.log('📍  Address  :', address);
  console.log('🔍  Explorer : https://polygonscan.com/address/' + address);
  console.log('💰  Total    : 1,000,000,000 ARC');

  fs.writeFileSync(path.join(artifactsDir, 'ARC_Token_address.txt'), address + '\n');
  console.log('✅  Address saved to artifacts/ARC_Token_address.txt');
}

main().catch(err => {
  console.error('❌  Deploy failed:', err.message || err);
  process.exit(1);
});
