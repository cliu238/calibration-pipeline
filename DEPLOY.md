# Deployment Guide

## Quick Deploy

```bash
./deploy.sh
```

This will:
1. Sync files to the server via rsync
2. Build Docker images
3. Start all containers

## Access

- **Private (Tailscale)**: http://100.106.202.64
- **Public (Cloudflare)**: See "Public Access" section below
- **Server**: `cliu238@100.106.202.64`

## Manual Commands

SSH into server:
```bash
ssh cliu238@100.106.202.64
cd calibration-pipeline
```

Check status:
```bash
docker compose ps
```

View logs:
```bash
docker compose logs -f           # all services
docker compose logs -f backend   # backend only
docker compose logs -f worker    # worker only
```

Restart services:
```bash
docker compose restart
```

Rebuild and restart:
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| frontend | 80 | Nginx serving React app |
| backend | 8000 (internal) | FastAPI server |
| worker | - | Celery worker for R scripts |
| redis | 6379 (internal) | Message broker |

## Public Access (Cloudflare Tunnel)

The server is on Tailscale VPN (100.x.x.x), so it's not directly public. Use Cloudflare Tunnel for public access.

### Start Tunnel
```bash
ssh cliu238@100.106.202.64 "nohup ~/bin/cloudflared tunnel --url http://localhost:80 > ~/cloudflared.log 2>&1 &"
```

### Get Public URL
```bash
ssh cliu238@100.106.202.64 "cat ~/cloudflared.log | grep trycloudflare.com"
```

Example output: `https://random-words.trycloudflare.com`

### Stop Tunnel
```bash
ssh cliu238@100.106.202.64 "pkill cloudflared"
```

### Check Tunnel Status
```bash
ssh cliu238@100.106.202.64 "pgrep -a cloudflared"
```

**Note:** Temporary URLs change each time the tunnel restarts. For a permanent custom domain, set up a named Cloudflare Tunnel with a free Cloudflare account.

## Troubleshooting

### Container not starting
```bash
docker compose logs worker  # Check for R package errors
```

### R script errors
Check if vacalibration is properly compiled:
```bash
docker compose exec worker R -e "library(vacalibration); packageVersion('vacalibration')"
```

### Rebuild single service
```bash
docker compose build --no-cache worker
docker compose up -d worker
```
