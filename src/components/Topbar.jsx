import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Topbar(){
  const navigate = useNavigate()
  const { logout } = useAuth()

  function handleLogout(){
    logout()
    navigate('/login')
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="page-title">Admin Dashboard</div>
      </div>
      <div className="topbar-right">
        <button className="btn" onClick={handleLogout}>Logout</button>
      </div>
    </header>
  )
}
