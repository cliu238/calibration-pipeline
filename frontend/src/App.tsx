import { useState } from 'react'
import { CalibrationForm } from './components/CalibrationForm'
import { TaskStatus } from './components/TaskStatus'
import { LogViewer } from './components/LogViewer'
import { TaskHistory } from './components/TaskHistory'

function App() {
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-900">VA Calibration Pipeline</h1>
          <p className="text-gray-600">
            Verbal Autopsy calibration task management interface
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <CalibrationForm onSubmit={setCurrentTaskId} />
          <TaskStatus taskId={currentTaskId} />
          <TaskHistory currentTaskId={currentTaskId} onSelectTask={setCurrentTaskId} />
        </div>

        <LogViewer taskId={currentTaskId} />
      </div>
    </div>
  )
}

export default App
