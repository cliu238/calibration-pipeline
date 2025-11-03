import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Spinner } from "./ui/spinner"

interface Task {
  task_id: string
  status: "pending" | "running" | "success" | "failed"
  result?: string
}

interface TaskStatusProps {
  taskId: string | null
}

export function TaskStatus({ taskId }: TaskStatusProps) {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!taskId) return

    const fetchStatus = async () => {
      setLoading(true)
      try {
        const response = await fetch(`http://localhost:8000/tasks/${taskId}`)
        const data = await response.json()
        setTask(data)
      } catch (error) {
        console.error("Failed to fetch task status:", error)
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchStatus()

    // Poll every 2 seconds if task is pending or running
    const interval = setInterval(() => {
      fetchStatus()
    }, 2000)

    return () => clearInterval(interval)
  }, [taskId])

  if (!taskId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm">
            No task selected. Submit a calibration task to see its status.
          </p>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "running":
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Spinner size={12} />
            Running
          </Badge>
        )
      case "success":
        return <Badge variant="success">Success</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Status</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && !task ? (
          <div className="flex items-center justify-center p-8">
            <Spinner />
          </div>
        ) : task ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Task ID:</span>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">{task.task_id}</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              {getStatusBadge(task.status)}
            </div>
            {task.result && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Result:</span>
                <pre className="text-sm bg-gray-100 p-4 rounded-lg overflow-auto max-h-48">
                  {typeof task.result === 'object'
                    ? JSON.stringify(task.result, null, 2)
                    : task.result}
                </pre>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
