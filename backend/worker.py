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
    mode="full",
    dataset_path=None,
    calib_data_path=None,
    country="Mozambique",
    age_group="neonate",
    data_type="WHO2016",
    nsim=1000,
    # vacalibration parameters
    mmat_type="prior",
    path_correction=True,
    nMCMC=5000,
    nBurn=5000,
    nThin=1,
    nChain=1,
    nCore=1,
    seed=1,
    verbose=True,
    saveoutput=False,
    plot_it=False,
    # ensemble calibration parameters
    eava_path=None,
    insilicova_path=None,
    interva_path=None,
):
    """Execute the R calibration script with custom parameters"""
    task_id = self.request.id
    log_file = f"logs/{task_id}.log"

    logger.info(f"Starting calibration task: {task_id} (mode: {mode})")
    logger.info(
        f"Parameters: dataset={dataset_path}, country={country}, age_group={age_group}"
    )

    try:
        # Build R script command based on mode
        if mode == "ensemble":
            cmd = ["Rscript", "scripts/ensemble_calibration.R"]
            if eava_path:
                cmd.append(f"--eava={eava_path}")
            if insilicova_path:
                cmd.append(f"--insilicova={insilicova_path}")
            if interva_path:
                cmd.append(f"--interva={interva_path}")
            cmd.append(f"--country={country}")
            cmd.append(f"--age_group={age_group}")
        elif mode == "calibration_only":
            cmd = ["Rscript", "scripts/calibration_only.R"]
            if calib_data_path:
                cmd.append(f"--calib_data={calib_data_path}")
            cmd.append(f"--country={country}")
            cmd.append(f"--age_group={age_group}")
        else:  # full mode
            cmd = ["Rscript", "scripts/complete_va_calibration.R"]
            if dataset_path:
                cmd.append(f"--dataset={dataset_path}")
            cmd.append(f"--country={country}")
            cmd.append(f"--age_group={age_group}")
            cmd.append(f"--data_type={data_type}")
            cmd.append(f"--nsim={nsim}")

        # Add vacalibration parameters (common to both modes)
        cmd.append(f"--mmat_type={mmat_type}")
        cmd.append(f"--path_correction={path_correction}")
        cmd.append(f"--nMCMC={nMCMC}")
        cmd.append(f"--nBurn={nBurn}")
        cmd.append(f"--nThin={nThin}")
        cmd.append(f"--nChain={nChain}")
        cmd.append(f"--nCore={nCore}")
        cmd.append(f"--seed={seed}")
        cmd.append(f"--verbose={verbose}")
        cmd.append(f"--saveoutput={saveoutput}")
        cmd.append(f"--plot_it={plot_it}")

        # Write initial log
        with open(log_file, "w") as f:
            f.write(f"Task ID: {task_id}\n")
            f.write(f"Mode: {mode}\n")
            f.write(f"Command: {' '.join(cmd)}\n")
            if mode == "ensemble":
                algos = []
                if eava_path:
                    algos.append(f"eava={eava_path}")
                if insilicova_path:
                    algos.append(f"insilicova={insilicova_path}")
                if interva_path:
                    algos.append(f"interva={interva_path}")
                f.write(f"Parameters: {', '.join(algos)}, country={country}, age_group={age_group}\n")
            elif mode == "calibration_only":
                f.write(f"Parameters: calib_data={calib_data_path}, country={country}, age_group={age_group}\n")
            else:
                f.write(f"Parameters: dataset={dataset_path}, country={country}, age_group={age_group}, nsim={nsim}\n")
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

            # Try to extract JSON results from output
            import json
            import re
            result_data = None
            json_match = re.search(r'___JSON_RESULT_START___\n(.*?)\n___JSON_RESULT_END___', output, re.DOTALL)
            if json_match:
                try:
                    result_data = json.loads(json_match.group(1))
                    logger.info(f"Parsed structured results for task {task_id}")
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse JSON results: {e}")

            return {
                "output": output,
                "status": "success",
                "log_file": log_file,
                "result_data": result_data
            }
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
