'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Users, FileText, Shield } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { GoogleLogin } from '@/components/GoogleLogin'
import { AuthProvider } from '@/hooks/useAuth'

function HomePageContent() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (user && !isLoading) {
      // Redirect based on user role
      switch (user.role) {
        case 'student':
          router.push('/student/dashboard')
          break
        case 'caretaker':
          router.push('/caretaker/dashboard')
          break
        case 'admin':
          router.push('/admin/dashboard')
          break
        default:
          router.push('/dashboard')
      }
    }
  }, [user, isLoading, router])

  if (isLoading || !isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-nitgoa-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nitgoa-600 mx-auto"></div>
          <p className="mt-4 text-nitgoa-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-nitgoa-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-nitgoa-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">NIT Goa</h1>
                <p className="text-sm text-gray-600">Leave Management System</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6 text-sm text-gray-600">
              <span>Official Portal</span>
              <span>•</span>
              <span>Secure Access</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                Welcome to{' '}
                <span className="text-nitgoa-600">NIT Goa LMS</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Streamlined leave management for students, faculty, and staff. 
                Apply, approve, and track leave requests with ease.
              </p>
            </div>

            {/* Features */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-nitgoa-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Student Portal</h3>
                  <p className="text-sm text-gray-600">Easy leave application and tracking</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-nitgoa-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Quick Approval</h3>
                  <p className="text-sm text-gray-600">Streamlined approval process</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Shield className="h-6 w-6 text-nitgoa-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Secure Access</h3>
                  <p className="text-sm text-gray-600">Google OAuth authentication</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Building2 className="h-6 w-6 text-nitgoa-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">NIT Goa Only</h3>
                  <p className="text-sm text-gray-600">Restricted to @nitgoa.ac.in</p>
                </div>
              </div>
            </div>

            {/* Login Section */}
            <div className="space-y-4">
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Sign in to continue
                </h2>
                <GoogleLogin />
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Only NIT Goa email addresses (@nitgoa.ac.in) are allowed
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
              <div className="space-y-6">
                <div className="text-center">
                  <Building2 className="h-16 w-16 text-nitgoa-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    National Institute of Technology Goa
                  </h3>
                  <p className="text-gray-600 mt-2">
                    Empowering students with modern technology
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-nitgoa-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-nitgoa-600">500+</div>
                    <div className="text-sm text-gray-600">Students</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">50+</div>
                    <div className="text-sm text-gray-600">Faculty</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">24/7</div>
                    <div className="text-sm text-gray-600">Access</div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-nitgoa-500 to-blue-500 rounded-lg p-6 text-white text-center">
                  <h4 className="font-semibold mb-2">Leave Management Made Simple</h4>
                  <p className="text-sm opacity-90">
                    Apply for leave, track status, and get approvals in real-time
                  </p>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-nitgoa-200 rounded-full opacity-20"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-200 rounded-full opacity-20"></div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 National Institute of Technology Goa. All rights reserved.</p>
            <p className="mt-2 text-sm">
              Leave Management System - Built with modern web technologies
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function HomePage() {
  return (
    <AuthProvider>
      <HomePageContent />
    </AuthProvider>
  )
}
