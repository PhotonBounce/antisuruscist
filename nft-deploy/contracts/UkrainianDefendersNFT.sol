// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Minimal ERC-721 — Ukrainian Defenders NFT
// Deploy once to Polygon Amoy testnet, then set NFT_CONTRACT_ADDRESS in main.js

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721 is IERC165 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function approve(address to, uint256 tokenId) external;
    function getApproved(uint256 tokenId) external view returns (address);
    function setApprovalForAll(address operator, bool approved) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function transferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
}

interface IERC721Metadata is IERC721 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

interface IERC721Receiver {
    function onERC721Received(address, address, uint256, bytes calldata) external returns (bytes4);
}

contract UkrainianDefendersNFT {
    // ── ERC-165 ──────────────────────────────────────────────────────────────
    function supportsInterface(bytes4 id) public pure returns (bool) {
        return id == 0x80ac58cd  // ERC-721
            || id == 0x5b5e139f  // ERC-721Metadata
            || id == 0x01ffc9a7; // ERC-165
    }

    // ── NFT metadata ─────────────────────────────────────────────────────────
    string public constant name   = "Ukrainian Defenders";
    string public constant symbol = "UADEF";

    address  public owner;
    uint256  private _nextId = 1;
    string   private _baseTokenURI;

    // token storage
    mapping(uint256 => address)  private _owners;
    mapping(address => uint256)  private _balances;
    mapping(uint256 => address)  private _approvals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // rarity + name stored on-chain
    mapping(uint256 => string)   public tokenName;
    mapping(uint256 => string)   public tokenRarity;
    mapping(uint256 => uint256)  public tokenSeed;
    mapping(uint256 => uint256)  public tokenWave;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed own, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed own, address indexed op, bool approved);
    event Minted(address indexed to, uint256 indexed tokenId, string rarity, string heroName);

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }

    constructor(string memory baseURI_) {
        owner = msg.sender;
        _baseTokenURI = baseURI_;
    }

    // ── Mint ─────────────────────────────────────────────────────────────────
    // selector: 0x40d097c3 — safeMint(address)
    function safeMint(address to) external onlyOwner returns (uint256 tokenId) {
        tokenId = _nextId++;
        _mint(to, tokenId, "", "", 0, 0);
    }

    // Full mint with metadata — selector: 0xd3fc9864
    // safeMintWithMeta(address,string,string,uint256,uint256)
    function safeMintWithMeta(
        address to,
        string calldata heroName,
        string calldata rarity,
        uint256 seed,
        uint256 waveNum
    ) external onlyOwner returns (uint256 tokenId) {
        tokenId = _nextId++;
        _mint(to, tokenId, heroName, rarity, seed, waveNum);
    }

    function _mint(
        address to,
        uint256 tokenId,
        string memory heroName,
        string memory rarity,
        uint256 seed,
        uint256 waveNum
    ) internal {
        require(to != address(0), "zero address");
        _owners[tokenId]    = to;
        _balances[to]      += 1;
        tokenName[tokenId]  = heroName;
        tokenRarity[tokenId]= rarity;
        tokenSeed[tokenId]  = seed;
        tokenWave[tokenId]  = waveNum;
        emit Transfer(address(0), to, tokenId);
        emit Minted(to, tokenId, rarity, heroName);
    }

    // ── ERC-721 view ─────────────────────────────────────────────────────────
    function balanceOf(address a) external view returns (uint256) {
        require(a != address(0), "zero");
        return _balances[a];
    }
    function ownerOf(uint256 id) public view returns (address a) {
        require((a = _owners[id]) != address(0), "not minted");
    }
    function totalSupply() external view returns (uint256) { return _nextId - 1; }
    function tokenURI(uint256 id) external view returns (string memory) {
        ownerOf(id); // reverts if not minted
        return string(abi.encodePacked(_baseTokenURI, _toString(id)));
    }

    // ── ERC-721 transfer ─────────────────────────────────────────────────────
    function approve(address to, uint256 id) external {
        require(ownerOf(id) == msg.sender || _operatorApprovals[ownerOf(id)][msg.sender], "not auth");
        _approvals[id] = to;
        emit Approval(msg.sender, to, id);
    }
    function getApproved(uint256 id) external view returns (address) { return _approvals[id]; }
    function setApprovalForAll(address op, bool v) external {
        _operatorApprovals[msg.sender][op] = v;
        emit ApprovalForAll(msg.sender, op, v);
    }
    function isApprovedForAll(address o, address op) external view returns (bool) {
        return _operatorApprovals[o][op];
    }
    function transferFrom(address from, address to, uint256 id) public {
        require(_isApprovedOrOwner(msg.sender, id), "not auth");
        require(_owners[id] == from, "wrong from");
        require(to != address(0), "zero to");
        delete _approvals[id];
        _balances[from] -= 1;
        _balances[to]   += 1;
        _owners[id]      = to;
        emit Transfer(from, to, id);
    }
    function safeTransferFrom(address from, address to, uint256 id) external {
        safeTransferFrom(from, to, id, "");
    }
    function safeTransferFrom(address from, address to, uint256 id, bytes memory data) public {
        transferFrom(from, to, id);
        if (to.code.length > 0) {
            require(
                IERC721Receiver(to).onERC721Received(msg.sender, from, id, data)
                    == IERC721Receiver.onERC721Received.selector,
                "unsafe recv"
            );
        }
    }
    function _isApprovedOrOwner(address spender, uint256 id) internal view returns (bool) {
        address o = ownerOf(id);
        return spender == o || _approvals[id] == spender || _operatorApprovals[o][spender];
    }

    // ── Admin ─────────────────────────────────────────────────────────────────
    function setBaseURI(string calldata uri) external onlyOwner { _baseTokenURI = uri; }
    function transferOwnership(address newOwner) external onlyOwner { owner = newOwner; }

    // ── Internal helpers ──────────────────────────────────────────────────────
    function _toString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 t = v; uint256 len;
        while (t != 0) { len++; t /= 10; }
        bytes memory b = new bytes(len);
        while (v != 0) { b[--len] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(b);
    }
}
