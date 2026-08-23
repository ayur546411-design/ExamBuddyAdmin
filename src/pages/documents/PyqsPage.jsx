import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import { deleteDocument, uploadDocument } from '../../api/documentsApi'

export default function PyqsPage(){
  const [schools, setSchools] = useState([])
  const [departments, setDepartments] = useState([])
  const [semesters, setSemesters] = useState([])
  const [subjects, setSubjects] = useState([])
  
  const [filters, setFilters] = useState({
    school_id: '',
    department_id: '',
    semester_id: '',
    subject_id: ''
  })

  const [pyqs, setPyqs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Add PYQ modal states
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ title: '', description: '', academic_year: '', exam_type: 'end_semester', youtube_url: '', video_title: '', pdf_url: '' })
  const [addFile, setAddFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [saving, setSaving] = useState(false)

  // 1. Initial Load of Schools
  useEffect(() => {
    async function loadSchools(){
      try {
        const res = await api.get('/schools')
        setSchools(res.data || [])
      } catch (err) {
        console.error(err)
        setError('Failed to load schools.')
      }
    }
    loadSchools()
  }, [])

  // 2. Load Departments when school changes
  useEffect(() => {
    async function loadDepts(){
      if (!filters.school_id) {
        setDepartments([])
        setFilters(prev => ({ ...prev, department_id: '', semester_id: '', subject_id: '' }))
        return
      }
      try {
        const res = await api.get(`/schools/${filters.school_id}/departments`)
        setDepartments(res.data || [])
        if (res.data?.length) {
          setFilters(prev => ({ ...prev, department_id: res.data[0].id, semester_id: '', subject_id: '' }))
        } else {
          setFilters(prev => ({ ...prev, department_id: '', semester_id: '', subject_id: '' }))
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadDepts()
  }, [filters.school_id])

  // 3. Load Semesters when dept changes
  useEffect(() => {
    async function loadSems(){
      if (!filters.department_id) {
        setSemesters([])
        setFilters(prev => ({ ...prev, semester_id: '', subject_id: '' }))
        return
      }
      try {
        const res = await api.get('/semesters/', { params: { department_id: filters.department_id } })
        const sorted = (res.data || []).sort((a,b) => Number(a.semester_number) - Number(b.semester_number))
        setSemesters(sorted)
        if (sorted.length) {
          setFilters(prev => ({ ...prev, semester_id: sorted[0].id, subject_id: '' }))
        } else {
          setFilters(prev => ({ ...prev, semester_id: '', subject_id: '' }))
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadSems()
  }, [filters.department_id])

  // 4. Load Subjects when semester changes
  useEffect(() => {
    async function loadSubjects(){
      if (!filters.semester_id) {
        setSubjects([])
        setFilters(prev => ({ ...prev, subject_id: '' }))
        return
      }
      try {
        const res = await api.get('/subjects', { params: { semester_id: filters.semester_id } })
        setSubjects(res.data || [])
        if (res.data?.length) {
          setFilters(prev => ({ ...prev, subject_id: res.data[0].id }))
        } else {
          setFilters(prev => ({ ...prev, subject_id: '' }))
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadSubjects()
  }, [filters.semester_id])

  // 5. Fetch PYQ documents for selected subject
  async function loadPyqs(){
    if (!filters.subject_id) {
      setPyqs([])
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/documents', {
        params: {
          subject_id: filters.subject_id,
          document_type: 'pyq',
          page_size: 0
        }
      })
      setPyqs(res.data || [])
    } catch (err) {
      console.error(err)
      setError('Failed to fetch PYQ documents.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPyqs()
  }, [filters.subject_id])

  async function handleDelete(docId){
    if (!confirm('Are you sure you want to delete this PYQ paper from both app and database?')) return
    setError('')
    setSuccess('')
    try {
      await deleteDocument(docId)
      setSuccess('PYQ document deleted successfully.')
      await loadPyqs()
    } catch (err) {
      console.error(err)
      setError(err?.response?.data?.detail || 'Failed to delete PYQ document.')
    }
  }

  async function handleAddPyq(e){
    e.preventDefault()
    if (!addFile && !addForm.pdf_url && !addForm.youtube_url) {
      setError('Please upload a PDF/Image file, provide a direct PDF URL, or add a YouTube video solution.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    setUploadProgress(0)

    try {
      const fd = new FormData()
      if (addFile) fd.append('file', addFile)
      fd.append('school_id', filters.school_id)
      fd.append('department_id', filters.department_id)
      fd.append('semester_id', filters.semester_id)
      fd.append('subject_id', filters.subject_id)
      fd.append('document_type', 'pyq')
      fd.append('title', addForm.title || `${subjects.find(s=>s.id === filters.subject_id)?.name || 'Subject'} PYQ`)
      fd.append('description', addForm.description)
      fd.append('academic_year', addForm.academic_year)
      fd.append('exam_type', addForm.exam_type)
      fd.append('youtube_url', addForm.youtube_url)
      fd.append('video_title', addForm.video_title)
      fd.append('pdf_url', addForm.pdf_url)

      await uploadDocument(fd, (evt) => {
        if (evt.total) {
          setUploadProgress(Math.round((evt.loaded / evt.total) * 100))
        }
      })

      setSuccess('PYQ document uploaded and processed successfully.')
      setAddOpen(false)
      setAddFile(null)
      setAddForm({ title: '', description: '', academic_year: '', exam_type: 'end_semester', youtube_url: '', video_title: '', pdf_url: '' })
      await loadPyqs()
    } catch (err) {
      console.error(err)
      setError(err?.response?.data?.detail || 'Failed to upload PYQ document.')
    } finally {
      setSaving(false)
      setUploadProgress(0)
    }
  }

  const activeSubjectName = subjects.find(s => s.id === filters.subject_id)?.name || 'Selected Subject'

  return (
    <div className="page">
      <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>PYQ Manager</h1>
          <p>Create, manage, and audit Previous Year Question Papers directly connected to student apps.</p>
        </div>
        {filters.subject_id && (
          <button className="btn primary" onClick={() => setAddOpen(true)}>Add PYQ Paper</button>
        )}
      </div>

      {error && <div className="error" style={{ margin: '16px 0' }}>{error}</div>}
      {success && <div className="success" style={{ margin: '16px 0', padding: 12, backgroundColor: '#ECFDF5', color: '#065F46', borderRadius: 8 }}>{success}</div>}

      {/* Filter Selection Grid */}
      <div className="filter-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, backgroundColor: '#fff', padding: 20, borderRadius: 16, border: '1px solid #E5E7EB', marginBottom: 24 }}>
        <div>
          <label>School</label>
          <select value={filters.school_id} onChange={e => setFilters(prev => ({ ...prev, school_id: e.target.value, department_id: '', semester_id: '', subject_id: '' }))}>
            <option value="">Select school</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label>Department</label>
          <select value={filters.department_id} onChange={e => setFilters(prev => ({ ...prev, department_id: e.target.value, semester_id: '', subject_id: '' }))} disabled={!filters.school_id}>
            <option value="">Select department</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label>Semester</label>
          <select value={filters.semester_id} onChange={e => setFilters(prev => ({ ...prev, semester_id: e.target.value, subject_id: '' }))} disabled={!filters.department_id}>
            <option value="">Select semester</option>
            {semesters.map(sem => <option key={sem.id} value={sem.id}>{`Semester ${sem.semester_number}`}</option>)}
          </select>
        </div>
        <div>
          <label>Subject</label>
          <select value={filters.subject_id} onChange={e => setFilters(prev => ({ ...prev, subject_id: e.target.value }))} disabled={!filters.semester_id}>
            <option value="">Select subject</option>
            {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.name || sub.code}</option>)}
          </select>
        </div>
      </div>

      {/* PYQ Cards View */}
      {!filters.subject_id ? (
        <div className="empty-state card">Select a School, Department, Semester, and Subject above to start managing PYQs.</div>
      ) : loading ? (
        <p>Loading PYQ papers...</p>
      ) : pyqs.length === 0 ? (
        <div className="empty-state card">
          <p>No PYQ documents found for <strong>{activeSubjectName}</strong>.</p>
          <button className="btn primary" onClick={() => setAddOpen(true)} style={{ marginTop: 12 }}>Upload first PYQ paper</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {pyqs.map(doc => (
            <article key={doc.id} className="subject-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', padding: '4px 8px', borderRadius: 20, backgroundColor: '#EFF6FF', color: '#2563EB', marginBottom: 12, display: 'inline-block' }}>
                    {doc.metadata_json?.exam_type?.replace('_', ' ') || 'Other'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>{doc.academic_year || 'N/A'}</span>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '4px 0 8px', color: '#111827' }}>{doc.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#4B5563', margin: '0 0 12px' }}>{doc.description || 'No description added.'}</p>
                {doc.youtube_url && (
                  <div style={{ margin: '8px 0', fontSize: '0.85rem' }}>
                    <strong>📺 Video solution: </strong>
                    <a href={doc.youtube_url} target="_blank" rel="noreferrer" style={{ color: '#2563EB', textDecoration: 'none' }}>
                      {doc.video_title || 'Watch solution'}
                    </a>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F3F4F6', paddingTop: 12, marginTop: 12 }}>
                <div>
                  {doc.cloudinary_url && (
                    <a href={doc.cloudinary_url} target="_blank" rel="noreferrer" className="text-link" style={{ fontSize: '0.85rem', marginRight: 12 }}>View PDF</a>
                  )}
                  <Link to={`/documents/${doc.id}`} className="text-link" style={{ fontSize: '0.85rem' }}>Edit details</Link>
                </div>
                <button className="text-button" onClick={() => handleDelete(doc.id)} style={{ color: '#DC2626', fontSize: '0.85rem' }}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Add PYQ Modal */}
      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add PYQ Paper</h3>
              <button className="text-button" onClick={() => setAddOpen(false)}>Close</button>
            </div>
            <form className="modal-form" onSubmit={handleAddPyq}>
              <div className="form-grid">
                <label>
                  Document Title (Optional)
                  <input value={addForm.title} onChange={e => setAddForm(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. End Sem 2023" />
                </label>
                <label>
                  Academic Year
                  <input value={addForm.academic_year} onChange={e => setAddForm(prev => ({ ...prev, academic_year: e.target.value }))} placeholder="e.g. 2023-2024" required />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Exam Type
                  <select value={addForm.exam_type} onChange={e => setAddForm(prev => ({ ...prev, exam_type: e.target.value }))} required>
                    <option value="ct1">CT1</option>
                    <option value="ct2">CT2</option>
                    <option value="end_semester">End Semester</option>
                    <option value="other">Other / Resource</option>
                  </select>
                </label>
                <label>
                  YouTube Solution URL (Optional)
                  <input value={addForm.youtube_url} onChange={e => setAddForm(prev => ({ ...prev, youtube_url: e.target.value }))} placeholder="https://..." />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Video Label / Title (Optional)
                  <input value={addForm.video_title} onChange={e => setAddForm(prev => ({ ...prev, video_title: e.target.value }))} placeholder="e.g. Full solution lecture" />
                </label>
                <label>
                  Direct PDF URL (Optional if file uploaded)
                  <input value={addForm.pdf_url} onChange={e => setAddForm(prev => ({ ...prev, pdf_url: e.target.value }))} placeholder="https://..." />
                </label>
              </div>

              <label>
                Description (Optional)
                <textarea value={addForm.description} onChange={e => setAddForm(prev => ({ ...prev, description: e.target.value }))} rows="3" />
              </label>

              <label>
                Select PDF / Image File
                <input type="file" accept=".pdf,image/png,image/jpeg,image/jpg,image/webp" onChange={e => setAddFile(e.target.files?.[0] || null)} />
              </label>

              {uploadProgress > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: '#3B82F6' }}></div>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: 4, display: 'inline-block' }}>Uploading: {uploadProgress}%</span>
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: 16 }}>
                <button className="btn" type="button" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</button>
                <button className="btn primary" type="submit" disabled={saving}>
                  {saving ? 'Uploading...' : 'Upload PYQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
