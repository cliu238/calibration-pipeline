import { useState, useEffect, useCallback } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { API_URL } from "../config"

interface Task {
  task_id: string
  status: string
}

interface TaskHistoryProps {
  currentTaskId: string | null
  onSelectTask: (taskId: string) => void
}

export function TaskHistory({ currentTaskId, onSelectTask }: TaskHistoryProps) {
  const [tasks, setTasks] = useState<Task[]>([])

  // Fetch tasks from backend
  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/tasks`)
      const data = await response.json()
      setTasks(data.tasks || [])
    } catch (error) {
      console.error("Failed to fetch tasks:", error)
    }
  }, [])

  // Load tasks on mount and poll for updates
  useEffect(() => {
    fetchTasks()
    const interval = setInterval(fetchTasks, 3000)
    return () => clearInterval(interval)
  }, [fetchTasks])

  // Refresh when currentTaskId changes (new task submitted)
  useEffect(() => {
    if (currentTaskId) {
      fetchTasks()
    }
  }, [currentTaskId, fetchTasks])

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

  const clearHistory = async () => {
    try {
      await fetch(`${API_URL}/tasks`, { method: "DELETE" })
      setTasks([])
    } catch (error) {
      console.error("Failed to delete tasks:", error)
    }
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
              <div className="flex items-center justify-between">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {task.task_id.substring(0, 8)}...
                </code>
                {getStatusBadge(task.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
