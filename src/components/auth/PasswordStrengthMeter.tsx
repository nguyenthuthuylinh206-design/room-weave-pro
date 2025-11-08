import { useMemo } from 'react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface PasswordStrengthMeterProps {
  password: string
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' }

    let score = 0
    
    // Length
    if (password.length >= 8) score += 25
    if (password.length >= 12) score += 25
    
    // Complexity
    if (/[a-z]/.test(password)) score += 10
    if (/[A-Z]/.test(password)) score += 10
    if (/[0-9]/.test(password)) score += 15
    if (/[^A-Za-z0-9]/.test(password)) score += 15

    if (score <= 25) return { score: 25, label: 'Yếu', color: 'bg-destructive' }
    if (score <= 50) return { score: 50, label: 'Trung bình', color: 'bg-orange-500' }
    if (score <= 75) return { score: 75, label: 'Tốt', color: 'bg-yellow-500' }
    return { score: 100, label: 'Mạnh', color: 'bg-green-500' }
  }, [password])

  if (!password) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Độ mạnh mật khẩu:</span>
        <span className={cn('text-sm font-medium', strength.score >= 75 && 'text-green-600')}>
          {strength.label}
        </span>
      </div>
      <div className="relative">
        <Progress value={strength.score} className="h-2" />
        <div
          className={cn('absolute inset-0 h-2 rounded-full transition-all', strength.color)}
          style={{ width: `${strength.score}%` }}
        />
      </div>
    </div>
  )
}
