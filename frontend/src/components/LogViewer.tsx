import { useEffect, useState, useRef } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { Terminal } from "./ui/terminal"
import { Button } from "./ui/button"
import { Spinner } from "./ui/spinner"

interface LogViewerProps {
  taskId: string | null
}

export function LogViewer({ taskId }: LogViewerProps) {
  const [logs, setLogs] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const scrollToBottom = () => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [logs])

  const fetchLogs = async (follow: boolean = false) => {
    if (!taskId) return

    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setLoading(true)
    setStreaming(follow)

    try {
      const controller = new AbortController()
      abortControllerRef.current = controller

      const url = `http://localhost:8000/tasks/${taskId}/logs${follow ? "?follow=true" : ""}`
      const response = await fetch(url, { signal: controller.signal })

      if (!follow) {
        const text = await response.text()
        setLogs(text)
      } else {
        // Stream logs
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (reader) {
          setLogs("") // Clear existing logs
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            setLogs((prev) => prev + chunk)
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Failed to fetch logs:", error)
      }
    } finally {
      setLoading(false)
      setStreaming(false)
      abortControllerRef.current = null
    }
  }

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setStreaming(false)
    }
  }

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  if (!taskId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm">
            No task selected. Logs will appear here once a task is running.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Task Logs</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => fetchLogs(false)}
              disabled={loading || streaming}
              size="sm"
            >
              {loading && !streaming ? <Spinner size={14} className="mr-2" /> : null}
              Refresh
            </Button>
            {!streaming ? (
              <Button
                variant="default"
                onClick={() => fetchLogs(true)}
                disabled={loading}
                size="sm"
              >
                Stream Logs
              </Button>
            ) : (
              <Button variant="destructive" onClick={stopStreaming} size="sm">
                Stop Streaming
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Terminal>
          {logs || (
            <span className="text-gray-400">
              {loading ? "Loading logs..." : "No logs available. Click 'Refresh' or 'Stream Logs' to view."}
            </span>
          )}
          <div ref={logEndRef} />
        </Terminal>
      </CardContent>
    </Card>
  )
}
