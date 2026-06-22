# How to Deploy the Game

## TL;DR — What Goes Where

```
YOUR GITHUB REPO (this repo)
    │
    │  The game has TWO parts:
    │
    ├── 🌐 FRONTEND (the game itself — HTML, CSS, JS, images, sounds)
    │   Goes to ➜  your website's public_html/ar/ folder
    │   Example:   photon-bounce.com/ar/
    │   How:       cPanel pulls it from GitHub automatically (see below)
    │
    └── ⚙️ BACKEND API (leaderboards, admin panel, multiplayer — OPTIONAL)
        Goes to ➜  a Node.js host like Render.com
        Example:   antiruscist.onrender.com
        How:       Connect GitHub repo to Render (see below)
```

> **The game works 100% without the backend.** Players can play, save progress (localStorage), everything works. The backend only adds online features: leaderboards, cross-device sync, admin panel, PvP, news, ML analytics, ARC economy.

---

## Part 1: Put the Game on Your Website (Frontend)

This is the main thing — getting the game playable at `yoursite.com/ar/`.

### What You Need

- A **shared hosting** account with **cPanel** (most cheap hosts have this — Namecheap, Hostinger, Bluehost, etc.)
- This repo on **GitHub** (it already is)

### What Files Go Where

Your website has a folder called `public_html/` — that's where your website files live.
We're putting the game in a subfolder called `ar/`, so it'll be at `yoursite.com/ar/`.

```
YOUR HOSTING (what visitors see)          THIS REPO (on GitHub)
─────────────────────────────────         ─────────────────────────
public_html/                              antiruscist/
└── ar/                      ← gets ←    ├── index.html        ✅ deployed
    ├── index.html                        ├── admin.html        ✅ deployed
    ├── admin.html                        ├── scripts/          ✅ deployed
    ├── scripts/                          ├── styles/           ✅ deployed
    │   └── main.js                       ├── images/           ✅ deployed
    ├── styles/                           ├── sounds/           ✅ deployed
    │   └── main.css                      ├── fonts/            ✅ deployed
    ├── images/                           ├── icons/            ✅ deployed
    ├── sounds/                           ├── vendor/           ✅ deployed
    ├── fonts/                            ├── mobile/           ✅ deployed
    ├── icons/                            ├── sw.js             ✅ deployed
    ├── vendor/                           ├── manifest.json     ✅ deployed
    ├── mobile/                           ├── .htaccess         ✅ deployed
    ├── sw.js                             ├── robots.txt        ✅ deployed
    ├── manifest.json                     ├── favicon.ico       ✅ deployed
    ├── .htaccess                         │
    ├── robots.txt                        ├── server/           ❌ NOT deployed (backend only)
    └── favicon.ico                       ├── contracts/        ❌ NOT deployed (blockchain)
                                          ├── nft-deploy/       ❌ NOT deployed (blockchain)
                                          ├── node_modules/     ❌ NOT deployed (dev stuff)
                                          ├── .github/          ❌ NOT deployed (dev stuff)
                                          └── package.json      ❌ NOT deployed (dev stuff)
```

**You don't copy files manually.** cPanel does it for you. Here's how:

### Step-by-Step: Connect cPanel to GitHub

1. **Log in to your hosting's cPanel**
   - Usually at `yoursite.com/cpanel` or `yoursite.com:2083`
   - Use the username/password from your hosting provider

2. **Find "Git Version Control"**
   - Scroll down in cPanel, or use the search bar at the top
   - It's usually under the **Files** section
   - Click on **Git™ Version Control**

3. **Click the "Create" button** (top right)

4. **Fill in these 3 fields:**

   | Field | What to type |
   |-------|-------------|
   | **Clone URL** | `https://github.com/lindapot-art/antiruscist.git` |
   | **Repository Path** | `/home/YOUR_USERNAME/repositories/antiruscist` |
   | **Repository Name** | `antiruscist` |

   > ⚠️ Replace `YOUR_USERNAME` with your actual cPanel username (the one you log in with). If your username is `photonbo` then type `/home/photonbo/repositories/antiruscist`

   > ✅ Check the box that says **"Deploy HEAD Commit"**

