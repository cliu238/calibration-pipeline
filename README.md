# VA Calibration Pipeline

## Overview

This project provides an end-to-end pipeline for Verbal Autopsy (VA) analysis and calibration. It automates the process of analyzing cause of death data and calibrating prediction models to improve accuracy in mortality surveillance systems.

## Purpose

Verbal autopsy is a method used to determine causes of death in populations where medical death certification is not available. This pipeline streamlines the entire workflow from raw VA data to calibrated predictions, making it easier for researchers and public health professionals to obtain accurate cause of death estimates.

## Key Functions

### VA Analysis
- Processes verbal autopsy survey data to predict causes of death
- Uses **openVA** framework for comprehensive VA analysis
- Supports multiple age groups (neonate, child, adult)
- Handles country-specific data configurations

### Model Calibration
- Calibrates VA prediction models using the **vaCalibrate** package
- Improves prediction accuracy by adjusting model parameters based on gold standard data
- Runs iterative simulations to optimize model performance
- Generates calibrated cause-specific mortality fractions (CSMF)

### Two Operating Modes

#### Full Pipeline Mode (Steps 1-5)
Runs the complete VA analysis and calibration workflow:
1. **Data Input**: Upload or use sample VA datasets
2. **Analysis**: Process VA data through openVA/InSilicoVA algorithms
3. **Preparation**: Prepare data for calibration
4. **Calibration**: Apply vaCalibrate to refine predictions
5. **Results**: View calibrated outputs and performance metrics

**Use this mode when**: Starting with raw VA data and need complete analysis

#### Calibration-Only Mode (Steps 4-5)
Runs only the calibration and results steps using pre-prepared data:
4. **Calibration**: Apply vaCalibrate with different parameters (country, age group)
5. **Results**: View calibrated outputs and performance metrics

**Use this mode when**:
- You've already run InSilicoVA analysis and have prepared calibration data
- You want to experiment with different calibration parameters (country, age group)
- You want to skip the time-consuming InSilicoVA step

### Real-time Monitoring
Track analysis progress with live logs for both modes

## Use Cases

- **Public Health Research**: Improve accuracy of mortality statistics in low-resource settings
- **Epidemiological Studies**: Generate reliable cause of death distributions for population health analysis
- **Health Policy**: Inform evidence-based decision making with calibrated mortality data
- **Surveillance Systems**: Enhance automated VA analysis pipelines with calibration capabilities

## Benefits

- **Automated**: Eliminates manual steps in the VA calibration process
- **Accessible**: Web-based interface requires no programming knowledge
- **Transparent**: Real-time logs show analysis progress
- **Flexible**: Supports custom datasets and configurable parameters
- **Accurate**: Improves VA predictions through statistical calibration
- **Efficient**: Calibration-only mode allows rapid experimentation with different parameters

## Workflow Examples

### Example 1: Full Pipeline
1. Select "Full Pipeline" mode
2. (Optional) Provide path to your VA dataset CSV
3. Configure parameters (country, age group, data type, simulations)
4. Submit and monitor progress
5. View calibrated results

### Example 2: Calibration-Only Workflow
1. First, prepare calibration data using the helper script:
   ```bash
   Rscript scripts/prepare_and_save_calibration_data.R --dataset=my_data.csv --output=my_calib_data.rds
   ```
2. Select "Calibration-Only" mode in the UI
3. Provide path to the prepared calibration data (`.rds` file)
4. Try different calibration parameters (country, age group)
5. Compare results across different calibrations

This two-mode approach saves significant time when you need to run calibrations with different parameters on the same dataset.

## Project Structure

```
calibration-pipeline/
├── backend/              # Python FastAPI application
│   ├── main.py          # API endpoints
│   └── worker.py        # Celery task workers
├── scripts/             # R calibration scripts
│   ├── calibration_only.R
│   ├── complete_va_calibration.R
│   └── prepare_and_save_calibration_data.R
├── data/                # Test and sample data
├── frontend/            # React + TypeScript UI
├── logs/                # Runtime task logs
├── pyproject.toml       # Python dependencies (uv)
└── docker-compose.yml   # Redis service
```

## Setup

### Using uv (recommended)
```bash
# Install dependencies
uv sync

# Run API server
uv run uvicorn backend.main:app --reload --port 8000

# Run Celery worker
uv run celery -A backend.worker.celery_app worker --loglevel=info
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
