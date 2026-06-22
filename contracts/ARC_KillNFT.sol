// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  ARC Kill Achievement NFT (KillNFT)
 * @notice Soulbound (non-transferable) achievement NFTs for the Anti-Ruscist
 *         Coin game. Each tier grants an on-chain earn multiplier for ARC.
 *
 * Tiers (by total kills across all sessions):
 *   TIER 1 — Rookie      (  25 kills)  → ARC earn ×1.05   tokenId range: 1–99999
 *   TIER 2 — Fighter     ( 100 kills)  → ARC earn ×1.10   tokenId range: 100000–199999
 *   TIER 3 — Veteran     ( 250 kills)  → ARC earn ×1.25   tokenId range: 200000–299999
 *   TIER 4 — Elite       ( 500 kills)  → ARC earn ×1.50   tokenId range: 300000–399999
 *   TIER 5 — Legend      (1000 kills)  → ARC earn ×2.00   tokenId range: 400000–499999
 *
 * Soulbound: these tokens CANNOT be transferred — they are permanently bound
 *            to the wallet that achieved the kill milestone.
 *
 * Oracle: the claim oracle (backend) must sign off on the kill count before
 *         a player can mint their KillNFT tier.
 */

interface IERC165 {
    function supportsInterface(bytes4 id) external view returns (bool);
}

