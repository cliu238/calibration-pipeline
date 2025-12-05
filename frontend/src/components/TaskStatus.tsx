import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Spinner } from "./ui/spinner"
import { API_URL } from "../config"

interface CalibrationCause {
  cause: string[]
  calibrated_csmf: number[]
  uncalibrated_csmf: number[]
}

interface EnsembleAlgorithmResult {
  algorithm: string[]
  top_causes: CalibrationCause[]
}

interface CalibrationResult {
  mode?: string[]
  country?: string[]
  age_group?: string[]
  data_type?: string[]
  nsim?: number
  n_deaths?: number
  top_causes?: CalibrationCause[]
  // ensemble-specific fields
  algorithms_used?: string[]
  algorithm_results?: Record<string, EnsembleAlgorithmResult>
  summary?: {
    total_causes?: number[]
    total_algorithms?: number[]
    has_ensemble?: boolean[]
    calibrated?: boolean[]
  }
}

interface TaskResult {
  output?: string
  status?: string
  log_file?: string
  result_data?: CalibrationResult
}

interface Task {
  task_id: string
  status: "pending" | "running" | "success" | "failed"
  result?: TaskResult
  error?: string
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
        const response = await fetch(`${API_URL}/tasks/${taskId}`)
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
            {task.error && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-red-600">Error:</span>
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{task.error}</p>
              </div>
            )}
            {task.result?.result_data && (
              <div className="space-y-3 mt-4">
                <div className="border-t pt-3">
                  <h4 className="text-sm font-semibold mb-3">Calibration Results</h4>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                    {task.result.result_data.mode && (
                      <div>
                        <span className="text-gray-600">Mode:</span>{" "}
                        <span className="font-medium">{task.result.result_data.mode[0]}</span>
                      </div>
                    )}
                    {task.result.result_data.country && (
                      <div>
                        <span className="text-gray-600">Country:</span>{" "}
                        <span className="font-medium">{task.result.result_data.country[0]}</span>
                      </div>
                    )}
                    {task.result.result_data.age_group && (
                      <div>
                        <span className="text-gray-600">Age Group:</span>{" "}
                        <span className="font-medium">{task.result.result_data.age_group[0]}</span>
                      </div>
                    )}
                    {task.result.result_data.n_deaths && (
                      <div>
                        <span className="text-gray-600">Deaths:</span>{" "}
                        <span className="font-medium">{task.result.result_data.n_deaths}</span>
                      </div>
                    )}
                  </div>

                  {/* Top Causes Table (for non-ensemble modes) */}
                  {task.result.result_data.top_causes && task.result.result_data.top_causes.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold text-gray-700 mb-2">Top Causes of Death (CSMF)</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50 border-b">
                              <th className="text-left p-2 font-medium text-gray-700">Rank</th>
                              <th className="text-left p-2 font-medium text-gray-700">Cause</th>
                              <th className="text-right p-2 font-medium text-gray-700">Uncalibrated</th>
                              <th className="text-right p-2 font-medium text-gray-700">Calibrated</th>
                              <th className="text-right p-2 font-medium text-gray-700">Change</th>
                            </tr>
                          </thead>
                          <tbody>
                            {task.result.result_data.top_causes.map((cause, idx) => {
                              const uncalib = cause.uncalibrated_csmf[0] * 100
                              const calib = cause.calibrated_csmf[0] * 100
                              const change = calib - uncalib
                              const changeClass = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'

                              return (
                                <tr key={idx} className="border-b hover:bg-gray-50">
                                  <td className="p-2 text-gray-600">{idx + 1}</td>
                                  <td className="p-2 font-medium">{cause.cause[0]}</td>
                                  <td className="p-2 text-right text-gray-600">{uncalib.toFixed(2)}%</td>
                                  <td className="p-2 text-right font-semibold">{calib.toFixed(2)}%</td>
                                  <td className={`p-2 text-right text-xs ${changeClass}`}>
                                    {change > 0 ? '+' : ''}{change.toFixed(2)}%
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Ensemble Results */}
                  {task.result.result_data.algorithm_results && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="text-xs font-semibold text-gray-700">Ensemble Calibration Results</h5>
                        {task.result.result_data.algorithms_used && (
                          <span className="text-xs text-gray-500">
                            ({task.result.result_data.algorithms_used.join(', ')})
                          </span>
                        )}
                      </div>

                      {Object.entries(task.result.result_data.algorithm_results).map(([algoName, algoResult]) => (
                        <div key={algoName} className="border rounded-md p-3">
                          <h6 className="text-xs font-semibold text-blue-700 mb-2 uppercase">
                            {algoName === 'ensemble' ? '📊 Ensemble (Combined)' : `🔬 ${algoName}`}
                          </h6>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="bg-gray-50 border-b">
                                  <th className="text-left p-1 font-medium text-gray-700">Rank</th>
                                  <th className="text-left p-1 font-medium text-gray-700">Cause</th>
                                  <th className="text-right p-1 font-medium text-gray-700">Calibrated CSMF</th>
                                </tr>
                              </thead>
                              <tbody>
                                {algoResult.top_causes?.map((cause, idx) => {
                                  const calib = (cause.calibrated_csmf?.[0] ?? cause.calibrated_csmf) as number * 100
                                  return (
                                    <tr key={idx} className="border-b hover:bg-gray-50">
                                      <td className="p-1 text-gray-600">{idx + 1}</td>
                                      <td className="p-1 font-medium">{cause.cause?.[0] ?? cause.cause}</td>
                                      <td className="p-1 text-right font-semibold">{calib.toFixed(2)}%</td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary */}
                  {task.result.result_data.summary && (
                    <div className="mt-3 text-xs text-gray-600">
                      {task.result.result_data.summary.total_causes && (
                        <span>Total causes analyzed: {task.result.result_data.summary.total_causes[0]}</span>
                      )}
                      {task.result.result_data.summary.calibrated && task.result.result_data.summary.calibrated[0] && (
                        <Badge variant="success" className="ml-2 text-xs">Calibrated</Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
