# Deployment Guide

## Local Development

```bash
docker compose up -d
```

Access at http://localhost

### When to Rebuild

**R scripts and Python code are volume-mounted** - changes are reflected immediately without rebuilding.

Only rebuild when **dependencies change** (new R/Python packages):
```bash
docker compose build worker  # Uses cache, faster
docker compose up -d worker
```

Use `--no-cache` only when cache is stale:
```bash
docker compose build --no-cache worker  # Full rebuild, slow
```

## Remote Deployment

### Quick Deploy

```bash
./deploy.sh
```

This syncs files to the server, builds Docker images, and starts containers.

### Access

- **Private (Tailscale)**: http://100.106.202.64
- **Server**: `cliu238@100.106.202.64`

### Manual Commands

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

## Troubleshooting

### "no package called 'openVA'" Error

Rebuild the worker container:
```bash
docker compose build worker
docker compose up -d worker
```

### Check R packages in container
```bash
docker compose exec worker R -e "library(openVA); library(vacalibration)"
```

### View logs
```bash
docker compose logs -f worker
```
