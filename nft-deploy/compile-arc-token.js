// compile-arc-token.js — compiles ARC_Token.sol and writes ABI + bytecode
// Run: node compile-arc-token.js
const solc = require('solc');
const fs   = require('fs');
const path = require('path');

const contractPath = path.join(__dirname, '..', 'contracts', 'ARC_Token.sol');
const source       = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: { 'ARC_Token.sol': { content: source } },
  settings: {
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
    optimizer: { enabled: true, runs: 200 },
  },
};

console.log('⚙️  Compiling ARC_Token.sol …');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const errs = output.errors.filter(e => e.severity === 'error');
  if (errs.length) {
    errs.forEach(e => console.error('❌ ', e.formattedMessage));
    process.exit(1);
  }
  output.errors.forEach(e => console.warn('⚠️ ', e.formattedMessage));
}

const contract = output.contracts['ARC_Token.sol']['ARC_Token'];
if (!contract) {
  console.error('❌  Contract not found in output — check filename');
  process.exit(1);
}

const abi      = contract.abi;
const bytecode = '0x' + contract.evm.bytecode.object;

fs.mkdirSync(path.join(__dirname, 'artifacts'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'artifacts', 'ARC_Token.abi.json'), JSON.stringify(abi, null, 2));
fs.writeFileSync(path.join(__dirname, 'artifacts', 'ARC_Token.bytecode.txt'), bytecode);

console.log('✅  Compiled successfully');
console.log('   ABI      →  artifacts/ARC_Token.abi.json');
console.log('   Bytecode →  artifacts/ARC_Token.bytecode.txt');
console.log('   Bytecode size:', Math.round(bytecode.length / 2 - 1), 'bytes');
