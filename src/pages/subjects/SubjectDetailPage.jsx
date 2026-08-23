import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../api/client'
import { deleteDocument, uploadDocument } from '../../api/documentsApi'
import StatusBadge from '../../components/StatusBadge'

export default function SubjectDetailPage(){
  const { id } = useParams()
  const navigate = useNavigate()

  const [subject, setSubject] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Edit metadata form state
  const [metaForm, setMetaForm] = useState({ name: '', code: '', description: '', credits: 0, faculty_name: '', subject_type: 'theory' })
  const [editMetaOpen, setEditMetaOpen] = useState(false)

  // Upload modal states
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadType, setUploadType] = useState('syllabus') // 'syllabus' | 'pyq' | 'note'
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', academic_year: '', exam_type: '', youtube_url: '', video_title: '', pdf_url: '' })
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Delete subject state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteWarning, setDeleteWarning] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function loadAll(){
    setLoading(true)
    setError('')
    try {
      const [subjRes, docsRes] = await Promise.all([
        api.get(`/subjects/${id}`),
        api.get('/documents', { params: { subject_id: id, page_size: 0 } })
      ])
      
      setSubject(subjRes.data)
      setMetaForm({
        name: subjRes.data.name || '',
        code: subjRes.data.code || '',
        description: subjRes.data.description || '',
        credits: subjRes.data.credits || 0,
        faculty_name: subjRes.data.faculty_name || '',
        subject_type: subjRes.data.subject_type || 'theory'
      })
      setDocuments(docsRes.data || [])
    } catch (err) {
      console.error(err)
      setError(err?.response?.data?.detail || 'Failed to load subject details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [id])

  async function handleUpdateMetadata(e){
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await api.put(`/subjects/${id}`, {
        ...metaForm,
        credits: Number(metaForm.credits)
      })
      setSubject(res.data)
      setSuccess('Subject metadata updated successfully.')
      setEditMetaOpen(false)
    } catch (err) {
      console.error(err)
      setError(err?.response?.data?.detail || 'Failed to update subject metadata.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpload(e){
    e.preventDefault()
    if (uploadType !== 'pyq' && !uploadFile) {
      setError('Please select a file to upload.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    setUploadProgress(0)

    try {
      const fd = new FormData()
      if (uploadFile) fd.append('file', uploadFile)
      fd.append('school_id', subject.school_id)
      fd.append('department_id', subject.department_id)
      fd.append('semester_id', subject.semester_id)
      fd.append('subject_id', subject.id)
      fd.append('document_type', uploadType)
      fd.append('title', uploadForm.title || `${subject.name} ${uploadType.toUpperCase()}`)
      fd.append('description', uploadForm.description)
      fd.append('academic_year', uploadForm.academic_year)
      fd.append('exam_type', uploadForm.exam_type)
      fd.append('youtube_url', uploadForm.youtube_url)
      fd.append('video_title', uploadForm.video_title)
      fd.append('pdf_url', uploadForm.pdf_url)

      await uploadDocument(fd, (progressEvent) => {
        if (progressEvent.total) {
          setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100))
        }
      })

      setSuccess(`Uploaded ${uploadType} document successfully.`)
      setUploadOpen(false)
      setUploadFile(null)
      setUploadForm({ title: '', description: '', academic_year: '', exam_type: '', youtube_url: '', video_title: '', pdf_url: '' })
      await loadAll()
    } catch (err) {
      console.error(err)
      setError(err?.response?.data?.detail || `Failed to upload ${uploadType} document.`)
    } finally {
      setSaving(false)
      setUploadProgress(0)
    }
  }

  async function handleDeleteDocument(docId){
    if (!confirm('Are you sure you want to delete this document from both app and database?')) return
    setError('')
    setSuccess('')
    try {
      await deleteDocument(docId)
      setSuccess('Document deleted successfully.')
      await loadAll()
    } catch (err) {
      console.error(err)
      setError(err?.response?.data?.detail || 'Failed to delete document.')
    }
  }

  async function checkDeleteSubject(){
    setDeleteLoading(true)
    setDeleteOpen(true)
    setError('')
    try {
      const res = await api.delete(`/subjects/${id}`, { params: { confirm: false } })
      setDeleteWarning(res.data)
    } catch (err) {
      console.error(err)
      setError(err?.response?.data?.detail || 'Failed to check subject contents.')
      setDeleteOpen(false)
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleConfirmDeleteSubject(){
    setDeleteLoading(true)
    try {
      await api.delete(`/subjects/${id}`, { params: { confirm: true } })
      alert('Subject deleted successfully.')
      navigate('/subjects')
    } catch (err) {
      console.error(err)
      setError(err?.response?.data?.detail || 'Failed to delete subject.')
      setDeleteOpen(false)
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) return <div className="page"><p>Loading subject details...</p></div>

  const syllabusDocs = documents.filter(d => d.document_type === 'syllabus')
  const pyqDocs = documents.filter(d => d.document_type === 'pyq')
  const noteDocs = documents.filter(d => d.document_type === 'note')

  return (
    <div className="page">
      <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link to="/subjects" style={{ fontSize: '0.9rem', color: '#6B7280', textDecoration: 'none' }}>← Back to Subjects</Link>
          <h1 style={{ marginTop: 8 }}>{subject.name}</h1>
          <p style={{ color: '#4B5563', margin: '4px 0 0' }}>Code: <strong>{subject.code}</strong> | Type: {subject.subject_type} | Credits: {subject.credits}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn" onClick={() => setEditMetaOpen(true)}>Edit Details</button>
          <button className="btn" onClick={checkDeleteSubject} style={{ backgroundColor: '#DC2626', color: '#fff' }}>Delete Subject</button>
        </div>
      </div>

      {error && <div className="error" style={{ margin: '16px 0' }}>{error}</div>}
      {success && <div className="success" style={{ margin: '16px 0', padding: 12, backgroundColor: '#ECFDF5', color: '#065F46', borderRadius: 8 }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginTop: 20 }}>
        
        {/* Left Column: Metadata summary */}
        <aside className="card">
          <h3>Subject Information</h3>
          <table className="table" style={{ width: '100%', marginTop: 12 }}>
            <tbody>
              <tr><td><strong>Faculty</strong></td><td>{subject.faculty_name || 'Not assigned'}</td></tr>
              <tr><td><strong>Credits</strong></td><td>{subject.credits}</td></tr>
              <tr><td><strong>Type</strong></td><td>{subject.subject_type}</td></tr>
              <tr><td><strong>Department</strong></td><td>{subject.department_id?.slice(0, 8)}...</td></tr>
              <tr><td><strong>Semester</strong></td><td>{subject.semester_id?.slice(0, 8)}...</td></tr>
              <tr><td><strong>Status</strong></td><td>{subject.is_active ? 'Active' : 'Inactive'}</td></tr>
            </tbody>
          </table>
          <div style={{ marginTop: 16 }}>
            <strong>Description</strong>
            <p style={{ fontSize: '0.9rem', color: '#4B5563', marginTop: 4 }}>{subject.description || 'No description added yet.'}</p>
          </div>
        </aside>

        {/* Right Column: Manage Documents */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Syllabus Section */}
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Official Syllabus</h3>
              {syllabusDocs.length === 0 && (
                <button className="btn primary" onClick={() => { setUploadType('syllabus'); setUploadOpen(true) }}>Upload Syllabus</button>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              {syllabusDocs.length === 0 ? (
                <p className="empty-state">No syllabus uploaded yet.</p>
              ) : (
                syllabusDocs.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, border: '1px solid #E5E7EB' }}>
                    <div>
                      <h4 style={{ margin: 0 }}>{doc.title}</h4>
                      <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '4px 0 0' }}>
                        Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <a href={doc.cloudinary_url} target="_blank" rel="noreferrer" className="text-link">Download PDF</a>
                        <Link to={`/documents/${doc.id}`} className="text-link">Edit Structured JSON / Topics</Link>
                      </div>
                    </div>
                    <button className="text-button" onClick={() => handleDeleteDocument(doc.id)} style={{ color: '#DC2626' }}>Delete</button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* PYQ Papers Section */}
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Previous Year Papers (PYQs)</h3>
              <button className="btn primary" onClick={() => { setUploadType('pyq'); setUploadOpen(true) }}>Add PYQ</button>
            </div>

            <div style={{ marginTop: 12 }}>
              {pyqDocs.length === 0 ? (
                <p className="empty-state">No PYQs uploaded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {pyqDocs.map(doc => (
                    <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, border: '1px solid #E5E7EB' }}>
                      <div>
                        <h4 style={{ margin: 0 }}>{doc.title}</h4>
                        <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '4px 0 0' }}>
                          Exam Type: <strong>{doc.metadata_json?.exam_type?.toUpperCase() || 'Other'}</strong> | Year: {doc.academic_year || 'Unknown'}
                        </p>
                        {doc.youtube_url && (
                          <p style={{ fontSize: '0.85rem', color: '#2563EB', margin: '4px 0 0' }}>
                            📺 Video solution: <a href={doc.youtube_url} target="_blank" rel="noreferrer">{doc.video_title || doc.youtube_url}</a>
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          {doc.cloudinary_url && <a href={doc.cloudinary_url} target="_blank" rel="noreferrer" className="text-link">Download PDF</a>}
                          <Link to={`/documents/${doc.id}`} className="text-link">Edit Details</Link>
                        </div>
                      </div>
                      <button className="text-button" onClick={() => handleDeleteDocument(doc.id)} style={{ color: '#DC2626' }}>Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Notes Section */}
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Study Notes</h3>
              <button className="btn primary" onClick={() => { setUploadType('note'); setUploadOpen(true) }}>Add Study Note</button>
            </div>

            <div style={{ marginTop: 12 }}>
              {noteDocs.length === 0 ? (
                <p className="empty-state">No notes uploaded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {noteDocs.map(doc => (
                    <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, border: '1px solid #E5E7EB' }}>
                      <div>
                        <h4 style={{ margin: 0 }}>{doc.title}</h4>
                        <p style={{ fontSize: '0.85rem', color: '#4B5563', margin: '4px 0 0' }}>{doc.description || 'No description provided.'}</p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <a href={doc.cloudinary_url} target="_blank" rel="noreferrer" className="text-link">Download PDF</a>
                          <Link to={`/documents/${doc.id}`} className="text-link">Edit Details</Link>
                        </div>
                      </div>
                      <button className="text-button" onClick={() => handleDeleteDocument(doc.id)} style={{ color: '#DC2626' }}>Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </div>
      </div>

      {/* Edit Subject Details Modal */}
      {editMetaOpen && (
        <div className="modal-backdrop" onClick={() => setEditMetaOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Subject Details</h3>
              <button className="text-button" onClick={() => setEditMetaOpen(false)}>Close</button>
            </div>
            <form className="modal-form" onSubmit={handleUpdateMetadata}>
              <div className="form-grid">
                <label>
                  Subject Name
                  <input value={metaForm.name} onChange={e => setMetaForm(prev => ({ ...prev, name: e.target.value }))} required />
                </label>
                <label>
                  Subject Code
                  <input value={metaForm.code} onChange={e => setMetaForm(prev => ({ ...prev, code: e.target.value }))} required />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Credits
                  <input type="number" min="0" value={metaForm.credits} onChange={e => setMetaForm(prev => ({ ...prev, credits: e.target.value }))} required />
                </label>
                <label>
                  Faculty Name
                  <input value={metaForm.faculty_name} onChange={e => setMetaForm(prev => ({ ...prev, faculty_name: e.target.value }))} />
                </label>
              </div>
              <label>
                Subject Type
                <select value={metaForm.subject_type} onChange={e => setMetaForm(prev => ({ ...prev, subject_type: e.target.value }))}>
                  <option value="theory">Theory</option>
                  <option value="lab">Lab / Practical</option>
                </select>
              </label>
              <label>
                Description
                <textarea value={metaForm.description} onChange={e => setMetaForm(prev => ({ ...prev, description: e.target.value }))} rows="4" />
              </label>
              <div className="modal-actions">
                <button className="btn" type="button" onClick={() => setEditMetaOpen(false)}>Cancel</button>
                <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Subject Warning Modal */}
      {deleteOpen && (
        <div className="modal-backdrop" onClick={() => setDeleteOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: '#DC2626' }}>Delete Subject Confirmation</h3>
              <button className="text-button" onClick={() => setDeleteOpen(false)}>Close</button>
            </div>
            <div className="modal-body" style={{ padding: '12px 0' }}>
              {deleteLoading ? (
                <p>Checking dependencies...</p>
              ) : deleteWarning ? (
                <div>
                  <p>Are you sure you want to permanently delete this subject?</p>
                  <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', padding: 16, borderRadius: 12, margin: '16px 0', color: '#991B1B' }}>
                    <h4 style={{ margin: '0 0 8px' }}>⚠️ Warning: Associated Files Found</h4>
                    <p style={{ margin: 0 }}>{deleteWarning.message}</p>
                    {deleteWarning.status === 'warning' && (
                      <ul style={{ margin: '12px 0 0', paddingLeft: 20, fontSize: '0.9rem' }}>
                        {deleteWarning.documents.map(d => (
                          <li key={d.id}>{d.title} ({d.type})</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <p style={{ fontSize: '0.9rem', color: '#4B5563' }}>
                    This action will remove the subject from both the admin dashboard and the mobile app. All linked syllabus files, PYQs, and notes will be permanently cascade-deleted.
                  </p>
                </div>
              ) : null}
            </div>
            <div className="modal-actions" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn" type="button" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>Cancel</button>
              <button className="btn" type="button" onClick={handleConfirmDeleteSubject} disabled={deleteLoading} style={{ backgroundColor: '#DC2626', color: '#fff' }}>
                {deleteLoading ? 'Processing...' : 'Permanently Delete Subject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload File / Add Document Modal */}
      {uploadOpen && (
        <div className="modal-backdrop" onClick={() => setUploadOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload {uploadType.toUpperCase()} Document</h3>
              <button className="text-button" onClick={() => setUploadOpen(false)}>Close</button>
            </div>
            <form className="modal-form" onSubmit={handleUpload}>
              <div className="form-grid">
                <label>
                  Document Title
                  <input value={uploadForm.title} onChange={e => setUploadForm(prev => ({ ...prev, title: e.target.value }))} placeholder={`e.g. ${subject.name} ${uploadType.toUpperCase()}`} />
                </label>
                <label>
                  Academic Year
                  <input value={uploadForm.academic_year} onChange={e => setUploadForm(prev => ({ ...prev, academic_year: e.target.value }))} placeholder="e.g. 2026-2027" />
                </label>
              </div>

              {uploadType === 'pyq' && (
                <>
                  <div className="form-grid">
                    <label>
                      Exam Type
                      <select value={uploadForm.exam_type} onChange={e => setUploadForm(prev => ({ ...prev, exam_type: e.target.value }))} required>
                        <option value="">Select exam type</option>
                        <option value="ct1">CT1</option>
                        <option value="ct2">CT2</option>
                        <option value="end_semester">End Semester</option>
                      </select>
                    </label>
                    <label>
                      YouTube Solution URL (Optional)
                      <input value={uploadForm.youtube_url} onChange={e => setUploadForm(prev => ({ ...prev, youtube_url: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." />
                    </label>
                  </div>
                  <label>
                    Video Label / Title (Optional)
                    <input value={uploadForm.video_title} onChange={e => setUploadForm(prev => ({ ...prev, video_title: e.target.value }))} placeholder="e.g. CT1 Video Solution" />
                  </label>
                  <label>
                    Direct PDF URL (Optional if file uploaded)
                    <input value={uploadForm.pdf_url} onChange={e => setUploadForm(prev => ({ ...prev, pdf_url: e.target.value }))} placeholder="https://...pdf" />
                  </label>
                </>
              )}

              <label>
                Description (Optional)
                <textarea value={uploadForm.description} onChange={e => setUploadForm(prev => ({ ...prev, description: e.target.value }))} rows="3" />
              </label>

              <label>
                Select File (PDF or Image)
                <input type="file" accept=".pdf,image/png,image/jpeg,image/jpg,image/webp" onChange={e => setUploadFile(e.target.files?.[0] || null)} required={uploadType !== 'pyq'} />
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
                <button className="btn" type="button" onClick={() => setUploadOpen(false)} disabled={saving}>Cancel</button>
                <button className="btn primary" type="submit" disabled={saving}>
                  {saving ? 'Processing...' : 'Start Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
