'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface User {
  _id: string
  name: string
  email: string
  role: 'student' | 'caretaker' | 'admin'
  studentId?: string
  department?: string
  year?: number
  hostel?: string
  roomNumber?: string
  contactNumber?: string
  emergencyContact?: string
  profilePicture?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (credential: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('lms_token')
      if (token) {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setUser(response.data.user)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('lms_token')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (credential: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true)
      
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/google`, {
        credential
      })

      const { token, user: userData } = response.data
      
      localStorage.setItem('lms_token', token)
      setUser(userData)

      // Redirect based on role
      switch (userData.role) {
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

      return { success: true }
    } catch (error: any) {
      console.error('Login failed:', error)
      
      if (error.response?.data?.error) {
        return { success: false, error: error.response.data.error }
      }
      
      return { success: false, error: 'Login failed. Please try again.' }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('lms_token')
    setUser(null)
    router.push('/')
  }

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData })
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    updateUser,
  }

  return React.createElement(AuthContext.Provider, { value }, children)
}
