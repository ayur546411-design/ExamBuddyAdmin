import React, { createContext, useCallback, useContext, useLayoutEffect, useEffect, useState } from 'react'
import api, { setAuthToken } from '../api/client'

const AuthContext = createContext()

export function AuthProvider({ children }){
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('exambuddy_token')
    } catch {
      return null
    }
  })

  const logout = useCallback(() => {
    setToken(null)
    localStorage.removeItem('exambuddy_token')
    setAuthToken(null)
  }, [])

  useLayoutEffect(() => {
    setAuthToken(token)
  }, [token])

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error?.response?.status
        if ((status === 401 || status === 403) && !error?.config?.skipAuthRedirect) {
          logout()
          window.location.replace('/login')
        }
        return Promise.reject(error)
      }
    )

    return () => api.interceptors.response.eject(interceptor)
  }, [logout])

  const login = (t) => {
    setToken(t)
    localStorage.setItem('exambuddy_token', t)
  }

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(){
  return useContext(AuthContext)
}
