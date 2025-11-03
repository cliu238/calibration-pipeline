from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from worker import run_calibration_task, celery_app
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="VA Calibration API")


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
def create_calibration_task():
    """Start a new VA calibration task"""
    task = run_calibration_task.delay()
    logger.info(f"Created task: {task.id}")
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


@app.get("/health")
def health_check():
    return {"status": "ok"}
