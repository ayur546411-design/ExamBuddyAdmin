import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'

export default function DepartmentListPage(){
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load(){
      try {
        const schools = (await api.get('/schools/')).data || []
        const rows = []
        for (const school of schools) {
          const departments = (await api.get(`/schools/${school.id}/departments`)).data || []
          for (const department of departments) {
            const [semesters, subjects] = await Promise.all([
              api.get('/semesters/', { params: { department_id: department.id } }),
              api.get('/subjects/', { params: { department_id: department.id } })
            ])
            rows.push({ ...department, school, semesters: semesters.data || [], subjects: subjects.data || [] })
          }
        }
        setDepartments(rows)
      } catch (err) {
        setError(err?.response?.data?.detail || 'Failed to load departments.')
      } finally { setLoading(false) }
    }
    load()
  }, [])

  return <div className="page">
    <div className="page-heading">
      <div><h1>Departments</h1><p>Choose a department to inspect its complete academic structure.</p></div>
      <span className="pill accent">Live backend data</span>
    </div>
    {error && <div className="error">{error}</div>}
    {loading ? <div className="card">Loading departments...</div> : <div className="department-grid">
      {departments.map((department) => <Link className="department-card" to={`/subjects/departments/${department.id}`} key={department.id}>
        <div><span className="eyebrow">{department.school?.name || 'School'}</span><h2>{department.name}</h2><p>{department.subjects.length} Subjects <span>•</span> {department.semesters.length} Semesters</p></div>
        <span className="department-link">Open Department →</span>
      </Link>)}
      {!departments.length && <div className="card empty-state">No departments found.</div>}
    </div>}
  </div>
}
