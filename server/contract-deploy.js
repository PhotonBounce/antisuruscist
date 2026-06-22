// ── Contract Deploy Module ─────────────────────────────────────────
// Serves pre-compiled contract artifacts and stores deployment records.
// Compilation is delegated to existing nft-deploy/ scripts.

const fs   = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const ARTIFACTS_DIR = path.join(__dirname, '..', 'nft-deploy', 'artifacts');
const CONTRACTS_DIR = path.join(__dirname, '..', 'contracts');
const NFT_DEPLOY_DIR = path.join(__dirname, '..', 'nft-deploy');

// Contract metadata — constructor signatures for the admin UI
const CONTRACT_META = {
  'UkrainianDefendersNFT': {
    label: 'Ukrainian Defenders NFT (ERC-721)',
    solFile: 'UkrainianDefendersNFT.sol',
    abiFile: 'UkrainianDefendersNFT.abi.json',
    bytecodeFile: 'UkrainianDefendersNFT.bytecode.txt',
    constructorArgs: [
      { name: 'baseURI_', type: 'string', label: 'Base Token URI', default: 'https://anti-ruscist.xyz/nft/metadata/' }
    ]
  },
  'ARC_Token': {
    label: 'ARC Token (ERC-20)',
    solFile: 'ARC_Token.sol',
    abiFile: 'ARC_Token.abi.json',
    bytecodeFile: 'ARC_Token.bytecode.txt',
    constructorArgs: [
      { name: 'rewardsPool', type: 'address', label: 'Rewards Pool Address', default: 'DEPLOYER' },
      { name: 'treasury',    type: 'address', label: 'Treasury Address',     default: 'DEPLOYER' },
      { name: 'team',        type: 'address', label: 'Team Address',         default: 'DEPLOYER' },
      { name: 'liquidity',   type: 'address', label: 'Liquidity Address',    default: 'DEPLOYER' },
      { name: 'community',   type: 'address', label: 'Community Address',    default: 'DEPLOYER' },
      { name: 'oracle_',     type: 'address', label: 'Oracle Address',       default: 'DEPLOYER' }
    ]
  },
  'ARC_KillNFT': {
    label: 'Kill Achievement NFT (Soulbound)',
    solFile: 'ARC_KillNFT.sol',
    abiFile: 'ARC_KillNFT.abi.json',
    bytecodeFile: 'ARC_KillNFT.bytecode.txt',
    constructorArgs: [
      { name: 'oracle_', type: 'address', label: 'Oracle Address',    default: 'DEPLOYER' },
      { name: 'baseURI_', type: 'string',  label: 'Base Token URI',   default: 'https://anti-ruscist.xyz/nft/metadata/kills/' }
    ]
  }
};

