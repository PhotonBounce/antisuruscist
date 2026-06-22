// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  Anti-Ruscist Coin (ARC)
 * @notice ERC-20 play-to-earn token for the Anti-Ruscist Coin game.
 *         Deployed on Polygon Mainnet.
 *
 * Tokenomics (1 billion supply):
 *   40%  — Player rewards pool        (claimable via backend oracle)
 *   20%  — Treasury / ecosystem       (timelock 2 years)
 *   15%  — Team & advisors            (vested 4 years, 1-year cliff)
 *   10%  — Liquidity provision        (DEX bootstrap)
 *   10%  — Community events & airdrops
 *   05%  — Ukraine humanitarian fund  (direct donation wallet)
 *
 * Ukraine donation wallet (verified): 0x165CD37b4C644C2921454429E7F9358d18A45e14
 */

interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    function totalSupply()                           external view returns (uint256);
    function balanceOf(address account)             external view returns (uint256);
    function transfer(address to, uint256 amount)   external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount)  external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IERC20Metadata is IERC20 {
    function name()     external view returns (string memory);
    function symbol()   external view returns (string memory);
    function decimals() external view returns (uint8);
}

contract ARC_Token is IERC20Metadata {
    // ── Token metadata ───────────────────────────────────────────────────────
    string  public constant name     = "Anti-Ruscist Coin";
    string  public constant symbol   = "ARC";
    uint8   public constant decimals = 18;

    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 1e18; // 1B ARC

    // ── Allocation wallets (set at deploy) ───────────────────────────────────
    address public immutable UKRAINE_WALLET = 0x165CD37b4C644C2921454429E7F9358d18A45e14;
    address public owner;

    // ── Oracle that signs off-chain claim proofs ──────────────────────────────
    address public claimOracle;

    // ── ERC-20 state ──────────────────────────────────────────────────────────
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;

    // ── Claim state ───────────────────────────────────────────────────────────
    mapping(bytes32 => bool) private _usedNonces;   // prevent double-claim
    uint256 public totalClaimed;

    // ── Events ────────────────────────────────────────────────────────────────
    event Claimed(address indexed player, uint256 amount, bytes32 nonce);
    event OracleUpdated(address indexed newOracle);
    event OwnershipTransferred(address indexed prev, address indexed next);

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyOwner() { require(msg.sender == owner, "ARC: not owner"); _; }

    // ── Constructor ───────────────────────────────────────────────────────────
    /**
     * @param rewardsPool   40% — backend oracle funds claims from this wallet
     * @param treasury      20%
     * @param team          15%
     * @param liquidity     10%
     * @param community     10%
     * @param oracle_       Oracle address that signs claim proofs
     */
    constructor(
        address rewardsPool,
        address treasury,
        address team,
        address liquidity,
        address community,
        address oracle_
    ) {
        owner       = msg.sender;
        claimOracle = oracle_;

        uint256 s = TOTAL_SUPPLY;
        _mint(rewardsPool,       s * 40 / 100);  // 40% rewards
        _mint(treasury,          s * 20 / 100);  // 20% treasury
        _mint(team,              s * 15 / 100);  // 15% team
        _mint(liquidity,         s * 10 / 100);  // 10% liquidity
        _mint(community,         s * 10 / 100);  // 10% community
        _mint(UKRAINE_WALLET,    s *  5 / 100);  // 5%  Ukraine fund
    }

    // ── ERC-20 Core ───────────────────────────────────────────────────────────
    function totalSupply() external view returns (uint256) { return _totalSupply; }
    function balanceOf(address a) external view returns (uint256) { return _balances[a]; }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }
    function allowance(address owner_, address spender) external view returns (uint256) {
        return _allowances[owner_][spender];
    }
    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = _allowances[from][msg.sender];
        require(allowed >= amount, "ARC: allowance exceeded");
        unchecked { _allowances[from][msg.sender] = allowed - amount; }
        _transfer(from, to, amount);
        return true;
    }

    // ── Claim (oracle signature) ──────────────────────────────────────────────
    /**
     * @notice Claim ARC earned in-game. The backend oracle signs a proof of
     *         the (player, amount, nonce) tuple. Frontend calls this after
     *         receiving the signed proof from the /api/arc/claim endpoint.
     *
     * @param amount      ARC amount in wei (18 decimals)
     * @param nonce       Unique bytes32 nonce — prevents replay
     * @param v r s       ECDSA signature components from oracle
     */
    function claim(
        uint256 amount,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(!_usedNonces[nonce], "ARC: nonce already used");
        // Reconstruct the message the oracle signed
        bytes32 msgHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n84",
                msg.sender,
                amount,
                nonce
            )
        );
        require(ecrecover(msgHash, v, r, s) == claimOracle, "ARC: invalid sig");
        _usedNonces[nonce] = true;
        // Transfer from contract balance (rewards pool must have approved this
        // contract, or contract itself holds the rewards allocation)
        _transfer(address(this), msg.sender, amount);
        totalClaimed += amount;
        emit Claimed(msg.sender, amount, nonce);
    }

    // ── Admin ────────────────────────────────────────────────────────────────
    function setOracle(address oracle_) external onlyOwner {
        claimOracle = oracle_;
        emit OracleUpdated(oracle_);
    }
    function transferOwnership(address newOwner) external onlyOwner {
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ── Internal helpers ──────────────────────────────────────────────────────
    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "ARC: mint to zero");
        _totalSupply      += amount;
        _balances[to]     += amount;
        emit Transfer(address(0), to, amount);
    }
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "ARC: from zero");
        require(to   != address(0), "ARC: to zero");
        require(_balances[from] >= amount, "ARC: insufficient balance");
        unchecked {
            _balances[from] -= amount;
            _balances[to]   += amount;
        }
        emit Transfer(from, to, amount);
    }
}