5. **Click "Create"** — cPanel will download the repo from GitHub

6. **Done!** cPanel reads the `.cpanel.yml` file (already in this repo) and automatically copies only the game files to `public_html/ar/`. No manual file copying needed.

### How to Update the Game After Changes

**Option A — Manual (click a button):**
1. Go to cPanel → **Git Version Control**
2. Click **Manage** next to your repo
3. Click **Update from Remote** (pulls latest from GitHub)
4. Click **Deploy HEAD Commit** (copies files to public_html/ar/)

**Option B — Fully Automatic (webhook, set once and forget):**
1. In cPanel → **Git Version Control** → click **Manage** on your repo
2. Look for the **Deploy URL** — copy it (it looks like `https://yoursite.com/cpanelwebcall/...`)
3. Go to GitHub → your repo → **Settings** → **Webhooks** → **Add webhook**
4. Paste the deploy URL into **Payload URL**
5. Set **Content type** to `application/json`
6. Select **Just the push event**
7. Click **Add webhook**

Now every time you push to GitHub, your website updates automatically within seconds.

> ⚠️ The deploy URL is like a password — don't share it or commit it anywhere.

### Troubleshooting

| Problem | Fix |
|---------|-----|
| **"Repository already exists"** | In cPanel Git Version Control, delete the old one first, then create again |
| **Permission error on deploy** | Make sure Repository Path is `/home/username/repositories/...` — NOT inside `public_html/` |
| **Game files not updating** | Click **Update from Remote** first, THEN **Deploy HEAD Commit** |
| **Private repo won't clone** | Create a GitHub token (see below) and use `https://TOKEN@github.com/lindapot-art/antiruscist.git` as the Clone URL |
| **Game shows old version** | Hard-refresh the browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac) |
| **Want to deploy to a different folder** | Edit `.cpanel.yml` line 23: change `/ar` to your folder name, or remove it to deploy to root |

### Creating a GitHub Token for cPanel

