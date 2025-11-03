import { LoaderCircleIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number
}

export const Spinner = ({ className, size = 24, ...props }: SpinnerProps) => (
  <div className={cn("inline-flex items-center justify-center", className)} {...props}>
    <LoaderCircleIcon className="animate-spin" size={size} />
  </div>
)
