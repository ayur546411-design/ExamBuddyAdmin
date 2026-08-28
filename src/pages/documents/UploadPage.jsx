import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadDocument } from '../../api/documentsApi'
import api from '../../api/client'

const documentTypes = [
  { value: 'syllabus', label: 'Syllabus' },
  { value: 'pyq', label: 'PYQ / Question Paper' },
  { value: 'academic_calendar', label: 'Academic Calendar' },
  { value: 'note', label: 'Notes' },
  { value: 'other', label: 'Other' }
]

const examTypes = [
  { value: '', label: 'Select exam type' },
  { value: 'ct1', label: 'CT1' },
  { value: 'ct2', label: 'CT2' },
  { value: 'end_semester', label: 'End Semester' }
]

export default function UploadPage(){
  const navigate = useNavigate()
  const [schools, setSchools] = useState([])
  const [departments, setDepartments] = useState([])
  const [semesters, setSemesters] = useState([])
  const [academicYears, setAcademicYears] = useState([])
  const [subjects, setSubjects] = useState([])
  const [form, setForm] = useState({ school_id: '', department_id: '', semester_id: '', subject_id: '', document_type: 'syllabus', title: '', academic_year: '', exam_type: '', pdf_url: '', youtube_url: '', video_title: '', description: '' })
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const MAX_SIZE = 10 * 1024 * 1024  // 10 MB to match Cloudinary free tier limit

  function normalizeSemesterOptions(semesterRows = []){
    const byNumber = new Map()

    for (const semester of semesterRows) {
      const semesterNumber = Number(semester.semester_number)
      if (!Number.isInteger(semesterNumber) || semesterNumber < 1) continue

      const existing = byNumber.get(semesterNumber)
      if (!existing) {
        byNumber.set(semesterNumber, { ...semester, semester_number: semesterNumber })
        continue
      }

      const existingYear = String(existing.academic_year || '').trim()
      const incomingYear = String(semester.academic_year || '').trim()
      if (!existingYear && incomingYear) {
        byNumber.set(semesterNumber, { ...semester, semester_number: semesterNumber })
      }
    }

    return [...byNumber.values()].sort((a, b) => Number(a.semester_number) - Number(b.semester_number))
  }

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
      if(!form.department_id){
        setSemesters([])
        setAcademicYears([])
        return
      }
      try{
        const res = await api.get('/semesters/', { params: { department_id: form.department_id } })
        const semesterRows = res.data || []
        const dedupedSemesters = normalizeSemesterOptions(semesterRows)
        const years = [...new Set(dedupedSemesters
          .map(semester => String(semester.academic_year || '').trim())
          .filter(Boolean))]
          .sort((a, b) => b.localeCompare(a))

        setSemesters(dedupedSemesters)
        setAcademicYears(years)

        setForm(prev => {
          const selectedSemesterStillValid = dedupedSemesters.some(semester => semester.id === prev.semester_id)
          const selectedYearStillValid = !prev.academic_year || years.length === 0 || years.includes(String(prev.academic_year).trim())

          return {
            ...prev,
            academic_year: selectedYearStillValid ? (prev.academic_year || years[0] || '') : '',
            semester_id: selectedSemesterStillValid ? prev.semester_id : '',
            subject_id: selectedSemesterStillValid ? prev.subject_id : ''
          }
        })
      }catch(e){
        console.error(e)
        setSemesters([])
        setAcademicYears([])
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
    setForm(prev => ({ ...prev, school_id: schoolId, department_id: '', academic_year: '', semester_id: '', subject_id: '' }))
    setDepartments([])
    setSemesters([])
    setAcademicYears([])
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

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    const isAllowed = allowedTypes.includes(f.type) || /\.(pdf|png|jpe?g|webp)$/i.test(f.name)

    if(!isAllowed){
      setError('Only PDF, PNG, JPG, JPEG, and WEBP files are allowed')
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
    const hasYoutubeUrl = Boolean((form.youtube_url || '').trim())
    const hasDirectPdfUrl = Boolean((form.pdf_url || '').trim())

    if(form.document_type !== 'pyq' && !file){
      setError('Select a PDF or image file')
      return
    }

    if(form.document_type === 'pyq' && !file && !hasDirectPdfUrl && !hasYoutubeUrl){
      setError('Select a PYQ PDF/image file, provide a direct PDF URL, or add a YouTube video URL')
      return
    }

    if(!form.school_id || !form.department_id){ setError('Please select school and department'); return }
    if(form.document_type === 'syllabus' && !form.subject_id){ setError('Select the subject this syllabus belongs to'); return }

    const fd = new FormData()
    if(file){ fd.append('file', file) }
    fd.append('school_id', form.school_id)
    fd.append('department_id', form.department_id)
    fd.append('semester_id', form.semester_id)
    fd.append('subject_id', form.subject_id)
    fd.append('document_type', form.document_type)
    fd.append('academic_year', form.academic_year)
    fd.append('title', form.title)
    fd.append('description', form.description)
    fd.append('exam_type', form.exam_type)
    fd.append('pdf_url', form.pdf_url)
    fd.append('youtube_url', form.youtube_url)
    fd.append('video_title', form.video_title)

    setUploading(true)
    setError(null)
    try{
      const res = await uploadDocument(fd, (evt)=>{
        if(evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100))
      })
      const savedDocumentId = res.data?.document_ids?.[0]
      if(savedDocumentId){
        navigate(`/documents/${savedDocumentId}`)
      } else {
        alert('Upload completed, but no document was saved. Check the selected subject and PDF.')
      }
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

      <form className="card form-grid" onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'end' }}>
        <div>
          <label>School</label>
          <select value={form.school_id} onChange={e=>handleSchoolChange(e.target.value)}>
            <option value="">Select school</option>
            {schools.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label>Department</label>
          <select value={form.department_id} onChange={e=>setForm(prev=>({ ...prev, department_id: e.target.value, academic_year: '', semester_id: '', subject_id: '' }))}>
            <option value="">Select department</option>
            {departments.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        <div>
          <label>Academic Year</label>
          {academicYears.length > 0 ? (
            <select value={form.academic_year} onChange={e=>setForm(prev=>({ ...prev, academic_year: e.target.value }))}>
              <option value="">Select academic year</option>
              {academicYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          ) : (
            <input value={form.academic_year} onChange={e=>setForm(prev=>({ ...prev, academic_year: e.target.value }))} placeholder="e.g. 2024-2025" />
          )}
        </div>

        <div>
          <label>Semester</label>
          <select value={form.semester_id} onChange={e=>setForm(prev=>({ ...prev, semester_id: e.target.value, subject_id: '' }))}>
            <option value="">Select semester</option>
            {semesters.map(s=> <option key={s.id} value={s.id}>{`Semester ${s.semester_number}`}</option>)}
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

        <div style={{ gridColumn: 'span 2' }}>
          <label>PDF / Image File <span style={{ fontSize: '0.85em', color: '#666' }}>(Max 10 MB)</span></label>
          <input type="file" accept=".pdf,image/png,image/jpeg,image/jpg,image/webp" onChange={handleFile} />
          {file && <div className="file-summary">{file.name} · {Math.round(file.size / 1024)} KB</div>}
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <label>Title</label>
          <input value={form.title} onChange={e=>setForm(prev=>({ ...prev, title: e.target.value }))} placeholder="Document title" />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <label>Description</label>
          <textarea value={form.description} onChange={e=>setForm(prev=>({ ...prev, description: e.target.value }))} placeholder="Optional description" rows={3} />
        </div>

        <div>
          <label>Exam Type</label>
          <select value={form.exam_type} onChange={e=>setForm(prev=>({ ...prev, exam_type: e.target.value }))}>
            {examTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </div>

        <div>
          <label>Direct PDF URL</label>
          <input value={form.pdf_url} onChange={e=>setForm(prev=>({ ...prev, pdf_url: e.target.value }))} placeholder="https://...pdf" />
        </div>

        <div>
          <label>YouTube URL</label>
          <input value={form.youtube_url} onChange={e=>setForm(prev=>({ ...prev, youtube_url: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." />
        </div>

        <div>
          <label>Video Title</label>
          <input value={form.video_title} onChange={e=>setForm(prev=>({ ...prev, video_title: e.target.value }))} placeholder="Optional video label" />
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
