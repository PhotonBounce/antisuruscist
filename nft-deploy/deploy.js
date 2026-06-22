// deploy.js — deploys UkrainianDefendersNFT to Polygon Mainnet
// Usage:
//   1.  Copy .env.example → .env  and fill in PRIVATE_KEY
//   2.  Ensure wallet has POL for gas fees
//   3.  node compile.js          (only needed once, or after contract edits)
//   4.  node deploy.js
//   5.  Copy the deployed address into main.js  →  NFT_CONTRACT_ADDRESS = '0x...'

require('dotenv').config();
const { ethers } = require('ethers');
const fs   = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────────
const AMOY_RPC  = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
const PK        = process.env.PRIVATE_KEY;
const BASE_URI  = process.env.BASE_TOKEN_URI || 'https://anti-ruscist.xyz/nft/metadata/';

if (!PK) {
  console.error('❌  PRIVATE_KEY not set in .env — see .env.example');
  process.exit(1);
}

// ── Load artifacts ───────────────────────────────────────────────────────────
const artifactsDir = path.join(__dirname, 'artifacts');
if (!fs.existsSync(path.join(artifactsDir, 'UkrainianDefendersNFT.abi.json'))) {
  console.error('❌  Artifacts not found — run  node compile.js  first');
  process.exit(1);
}
const abi      = JSON.parse(fs.readFileSync(path.join(artifactsDir, 'UkrainianDefendersNFT.abi.json'), 'utf8'));
const bytecode = fs.readFileSync(path.join(artifactsDir, 'UkrainianDefendersNFT.bytecode.txt'), 'utf8').trim();

// ── Deploy ───────────────────────────────────────────────────────────────────
async function main() {
  const provider = new ethers.JsonRpcProvider(AMOY_RPC);
  const wallet   = new ethers.Wallet(PK, provider);

  const balance  = await provider.getBalance(wallet.address);
  console.log('🦊  Deployer:', wallet.address);
  console.log('💰  Balance :', ethers.formatEther(balance), 'POL');

  if (balance === 0n) {
    console.error('❌  Zero balance — wallet needs POL for gas fees');
    process.exit(1);
  }

  const network = await provider.getNetwork();
  console.log('🔗  Network :', network.name, '(chainId', network.chainId.toString() + ')');
  if (network.chainId !== 137n) {
    console.warn('⚠️   Expected Polygon mainnet (137) — double-check POLYGON_RPC_URL in .env');
  }

  console.log('\n⚙️   Deploying UkrainianDefendersNFT …');
  const factory  = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy(BASE_URI);
  console.log('📨  TX hash :', contract.deploymentTransaction().hash);
  console.log('⏳  Waiting for confirmation …');

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log('\n🎉  Contract deployed!');
  console.log('📍  Address  :', address);
  console.log('🔍  Explorer : https://polygonscan.com/address/' + address);
  console.log('\n👉  Now paste this into main.js:');
  console.log('    const NFT_CONTRACT_ADDRESS = \'' + address + '\';');

  // Write address to file for convenience
  fs.writeFileSync(
    path.join(__dirname, 'artifacts', 'deployed_address.txt'),
    address + '\n'
  );
  console.log('\n✅  Address also saved to artifacts/deployed_address.txt');
}

main().catch(err => {
  console.error('❌  Deploy failed:', err.message || err);
  process.exit(1);
});
