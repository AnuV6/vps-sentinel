# 🛡️ VPS Sentinel

A self-hosted, lightweight monitoring tool for your servers and services.
Get instant alerts via **Telegram** when your sites, ports, or keywords go down.

![Logo](public/images/logo.png)

## 🚀 Features

*   **Multi-Type Monitoring:**
    *   **HTTP:** Check if websites are returning status 200.
    *   **Keyword:** Check if a specific word exists on the page (anti-defacement/content check).
    *   **Port:** Check if TCP ports (e.g., 3306, 5432) are open.
*   **Real-Time Dashboard:**
    *   Dark mode UI (Cyberpunk/Neon theme).
    *   Live sparkline latency charts.
    *   "Time since last check" indicators.
*   **Smart Alerts:**
    *   **Telegram:** Instant notifications to your User or Channel.
    *   **Email:** (Optional) SMTP support.
    *   **Smart Logic:** Alerts on status *change* OR if a new monitor starts as DOWN.
*   **Optimized:**
    *   Automatic data pruning (keeps database small).
    *   Browser masquerading (User-Agent tags) to avoid blocking.
    *   SSL Verification bypass for internal/dev sites.

## 🛠️ Installation

### Option 1: Docker (Recommended)
You can run VPS Sentinel anywhere with Docker.

```bash
# 1. Build the image
docker build -t vps-sentinel .

# 2. Run the container
docker run -d -p 3000:3000 \
  -e TELEGRAM_BOT_TOKEN="your-token" \
  -e TELEGRAM_CHAT_ID="-100xxxx" \
  --restart always \
  --name sentinel \
  vps-sentinel
```

### Option 2: Local Node.js
```bash
# 1. Install dependencies
npm install

# 2. Configure Environment
cp .env.example .env
# Edit .env and add your Telegram credentials

# 3. Build & Start
npm run build
npm start
```

## ⚙️ Configuration (.env)

| Variable | Description |
| :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | Your BotFather token. |
| `TELEGRAM_CHAT_ID` | Your User ID or Channel ID (e.g., -100...). |
| `SMTP_USER` | (Optional) Gmail/SMTP user for email alerts. |
| `SMTP_PASS` | (Optional) App password for email. |
| `PORT` | (Optional) Port to run on (default: 3000). |

## 📂 Project Structure

*   `src/monitor.ts` - The core engine that runs cron jobs.
*   `src/alerts.ts` - Telegram/Email notification logic.
*   `src/server.ts` - Express web server for the dashboard.
*   `views/dashboard.ejs` - The frontend UI template.

---
*Created by Anupa Dinuranga*
