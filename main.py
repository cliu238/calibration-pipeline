from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from worker import run_calibration_task, celery_app
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="VA Calibration API")


class CalibrationRequest(BaseModel):
    dataset_path: str | None = Field(
        None, description="Path to CSV dataset (optional, uses sample if not provided)"
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
    task = run_calibration_task.delay(
        dataset_path=request.dataset_path,
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


@app.get("/health")
def health_check():
    return {"status": "ok"}
