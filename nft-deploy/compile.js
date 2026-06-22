// compile.js — compiles UkrainianDefendersNFT.sol and writes ABI + bytecode
// Run: node compile.js
const solc = require('solc');
const fs   = require('fs');
const path = require('path');

const contractPath = path.join(__dirname, 'contracts', 'UkrainianDefendersNFT.sol');
const source       = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: { 'UkrainianDefendersNFT.sol': { content: source } },
  settings: {
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
    optimizer: { enabled: true, runs: 200 },
  },
};

console.log('⚙️  Compiling UkrainianDefendersNFT.sol …');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const errs = output.errors.filter(e => e.severity === 'error');
  if (errs.length) {
    errs.forEach(e => console.error('❌ ', e.formattedMessage));
    process.exit(1);
  }
  output.errors.forEach(e => console.warn('⚠️ ', e.formattedMessage));
}

const contract = output.contracts['UkrainianDefendersNFT.sol']['UkrainianDefendersNFT'];
if (!contract) {
  console.error('❌  Contract not found in output — check filename');
  process.exit(1);
}

const abi      = contract.abi;
const bytecode = '0x' + contract.evm.bytecode.object;

fs.mkdirSync(path.join(__dirname, 'artifacts'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'artifacts', 'UkrainianDefendersNFT.abi.json'), JSON.stringify(abi, null, 2));
fs.writeFileSync(path.join(__dirname, 'artifacts', 'UkrainianDefendersNFT.bytecode.txt'), bytecode);

console.log('✅  Compiled successfully');
console.log('   ABI      →  artifacts/UkrainianDefendersNFT.abi.json');
console.log('   Bytecode →  artifacts/UkrainianDefendersNFT.bytecode.txt');
console.log('   Bytecode size:', Math.round(bytecode.length / 2 - 1), 'bytes');
