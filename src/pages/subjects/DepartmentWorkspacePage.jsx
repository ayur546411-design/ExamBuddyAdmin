import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../api/client'

export default function DepartmentWorkspacePage(){
  const { departmentId } = useParams()
  const [department, setDepartment] = useState(null)
  const [semesters, setSemesters] = useState([])
  const [open, setOpen] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    async function load(){
      try {
        const schools = (await api.get('/schools/')).data || []
        let found = null
        for (const school of schools) {
          const rows = (await api.get(`/schools/${school.id}/departments`)).data || []
          const match = rows.find((row) => row.id === departmentId)
          if (match) { found = { ...match, school }; break }
        }
        const [semesterRes, subjectRes] = await Promise.all([
          api.get('/semesters/', { params: { department_id: departmentId } }),
          api.get('/subjects/', { params: { department_id: departmentId } })
        ])
        const subjects = subjectRes.data || []
        const grouped = (semesterRes.data || []).sort((a, b) => a.semester_number - b.semester_number).map((semester) => ({ ...semester, subjects: subjects.filter((subject) => subject.semester_id === semester.id) }))
        setDepartment(found)
        setSemesters(grouped)
        setOpen(Object.fromEntries(grouped.map((semester) => [semester.id, true])))
      } catch (err) { setError(err?.response?.data?.detail || 'Failed to load department workspace.') }
    }
    load()
  }, [departmentId])

  const subjectCount = semesters.reduce((total, semester) => total + semester.subjects.length, 0)
  return <div className="page">
    <Link className="text-link" to="/subjects">← Back to Departments</Link>
    <div className="page-heading workspace-heading"><div><span className="eyebrow">{department?.school?.name || 'School'}</span><h1>Department of {department?.name || '...'}</h1><p>Browse every semester and subject in one live workspace.</p></div><span className="pill accent">● Live backend data</span></div>
    {error && <div className="error">{error}</div>}
    {department && <div className="stats-grid"><div className="stat-card"><div className="stat-card-title">Department</div><div className="stat-card-value">{department.name}</div></div><div className="stat-card"><div className="stat-card-title">Total Semesters</div><div className="stat-card-value">{semesters.length}</div></div><div className="stat-card"><div className="stat-card-title">Total Subjects</div><div className="stat-card-value">{subjectCount}</div></div></div>}
    <div className="workspace-list">{semesters.map((semester) => <section className="card semester-workspace" key={semester.id}>
      <button className="semester-toggle" type="button" onClick={() => setOpen((current) => ({ ...current, [semester.id]: !current[semester.id] }))}><strong>{open[semester.id] ? '▼' : '▶'} Semester {semester.semester_number}</strong><span>{semester.subjects.length} Subjects</span></button>
      {open[semester.id] && <div className="workspace-subject-list">{semester.subjects.map((subject) => <Link to={`/subjects/editor/${subject.id}`} className="workspace-subject" key={subject.id}><span><strong>{subject.name}</strong><small>{subject.code || 'No code'}</small></span><span>Open editor →</span></Link>)}{!semester.subjects.length && <div className="empty-state">No subjects in this semester.</div>}</div>}
    </section>)}</div>
  </div>
}