function initContractDeploy(app, db, adminAuth, adminOnly) {

  // ── GET /api/admin/contract/artifacts ──────────────────────────
  // Returns compiled ABI + bytecode for all contracts
  app.get('/api/admin/contract/artifacts', adminAuth, adminOnly, (req, res) => {
    const results = {};
    for (const [name, meta] of Object.entries(CONTRACT_META)) {
      const abiPath = path.join(ARTIFACTS_DIR, meta.abiFile);
      const bytecodePath = path.join(ARTIFACTS_DIR, meta.bytecodeFile);
      const solPath = path.join(CONTRACTS_DIR, meta.solFile);

      const compiled = fs.existsSync(abiPath) && fs.existsSync(bytecodePath);
      const sourceExists = fs.existsSync(solPath);

      results[name] = {
        label: meta.label,
        constructorArgs: meta.constructorArgs,
        sourceExists,
        compiled,
        abi: null,
        bytecode: null
      };

      if (compiled) {
        try {
          results[name].abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
          results[name].bytecode = fs.readFileSync(bytecodePath, 'utf8').trim();
        } catch (e) {
          results[name].compiled = false;
          results[name].error = 'Failed to read artifacts: ' + e.message;
        }
      }
    }
    res.json(results);
  });

  // ── POST /api/admin/contract/compile ──────────────────────────
  // Compiles contracts using existing nft-deploy scripts
  app.post('/api/admin/contract/compile', adminAuth, adminOnly, (req, res) => {
    const { contract } = req.body;

    // Map contract names to compile scripts
    const compileScripts = {
      'UkrainianDefendersNFT': 'compile.js',
      'ARC_Token': 'compile-arc-token.js',
      'ARC_KillNFT': null // No separate compile script; uses hardhat or manual
    };

    if (contract && !CONTRACT_META[contract]) {
      return res.status(400).json({ error: 'Unknown contract: ' + contract });
    }

    const toCompile = contract ? [contract] : Object.keys(compileScripts);
    const results = [];
    let pending = 0;
    let responded = false;

    for (const name of toCompile) {
      const scriptName = compileScripts[name];
      if (!scriptName) {
        // Check if artifacts already exist
        const abiPath = path.join(ARTIFACTS_DIR, CONTRACT_META[name].abiFile);
        if (fs.existsSync(abiPath)) {
          results.push({ contract: name, status: 'ok', message: 'Pre-compiled artifacts exist' });
        } else {
          results.push({ contract: name, status: 'skip', message: 'No compile script available — compile manually with Hardhat' });
        }
        continue;
      }

      pending++;
      const scriptPath = path.join(NFT_DEPLOY_DIR, scriptName);

      if (!fs.existsSync(scriptPath)) {
        results.push({ contract: name, status: 'error', message: 'Compile script not found: ' + scriptName });
        pending--;
        continue;
      }

      execFile('node', [scriptPath], {
        cwd: NFT_DEPLOY_DIR,
        timeout: 60000,
        env: { PATH: process.env.PATH, NODE_PATH: process.env.NODE_PATH || '' }
      }, (err, stdout, stderr) => {
        if (err) {
          results.push({
            contract: name, status: 'error',
            message: (stderr || err.message || 'Compilation failed').slice(0, 500)
          });
        } else {
          results.push({
            contract: name, status: 'ok',
            message: (stdout || 'Compiled successfully').trim().slice(0, 500)
          });
        }
        pending--;
        if (pending === 0 && !responded) {
          responded = true;
          res.json({ results });
        }
      });
    }

    // If nothing was async, respond immediately
    if (pending === 0 && !responded) {
      responded = true;
      res.json({ results });
    }
  });

  // ── POST /api/admin/contract/save-deployment ──────────────────
  // Saves a deployment record after client-side deployment via MetaMask
  app.post('/api/admin/contract/save-deployment', adminAuth, adminOnly, (req, res) => {
    const { contractName, network, chainId, address, deployer, txHash, blockNumber, constructorArgs } = req.body;

    if (!contractName || !address || !txHash || !deployer || !chainId) {
      return res.status(400).json({ error: 'Missing required fields: contractName, address, txHash, deployer, chainId' });
    }

    // Validate contract name
    if (!CONTRACT_META[contractName]) {
      return res.status(400).json({ error: 'Unknown contract: ' + contractName });
    }

    // Basic address/hash validation
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid contract address format' });
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(deployer)) {
      return res.status(400).json({ error: 'Invalid deployer address format' });
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      return res.status(400).json({ error: 'Invalid transaction hash format' });
    }

    try {
      const stmt = db.prepare(`
        INSERT INTO contract_deployments (contract_name, network, chain_id, address, deployer, tx_hash, block_number, constructor_args)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        contractName,
        network || 'unknown',
        chainId,
        address,
        deployer,
        txHash,
        blockNumber || null,
        constructorArgs ? JSON.stringify(constructorArgs) : null
      );
      res.json({ ok: true, id: info.lastInsertRowid });
    } catch (e) {
      res.status(500).json({ error: 'Failed to save: ' + e.message });
    }
  });

  // ── GET /api/admin/contract/deployments ───────────────────────
  // Lists all deployment records
  app.get('/api/admin/contract/deployments', adminAuth, adminOnly, (req, res) => {
    try {
      const rows = db.prepare(
        'SELECT id, contract_name, network, chain_id, address, deployer, tx_hash, block_number, status, deployed_at FROM contract_deployments ORDER BY deployed_at DESC LIMIT 100'
      ).all();
      res.json(rows);
    } catch (e) {
      res.json([]);
    }
  });
}

module.exports = { initContractDeploy };
