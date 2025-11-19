import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Spinner } from "./ui/spinner"

interface CalibrationParams {
  mode: "full" | "calibration_only"
  dataset_path?: string
  calib_data_path?: string
  country: string
  age_group: string
  data_type: string
  nsim: number
}

interface CalibrationFormProps {
  onSubmit: (taskId: string) => void
}

export function CalibrationForm({ onSubmit }: CalibrationFormProps) {
  const [loading, setLoading] = useState(false)
  const [params, setParams] = useState<CalibrationParams>({
    mode: "full",
    country: "Mozambique",
    age_group: "neonate",
    data_type: "WHO2016",
    nsim: 1000,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("http://localhost:8000/tasks/calibration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      })

      const data = await response.json()
      onSubmit(data.task_id)
    } catch (error) {
      console.error("Failed to submit calibration task:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Calibration Task</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode Selection */}
          <div className="space-y-2">
            <Label>Mode</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="full"
                  checked={params.mode === "full"}
                  onChange={(e) => setParams({ ...params, mode: e.target.value as "full" })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Full Pipeline (Steps 1-5)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="calibration_only"
                  checked={params.mode === "calibration_only"}
                  onChange={(e) => setParams({ ...params, mode: e.target.value as "calibration_only" })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Calibration Only (Steps 4-5)</span>
              </label>
            </div>
          </div>

          {/* Full Mode Fields */}
          {params.mode === "full" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="dataset_path">Dataset Path (optional)</Label>
                <Input
                  id="dataset_path"
                  placeholder="/path/to/dataset.csv"
                  value={params.dataset_path || ""}
                  onChange={(e) =>
                    setParams({ ...params, dataset_path: e.target.value || undefined })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_type">Data Type</Label>
                <Input
                  id="data_type"
                  value={params.data_type}
                  onChange={(e) => setParams({ ...params, data_type: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nsim">Number of Simulations</Label>
                <Input
                  id="nsim"
                  type="number"
                  value={params.nsim}
                  onChange={(e) => setParams({ ...params, nsim: parseInt(e.target.value) })}
                  required
                />
              </div>
            </>
          )}

          {/* Calibration Only Mode Fields */}
          {params.mode === "calibration_only" && (
            <div className="space-y-2">
              <Label htmlFor="calib_data_path">Calibration Data Path (required)</Label>
              <Input
                id="calib_data_path"
                placeholder="/path/to/calibration_data.rds"
                value={params.calib_data_path || ""}
                onChange={(e) =>
                  setParams({ ...params, calib_data_path: e.target.value || undefined })
                }
                required
              />
              <p className="text-xs text-gray-500">
                RDS file containing prepared InSilicoVA output
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={params.country}
              onChange={(e) => setParams({ ...params, country: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="age_group">Age Group</Label>
            <select
              id="age_group"
              value={params.age_group}
              onChange={(e) => setParams({ ...params, age_group: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="neonate">Neonate</option>
              <option value="child">Child</option>
              <option value="adult">Adult</option>
            </select>
          </div>

          {/* Common Fields for Both Modes */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Spinner size={16} className="mr-2" />
                Submitting...
              </>
            ) : (
              "Start Calibration"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
