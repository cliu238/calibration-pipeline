import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Spinner } from "./ui/spinner"
import { API_URL } from "../config"

interface CalibrationParams {
  mode: "full" | "calibration_only" | "ensemble"
  dataset_path?: string
  calib_data_path?: string
  country: string
  age_group: string
  data_type: string
  nsim: number
  // vacalibration parameters
  mmat_type: "prior" | "fixed" | "samples"
  path_correction: boolean
  nMCMC: number
  nBurn: number
  nThin: number
  nChain: number
  nCore: number
  seed: number
  verbose: boolean
  saveoutput: boolean
  // ensemble calibration parameters
  eava_path?: string
  insilicova_path?: string
  interva_path?: string
}

interface CalibrationFormProps {
  onSubmit: (taskId: string) => void
}

export function CalibrationForm({ onSubmit }: CalibrationFormProps) {
  const [loading, setLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [params, setParams] = useState<CalibrationParams>({
    mode: "full",
    dataset_path: "data/NeonatesVA5.csv",
    country: "Mozambique",
    age_group: "neonate",
    data_type: "WHO2016",
    nsim: 1000,
    // vacalibration defaults
    mmat_type: "prior",
    path_correction: true,
    nMCMC: 5000,
    nBurn: 5000,
    nThin: 1,
    nChain: 1,
    nCore: 1,
    seed: 1,
    verbose: true,
    saveoutput: false,
    // ensemble defaults
    eava_path: "data/ensemble/single_eava_neonate_comsa.rds",
    insilicova_path: "data/ensemble/single_insilicova_neonate_comsa.rds",
    interva_path: "data/ensemble/single_interva_neonate_comsa.rds",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/tasks/calibration`, {
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
            <div className="flex flex-wrap gap-4">
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
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="ensemble"
                  checked={params.mode === "ensemble"}
                  onChange={(e) => setParams({ ...params, mode: e.target.value as "ensemble" })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Ensemble Calibration</span>
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

          {/* Ensemble Mode Fields */}
          {params.mode === "ensemble" && (
            <div className="space-y-4 bg-blue-50 p-4 rounded-md">
              <p className="text-sm text-blue-700 mb-2">
                Provide at least one algorithm output file. Multiple algorithms will be combined for ensemble calibration.
              </p>

              <div className="space-y-2">
                <Label htmlFor="eava_path">EAVA Output Path</Label>
                <Input
                  id="eava_path"
                  placeholder="data/ensemble/single_eava_neonate_comsa.rds"
                  value={params.eava_path || ""}
                  onChange={(e) =>
                    setParams({ ...params, eava_path: e.target.value || undefined })
                  }
                />
                <p className="text-xs text-gray-500">RDS file with EAVA algorithm output matrix</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="insilicova_path">InSilicoVA Output Path</Label>
                <Input
                  id="insilicova_path"
                  placeholder="data/ensemble/single_insilicova_neonate_comsa.rds"
                  value={params.insilicova_path || ""}
                  onChange={(e) =>
                    setParams({ ...params, insilicova_path: e.target.value || undefined })
                  }
                />
                <p className="text-xs text-gray-500">RDS file with InSilicoVA algorithm output matrix</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interva_path">InterVA Output Path</Label>
                <Input
                  id="interva_path"
                  placeholder="data/ensemble/single_interva_neonate_comsa.rds"
                  value={params.interva_path || ""}
                  onChange={(e) =>
                    setParams({ ...params, interva_path: e.target.value || undefined })
                  }
                />
                <p className="text-xs text-gray-500">RDS file with InterVA algorithm output matrix</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <select
              id="country"
              value={params.country}
              onChange={(e) => setParams({ ...params, country: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              required
            >
              <option value="Mozambique">Mozambique</option>
              <option value="Bangladesh">Bangladesh</option>
              <option value="Ethiopia">Ethiopia</option>
              <option value="Kenya">Kenya</option>
              <option value="Mali">Mali</option>
              <option value="Sierra Leone">Sierra Leone</option>
              <option value="South Africa">South Africa</option>
              <option value="other">Other</option>
            </select>
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

          {/* Advanced vacalibration Parameters */}
          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <span>{showAdvanced ? "▼" : "▶"}</span>
              <span>Advanced Calibration Parameters</span>
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 bg-gray-50 p-4 rounded-md">
                {/* Mmat Type */}
                <div className="space-y-2">
                  <Label htmlFor="mmat_type">Misclassification Matrix Type</Label>
                  <select
                    id="mmat_type"
                    value={params.mmat_type}
                    onChange={(e) => setParams({ ...params, mmat_type: e.target.value as "prior" | "fixed" | "samples" })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="prior">Prior (propagate uncertainty)</option>
                    <option value="fixed">Fixed (use point estimate)</option>
                    <option value="samples">Samples (use posterior samples)</option>
                  </select>
                  <p className="text-xs text-gray-500">How to treat the misclassification matrix in calibration</p>
                </div>

                {/* Path Correction */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={params.path_correction}
                      onChange={(e) => setParams({ ...params, path_correction: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Enable Path Correction</span>
                  </label>
                  <p className="text-xs text-gray-500">Apply pathway correction to reduce bias in calibration</p>
                </div>

                {/* MCMC Parameters */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nMCMC">MCMC Iterations</Label>
                    <Input
                      id="nMCMC"
                      type="number"
                      value={params.nMCMC}
                      onChange={(e) => setParams({ ...params, nMCMC: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-gray-500">Number of MCMC samples to draw</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nBurn">Burn-in</Label>
                    <Input
                      id="nBurn"
                      type="number"
                      value={params.nBurn}
                      onChange={(e) => setParams({ ...params, nBurn: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-gray-500">Number of burn-in iterations to discard</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nThin">Thinning</Label>
                    <Input
                      id="nThin"
                      type="number"
                      value={params.nThin}
                      onChange={(e) => setParams({ ...params, nThin: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-gray-500">Keep every nth sample (1 = no thinning)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nChain">Chains</Label>
                    <Input
                      id="nChain"
                      type="number"
                      value={params.nChain}
                      onChange={(e) => setParams({ ...params, nChain: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-gray-500">Number of MCMC chains to run</p>
                  </div>
                </div>

                {/* Parallel Processing */}
                <div className="space-y-2">
                  <Label htmlFor="nCore">CPU Cores</Label>
                  <Input
                    id="nCore"
                    type="number"
                    min="1"
                    value={params.nCore}
                    onChange={(e) => setParams({ ...params, nCore: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-gray-500">Number of CPU cores for parallel processing</p>
                </div>

                {/* Random Seed */}
                <div className="space-y-2">
                  <Label htmlFor="seed">Random Seed</Label>
                  <Input
                    id="seed"
                    type="number"
                    value={params.seed}
                    onChange={(e) => setParams({ ...params, seed: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-gray-500">Set random seed for reproducibility</p>
                </div>

                {/* Output Options */}
                <div className="space-y-2">
                  <div className="text-sm font-medium mb-2">Output Options</div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={params.verbose}
                      onChange={(e) => setParams({ ...params, verbose: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Verbose logging</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={params.saveoutput}
                      onChange={(e) => setParams({ ...params, saveoutput: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Save output to file</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
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
