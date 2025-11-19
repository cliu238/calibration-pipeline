from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from worker import run_calibration_task, celery_app
import logging
import os
import asyncio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="VA Calibration API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CalibrationRequest(BaseModel):
    mode: str = Field("full", description="Mode: 'full' (steps 1-5) or 'calibration_only' (steps 4-5)")
    dataset_path: str | None = Field(
        None, description="Path to CSV dataset (optional for full mode, uses sample if not provided)"
    )
    calib_data_path: str | None = Field(
        None, description="Path to prepared calibration data (required for calibration_only mode)"
    )
    country: str = Field("Mozambique", description="Country for calibration")
    age_group: str = Field("neonate", description="Age group: neonate, child, adult")
    data_type: str = Field("WHO2016", description="Data type: WHO2016, etc.")
    nsim: int = Field(1000, description="Number of InSilicoVA simulations", gt=0)


class TaskResponse(BaseModel):
    task_id: str
    status: str


class TaskResult(BaseModel):
    task_id: str
    status: str
    result: dict | str | None = None
    error: str | None = None


@app.get("/")
def root():
    return {"message": "VA Calibration API", "version": "1.0"}


@app.post("/tasks/calibration", response_model=TaskResponse)
def create_calibration_task(request: CalibrationRequest = CalibrationRequest()):
    """Start a new VA calibration task with custom parameters"""
    # Validate mode-specific requirements
    if request.mode == "calibration_only" and not request.calib_data_path:
        raise HTTPException(
            status_code=400,
            detail="calib_data_path is required for calibration_only mode"
        )

    task = run_calibration_task.delay(
        mode=request.mode,
        dataset_path=request.dataset_path,
        calib_data_path=request.calib_data_path,
        country=request.country,
        age_group=request.age_group,
        data_type=request.data_type,
        nsim=request.nsim,
    )
    logger.info(f"Created task: {task.id} with params: {request.model_dump()}")
    return TaskResponse(task_id=task.id, status="pending")


@app.get("/tasks/{task_id}", response_model=TaskResult)
def get_task_status(task_id: str):
    """Get the status and result of a task"""
    task_result = celery_app.AsyncResult(task_id)

    if task_result.state == "PENDING":
        return TaskResult(task_id=task_id, status="pending")
    elif task_result.state == "STARTED":
        return TaskResult(task_id=task_id, status="running")
    elif task_result.state == "SUCCESS":
        return TaskResult(task_id=task_id, status="success", result=task_result.result)
    elif task_result.state == "FAILURE":
        return TaskResult(task_id=task_id, status="failed", error=str(task_result.info))
    else:
        return TaskResult(task_id=task_id, status=task_result.state.lower())


@app.get("/tasks/{task_id}/logs")
async def get_task_logs(task_id: str, follow: bool = False):
    """Get task logs - supports live streaming with follow=true"""
    log_file = f"logs/{task_id}.log"

    if not os.path.exists(log_file):
        raise HTTPException(status_code=404, detail="Log file not found")

    if not follow:
        # Return complete log file
        return FileResponse(
            log_file, media_type="text/plain", filename=f"{task_id}.log"
        )

    # Stream logs in real-time (for running tasks)
    async def log_streamer():
        with open(log_file, "r") as f:
            # Read existing content
            yield f.read()

            # Continue reading new lines as they're written
            while True:
                line = f.readline()
                if line:
                    yield line
                else:
                    # Check if task is still running
                    task_result = celery_app.AsyncResult(task_id)
                    if task_result.state not in ["PENDING", "STARTED"]:
                        # Task finished, read any remaining content and exit
                        remaining = f.read()
                        if remaining:
                            yield remaining
                        break
                    await asyncio.sleep(0.5)

    return StreamingResponse(log_streamer(), media_type="text/plain")


@app.get("/health")
def health_check():
    return {"status": "ok"}
