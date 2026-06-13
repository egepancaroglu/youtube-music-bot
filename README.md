# Discord Music Bot

A feature-rich Discord music bot with **YouTube** and **Spotify** support. Built with TypeScript, discord.js v14, and yt-dlp for reliable playback.

## Features

- YouTube video, shorts, and playlist playback
- Spotify track, playlist, and album support (resolved via YouTube)
- Text search with interactive selection menu
- Per-server queue with auto-play next track
- Volume control, shuffle, skip, pause/resume
- Auto-disconnect after 5 minutes of inactivity
- Clean embed responses

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or higher
- A Discord bot token ([how to get one](#1-create-a-discord-bot))
- Spotify API credentials *(optional, for Spotify link support)*

### Installation

```bash
# Clone the repo
git clone https://github.com/egepancaroglu/youtube-music-bot.git
cd youtube-music-bot

# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env
# Edit .env with your credentials (see below)

# Register slash commands with Discord
npm run deploy

# Start the bot
npm run dev
```

---

## Setup Guide

### 1. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**, give it a name
3. Go to the **Bot** tab, click **Reset Token**, copy it → this is your `DISCORD_TOKEN`
4. On the same page, enable these under **Privileged Gateway Intents**:
   - Server Members Intent
   - Message Content Intent
5. Go to **OAuth2** tab → copy the **Client ID** → this is your `DISCORD_CLIENT_ID`

### 2. Invite the Bot to Your Server

Go to **OAuth2 → URL Generator**:
- **Scopes**: select `bot` and `applications.commands`
- **Bot Permissions**: select `Connect`, `Speak`

Open the generated URL in your browser → select your server → **Authorize**.

### 3. Get Your Server (Guild) ID

1. In Discord, go to **Settings → Advanced → Developer Mode** (turn on)
2. Right-click your server name → **Copy Server ID** → this is your `DISCORD_GUILD_ID`

### 4. Spotify Credentials (Optional)

If you want Spotify link support:

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app
3. Copy **Client ID** and **Client Secret**

Without Spotify credentials, the bot still works — you just can't paste Spotify links. Search and YouTube links work fine.

### 5. Environment Variables

Create a `.env` file in the project root:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_guild_id_here
SPOTIFY_CLIENT_ID=your_spotify_client_id        # optional
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret  # optional
DEFAULT_VOLUME=50
```

### 6. Register Commands & Run

```bash
# Register slash commands (run once, or after adding new commands)
npm run deploy

# Development (auto-restart on changes)
npm run dev

# Production
npm run build
npm start
```

---

## Commands

| Command | Description |
|---------|-------------|
| `/play <query or URL>` | Play a track or add it to the queue |
| `/search <query>` | Search and pick from top 5 results |
| `/pause` | Pause the current track |
| `/resume` | Resume playback |
| `/skip` | Skip to the next track |
| `/stop` | Stop playback and clear queue |
| `/queue` | Show the current queue |
| `/nowplaying` | Show the currently playing track |
| `/shuffle` | Shuffle the queue |
| `/remove <position>` | Remove a track by position number |
| `/clear` | Clear the queue (keeps current track) |
| `/leave` | Leave the voice channel |
| `/volume <0-100>` | Set playback volume |

## Supported Inputs

| Input | Example |
|-------|---------|
| YouTube video | `https://www.youtube.com/watch?v=dQw4w9WgXcQ` |
| YouTube shorts | `https://www.youtube.com/shorts/abc123` |
| YouTube playlist | `https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf` |
| Spotify track | `https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT` |
| Spotify playlist | `https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M` |
| Spotify album | `https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3` |
| Search query | `crazy frog axel f` |

## How Spotify Works

Spotify's API doesn't provide audio streams — only metadata (song name, artist, etc.). So the bot:

1. Reads track info from Spotify's API
2. Searches YouTube for `"artist - song title"`
3. Plays the matching YouTube result

This is the same approach used by all major Discord music bots.

---

## Deploy to AWS EC2 (Free Tier)

Run your bot 24/7 for free on AWS (first 12 months).

### 1. Launch EC2 Instance

1. Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2)
2. Click **Launch Instance**
3. Settings:
   - **Name**: discord-music-bot
   - **AMI**: Ubuntu Server 24.04 LTS
   - **Instance type**: t2.micro (Free Tier eligible)
   - **Key pair**: Create new → download `.pem` file
   - **Security Group**: Allow SSH (port 22) from your IP
4. Click **Launch Instance**

### 2. Connect & Setup

```bash
# Connect via SSH
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Clone and setup
git clone https://github.com/egepancaroglu/youtube-music-bot.git
cd youtube-music-bot
chmod +x scripts/ec2-setup.sh
./scripts/ec2-setup.sh

# IMPORTANT: Log out and back in for Docker permissions
exit
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
cd youtube-music-bot
```

### 3. Configure & Start

```bash
# Create .env file
nano .env
# Paste your environment variables, Ctrl+X to save

# Build and start (runs in background)
docker compose up -d --build

# Register slash commands (first time only)
docker compose exec bot node dist/deploy-commands.js

# Watch logs
docker compose logs -f
```

### 4. Update the Bot

```bash
cd youtube-music-bot
./scripts/deploy.sh
```

### AWS Cost

| Period | Instance | Cost |
|--------|----------|------|
| First 12 months | t2.micro | **Free** (750 hrs/month) |
| After 12 months | t2.micro | ~$8-9/month |
| After 12 months | t4g.nano (ARM) | ~$3/month |

---

## Docker (Local or Any Server)

```bash
# Build and run
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down
```

---

## Project Structure

```
src/
  index.ts              # Entry point
  config.ts             # Environment variable loading
  client.ts             # Discord client & command routing
  deploy-commands.ts    # Slash command registration script
  commands/             # All 13 slash commands
  music/
    Track.ts            # Track interface
    Queue.ts            # Per-guild queue
    Player.ts           # Audio player (yt-dlp + ffmpeg)
    GuildMusicManager.ts # Voice connection + queue + player
  providers/
    Provider.ts         # MusicProvider interface
    YouTubeProvider.ts  # YouTube search, video, playlist
    SpotifyProvider.ts  # Spotify → YouTube resolution
    ProviderRegistry.ts # Provider routing
  utils/
    url.ts              # URL type detection
    duration.ts         # Time formatting
    logger.ts           # Console logger
    errors.ts           # Custom error classes
```

## Tech Stack

- **TypeScript** + **Node.js 20+**
- **discord.js v14** — Discord API
- **@discordjs/voice v0.19** — Voice connections (gateway v8)
- **yt-dlp** — YouTube audio downloading (reliable, maintained)
- **ffmpeg** — Audio transcoding
- **youtube-sr** — YouTube search
- **Spotify Web API** — Spotify metadata resolution

## Troubleshooting

**Bot doesn't respond to commands**
- Run `npm run deploy` to register slash commands
- Make sure `DISCORD_TOKEN` and `DISCORD_CLIENT_ID` are correct in `.env`

**No audio / silence**
- The bot needs `Connect` and `Speak` permissions in your voice channel
- Make sure `yt-dlp` binary exists: `node_modules/yt-dlp-exec/bin/yt-dlp.exe`
- Check logs for errors: `docker compose logs -f`

**"No results found"**
- Some videos are age-restricted or region-locked
- Try a different search query

**Spotify not working**
- Check that `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are set in `.env`
- Spotify links are resolved by searching YouTube — if a song isn't on YouTube, it'll be skipped

**Bot disconnects randomly**
- The bot auto-disconnects after 5 minutes of inactivity (empty queue)
- On EC2, make sure the instance isn't running out of CPU credits

## License

MIT
