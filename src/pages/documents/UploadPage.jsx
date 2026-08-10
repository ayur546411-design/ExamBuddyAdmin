import React, { useEffect, useState } from 'react'
import { uploadDocument } from '../../api/documentsApi'
import api from '../../api/client'

const documentTypes = [
  { value: 'syllabus', label: 'Syllabus' },
  { value: 'pyq', label: 'Past Year Question Paper' },
  { value: 'academic_calendar', label: 'Academic Calendar' },
  { value: 'note', label: 'Notes' },
  { value: 'other', label: 'Other' }
]

export default function UploadPage(){
  const [schools, setSchools] = useState([])
  const [departments, setDepartments] = useState([])
  const [semesters, setSemesters] = useState([])
  const [subjects, setSubjects] = useState([])
  const [form, setForm] = useState({ school_id: '', department_id: '', semester_id: '', subject_id: '', document_type: 'syllabus', title: '', academic_year: '' })
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const MAX_SIZE = 20 * 1024 * 1024

  useEffect(()=>{
    async function loadSchools(){
      try{
        const res = await api.get('/schools')
        setSchools(res.data || [])
      }catch(e){
        console.error(e)
      }
    }
    loadSchools()
  },[])

  useEffect(()=>{
    async function loadSemesters(){
      if(!form.department_id) return
      try{
        const res = await api.get('/semesters')
        setSemesters(res.data || [])
      }catch(e){
        console.error(e)
      }
    }
    loadSemesters()
  }, [form.department_id])

  useEffect(()=>{
    async function loadSubjects(){
      if(!form.semester_id) return
      try{
        const res = await api.get('/subjects', { params: { semester_id: form.semester_id } })
        setSubjects(res.data || [])
      }catch(e){
        console.error(e)
      }
    }
    loadSubjects()
  }, [form.semester_id])

  async function handleSchoolChange(schoolId){
    setForm(prev => ({ ...prev, school_id: schoolId, department_id: '', semester_id: '', subject_id: '' }))
    setDepartments([])
    setSemesters([])
    setSubjects([])
    if(!schoolId) return
    try{
      const res = await api.get(`/schools/${schoolId}/departments`)
      setDepartments(res.data || [])
      if(res.data?.length){
        setForm(prev => ({ ...prev, department_id: res.data[0].id }))
      }
    }catch(e){
      console.error(e)
    }
  }

  function handleFile(e){
    const f = e.target.files[0]
    setError(null)
    if(!f) return
    if(f.type !== 'application/pdf'){
      setError('Only PDF files are allowed')
      return
    }
    if(f.size > MAX_SIZE){
      setError('File exceeds maximum allowed size')
      return
    }
    setFile(f)
  }

  async function handleSubmit(e){
    e.preventDefault()
    if(!file){ setError('Select a PDF file'); return }
    if(!form.school_id || !form.department_id){ setError('Please select school and department'); return }

    const fd = new FormData()
    fd.append('file', file)
    fd.append('school_id', form.school_id)
    fd.append('department_id', form.department_id)
    fd.append('semester_id', form.semester_id)
    fd.append('subject_id', form.subject_id)
    fd.append('document_type', form.document_type)
    fd.append('academic_year', form.academic_year)
    fd.append('title', form.title)

    setUploading(true)
    setError(null)
    try{
      const res = await uploadDocument(fd, (evt)=>{
        if(evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100))
      })
      alert('Upload completed successfully')
      setFile(null)
      setProgress(0)
    }catch(err){
      console.error(err)
      setError(err?.response?.data?.detail || 'Upload failed')
    }finally{
      setUploading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Upload PDF</h1>
          <p>Upload a document and start extraction for review and publication.</p>
        </div>
      </div>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <div>
          <label>School</label>
          <select value={form.school_id} onChange={e=>handleSchoolChange(e.target.value)}>
            <option value="">Select school</option>
            {schools.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label>Department</label>
          <select value={form.department_id} onChange={e=>setForm(prev=>({ ...prev, department_id: e.target.value, semester_id: '', subject_id: '' }))}>
            <option value="">Select department</option>
            {departments.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        <div>
          <label>Semester</label>
          <select value={form.semester_id} onChange={e=>setForm(prev=>({ ...prev, semester_id: e.target.value, subject_id: '' }))}>
            <option value="">Select semester</option>
            {semesters.map(s=> <option key={s.id} value={s.id}>{s.semester_number || s.id}</option>)}
          </select>
        </div>

        <div>
          <label>Subject</label>
          <select value={form.subject_id} onChange={e=>setForm(prev=>({ ...prev, subject_id: e.target.value }))}>
            <option value="">Optional subject</option>
            {subjects.map(sub=> <option key={sub.id} value={sub.id}>{sub.name || sub.code}</option>)}
          </select>
        </div>

        <div>
          <label>Document Type</label>
          <select value={form.document_type} onChange={e=>setForm(prev=>({ ...prev, document_type: e.target.value }))}>
            {documentTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </div>

        <div>
          <label>Academic Year</label>
          <input value={form.academic_year} onChange={e=>setForm(prev=>({ ...prev, academic_year: e.target.value }))} placeholder="e.g. 2024-2025" />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <label>Title</label>
          <input value={form.title} onChange={e=>setForm(prev=>({ ...prev, title: e.target.value }))} placeholder="Document title" />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <label>PDF File</label>
          <input type="file" accept="application/pdf" onChange={handleFile} />
          {file && <div className="file-summary">{file.name} · {Math.round(file.size / 1024)} KB</div>}
        </div>

        {error && <div className="error" style={{ gridColumn: 'span 2' }}>{error}</div>}

        <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn primary" type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Start Upload'}</button>
          {progress > 0 && <span>{progress}%</span>}
        </div>
      </form>
    </div>
  )
}
