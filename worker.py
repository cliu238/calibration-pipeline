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
def run_calibration_task(
    self,
    dataset_path=None,
    country="Mozambique",
    age_group="neonate",
    data_type="WHO2016",
    nsim=1000,
):
    """Execute the R calibration script with custom parameters"""
    task_id = self.request.id
    log_file = f"logs/{task_id}.log"

    logger.info(f"Starting calibration task: {task_id}")
    logger.info(
        f"Parameters: dataset={dataset_path}, country={country}, age_group={age_group}"
    )

    try:
        # Build R script command with parameters
        cmd = ["Rscript", "complete_va_calibration.R"]

        if dataset_path:
            cmd.append(f"--dataset={dataset_path}")
        cmd.append(f"--country={country}")
        cmd.append(f"--age_group={age_group}")
        cmd.append(f"--data_type={data_type}")
        cmd.append(f"--nsim={nsim}")

        # Write initial log
        with open(log_file, "w") as f:
            f.write(f"Task ID: {task_id}\n")
            f.write(f"Command: {' '.join(cmd)}\n")
            f.write(f"Parameters: country={country}, age_group={age_group}, nsim={nsim}\n")
            f.write("-" * 80 + "\n\n")

        # Run the R script with live output streaming to log file
        with open(log_file, "a") as f:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )

            output_lines = []
            for line in process.stdout:
                f.write(line)
                f.flush()
                output_lines.append(line)

            process.wait(timeout=600)

        output = "".join(output_lines)

        if process.returncode == 0:
            logger.info(f"Task {task_id} completed successfully")
            with open(log_file, "a") as f:
                f.write("\n" + "-" * 80 + "\n")
                f.write("STATUS: SUCCESS\n")
            return {"output": output, "status": "success", "log_file": log_file}
        else:
            logger.error(f"Task {task_id} failed")
            with open(log_file, "a") as f:
                f.write("\n" + "-" * 80 + "\n")
                f.write(f"STATUS: FAILED (exit code {process.returncode})\n")
            raise Exception(f"R script failed with exit code {process.returncode}")

    except subprocess.TimeoutExpired:
        logger.error(f"Task {task_id} timed out")
        with open(log_file, "a") as f:
            f.write("\n" + "-" * 80 + "\n")
            f.write("STATUS: TIMEOUT\n")
        raise Exception("Task timed out after 10 minutes")
    except Exception as e:
        logger.error(f"Task {task_id} error: {str(e)}")
        with open(log_file, "a") as f:
            f.write("\n" + "-" * 80 + "\n")
            f.write(f"STATUS: ERROR - {str(e)}\n")
        raise
