import React from 'react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/documents', label: 'Documents' },
  { to: '/documents/upload', label: 'Upload PDF' },
  { to: '/processing', label: 'Processing' },
  { to: '/errors', label: 'Errors' },
  { to: '/audit', label: 'Audit Log' },
  { to: '/subjects', label: 'Subjects' },
  { to: '/subjects/departments/new', label: 'Name Department' },
  { to: '/pyqs', label: 'PYQ Manager' },
  { to: '/users', label: 'Users' },
  { to: '/settings', label: 'Settings' }
]

export default function Sidebar(){
  return (
    <aside className="sidebar">
      <div className="sidebar-brand"><span>ExamBuddy</span><small>Admin</small></div>
      <nav className="sidebar-nav">
        {links.map(link => (
          <NavLink key={link.to} to={link.to} className={({isActive}) => isActive ? 'active' : ''}>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
