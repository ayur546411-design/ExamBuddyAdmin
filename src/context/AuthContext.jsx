import React, { createContext, useContext, useEffect, useState } from 'react'
import { setAuthToken } from '../api/client'

const AuthContext = createContext()

export function AuthProvider({ children }){
  const [token, setToken] = useState(localStorage.getItem('exambuddy_token'))

  useEffect(() => {
    setAuthToken(token)
  }, [token])

  const login = (t) => {
    setToken(t)
    localStorage.setItem('exambuddy_token', t)
  }

  const logout = () => {
    setToken(null)
    localStorage.removeItem('exambuddy_token')
    setAuthToken(null)
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
