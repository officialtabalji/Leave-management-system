'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

declare global {
  interface Window {
    google: any
  }
}

export function GoogleLogin() {
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load Google GSI script
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = initializeGoogleSignIn
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  const initializeGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      })

      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        }
      )
    }
  }

  const handleCredentialResponse = async (response: any) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const result = await login(response.credential)
      
      if (!result.success) {
        setError(result.error || 'Login failed')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualSignIn = () => {
    // Fallback for manual sign-in if needed
    setError('Please use the Google Sign-In button above')
  }

  return (
    <div className="space-y-4">
      <div id="google-signin-button" className="flex justify-center"></div>
      
      {isLoading && (
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-nitgoa-600"></div>
          <p className="mt-2 text-sm text-gray-600">Signing in...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      <button
        onClick={handleManualSignIn}
        className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        disabled={isLoading}
      >
        Having trouble? Contact support
      </button>
    </div>
  )
}
