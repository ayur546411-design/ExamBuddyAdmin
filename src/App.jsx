import React from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import DocumentsPage from './pages/documents/DocumentsPage'
import UploadPage from './pages/documents/UploadPage'
import DocumentDetailPage from './pages/documents/DocumentDetailPage'
import ProcessingPage from './pages/processing/ProcessingPage'
import ErrorsPage from './pages/errors/ErrorsPage'
import AuditPage from './pages/audit/AuditPage'
import SubjectsPage from './pages/subjects/SubjectsPage'
import DepartmentListPage from './pages/subjects/DepartmentListPage'
import DepartmentWorkspacePage from './pages/subjects/DepartmentWorkspacePage'
import SubjectEditorPage from './pages/subjects/SubjectEditorPage'
import PyqsPage from './pages/documents/PyqsPage'
import UsersPage from './pages/users/UsersPage'
import SettingsPage from './pages/settings/SettingsPage'
import MainLayout from './layouts/MainLayout'
import { AuthProvider, useAuth } from './context/AuthContext'

function PrivateRoute({ children }){
  const { token } = useAuth()
  if(!token) return <Navigate to="/login" replace />
  return children
}

function ProtectedLayout(){
  return (
    <PrivateRoute>
      <MainLayout />
    </PrivateRoute>
  )
}

export default function App(){
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/upload" element={<UploadPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
          <Route path="/processing" element={<ProcessingPage />} />
          <Route path="/errors" element={<ErrorsPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/subjects" element={<DepartmentListPage />} />
          <Route path="/subjects/departments/:departmentId" element={<DepartmentWorkspacePage />} />
          <Route path="/subjects/editor/:id" element={<SubjectEditorPage />} />
          <Route path="/subjects/:id" element={<SubjectDetailPage />} />
          <Route path="/subjects/legacy" element={<SubjectsPage />} />
          <Route path="/pyqs" element={<PyqsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}
