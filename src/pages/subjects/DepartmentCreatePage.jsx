import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/client'

const initialForm = { school_id: '', name: '', code: '', description: '', duration_years: '', total_semesters: '' }

export default function DepartmentCreatePage(){
  const navigate = useNavigate()
  const [schools, setSchools] = useState([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadSchools(){
      try {
        const response = await api.get('/schools/')
        const schoolList = response.data || []
        setSchools(schoolList)
        if (schoolList.length) setForm((current) => ({ ...current, school_id: schoolList[0].id }))
      } catch (err) {
        setError(err?.response?.data?.detail || 'Failed to load schools.')
      } finally { setLoading(false) }
    }
    loadSchools()
  }, [])

  function updateField(field, value){
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function saveDepartment(event){
    event.preventDefault()
    setError('')
    if (!form.school_id || !form.name.trim() || !form.code.trim()) {
      setError('School, department name, and department code are required.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        school_id: form.school_id,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        duration_years: form.duration_years ? Number(form.duration_years) : null,
        total_semesters: form.total_semesters ? Number(form.total_semesters) : null,
      }
      const response = await api.post(`/schools/${form.school_id}/departments`, payload)
      navigate(`/subjects/departments/${response.data.id}`)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to create department.')
    } finally { setSaving(false) }
  }

  return <div className="page">
    <Link className="text-link" to="/subjects">← Back to Departments</Link>
    <div className="page-heading workspace-heading">
      <div><span className="eyebrow">Department Setup</span><h1>Name Department</h1><p>Create the academic home for semesters, subjects, and content.</p></div>
      <span className="pill accent">Admin action</span>
    </div>
    {error && <div className="error" role="alert">{error}</div>}
    {loading ? <div className="card">Loading schools...</div> : <form className="card department-form" onSubmit={saveDepartment}>
      <div className="form-section-heading"><div><h2>Department details</h2><p>These details will appear throughout the admin dashboard and mobile app.</p></div></div>
      <div className="form-grid">
        <label>School<select value={form.school_id} onChange={(event) => updateField('school_id', event.target.value)} disabled={!schools.length} required><option value="">Select a school</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select></label>
        <label>Department name<input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="e.g. Chemical Engineering" required /></label>
        <label>Department code<input value={form.code} onChange={(event) => updateField('code', event.target.value.toUpperCase())} placeholder="e.g. CHE" maxLength="20" required /><small>Short, unique identifier used by the app.</small></label>
        <label>Duration (years)<input type="number" min="1" max="10" value={form.duration_years} onChange={(event) => updateField('duration_years', event.target.value)} placeholder="4" /></label>
        <label>Total semesters<input type="number" min="1" max="20" value={form.total_semesters} onChange={(event) => updateField('total_semesters', event.target.value)} placeholder="8" /></label>
      </div>
      <label className="full-width-field">Description<textarea rows="5" value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="What does this department cover?" /></label>
      {!schools.length && <div className="empty-state">No active schools are available. Add a school before creating a department.</div>}
      <div className="modal-actions"><Link className="btn" to="/subjects">Cancel</Link><button className="btn primary" disabled={saving || !schools.length}>{saving ? 'Creating...' : 'Create Department'}</button></div>
    </form>}
  </div>
}