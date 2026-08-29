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
        const res = await api.get('/schools/')
        const schoolList = res.data || []
        setSchools(schoolList)
        if(schoolList.length > 0){
          const first = schoolList[0]
          setForm(f=> ({...f, school_id: first.id}))
          const dres = await api.get(`/schools/${first.id}/departments/`)
          const departmentList = dres.data || []
          setDepartments(departmentList)
          if(departmentList.length > 0){
            setForm(f=> ({...f, department_id: departmentList[0].id}))
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
      const selectedSchoolId = form.school_id
      const selectedDepartmentId = form.department_id
      const validDepartment = departments.find((department) => department.id === selectedDepartmentId)

      if(!selectedSchoolId || !validDepartment){
        setError('Select a school and department before signing in.')
        setLoading(false)
        return
      }

      const payload = {
        full_name: form.full_name,
        school_id: selectedSchoolId,
        department_id: validDepartment.id,
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
      const dres = await api.get(`/schools/${schoolId}/departments/`)
      const departmentList = dres.data || []
      setDepartments(departmentList)
      if(departmentList.length > 0){
        setForm(f=> ({...f, department_id: departmentList[0].id}))
      }
    }catch(e){
      console.error('Failed to load departments', e)
      setDepartments([])
    }
  }

  return (
    <div className="login-screen">
      <div className="login-shell">
        <section className="login-brand-panel">
          <div className="brand-dots" aria-hidden="true" />
          <img className="login-logo" src="/logo.png" alt="ExamBuddy" />
          <div className="brand-welcome">
            <div className="brand-shield" aria-hidden="true">✓</div>
            <strong>Welcome Admin!</strong>
            <span>Please sign in to access<br />your dashboard</span>
          </div>
          <div className="brand-ring brand-ring-one" aria-hidden="true" />
          <div className="brand-ring brand-ring-two" aria-hidden="true" />
        </section>

        <form className="login-form-panel" onSubmit={handleSubmit}>
          <div className="secure-label"><span aria-hidden="true">♢</span> Secure Admin Access</div>
          <div className="login-heading">
            <span className="eyebrow">ExamBuddy workspace</span>
            <h1>Admin Login</h1>
            <p>Sign in to manage your academic content</p>
          </div>
          {error && <div className="error login-error">{error}</div>}

          <label className="login-field"><span>Full Name</span><div className="input-wrap"><span className="field-icon" aria-hidden="true">♙</span><input value={form.full_name} onChange={e=>setForm({...form, full_name: e.target.value})} placeholder="Enter your full name" required /></div></label>
          <label className="login-field"><span>School</span><div className="input-wrap"><span className="field-icon" aria-hidden="true">⌂</span><select value={form.school_id} onChange={e=>handleSchoolChange(e.target.value)} required><option value="">Select a school</option>{schools.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}</select></div></label>
          <label className="login-field"><span>Department</span><div className="input-wrap"><span className="field-icon" aria-hidden="true">♧</span><select value={form.department_id} onChange={e=>setForm({...form, department_id: e.target.value})} required><option value="">Select a department</option>{departments.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}</select></div></label>

          <div className="login-options"><label className="remember-option"><input type="checkbox" defaultChecked /> <span>Remember me</span></label><button className="text-button" type="button" onClick={() => setError('Please contact your administrator for access help.')}>Forgot access?</button></div>
          <button className="login-submit" disabled={loading}>{loading ? 'Signing in...' : <><span>Sign in as Admin</span><b aria-hidden="true">→</b></>}</button>
          <div className="login-divider"><span>or</span></div>
          <button className="secure-key-button" type="button" onClick={() => setError('Secure key sign-in is not configured yet.')}>♢ <span>Sign in with Secure Key</span></button>
          <p className="login-note">This uses the backend <code>onboard</code> endpoint for quick dev login. For production, implement a proper <code>/auth/login</code>.</p>
        </form>
      </div>
    </div>
  )
}
