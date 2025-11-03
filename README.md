# VA Calibration Pipeline

Backend service for running Verbal Autopsy calibration tasks using FastAPI, Celery, and Redis.

## Prerequisites

- Python 3.10+
- R with packages: `openVA`, `vacalibration`
- Docker (for Redis)
- Conda (recommended)

## Setup

1. Start Redis:
```bash
docker-compose up -d
```

2. Create conda environment and install dependencies:
```bash
conda create -n va-calibration python=3.11 -y
conda activate va-calibration
uv pip install -r requirements.txt
```

3. Install R packages (if not already installed):
```R
install.packages(c("openVA", "vacalibration"))
```

## Running

Start the services in separate terminals:

**Terminal 1 - FastAPI server:**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Celery worker:**
```bash
celery -A worker.celery_app worker --loglevel=info
```

## API Usage

**Create a calibration task (with default sample dataset):**
```bash
curl -X POST http://localhost:8000/tasks/calibration
# Returns: {"task_id": "...", "status": "pending"}
```

**Create a calibration task with custom parameters:**
```bash
curl -X POST http://localhost:8000/tasks/calibration \
  -H "Content-Type: application/json" \
  -d '{
    "country": "Tanzania",
    "age_group": "child",
    "nsim": 500
  }'
```

**With custom dataset**
```bash
curl -X POST http://localhost:8000/tasks/calibration \
  -H "Content-Type: application/json" \
  -d '{"dataset_path": "/path/to/data.csv", "country": "Kenya"}'
```

**Available parameters:**
- `dataset_path` (optional): Path to custom CSV dataset (default: uses sample NeonatesVA5)
- `country` (default: "Mozambique"): Country for calibration
- `age_group` (default: "neonate"): Age group - neonate, child, or adult
- `data_type` (default: "WHO2016"): Data type format
- `nsim` (default: 1000): Number of InSilicoVA simulations

**Check task status:**
```bash
curl http://localhost:8000/tasks/{task_id}
# Returns: {"task_id": "...", "status": "success|pending|running|failed", "result": "..."}
```

**View task logs:**
```bash
# Get complete log (for completed or running tasks)
curl http://localhost:8000/tasks/{task_id}/logs

# Stream logs in real-time (for running tasks)
curl "http://localhost:8000/tasks/{task_id}/logs?follow=true"
```

Logs are stored in `logs/{task_id}.log` and include:
- Task parameters and command
- Real-time R script output
- Final status (SUCCESS/FAILED/TIMEOUT/ERROR)

**Health check:**
```bash
curl http://localhost:8000/health
```

**API Documentation:**
Visit http://localhost:8000/docs for interactive Swagger UI

## Direct R Script Usage

**With sample dataset (default):**
```bash
Rscript complete_va_calibration.R
```

**With custom parameters:**
```bash
Rscript complete_va_calibration.R \
  --dataset=/path/to/data.csv \
  --country=Tanzania \
  --age_group=child \
  --nsim=500
```