contract ARC_KillNFT is IERC165 {
    // ── Constants ──────────────────────────────────────────────────────────────
    string public constant name   = "ARC Kill Achievement";
    string public constant symbol = "ARCKILL";

    struct Tier {
        uint8   id;
        string  name;
        uint256 killsRequired;
        uint16  multiplierBps; // basis points: 10000 = 1x, 10500 = 1.05x, etc.
        uint256 startId;       // tokenId range start
    }

    uint8 public constant TIER_COUNT = 5;
    Tier[5] public tiers;

    // ── ERC-721 state (soulbound — no transfer) ───────────────────────────────
    mapping(uint256 => address) private _owners;          // tokenId → owner
    mapping(address => uint256[]) private _ownedTokens;   // wallet → tokenIds
    mapping(address => mapping(uint8 => bool)) public hasTier; // wallet → tier → minted
    mapping(uint256 => string) public achievementURI;     // per-token metadata URI

    uint256 private _nextId = 1;
    uint256 public  totalMinted;

    // ── Admin & oracle ────────────────────────────────────────────────────────
    address public owner;
    address public claimOracle;
    string  private _baseURI;
    mapping(bytes32 => bool) private _usedNonces;

    // ── Events ────────────────────────────────────────────────────────────────
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event KillNFTMinted(address indexed player, uint8 tier, uint256 tokenId, uint256 kills);

    // ── Modifier ──────────────────────────────────────────────────────────────
    modifier onlyOwner() { require(msg.sender == owner, "KillNFT: not owner"); _; }

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(address oracle_, string memory baseURI_) {
        owner       = msg.sender;
        claimOracle = oracle_;
        _baseURI    = baseURI_;

        // Initialise tier data
        tiers[0] = Tier(1, "Rookie",   25,   10500, 1);
        tiers[1] = Tier(2, "Fighter",  100,  11000, 100_000);
        tiers[2] = Tier(3, "Veteran",  250,  12500, 200_000);
        tiers[3] = Tier(4, "Elite",    500,  15000, 300_000);
        tiers[4] = Tier(5, "Legend",   1000, 20000, 400_000);
    }

    // ── Mint (oracle-validated) ───────────────────────────────────────────────
    /**
     * @notice Mint a KillNFT for the given tier. Requires a valid oracle
     *         signature proving the player achieved the kill milestone.
     *
     * @param tierId   1–5 (see Tier table above)
     * @param kills    Player's verified kill count
     * @param nonce    Unique bytes32 to prevent replay
     * @param v r s    ECDSA signature from claimOracle
     */
    function mintTier(
        uint8   tierId,
        uint256 kills,
        bytes32 nonce,
        uint8   v,
        bytes32 r,
        bytes32 s
    ) external {
        require(tierId >= 1 && tierId <= TIER_COUNT, "KillNFT: invalid tier");
        require(!hasTier[msg.sender][tierId],         "KillNFT: already minted");
        require(!_usedNonces[nonce],                  "KillNFT: nonce used");

        Tier storage t = tiers[tierId - 1];
        require(kills >= t.killsRequired, "KillNFT: insufficient kills");

        // Verify oracle signature over (player, tierId, kills, nonce)
        bytes32 msgHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n85",
                msg.sender,
                tierId,
                kills,
                nonce
            )
        );
        require(ecrecover(msgHash, v, r, s) == claimOracle, "KillNFT: bad sig");

        _usedNonces[nonce]           = true;
        hasTier[msg.sender][tierId]  = true;

        uint256 tokenId = t.startId + (totalMinted % 99999);
        // Ensure no collision
        while (_owners[tokenId] != address(0)) { unchecked { tokenId++; } }

        _owners[tokenId] = msg.sender;
        _ownedTokens[msg.sender].push(tokenId);
        totalMinted++;

        achievementURI[tokenId] = string(
            abi.encodePacked(_baseURI, _toString(uint256(tierId)), "/", _toString(tokenId))
        );

        emit Transfer(address(0), msg.sender, tokenId);
        emit KillNFTMinted(msg.sender, tierId, tokenId, kills);
    }

    // ── Multiplier query ──────────────────────────────────────────────────────
    /**
     * @notice Returns the highest active multiplier in basis points for wallet.
     *         10000 = 1x (baseline), 20000 = 2x.
     *         Frontend divides result by 10000 to get float multiplier.
     */
    function getMultiplierBps(address wallet) external view returns (uint16 best) {
        best = 10000; // baseline 1x
        for (uint8 i = 1; i <= TIER_COUNT; i++) {
            if (hasTier[wallet][i] && tiers[i-1].multiplierBps > best) {
                best = tiers[i-1].multiplierBps;
            }
        }
    }

    /**
     * @notice Returns all tier NFTs owned by wallet.
     */
    function tokensOf(address wallet) external view returns (uint256[] memory) {
        return _ownedTokens[wallet];
    }

    /**
     * @notice Returns which tiers (1–5) the wallet has minted, as a bitmask.
     *         bit 0 = tier 1, bit 4 = tier 5.
     */
    function tierBitmask(address wallet) external view returns (uint8 mask) {
        for (uint8 i = 1; i <= TIER_COUNT; i++) {
            if (hasTier[wallet][i]) mask |= uint8(1 << (i - 1));
        }
    }

    // ── ERC-721 view (read-only — soulbound prevents transfer) ───────────────
    function ownerOf(uint256 tokenId) external view returns (address) {
        require(_owners[tokenId] != address(0), "KillNFT: not minted");
        return _owners[tokenId];
    }
    function balanceOf(address wallet) external view returns (uint256) {
        return _ownedTokens[wallet].length;
    }
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        return achievementURI[tokenId];
    }

    /**
     * @dev SOULBOUND — all transfers are blocked.
     */
    function transferFrom(address, address, uint256) external pure {
        revert("KillNFT: soulbound");
    }
    function safeTransferFrom(address, address, uint256) external pure {
        revert("KillNFT: soulbound");
    }
    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert("KillNFT: soulbound");
    }
    function approve(address, uint256) external pure {
        revert("KillNFT: soulbound");
    }

    // ── ERC-165 ───────────────────────────────────────────────────────────────
    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == 0x80ac58cd  // ERC-721
            || id == 0x01ffc9a7; // ERC-165
    }

    // ── Admin ────────────────────────────────────────────────────────────────
    function setOracle(address oracle_)  external onlyOwner { claimOracle = oracle_; }
    function setBaseURI(string calldata u) external onlyOwner { _baseURI = u; }
    function transferOwnership(address n) external onlyOwner { owner = n; }

    // ── Internal ─────────────────────────────────────────────────────────────
    function _toString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 t = v; uint256 len;
        while (t != 0) { len++; t /= 10; }
        bytes memory b = new bytes(len);
        while (v != 0) { b[--len] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(b);
    }
}
