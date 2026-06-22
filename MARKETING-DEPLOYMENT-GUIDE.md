# ANTI-RUSCIST — Marketing & Game Deployment Guide
### Master Strategy Document · Created March 14, 2026

---

## TABLE OF CONTENTS
1. [Game Overview & Specs](#1-game-overview--specs)
2. [Two-App Strategy](#2-two-app-strategy)
3. [Distribution Platforms](#3-distribution-platforms)
4. [Revenue Projections](#4-revenue-projections)
5. [Monetization Systems (Built)](#5-monetization-systems-built)
6. [Shots-for-Ukraine Donation Mechanic](#6-shots-for-ukraine-donation-mechanic)
7. [Crypto Mining / Play-to-Earn](#7-crypto-mining--play-to-earn)
8. [Content Policy & Compliance](#8-content-policy--compliance)
9. [Level Expansion Roadmap](#9-level-expansion-roadmap)
10. [Growth & Viral Drivers](#10-growth--viral-drivers)
11. [Packaging & Deployment Steps](#11-packaging--deployment-steps)
12. [Budget & Costs](#12-budget--costs)
13. [Non-Violent App: Defenders of Ukraine](#13-non-violent-app-defenders-of-ukraine)
14. [Hype Ideas & Feature Wishlist](#14-hype-ideas--feature-wishlist)
15. [Timeline & Milestones](#15-timeline--milestones)

---

## 1. Game Overview & Specs

| Attribute | Details |
|-----------|---------|
| **Title** | Anti-Ruscist |
| **Genre** | 2D side-scroll zombie shooter + blockchain economy |
| **Engine** | jQuery + vanilla JS, HTML5 Canvas, CSS animations |
| **Resolution** | 1024×550 (scaled responsive) |
| **Platforms** | Web (mobile + desktop), itch.io, Steam, own site |
| **Languages** | 15 (EN, UK, DE, FR, ES, PT, IT, PL, NL, CS, JA, KO, ZH, TR, AR) |
| **Waves** | 4 (expandable — see Section 9) |
| **Weapons** | 8 (Revolver, Shotgun, AK-47, Sniper, RPG, Flamethrower, Minigun, Laser) |
| **Call-ins** | 7 (Artillery, Drones, HIMARS, Bradley, Rover, Fire Drone, FPV Strike) |
| **Skill Tree** | 32 skills across 4 categories |
| **Adaptive AI** | Client-side difficulty scaling (speed + spawn rate) via EMA player profiling |
| **Blockchain** | Polygon (MATIC) — ARC Token (ERC-20), NFTs (ERC-721) |
| **Tokenomics** | ARC coins: earn, spend, stake, mint NFTs, referrals |

---

## 2. Two-App Strategy

### App A: "Anti-Ruscist" (Uncensored)
- **Platforms:** itch.io, Steam, own website
- **Content:** Full violence, profanity, political satire
- **Audience:** Gamers, crypto enthusiasts, Ukrainian supporters
- **Revenue:** Game sales, in-app purchases, crypto transactions

### App B: "Defenders of Ukraine" (Store-Safe)
- **Platforms:** Google Play, Apple App Store, own website
- **Content:** No violence, no profanity, positive heroes only
- **Audience:** Mass market, casual gamers, donors, educators
- **Revenue:** IAP, ads, donations pass-through, NFT hero cards

### Shared Infrastructure
- Same ARC token and blockchain wallet works across both apps
- Same user accounts and progression where applicable
- Same NFT collection — cards earned in either app are visible in both
- Same staking and referral systems

---

## 3. Distribution Platforms

### 3A. itch.io
| Detail | Info |
|--------|------|
| **Setup cost** | $0 |
| **Revenue cut** | 0% default (optional tip to itch) |
| **Content policy** | Very permissive — violence, political, mature OK |
| **Packaging** | Upload HTML5 ZIP directly |
| **Payment** | PayPal or Stripe payouts |

**Revenue model on itch.io:**
- Free-to-play base game
- "Supporter Pack" — $3 (exclusive skin + 50 ARC)
- "Deluxe Pack" — $5 (3 skins + 200 ARC + soundtrack)
- "Ultimate Pack" — $10 (all skins + 500 ARC + NFT + soundtrack + name in credits)
- Optional "pay what you want" donations

### 3B. Steam
| Detail | Info |
|--------|------|
| **Setup cost** | $100 (Steamworks fee, one-time) |
| **Revenue cut** | 30% (drops to 25% after $10M, 20% after $50M) |
| **Content policy** | Mature content OK with proper tagging |
| **Packaging** | Electron wrapper → native executable |
| **Payment** | Direct deposit, 30-day net |

**Revenue model on Steam:**
- Base game: $4.99
- "ARC Starter Kit" DLC: $2.99 (200 ARC + 2 skins)
- "Armory Expansion" DLC: $4.99 (new weapons + call-ins)
- "Wave Pack" DLC: $3.99 (waves 5-8)
- In-game cosmetics via Steam Inventory
- Trading cards (auto-generated revenue)

### 3C. Own Website (antiruscist.com)
| Detail | Info |
|--------|------|
| **Setup cost** | $0 (use existing hosting / GitHub Pages / Cloudflare Pages) |
| **Revenue cut** | Stripe: 2.9% + $0.30 per transaction; Crypto: ~0 |
| **Content policy** | None — your site, your rules |
| **Payment** | Stripe (cards), MetaMask (crypto), PayPal |

**Revenue model on own site:**
- Free-to-play with ads (AdSense / Playwire)
- Direct ARC token purchases (crypto wallet)
- Premium packs via Stripe checkout
- Donation pass-through to Ukraine charities
- Full control over pricing and promotions

### 3D. Google Play (Defenders of Ukraine only)
| Detail | Info |
|--------|------|
| **Setup cost** | $25 (one-time developer fee) |
| **Revenue cut** | 15% first $1M/year, then 30% |
| **Content policy** | Strict — no violence, no hate, no targeting real people |
| **Packaging** | TWA (Trusted Web Activity) or Capacitor native wrapper |
| **NFT rules** | Must disclose blockchain; NFT purchases must link out to web |

### 3E. Apple App Store (Defenders of Ukraine only)
| Detail | Info |
|--------|------|
| **Setup cost** | $99/year (developer program) |
| **Revenue cut** | 15% (small business) or 30% |
| **Content policy** | Strictest — no violence, no hate, no real-person targeting |
| **Packaging** | Capacitor → Xcode → IPA |
| **NFT rules** | NFT display OK, but ALL purchases must go through Safari (no in-app NFT buying) |

---

## 4. Revenue Projections

### Year 1 — Conservative Scenario (100-500 players)

| Platform | Monthly | Annual |
|----------|---------|--------|
| itch.io | $30-$80 | $360-$960 |
| Steam | $150-$400 | $1,800-$4,800 |
| Own site (ads + micro-tx) | $40-$200 | $480-$2,400 |
| Google Play (Defenders) | $50-$250 | $600-$3,000 |
| Apple (Defenders) | $30-$150 | $360-$1,800 |
| **TOTAL** | **$300-$1,080** | **$3,600-$12,960** |

### Year 1 — Moderate Scenario (1K-5K players)

| Platform | Monthly | Annual |
|----------|---------|--------|
| itch.io | $200-$800 | $2,400-$9,600 |
| Steam | $500-$2,500 | $6,000-$30,000 |
| Own site | $300-$1,500 | $3,600-$18,000 |
| Google Play (Defenders) | $200-$1,000 | $2,400-$12,000 |
| Apple (Defenders) | $150-$800 | $1,800-$9,600 |
| **TOTAL** | **$1,350-$6,600** | **$16,200-$79,200** |

### Year 1 — Optimistic Scenario (10K+ DAU, viral hit)

| Platform | Monthly | Annual |
|----------|---------|--------|
| itch.io | $1,000-$2,700 | $12,000-$32,400 |
| Steam | $2,500-$5,800 | $30,000-$70,000 |
| Own site | $2,000-$10,600 | $24,000-$127,200 |
| Google Play (Defenders) | $1,500-$5,000 | $18,000-$60,000 |
| Apple (Defenders) | $1,000-$3,500 | $12,000-$42,000 |
| **TOTAL** | **$8,000-$27,600** | **$96,000-$331,600** |

---

## 5. Monetization Systems (Built)

These systems are ALREADY implemented in the mobile lobby hub:

### Lobby Hub Cards (8 buttons)
1. **Daily Spin** (FREE badge) — Wheel with ARC prizes, cooldown timer
2. **Armory** — Opens inventory/shop panel
3. **Mint NFT** (HOT badge) — Ukrainian Defenders NFT minting (5 ARC)
4. **Missions** (count badge) — 3 daily missions, 3-12 ARC each
5. **Staking** (NEW badge) — 3 plans: 7d/12%, 30d/24%, 90d/48%
6. **Shop** — Cosmetics store (15 items, 5-30 ARC each)
7. **Watch & Earn** (+3 ARC) — Simulated ad viewing, 60s cooldown
8. **Invite Friends** (+2 ARC per referral) — Copy referral link

### In-Game Monetization Hooks
- **Between-wave CTA overlay** — Armory + Watch Ad buttons between waves
- **Game-over revival** — Watch ad to revive OR spend 10 ARC
- **Toast notifications** — Earnings/rewards feedback

### ARC Token Economy
- Registration bonus: +5 ARC
- Referral bonus: +2 ARC per invite
- Daily missions: 3-12 ARC/day
- Spin wheel: 1-50 ARC per spin
- Watch-to-earn: +3 ARC per view
- Achievements: 20 achievements awarding ARC
- Staking yields: 12-48% APY

---

## 6. Shots-for-Ukraine Donation Mechanic

### Concept
Every shot fired in-game generates a micro-donation to verified Ukrainian charity wallets.

### Architecture
```
Player fires shot → Off-chain counter increments (localStorage + Firebase)
                  → Daily/weekly batch aggregation on server
                  → Monthly on-chain transfer to UA charity wallet
                  → Smart contract logs donation with player attribution
```

### Why Not Per-Shot On-Chain?
- Gas fees: $0.005-0.02 per transaction on Polygon
- At 5,000 shots/session, that's $25-100 in gas per player per session
- Solution: Batch thousands of players' shots into single monthly transfers

### Three Funding Models

**Model A — Player-Funded:**
Players opt-in to donate from their ARC balance per shot ($0.0001/shot).
- Pro: Direct player involvement
- Con: Reduces player ARC balance, may discourage play

**Model B — Revenue-Funded (RECOMMENDED):**
Platform pledges percentage of ad/IAP revenue per community shot.
- Pro: Players play for free, revenue funds donations
- Con: Depends on revenue existing

**Model C — Hybrid Watch-to-Donate:**
Player watches an ad → ad revenue is donated per 1,000 community shots.
- Pro: Player feels good, costs nothing, you earn ad revenue
- Con: Requires ad network integration

### Verified Ukrainian Charity Wallets
- **United24** (official UA government) — united24.gov.ua
- **Come Back Alive** — comebackalive.in.ua
- **Serhiy Prytula Foundation** — prytulafoundation.org

### In-Game UI
- **HUD Counter:** "🇺🇦 42,847 shots for Ukraine" (top of screen)
- **Global Leaderboard:** Top donors by shot count
- **End-of-Session Card:** "You fired 847 shots → $0.08 donated to Come Back Alive"
- **Community Milestone Banners:** "1,000,000 community shots! Unlocking exclusive NFT for all players"

### Economics (Model B)
| DAU | Avg shots/day | Monthly shots | Monthly donation @ $0.0001/shot |
|-----|--------------|---------------|----------------------------------|
| 100 | 3,000 | 9M | $900 |
| 1,000 | 3,000 | 90M | $9,000 |
| 10,000 | 3,000 | 900M | $90,000 |

---

## 7. Crypto Mining / Play-to-Earn

### Option A: Proof-of-Play (RECOMMENDED)
Players earn ARC tokens by playing — not real mining, but functionally identical.
- Pre-mint a treasury pool (e.g., 100M ARC)
- Players earn from the pool through gameplay, quests, achievements
- Can withdraw on-chain to Polygon wallet
- Store-compliant if you don't call it "mining"
- Your cost: gas fees for withdrawals (~$0.001 on Polygon)

### Option B: Browser Mining (NOT RECOMMENDED)
Using device CPU/GPU to mine while playing.
- Earns negligible amounts ($0.001-0.01/hr on mobile)
- Kills battery, feels like malware
- Google/Apple will instantly reject
- Bad user experience

### Option C: Donation-Mining (GREAT FOR DEFENDERS APP)
Donations mint unique NFTs — the donation IS the mining.
```
Player donates $5 → Smart contract mints "Defender #4821" NFT
                   → $4.50 → UA charity
                   → $0.50 → gas + platform fee
                   → NFT has random rarity (common/rare/epic/legendary)
```

### Option D: Staking Rewards (ALREADY BUILT)
Existing staking system is yield farming:
- 7-day lock: 12% APY
- 30-day lock: 24% APY
- 90-day lock: 48% APY
Market it as "Stake ARC to mine more ARC."

### Recommended Combo Per App
| App | "Mining" Methods |
|-----|-----------------|
| Anti-Ruscist | Proof-of-Play + Staking + Shots-for-Ukraine |
| Defenders of Ukraine | Proof-of-Play + Donation-Mining + Daily quests + Staking |

---

## 8. Content Policy & Compliance

### HIGH RISK content (current game)
| Content | Risk | Affected Stores |
|---------|------|-----------------|
| "Putin Khuilo" (track name + text) | Profanity targeting real political figure | Google Play, Apple, some ad networks |
| "Kill Ruscists Now!" (start button) | Call to violence | Google Play, Apple |
| "Anti-Ruscist" (game name) | Borderline — could be flagged as hate speech | Google Play, Apple |
| Zombie violence / gore | Moderate violence | Google (Teen+), Apple (12+) |
| Real-world political conflict | Sensitive topic | All stores flag for review |

### Platform-by-Platform Verdict

| Platform | Anti-Ruscist OK? | Defenders of Ukraine OK? |
|----------|-------------------|--------------------------|
| itch.io | ✅ Fully accepted | ✅ |
| Steam | ✅ With mature tag | ✅ |
| Own website | ✅ No restrictions | ✅ |
| Newgrounds | ✅ Fully accepted | ✅ |
| Google Play | ❌ Would be rejected | ✅ Compliant |
| Apple App Store | ❌ Would be rejected | ✅ Compliant |

### Compliance Checklist for Defenders App
- [ ] No violence or weapon imagery
- [ ] No profanity or slurs
- [ ] No targeting of real individuals (heroes only, positive portrayal)
- [ ] Disclose blockchain/NFT usage in store listing
- [ ] NFT purchases link out to web browser (Apple requirement)
- [ ] Charity claims backed by verifiable wallet addresses
- [ ] Privacy policy covering wallet data
- [ ] Age rating: 4+ / Everyone

---

## 9. Level Expansion Roadmap

### Is 4 Levels Enough?

| Metric | 4 Waves (Current) | 8+ Waves (Target) |
|--------|-------------------|--------------------|
| First-session content | 15-25 min ✅ | 40-60 min |
| Replay value | Low — players see everything fast | High |
| Steam refund window | Risky (< 2hr playtime) | Safe |
| Monetization hooks | Few between-wave CTAs | Many more upsell moments |
| Development cost | Done ✅ | Additional art + code |

**Verdict:** 4 waves is enough to **launch**. But retention will suffer without more content.
Ship v1.0 with 4 waves + Endless mode to pad playtime. Add waves 5-8 as first DLC.

### Current: 4 Waves (v1.0)
- Wave 1: Basic zombies, tutorial-like
- Wave 2: Armored enemies, new weapon unlocks
- Wave 3: Vehicles, mini-boss
- Wave 4: Final boss, all call-ins available

### Planned: Waves 5-8 (DLC / Update)
- **Wave 5:** Night map, flashlight mechanic, stealth zombies
- **Wave 6:** Urban ruins, building interiors, close-quarters
- **Wave 7:** Winter map, slow movement, ice mechanics
- **Wave 8:** Kremlin assault, ultimate boss fight

### Planned: Endless / Survival Mode
- Infinite scaling difficulty
- Global leaderboard (highest wave survived)
- Special rewards every 5 waves
- ARC multiplier increases with each wave

### Planned: Daily Challenge Mode
- 1 random wave with gameplay modifiers (e.g., "pistols only", "double speed")
- 24hr rotation
- Top 3 daily winners get bonus ARC
- Drives daily return visits

### Planned: Boss Rush Mode
- Fight all bosses back-to-back
- Timed leaderboard
- Exclusive cosmetic rewards

---

## 10. Growth & Viral Drivers

### Press & Media
- Submit to indie game sites: IndieDB, Rock Paper Shotgun, Kotaku
- Ukrainian media outlets (especially interested in Ukraine-support angle)
- Crypto/Web3 gaming outlets: Decrypt, CoinDesk Gaming
- "Games that donate to Ukraine" roundup articles

### Streamer & Content Creator Strategy
- Send free Steam keys to 50+ Twitch/YouTube streamers
- Create streamer-only cosmetic (shows "STREAMER" badge in-game)
- Twitch extension showing live stats
- Auto-clip system for TikTok/Shorts content

### Community Building
- Discord server with roles (Defender, Hero, Legendary Donor)
- Reddit posts in r/ukraine, r/indiegaming, r/cryptogaming, r/webgames
- TikTok clips of gameplay + donation counter
- Twitter/X engagement with Ukraine support community

### Referral Loop
- Current: +2 ARC per referral
- Enhanced: Tiered rewards (5 refs = rare skin, 25 refs = exclusive NFT, 100 refs = legendary status)
- Referral leaderboard with monthly prizes

### Seasonal Events
- **August 24 (Independence Day):** Special event, exclusive NFT drop
- **October 1 (Defender's Day):** Hero NFT collection expands
- **February 24 (Anniversary):** Memorial event, donation drive
- **Winter holidays:** "Winter Warrior" cosmetic pack

### Crypto Community
- List ARC token on DEXs (QuickSwap, Uniswap on Polygon)
- CoinGecko / CoinMarketCap listing (free, requires application)
- Partner with Ukraine DAO and other crypto-charity projects
- Cross-promote with other play-to-earn games

---

## 11. Packaging & Deployment Steps

### Step 1: itch.io (Week 1)
```
1. Create itch.io developer account (free)
2. ZIP the web build: index.html + scripts/ + styles/ + images/ + sounds/ + vendor/
3. Upload as "HTML5" project type
4. Set pricing: free + supporter packs
5. Write store page: screenshots, description, trailer link
6. Add tags: ukraine, shooter, blockchain, web-game, pixel-art
7. Publish → share link → collect feedback
```

### Step 2: Own Website (Week 1-2)
```
1. Deploy to Cloudflare Pages or Vercel (free tier)
2. Custom domain: antiruscist.com (or similar)
3. Add Stripe checkout for premium packs
4. Add ad network (Google AdSense or Playwire)
5. Add donation button linking to UA charities
6. SEO: meta tags, Open Graph, structured data
7. Analytics: Google Analytics or Plausible
```

### Step 3: Steam (Week 2-4)
```
1. Pay $100 Steamworks fee
2. Package game with Electron:
   npm install electron electron-builder
   Create main process (loads index.html)
   Build for Windows + Mac + Linux
3. Create store assets:
   - Capsule images (460×215, 231×87, 616×353)
   - Screenshots (1920×1080 minimum, 5+)
   - Trailer video (30-60 seconds)
   - Description, tags, mature content descriptor
4. Upload build via SteamPipe
5. Set pricing: $4.99 base
6. Create DLC listings
7. Submit for review (1-3 business days)
8. Set launch date, start building wishlists
```

### Step 4: Google Play — Defenders of Ukraine (Week 4-6)
```
1. Build store-safe version (no violence, new assets)
2. Package with Capacitor or TWA:
   npm install @capacitor/core @capacitor/cli
   npx cap init
   npx cap add android
   npx cap sync
   Android Studio → Build → Signed APK/AAB
3. Pay $25 Google Play developer fee
4. Create store listing: screenshots, description, privacy policy
5. Set content rating (Everyone)
6. Add in-app products (ARC packs, cosmetics)
7. Submit for review (1-7 days)
```

### Step 5: Apple App Store — Defenders of Ukraine (Week 6-8)
```
1. Enroll in Apple Developer Program ($99/year)
2. Package with Capacitor:
   npx cap add ios
   npx cap sync
   Open in Xcode → Build → Archive → Upload
3. Create App Store Connect listing
4. Screenshots for all device sizes (iPhone, iPad)
5. Privacy policy, NFT disclosure
6. Ensure ALL NFT purchases link to Safari (Apple rule)
7. Submit for review (1-3 days)
```

---

## 12. Budget & Costs

| Item | Cost | When |
|------|------|------|
| itch.io account | $0 | Week 1 |
| Domain name (antiruscist.com) | $10-15/year | Week 1 |
| Cloudflare Pages hosting | $0 | Week 1 |
| SSL certificate | $0 (Cloudflare auto) | Week 1 |
| Steam Steamworks fee | $100 (one-time) | Week 2 |
| Google Play developer fee | $25 (one-time) | Week 4 |
| Apple Developer Program | $99/year | Week 6 |
| Electron Builder | $0 (open source) | Week 2 |
| Capacitor | $0 (open source) | Week 4 |
| **TOTAL YEAR 1** | **~$235-250** | |

### Optional Costs
| Item | Cost | Notes |
|------|------|-------|
| Trailer video (DIY) | $0 | Use OBS + gameplay footage |
| Trailer video (freelancer) | $50-200 | Fiverr |
| Logo/icon redesign | $20-100 | Fiverr |
| Press outreach service | $0-500 | DIY is free, services vary |
| Ad spend (Facebook/Google) | $50-500/mo | Optional, test small first |
| Analytics (premium) | $0 | Use free tier tools |

---

## 13. Non-Violent App: Defenders of Ukraine

### Core Game Loops (No Violence)

| Feature | Description | Revenue Source |
|---------|-------------|---------------|
| **Hero NFT Collection** | Collect/mint cards of real Ukrainian heroes (defenders, volunteers, medics, Patron the dog). Each has rarity, stats, lore. | NFT sales (5-50 ARC) |
| **Rebuild Ukraine** | Tap-to-build minigame — reconstruct cities brick by brick. Each building unlocks historical lore. | IAP speed boosts |
| **Donation Dashboard** | Real-time tracker of community donations. Leaderboard of top donors. Verified wallet transparency. | Direct donations |
| **Daily Quests** | "Share on social media," "Watch a video," "Learn a Ukrainian word," "Read today's news" | Ad revenue |
| **Ukrainian Language Mini-Lessons** | Duolingo-style module — learn basic Ukrainian phrases and alphabet | Premium lessons IAP |
| **Sunflower Farm** | Idle/clicker garden — grow sunflowers (Ukraine's national flower), harvest for ARC | Cosmetic IAP, time skips |
| **Memorial Wall** | Player-contributed messages of support. Each post costs 1 ARC. | Token sink |
| **Trivia & Quizzes** | Ukraine history, culture, geography → earn ARC | Engagement + ads |
| **Sticker/Avatar Creator** | Ukrainian-themed profile customization | Cosmetic IAP |
| **Live Charity Events** | Timed events where community unlocks donation milestones | FOMO + virality |
| **AR Sunflower Planting** | Point camera at real world, plant virtual sunflowers (like Pokémon GO lite) | Premium AR items |

### Shared Economy
Both apps share the same:
- ARC token on Polygon
- User wallet/account
- NFT collection (cards visible in both apps)
- Staking system
- Referral network

---

## 14. Hype Ideas & Feature Wishlist

### Viral Features
- [ ] **Global shot counter** on website homepage ("247,382,951 shots for Ukraine!")
- [ ] **TikTok auto-clipper** — capture epic moments, one-tap share
- [ ] **Streamer Twitch extension** — overlay showing live kill count
- [ ] **Celebrity hero NFTs** — partner with Ukrainian public figures
- [ ] **"Shots heard round the world"** — world map showing where shots are being fired from

### Engagement Features
- [ ] **Endless/Survival mode** — infinite scaling, global leaderboard
- [ ] **Daily Challenge** — random wave with modifiers, daily rewards
- [ ] **Boss Rush** — all bosses back-to-back, timed
- [ ] **Pet companions** — Patron the mine-sniffing dog as in-game buddy
- [ ] **Clan/Guild system** — team donations, group leaderboards, clan wars
- [ ] **Battle Pass** — seasonal pass with 50 tiers, free + premium track
- [ ] **Weapon skins marketplace** — player trading

### Crypto/Web3 Features
- [ ] **ARC token DEX listing** (QuickSwap on Polygon)
- [ ] **CoinGecko / CoinMarketCap listing**
- [ ] **DAO governance** — token holders vote on charity allocation
- [ ] **Cross-game NFT utility** — partner with other Web3 games
- [ ] **Donation receipt NFTs** — verifiable proof of charitable giving

### Social Impact Features
- [ ] **Real donation tracking** — transparent on-chain proof
- [ ] **Monthly impact reports** — "This month, players funded 3 drones for Ukraine"
- [ ] **Partnership with UA foundations** — official endorsement badges
- [ ] **Educational content** — in-game news feed about Ukraine

---

## 15. Timeline & Milestones

### Phase 1: Launch Prep (Weeks 1-2)
- [ ] Finalize mobile game polish
- [ ] Create marketing assets (screenshots, trailer, descriptions)
- [ ] Deploy to itch.io
- [ ] Deploy own website
- [ ] Set up analytics

### Phase 2: Steam Launch (Weeks 2-4)
- [ ] Package Electron build
- [ ] Create Steam store page
- [ ] Submit for Steam review
- [ ] Start wishlist campaign
- [ ] Press outreach begins

### Phase 3: Defenders App Development (Weeks 4-8)
- [ ] Design non-violent game loops
- [ ] Build Defenders of Ukraine HTML5 app
- [ ] Package for Android (Capacitor)
- [ ] Package for iOS (Capacitor + Xcode)
- [ ] Submit to Google Play and Apple App Store

### Phase 4: Shots-for-Ukraine (Weeks 4-6)
- [ ] Implement off-chain shot counter
- [ ] Set up Firebase aggregation
- [ ] Build donation dashboard UI
- [ ] Establish charity wallet partnerships
- [ ] First monthly donation transfer

### Phase 5: Growth (Weeks 6-12)
- [ ] Launch referral campaign
- [ ] Streamer key distribution
- [ ] First seasonal event (tied to nearest Ukrainian holiday)
- [ ] ARC token DEX listing
- [ ] Community building (Discord, Reddit, Twitter)

### Phase 6: Expansion (Months 3-6)
- [ ] Waves 5-8 development
- [ ] Endless mode
- [ ] Battle Pass system
- [ ] Clan/Guild system
- [ ] Cross-promotion and partnerships

---

## FILE LOCATIONS (Quick Reference)

| File | Purpose |
|------|---------|
| `mobile/index.html` | Mobile game HTML (578 lines, includes lobby hub) |
| `mobile/scripts/mobile.js` | Mobile touch layer (1098 lines, 14 sections) |
| `mobile/styles/mobile.css` | Mobile styles (1104 lines, includes lobby CSS) |
| `scripts/main.js` | Desktop game engine (~9528 lines) |
| `styles/main.css` | Desktop styles (~8497 lines) |
| `contracts/ARC_Token.sol` | ARC ERC-20 token contract |
| `contracts/UkrainianDefendersNFT.sol` | NFT contract |
| `nft-deploy/` | NFT deployment scripts |
| `backups/20260314_session/` | Latest backup of all key files |

---

## 16. Day 2+ Roadmap & Future Plans

### Immediate (This Week)
- [ ] Finish mobile game polish (pending backlog items)
- [ ] Implement Shots-for-Ukraine HUD counter (off-chain, localStorage)
- [ ] Create itch.io store page draft
- [ ] Record gameplay trailer (OBS, 30-60 sec)
- [ ] Take 5+ screenshots for store pages

### Short-Term (Weeks 2-4)
- [ ] Deploy to itch.io (first public launch)
- [ ] Set up own website (Cloudflare Pages)
- [ ] Begin Electron packaging for Steam
- [ ] Start Discord community server
- [ ] Write press kit (description, screenshots, logo, press contact)
- [ ] Submit to web game directories (Newgrounds, Kongregate, GameJolt)
- [ ] Reddit launch posts (r/ukraine, r/indiegaming, r/webgames, r/playmygame)

### Medium-Term (Months 1-2)
- [ ] Steam store page live + wishlist campaign
- [ ] Begin Defenders of Ukraine app development
- [ ] Implement Firebase backend for shot counter + leaderboards
- [ ] First charity partnership outreach (United24, Come Back Alive)
- [ ] ARC token smart contract audit
- [ ] First streamer key batch (50 keys)
- [ ] TikTok/YouTube Shorts content creation

### Long-Term (Months 3-6)
- [ ] Defenders of Ukraine on Google Play + Apple App Store
- [ ] Waves 5-8 DLC development
- [ ] Endless / Survival mode
- [ ] Battle Pass system (Season 1)
- [ ] ARC token DEX listing (QuickSwap)
- [ ] CoinGecko / CoinMarketCap application
- [ ] Clan/Guild system
- [ ] First seasonal event
- [ ] Explore Ukraine DAO partnership
- [ ] Consider PWABuilder for Microsoft Store

---

## 17. Marketing Playbook

### Pre-Launch Hype (Before itch.io)
1. **Teaser clips** — 15-second gameplay clips on TikTok, Twitter, Reddit
2. **"Every shot donates to Ukraine"** messaging — this is the hook
3. **Countdown posts** — "Launching in 3 days" etc.
4. **Dev diary posts** — Behind-the-scenes on r/indiedev, IndieDB

### Launch Day (itch.io)
1. Post to: r/ukraine, r/indiegaming, r/webgames, r/playmygame, r/cryptogaming
2. Tweet with hashtags: #Ukraine #IndieGame #GameDev #Web3Gaming #StandWithUkraine
3. Submit to IndieDB, Newgrounds, GameJolt
4. Email Ukrainian media contacts
5. Share in crypto gaming Discord servers

### Ongoing Marketing Cadence
- **Daily:** 1 TikTok/Short (gameplay clip, donation counter update, or dev update)
- **Weekly:** Reddit post, community Discord event, donation milestone update
- **Monthly:** Press update, new content drop, donation transparency report
- **Quarterly:** Seasonal event, major update, NFT collection expansion

### Content Marketing Ideas
- "How a game raised $X for Ukraine" — Medium/blog article
- Infographic: community shots count → donation amount → impact
- Player spotlight: top donor of the month
- Ukrainian hero spotlight: the real person behind each NFT card
- "Why we made this game" — founder story

### Partnership Targets
| Partner Type | Examples | Pitch Angle |
|-------------|----------|-------------|
| Ukrainian charities | United24, Come Back Alive, Prytula | Official endorsement, verified wallets |
| Crypto projects | Ukraine DAO, Polygon, Aave Grants | Web3 gaming + charity |
| Streamers (UA) | Ukrainian gaming YouTubers/Twitch | Patriotic angle, free keys |
| Streamers (EN) | Mid-tier gaming streamers (1K-50K) | Unique game + charity angle |
| Press | Decrypt, Rock Paper Shotgun, Kotaku | "Game that donates to Ukraine" |
| Influencers | TikTok creators who cover Ukraine | Ready-made audience |

### ASO (App Store Optimization) for Defenders App
- **Keywords:** ukraine, donate, support ukraine, hero, nft, blockchain, charity, sunflower
- **Icon:** Sunflower + Ukrainian flag colors (blue/yellow)
- **Screenshots:** Show donation counter, hero cards, sunflower farm, rebuild minigame
- **Description lead:** "Every action you take supports Ukraine. Collect hero cards, donate to verified charities, and join a global community."

### Pricing Psychology
| SKU | Price | Perceived Value | Conversion Driver |
|-----|-------|----------------|-------------------|
| Free play | $0 | Entry point | "Try before you buy" |
| Supporter Pack | $2.99 | "Buy me a coffee" | Low barrier, good will |
| Deluxe Pack | $4.99 | Fair price for indie | Best value messaging |
| Ultimate Pack | $9.99 | Completionist | Scarcity (limited items) |
| Donation Pack | Custom | 100% to charity | Guilt-free spending |

---

## 18. Brainstorm Archive

### Session: March 14, 2026 — Initial Strategy

**Key Questions Explored:**
- Is 4 levels enough? → Yes for launch, no for retention. Add Endless mode + DLC waves.
- Alternative non-violent version? → "Defenders of Ukraine" for Google/Apple stores.
- Can players mine crypto? → Real mining = bad idea. Proof-of-Play + Donation-Mining = great.
- What hypes the game? → Shots-for-Ukraine counter, streamer integration, seasonal events, AR sunflowers.

**Database / Backend Decision:**
- Firebase recommended for free tier (auth, Firestore, hosting)
- Polygon blockchain for tokens/NFTs ONLY (not game state)
- Hybrid approach: Firebase handles game data, blockchain handles value

**Google Play Risk Assessment:**
- "Putin Khuilo" = instant rejection (profanity + real person)
- "Kill Ruscists Now!" = instant rejection (call to violence)
- "Anti-Ruscist" name = borderline, likely flagged
- Solution: Two-app strategy separates uncensored (web) from store-safe (mobile)

**Platforms That Accept Uncensored Content:**
- itch.io ✅, Steam ✅ (with mature tag), Newgrounds ✅, own website ✅
- Google Play ❌, Apple ❌ (without content changes)

**Non-Violent App Feature Ideas (Defenders of Ukraine):**
- Hero NFT collection (real Ukrainian heroes, Patron the dog)
- Rebuild Ukraine tap-to-build minigame
- Donation dashboard with real-time charity tracking
- Ukrainian language mini-lessons (Duolingo-style)
- Sunflower farm idle/clicker
- Memorial wall (player messages, 1 ARC each)
- Trivia/quizzes about Ukraine
- Live charity events with community milestones
- AR sunflower planting (Pokémon GO-style)

**Crypto Mining Analysis:**
- Browser mining → $0.001/hr, kills battery, stores reject = DON'T DO
- Proof-of-Play → treasury-funded, store-safe, works great = DO THIS
- Donation-Mining → donate $5, get random-rarity NFT = DO THIS
- Staking rewards → already built (12-48% APY) = ALREADY DONE

---

## NOTES & DECISIONS LOG

### 2026-03-14 — Session 1
- **Decision:** Two-app strategy (Anti-Ruscist uncensored + Defenders of Ukraine store-safe)
- **Decision:** itch.io + Steam + own site for Anti-Ruscist; Google Play + Apple for Defenders
- **Decision:** Proof-of-Play + Donation-Mining as crypto "mining" mechanic (NOT browser mining)
- **Decision:** Shots-for-Ukraine using off-chain batching, Model B (revenue-funded) recommended
- **Decision:** 4 waves for v1.0 launch, expandable to 8+ with DLC
- **Decision:** Firebase for backend, Polygon for blockchain value layer only
- **Decision:** Endless/Survival mode to pad playtime beyond 4 waves
- **Built:** Lobby hub (8 monetization cards), between-wave CTAs, game-over revival, toast system
- **Backup created:** `backups/20260314_session/` (7 files)

### Pending Implementation Queue
1. Shots-for-Ukraine HUD counter (hook into doFire)
2. Fight UI polish (backlog)
3. HUD defaults fix (backlog)
4. Music-only-from-play fix (backlog)
5. Armory during reload fix (backlog)
6. Inventory nav vertical fix (backlog)
7. Health drops tuning (backlog)
8. Staking audit (backlog)
9. Putin Khuilo removal option (for store version)
10. News RSS feed (backlog)
11. ARC/Token merge consolidation (backlog)
12. Memorial minting feature (backlog)
13. Tokenomics calibration (backlog)
14. NPC market (backlog)
15. Clans system (backlog)
16. Weapon selling (backlog)
17. Donations integration (backlog)

---

*This document should be updated as decisions are made and milestones are reached.*
*Last updated: March 14, 2026*
