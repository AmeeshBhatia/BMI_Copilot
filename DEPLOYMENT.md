# Deploying / Sharing BMI Copilot for Testing

Three ways to let other computers use the app, from quickest to most permanent.
Pick based on who needs access and for how long.

---

## Option A — Same network (LAN): fastest, zero setup

Best when your testers are on the **same Wi-Fi/office network** as your PC.
The app already binds to all network interfaces, so other devices can reach it.

1. Start the app on your machine:
   ```
   npm start
   ```
2. Find your machine's local IP address:
   - **Windows:** open a terminal and run `ipconfig` → look for **IPv4 Address**
     (something like `192.168.1.42`).
   - **Mac:** `ipconfig getifaddr en0`
3. On any other device on the same network, open:
   ```
   http://<your-ip>:3000
   ```
   e.g. `http://192.168.1.42:3000`

**If it won't connect from other devices**, Windows Firewall is likely blocking
Node. Allow it once:
- When you first ran `npm start`, Windows may have shown a firewall prompt —
  click **Allow access** (Private networks).
- Or manually: Windows Security → Firewall & network protection → Allow an app
  through firewall → allow **Node.js**.

**Limits:** your PC must stay on and running the app; only works on that
network; not reachable from the public internet.

---

## Option B — Temporary public link (tunnel): quick, share anywhere

Best for **short-term testing with people not on your network** (e.g. a client
across town). A tunnel exposes your locally-running app at a temporary public
URL. Your PC still does the work.

Using **Cloudflare Tunnel** (free, no account needed for quick tunnels):

1. Install once (Windows, via winget):
   ```
   winget install --id Cloudflare.cloudflared
   ```
2. Start your app in one terminal:
   ```
   npm start
   ```
3. In a second terminal, run:
   ```
   cloudflared tunnel --url http://localhost:3000
   ```
4. It prints a public URL like `https://random-words.trycloudflare.com`.
   Share that — anyone can open it while both terminals stay running.

(ngrok works the same way: `ngrok http 3000`, but needs a free account/token.)

**Limits:** the URL changes each time you restart the tunnel; your PC must stay
on; meant for testing, not production.

---

## Option C — Always-on cloud URL (Render): permanent, independent of your PC

Best when testers need a **stable link anytime**, without your computer being
on. Free tier is fine for testing (it sleeps when idle and wakes on the next
request — first hit after idle takes ~30s).

You'll do this once; I've already added the `render.yaml` blueprint.

**1. Put the project on GitHub.**
   ```
   cd bmi-copilot
   git init
   git add .
   git commit -m "BMI Copilot"
   ```
   Create an empty repo on github.com, then follow its "push an existing repo"
   commands. (`.env` is gitignored, so your keys are NOT uploaded — good.)

**2. Deploy on Render.**
   - Go to https://render.com and sign up (free, GitHub login works).
   - Click **New → Blueprint**, connect your GitHub, pick the repo.
   - Render reads `render.yaml` and configures the service automatically.

**3. Add your secret keys.**
   In the Render service → **Environment**, add:
   - `GEMINI_API_KEY` = your Gemini key
   - `TAVILY_API_KEY` = your Tavily key (for live + cited reports)
   (These are intentionally not in the repo.)

**4. Deploy.**
   Render builds and gives you a URL like `https://bmi-copilot.onrender.com`.
   Share it with anyone.

**Redeploying later:** just `git push` — Render auto-rebuilds.

**Limits (free tier):** the service sleeps after ~15 min idle; the first
request after sleeping is slow while it wakes. Upgrade to a paid instance to
keep it always warm.

---

## Which should you pick?

| Need | Use |
|---|---|
| Quick test, same office/network | **A (LAN)** |
| Show someone remote for an hour | **B (tunnel)** |
| A link testers can use anytime | **C (Render)** |

---

## Security note before sharing widely

The app has **no login** — anyone with the URL can generate reports, which
spends your Gemini/Tavily quota. For LAN or a short tunnel this is fine. Before
putting it on a public Render URL that many people will hit, consider adding a
simple access password or basic auth so your API quota isn't used by strangers.
I can add that for you — just ask.
