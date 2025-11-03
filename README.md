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

**Create a calibration task:**
```bash
curl -X POST http://localhost:8000/tasks/calibration
# Returns: {"task_id": "...", "status": "pending"}
```

**Check task status:**
```bash
curl http://localhost:8000/tasks/{task_id}
# Returns: {"task_id": "...", "status": "success|pending|running|failed", "result": "..."}
```

**Health check:**
```bash
curl http://localhost:8000/health
```

## Direct R Script Usage

```bash
Rscript complete_va_calibration.R 2>&1
```
