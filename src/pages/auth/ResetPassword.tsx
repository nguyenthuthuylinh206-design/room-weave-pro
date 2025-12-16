import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export default function ResetPassword() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4 relative">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      
      <ResetPasswordForm />
    </div>
  )
}
