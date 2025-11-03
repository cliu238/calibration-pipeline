from celery import Celery
import subprocess
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Celery configuration
celery_app = Celery(
    "va_calibration",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    result_backend=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)


@celery_app.task(bind=True, name="run_calibration")
def run_calibration_task(self):
    """Execute the R calibration script"""
    logger.info(f"Starting calibration task: {self.request.id}")

    try:
        # Run the R script
        result = subprocess.run(
            ["Rscript", "complete_va_calibration.R"],
            capture_output=True,
            text=True,
            timeout=600,  # 10 minute timeout
        )

        if result.returncode == 0:
            logger.info(f"Task {self.request.id} completed successfully")
            return {"output": result.stdout, "status": "success"}
        else:
            logger.error(f"Task {self.request.id} failed: {result.stderr}")
            raise Exception(f"R script failed: {result.stderr}")

    except subprocess.TimeoutExpired:
        logger.error(f"Task {self.request.id} timed out")
        raise Exception("Task timed out after 10 minutes")
    except Exception as e:
        logger.error(f"Task {self.request.id} error: {str(e)}")
        raise
