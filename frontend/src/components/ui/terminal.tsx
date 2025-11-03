import { cn } from "@/lib/utils"

interface TerminalProps {
  children: React.ReactNode
  className?: string
}

export const Terminal = ({ children, className }: TerminalProps) => {
  return (
    <div
      className={cn(
        "w-full rounded-lg border border-gray-200 bg-gray-900 text-gray-100",
        className,
      )}
    >
      <div className="flex flex-col gap-y-2 border-b border-gray-700 p-4">
        <div className="flex flex-row gap-x-2">
          <div className="h-2 w-2 rounded-full bg-red-500"></div>
          <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
        </div>
      </div>
      <pre className="p-4 overflow-auto max-h-96">
        <code className="grid gap-y-1 text-sm font-mono">{children}</code>
      </pre>
    </div>
  )
}
