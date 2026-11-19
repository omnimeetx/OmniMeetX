"use client"
import { API_URL } from "@/lib/config"

export interface User {
  id: number
  email: string
  full_name: string
  bio?: string
  avatar_url?: string | null
  location?: string
  website?: string
  phone_number?: string
  social_links?: Record<string, string>
  two_factor_enabled?: boolean
  has_2fa_pin?: boolean
  isAdmin?: boolean
  is_admin?: boolean
  password_updated_at?: string
}

export class AuthService {
  private static instance: AuthService
  private user: User | null = null

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.status === "2fa_required") {
          return { success: false, error: "2fa_required" }
        }
        const token = data.access_token || data.token
        this.user = data.user
        localStorage.setItem("token", token)
        localStorage.setItem("user", JSON.stringify(data.user))
        return { success: true, user: data.user }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: "Network error occurred" }
    }
  }

  async signup(
    name: string,
    email: string,
    password: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ full_name: name, email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true, message: data.message }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: "Network error occurred" }
    }
  }

  async verifyOtp(
    email: string,
    emailOtp: string,
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, email_otp: emailOtp }),
      })

      const data = await response.json()

      if (response.ok) {
        const token = data.access_token || data.token
        this.user = data.user
        localStorage.setItem("token", token)
        localStorage.setItem("user", JSON.stringify(data.user))
        return { success: true, user: data.user }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: "Network error occurred" }
    }
  }

  async getProfile(): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const token = this.getToken()
      if (!token) return { success: false, error: "No token found" }

      const response = await fetch(`${API_URL}/api/auth/profile`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (response.ok) {
        this.user = data
        localStorage.setItem("user", JSON.stringify(data))
        return { success: true, user: data }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }

  async updateProfile(fullName: string, bio?: string, extra?: { phone_number?: string, location?: string, website?: string, social_links?: Record<string, string>, privacy_settings?: { twoFactorAuth: boolean } }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const token = this.getToken()
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: fullName,
          bio: bio,
          ...extra
        }),
      })

      const data = await response.json()
      if (response.ok) {
        this.user = data.user
        localStorage.setItem("user", JSON.stringify(data.user))
        return { success: true, user: data.user }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }

  async updatePrivacySettings(settings: { twoFactorAuth: boolean }): Promise<{ success: boolean; error?: string }> {
    try {
      const token = this.getToken()
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          two_factor_enabled: settings.twoFactorAuth
        }),
      })

      if (response.ok) {
        // Update local user state
        if (this.user) {
          this.user.two_factor_enabled = settings.twoFactorAuth
          localStorage.setItem("user", JSON.stringify(this.user))
        }
        return { success: true }
      } else {
        const data = await response.json()
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }

  async set2faPin(pin: string, currentPin?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = this.getToken()
      const response = await fetch(`${API_URL}/api/auth/profile/2fa-pin`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ pin, current_pin: currentPin }),
      })

      if (response.ok) {
        if (this.user) {
          this.user.has_2fa_pin = true
          localStorage.setItem("user", JSON.stringify(this.user))
        }
        return { success: true }
      } else {
        const data = await response.json()
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }

  async verify2faPin(pin: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = this.getToken()
      const response = await fetch(`${API_URL}/api/auth/profile/verify-2fa-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ pin }),
      })

      const data = await response.json()
      return { success: response.ok, error: data.error }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }

  async loginWith2fa(email: string, password: string, pin: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, two_factor_pin: pin }),
      })

      const data = await response.json()
      if (response.ok) {
        const token = data.access_token || data.token
        this.user = data.user
        localStorage.setItem("token", token)
        localStorage.setItem("user", JSON.stringify(data.user))
        return { success: true, user: data.user }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const token = this.getToken()
      const response = await fetch(`${API_URL}/api/auth/profile/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      })

      const data = await response.json()
      if (response.ok) {
        return { success: true, message: data.message }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }

  async forgotPin(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      if (response.ok) {
        return { success: true, message: data.message }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: "Network error occurred" }
    }
  }

  async resetPin(token: string, newPin: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, new_pin: newPin }),
      })

      const data = await response.json()
      if (response.ok) {
        return { success: true, message: data.message }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: "Network error occurred" }
    }
  }

  async verifyCredentials(email: string, password?: string): Promise<{ success: boolean; email_exists: boolean; password_correct: boolean; is_verified: boolean }> {
    try {
      const token = this.getToken()
      const response = await fetch(`${API_URL}/api/auth/verify-credentials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // The password answer is only given for your own signed-in account.
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()
      if (response.ok) {
        return {
          success: true,
          email_exists: data.email_exists,
          password_correct: data.password_correct,
          is_verified: data.is_verified,
        }
      } else {
        return { success: false, email_exists: false, password_correct: false, is_verified: false }
      }
    } catch (error) {
      return { success: false, email_exists: false, password_correct: false, is_verified: false }
    }
  }

  logout(): void {
    this.user = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
    }
  }

  getCurrentUser(): User | null {
    if (this.user) return this.user

    if (typeof window !== "undefined") {
      const userData = localStorage.getItem("user")
      if (userData) {
        this.user = JSON.parse(userData)
        return this.user
      }
    }

    return null
  }

  getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token")
    }
    return null
  }

  setToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token)
    }
  }

  setUser(user: User): void {
    this.user = user
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(user))
    }
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null && this.getToken() !== null
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser()
    return Boolean(user?.is_admin || user?.isAdmin)
  }
}

export const authService = AuthService.getInstance()
