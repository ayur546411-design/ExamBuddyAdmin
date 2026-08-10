import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { setAuthToken } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

export default function LoginPage(){
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { login } = useAuth()
  const [schools, setSchools] = useState([])
  const [departments, setDepartments] = useState([])
  const [form, setForm] = useState({ full_name: 'Admin User', school_id: '', department_id: '' })

  useEffect(()=>{
    async function load(){
      try{
        const res = await api.get('/schools')
        setSchools(res.data || [])
        if(res.data && res.data.length>0){
          const first = res.data[0]
          setForm(f=> ({...f, school_id: first.id}))
          const dres = await api.get(`/schools/${first.id}/departments`)
          setDepartments(dres.data || [])
          if(dres.data && dres.data.length>0){
            setForm(f=> ({...f, department_id: dres.data[0].id}))
          }
        }
      }catch(e){
        console.error('Failed to load schools', e)
      }
    }
    load()
  },[])

  async function handleSubmit(e){
    e.preventDefault()
    setLoading(true)
    setError(null)
    try{
      if(!form.school_id || !form.department_id){
        setError('Select a school and department before signing in.')
        setLoading(false)
        return
      }
      const payload = {
        full_name: form.full_name,
        school_id: form.school_id,
        department_id: form.department_id,
        role: 'admin'
      }
      const res = await api.post('/auth/onboard', payload)
      const token = res.data.access_token
      login(token)
      setAuthToken(token)
      navigate('/dashboard')
    }catch(err){
      console.error(err)
      setError(err?.response?.data?.detail || 'Login failed')
    }finally{ setLoading(false) }
  }

  async function handleSchoolChange(schoolId){
    setForm(f=> ({...f, school_id: schoolId, department_id: ''}))
    try{
      const dres = await api.get(`/schools/${schoolId}/departments`)
      setDepartments(dres.data || [])
      if(dres.data && dres.data.length>0){
        setForm(f=> ({...f, department_id: dres.data[0].id}))
      }
    }catch(e){
      console.error('Failed to load departments', e)
      setDepartments([])
    }
  }

  return (
    <div className="center-screen">
      <form className="card" onSubmit={handleSubmit} style={{ minWidth:360 }}>
        <h2>ExamBuddy Admin Login</h2>
        {error && <div className="error">{error}</div>}

        <label>Full name</label>
        <input value={form.full_name} onChange={e=>setForm({...form, full_name: e.target.value})} />

        <label>School</label>
        <select value={form.school_id} onChange={e=>handleSchoolChange(e.target.value)}>
          <option value="">Select a school</option>
          {schools.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <label>Department</label>
        <select value={form.department_id} onChange={e=>setForm({...form, department_id: e.target.value})}>
          <option value="">Select a department</option>
          {departments.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <div style={{ marginTop: 12 }}>
          <button className="btn primary" disabled={loading}>{loading ? 'Signing in...' : 'Sign in as Admin (dev)'}</button>
        </div>
        <div style={{ marginTop:8, color:'#6b7280', fontSize:13 }}>
          Note: This uses the backend `onboard` endpoint for quick dev login. For production implement a proper `/auth/login`.
        </div>
      </form>
    </div>
  )
}