cPanel needs a token to clone private repos (it can't prompt for a password).

**Option A — Fine-Grained Token (GitHub's new default):**

1. Go to [github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta)
2. Click **"Generate new token"**
3. Fill in:
   - **Token name:** `cPanel deploy`
   - **Expiration:** 90 days (or custom — you'll need to regenerate when it expires)
   - **Resource owner:** your GitHub account
   - **Repository access:** select **"Only select repositories"** → pick **antiruscist**
4. Under **Permissions → Repository permissions:**
   - Set **Contents** to **Read-only** (that's the only one needed)
5. Click **"Generate token"** → copy it immediately (starts with `github_pat_`)

**Option B — Classic Token (simpler, has the "repo" checkbox):**

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click the dropdown **"Generate new token"** → choose **"Generate new token (classic)"**
3. Fill in:
   - **Note:** `cPanel deploy`
   - **Expiration:** 90 days
   - **Scopes:** check only **repo** (full repo access)
4. Click **"Generate token"** → copy it immediately (starts with `ghp_`)

> 💡 If you only see "Fine-grained tokens" and can't find the scopes checkboxes, you're on the wrong tab. Look for **"Tokens (classic)"** in the left sidebar or token type switcher at the top.

**Then use the token in cPanel:**

In cPanel → Git Version Control → Create, use this as the Clone URL:
```
https://YOUR_TOKEN_HERE@github.com/lindapot-art/antiruscist.git
```
Replace `YOUR_TOKEN_HERE` with the token you just copied.

### If You Don't Have cPanel

You can also just upload files manually via **File Manager** or **FTP**:
1. Download this repo as a ZIP from GitHub (Code → Download ZIP)
2. In cPanel → **File Manager** → navigate to `public_html/ar/`
3. Upload and extract the ZIP there
4. Delete the folders you don't need: `server/`, `contracts/`, `nft-deploy/`, `node_modules/`, `.github/`

---

## Part 2: Add Online Features (Backend API — Optional)

Skip this entire section if you just want the game playable. Come back later when you want leaderboards, admin panel, multiplayer, etc.

### What the Backend Does

| Feature | Without Backend | With Backend |
|---------|----------------|-------------|
| Play the game | ✅ Works | ✅ Works |
| Save progress | ✅ localStorage | ✅ Cloud sync |
| Leaderboards | ❌ | ✅ |
| Admin panel | ⚠️ Local mode only | ✅ Full control |
| PvP multiplayer | ❌ | ✅ |
| News/announcements | ❌ | ✅ |
| ARC economy tracking | ❌ | ✅ |

### Easiest Way: Render.com (Free)

1. Go to [render.com](https://render.com) and sign up (free)
2. Click **New** → **Web Service**
3. Connect your GitHub account and select this repo
4. Set **Root Directory** to `server` (important! not the repo root)
5. Render reads the `render.yaml` file and configures everything automatically
6. Wait for it to deploy (1-2 minutes)
7. Your API URL will be something like `https://antiruscist.onrender.com`

> 💡 Free tier sleeps after 15 min of no traffic. First visit after sleep takes 2-5 seconds to wake up.

### Other Hosting Options

<details>
<summary>Railway.app (free tier)</summary>

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Set root to `server/`
3. Add environment variable: `CORS_ORIGINS=https://www.photon-bounce.com,https://photon-bounce.com`
4. Note your service URL
</details>

<details>
<summary>Docker (if you have a VPS)</summary>

```bash
cd server
docker build -t antiruscist-api .
docker run -d \
  -p 3001:3001 \
  -e CORS_ORIGINS="https://www.photon-bounce.com,https://photon-bounce.com" \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  -v antiruscist-data:/app/data \
  antiruscist-api
```
</details>

<details>
<summary>Plain Node.js (if you have a VPS with SSH)</summary>

```bash
cd server
npm install --production
JWT_SECRET="your-secret-here" \
CORS_ORIGINS="https://www.photon-bounce.com,https://photon-bounce.com" \
node index.js
```
</details>

### Connect the Game to Your Backend

After deploying the backend, tell the game where to find it:

1. Open `yoursite.com/ar/admin.html` in your browser
2. You'll see a field to enter your **API URL** (e.g. `https://antiruscist.onrender.com`)
3. Type it in, click **Connect**
4. If it's a fresh install, you'll see a **"Create Admin Account"** form — fill it in
5. Log in — you're done!

> 💡 This saves the API URL in your browser. Players who visit the game will also connect to it automatically.

### Backend Environment Variables

| Variable | Required? | Default | What it does |
|----------|-----------|---------|-------------|
| `API_PORT` | No | `3001` | Which port the server listens on |
| `JWT_SECRET` | **Yes** in production | Random | Secret key for login tokens |
| `CORS_ORIGINS` | **Yes** in production | `*` (all) | Your website URL(s), comma-separated |
| `NODE_ENV` | No | `development` | Set to `production` on live server |
| `ADMIN_USER` | No | — | Auto-create admin on first boot |
| `ADMIN_PASS` | No | — | Password for auto-created admin |

### Backend Troubleshooting

| Problem | Fix |
|---------|-----|
| **CORS errors in console** | Set `CORS_ORIGINS` to your exact site URL: `https://www.photon-bounce.com` |
| **Admin panel says "Server offline"** | Check API URL is correct. If using Render free tier, wait 5 seconds for it to wake up |
| **Game works but scores don't sync** | Open browser console (F12), look for `[ARC-API]` messages. Run `ARC_API.getApiUrl()` to check |

---

## Quick Reference

```
THE BIG PICTURE:

  GitHub Repo ──push──► cPanel auto-deploys to ──► yoursite.com/ar/  (game)
                 │
                 └─────► Render.com auto-deploys ──► API server       (optional)
                         the server/ folder
```
