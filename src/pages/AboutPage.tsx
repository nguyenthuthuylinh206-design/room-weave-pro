import { Card } from '@/components/ui/card'
import { Info, Building2, Shield, Zap, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Info className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">About</h1>
              <p className="text-sm text-muted-foreground">
                Room Weave Pro
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {/* App Info */}
        <Card className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="h-16 w-16 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Room Weave Pro</h2>
          <p className="text-muted-foreground mb-4">
            Professional Hotel Management System
          </p>
          <p className="text-sm text-muted-foreground">
            Version 1.0.0
          </p>
        </Card>

        {/* Features */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Features</h2>
          <div className="grid gap-3">
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Real-time Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Track inventory, laundry, and maintenance in real-time
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Multi-hotel Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage multiple properties from one platform
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Secure & Reliable</h3>
                  <p className="text-sm text-muted-foreground">
                    Enterprise-grade security with role-based access control
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Legal */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Legal</h2>
          <Card className="divide-y">
            <button className="w-full p-4 text-left hover:bg-accent transition-colors">
              Terms of Service
            </button>
            <button className="w-full p-4 text-left hover:bg-accent transition-colors">
              Privacy Policy
            </button>
            <button className="w-full p-4 text-left hover:bg-accent transition-colors">
              Licenses
            </button>
          </Card>
        </div>

        {/* Credits */}
        <Card className="p-6 text-center bg-gradient-to-br from-primary/5 to-background">
          <p className="text-sm text-muted-foreground mb-2">
            Built with ❤️ for hotel professionals
          </p>
          <p className="text-xs text-muted-foreground">
            © 2024 Room Weave Pro. All rights reserved.
          </p>
        </Card>
      </div>
    </div>
  )
}
