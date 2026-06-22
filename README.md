# Anti-Ruscist — Zombie Shooter with Blockchain Economy

A browser-based zombie shooter game where you defend Ukraine across 4 waves of increasingly difficult enemies. Earn **ARC tokens**, mint **Kill NFTs**, and climb the weekly leaderboard.

## Features

- **8 Weapons** — Revolver, Shotgun, M16, Claymore, Stugna-P, Drone Bomb, Panzerfaust, PKM
- **7 Call-ins** — Artillery, Drone Swarm, HIMARS, Bradley IFV, Rover, Fire Drone, FPV Drone
- **Adaptive AI** — Difficulty adjusts to your accuracy, kill speed, and survival rate
- **ARC Token Economy** — Earn crypto-style tokens for kills, combos, achievements, and daily streaks
- **Kill NFTs** — Mint commemorative NFTs for boss kills (stored locally or on-chain via Polygon)
- **15 Languages** — EN, UA, DE, FR, ES, PL, PT, IT, NL, CS, JA, KO, ZH, TR, SV
- **Battle Pass** — Free + Premium tiers with cosmetic rewards
- **Clan System** — Create or join squads, compete on clan leaderboards
- **PvP Challenges** — Share challenge URLs, bet ARC tokens against friends
- **Jukebox** — Ukrainian and electronic music soundtrack with player controls
- **Mobile** — Dedicated touch-optimized mobile version at `/mobile/`

## Tech Stack

- **Frontend:** jQuery + vanilla JS, HTML5, CSS3 (no framework)
- **Blockchain:** Polygon (POL) via MetaMask — ARC Token (ERC-20), Kill NFTs (ERC-721)
- **Smart Contracts:** Solidity — `ARC_Token.sol`, `ARC_KillNFT.sol`, `UkrainianDefendersNFT.sol`
- **PWA:** Service worker with cache-first strategy, installable on mobile

## Running Locally

```bash
npx http-server -p 8080
```

Open `http://localhost:8080` in your browser. Touch devices auto-redirect to `/mobile/`.

## Ukraine Donation

**10% of all on-chain ARC token transactions are automatically pledged to Ukrainian defense funds.**

- [United24](https://u24.gov.ua/)
- [Come Back Alive](https://savelife.in.ua/en/donate-en/)
- [NBU Armed Forces Fund](https://bank.gov.ua/en/about/support-the-armed-forces)

## License

All rights reserved. Game assets and code are proprietary.