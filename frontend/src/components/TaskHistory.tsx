import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"

interface Task {
  task_id: string
  status: string
  timestamp?: string
}

interface TaskHistoryProps {
  currentTaskId: string | null
  onSelectTask: (taskId: string) => void
}

export function TaskHistory({ currentTaskId, onSelectTask }: TaskHistoryProps) {
  const [tasks, setTasks] = useState<Task[]>([])

  // Load tasks from localStorage on mount
  useEffect(() => {
    const savedTasks = localStorage.getItem("va-calibration-tasks")
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks))
    }
  }, [])

  // Poll for status updates for all tasks
  useEffect(() => {
    if (tasks.length === 0) return

    const updateTaskStatuses = async () => {
      const updatedTasks = await Promise.all(
        tasks.map(async (task) => {
          // Only update if task is not in final state
          if (task.status === "success" || task.status === "failed") {
            return task
          }

          try {
            const response = await fetch(`http://localhost:8000/tasks/${task.task_id}`)
            const data = await response.json()
            return { ...task, status: data.status }
          } catch (error) {
            return task
          }
        })
      )

      setTasks(updatedTasks)
      localStorage.setItem("va-calibration-tasks", JSON.stringify(updatedTasks))
    }

    // Update immediately
    updateTaskStatuses()

    // Then poll every 3 seconds
    const interval = setInterval(updateTaskStatuses, 3000)
    return () => clearInterval(interval)
  }, [tasks.length])

  // Save new task to history when currentTaskId changes
  useEffect(() => {
    if (!currentTaskId) return

    const existingTask = tasks.find((t) => t.task_id === currentTaskId)
    if (existingTask) {
      // Task already in history, move it to top
      const updatedTasks = [
        existingTask,
        ...tasks.filter((t) => t.task_id !== currentTaskId),
      ]
      setTasks(updatedTasks)
      localStorage.setItem("va-calibration-tasks", JSON.stringify(updatedTasks))
    } else {
      // New task, add to history
      const newTask: Task = {
        task_id: currentTaskId,
        status: "pending",
        timestamp: new Date().toISOString(),
      }
      const updatedTasks = [newTask, ...tasks].slice(0, 10) // Keep last 10 tasks
      setTasks(updatedTasks)
      localStorage.setItem("va-calibration-tasks", JSON.stringify(updatedTasks))
    }
  }, [currentTaskId])

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "running":
        return <Badge variant="warning">Running</Badge>
      case "success":
        return <Badge variant="success">Success</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "Unknown"
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const clearHistory = () => {
    setTasks([])
    localStorage.removeItem("va-calibration-tasks")
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm">
            No previous tasks. Submit a calibration task to build your history.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Task History</CardTitle>
          <button
            onClick={clearHistory}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Clear History
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {tasks.map((task) => (
            <div
              key={task.task_id}
              onClick={() => onSelectTask(task.task_id)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                task.task_id === currentTaskId
                  ? "bg-blue-50 border-blue-300"
                  : "bg-white border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {task.task_id.substring(0, 8)}...
                </code>
                {getStatusBadge(task.status)}
              </div>
              <p className="text-xs text-gray-600">
                {formatTimestamp(task.timestamp)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
