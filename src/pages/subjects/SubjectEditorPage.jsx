import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../api/client'

const tabs = ['Overview', 'Syllabus', 'PYQs', 'Notes', 'Videos', 'Preview']

function syllabusData(document){
  const data = document?.structured_json
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
}

export default function SubjectEditorPage(){
  const { id } = useParams()
  const [subject, setSubject] = useState(null)
  const [documents, setDocuments] = useState([])
  const [form, setForm] = useState({ name: '', code: '', credits: 0, description: '', subject_type: 'theory' })
  const [tab, setTab] = useState('Overview')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [copyOpen, setCopyOpen] = useState(false)
  const [copyDestinations, setCopyDestinations] = useState([])
  const [copyOptions, setCopyOptions] = useState({ copy_topics: true, copy_description: true, copy_credits: true, copy_pdf: false, copy_notes: false, copy_pyqs: false, copy_youtube: false })

  async function load(){
    try {
      const [subjectRes, documentsRes] = await Promise.all([api.get(`/subjects/${id}`), api.get('/documents', { params: { subject_id: id, page_size: 0 } })])
      setSubject(subjectRes.data)
      setDocuments(documentsRes.data || [])
      setForm({ name: subjectRes.data.name || '', code: subjectRes.data.code || '', credits: subjectRes.data.credits || 0, description: subjectRes.data.description || '', subject_type: subjectRes.data.subject_type || 'theory' })
    } catch (err) { setError(err?.response?.data?.detail || 'Failed to load subject.') }
  }
  useEffect(() => { load() }, [id])

  const syllabus = useMemo(() => documents.find((document) => document.document_type === 'syllabus'), [documents])
  const topics = syllabusData(syllabus)
  const units = Array.isArray(topics.Units) ? topics.Units : []
  const related = (type) => documents.filter((document) => document.document_type === type)

  async function openCopy(){
    try {
      const schools = (await api.get('/schools/')).data || []
      const rows = []
      for (const school of schools) {
        const departments = (await api.get(`/schools/${school.id}/departments`)).data || []
        for (const department of departments) {
          const semesters = (await api.get('/semesters/', { params: { department_id: department.id } })).data || []
          if (department.id !== subject?.department_id) rows.push({ department, semesters, semesterId: semesters[0]?.id || '', selected: false })
        }
      }
      setCopyDestinations(rows)
      setCopyOpen(true)
    } catch (err) { setError(err?.response?.data?.detail || 'Failed to load copy destinations.') }
  }

  async function copySubject(event){
    event.preventDefault()
    const destinations = copyDestinations.filter((item) => item.selected && item.semesterId).map((item) => ({ department_id: item.department.id, semester_id: item.semesterId }))
    if (!destinations.length) { setError('Select at least one destination department and semester.'); return }
    setSaving(true); setError('')
    try {
      const response = await api.post('/subjects/bulk-copy', { source_subject_ids: [subject.id], destinations, ...copyOptions })
      setCopyOpen(false)
      setMessage(`Saved successfully. ${response.data?.length || 0} subject copy is now available to the app.`)
    } catch (err) { setError(err?.response?.data?.detail || 'Copy failed. No changes were made.') } finally { setSaving(false) }
  }

  async function approveSyllabus(){
    if (!syllabus) return
    setSaving(true); setError(''); setMessage('')
    try { await api.put(`/documents/${syllabus.id}`, { status: 'active' }); setMessage('Approved and published. Changes are now available to the app.'); await load() }
    catch (err) { setError(err?.response?.data?.detail || 'Failed to publish syllabus.') } finally { setSaving(false) }
  }

  async function saveSubject(event){
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try { const response = await api.put(`/subjects/${id}`, { ...form, credits: Number(form.credits) }); setSubject(response.data); setMessage('Saved successfully. Changes are now available to the app.'); }
    catch (err) { setError(err?.response?.data?.detail || 'Failed to save subject.') } finally { setSaving(false) }
  }

  async function saveTopics(event){
    event.preventDefault(); if (!syllabus) return
    setSaving(true); setError(''); setMessage('')
    try { await api.put(`/documents/${syllabus.id}`, { structured_json: topics }); setMessage('Saved successfully. Changes are now available to the app.'); await load() }
    catch (err) { setError(err?.response?.data?.detail || 'Failed to save syllabus topics.') } finally { setSaving(false) }
  }

  if (!subject) return <div className="page"><div className="card">{error || 'Loading subject...'}</div></div>
  return <div className="page subject-editor-page">
    <Link className="text-link" to={`/subjects/departments/${subject.department_id}`}>← Back to Department Workspace</Link>
    <div className="page-heading workspace-heading"><div><span className="eyebrow">Subject Editor</span><h1>{subject.name}</h1><p><strong>{subject.code}</strong> · Semester {subject.semester_id?.slice(0, 8)}... · {subject.department_id?.slice(0, 8)}...</p></div><div className="pill-box"><button className="btn" type="button" onClick={openCopy}>Copy Subject</button><span className="pill accent">● Live backend data</span></div></div>
    {error && <div className="error">{error}</div>}{message && <div className="success">✓ {message}</div>}
    <div className="editor-layout"><main className="card editor-main"><nav className="editor-tabs">{tabs.map((item) => <button className={tab === item ? 'active' : ''} type="button" key={item} onClick={() => setTab(item)}>{item}</button>)}</nav>
      {tab === 'Overview' && <form className="modal-form" onSubmit={saveSubject}><div className="form-grid"><label>Subject Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Subject Code<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label><label>Credits<input type="number" min="0" value={form.credits} onChange={(event) => setForm({ ...form, credits: event.target.value })} /></label><label>Type<select value={form.subject_type} onChange={(event) => setForm({ ...form, subject_type: event.target.value })}><option value="theory">Theory</option><option value="lab">Lab</option></select></label></div><label>Description<textarea rows="5" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div className="modal-actions"><button className="btn primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button></div></form>}
      {tab === 'Syllabus' && <form onSubmit={saveTopics}><div className="content-section"><h2>Syllabus / Topics</h2>{units.map((unit, index) => <div className="unit-editor" key={index}><h3>Unit {index + 1}</h3>{(unit.Topics || unit.topics || []).map((topic, topicIndex) => <input key={topicIndex} value={typeof topic === 'string' ? topic : topic?.Topic || topic?.name || ''} onChange={(event) => { const next = [...units]; const field = Array.isArray(next[index].Topics) ? 'Topics' : 'topics'; next[index] = { ...next[index], [field]: next[index][field].map((value, itemIndex) => itemIndex === topicIndex ? event.target.value : value) }; setDocuments(documents.map((document) => document.id === syllabus.id ? { ...document, structured_json: { ...topics, Units: next } } : document)) }} />)}</div>)}{!units.length && <div className="empty-state">No extracted topics are available yet.</div>}</div><div className="modal-actions"><button className="btn primary" disabled={saving}>Save Topics</button></div></form>}
      {['PYQs', 'Notes', 'Videos'].includes(tab) && <div className="content-section"><h2>{tab}</h2>{related(tab === 'PYQs' ? 'pyq' : tab === 'Notes' ? 'note' : 'pyq').map((document) => <div className="content-row" key={document.id}><strong>{document.title}</strong><span>{document.status || 'active'} · {document.cloudinary_url ? 'Linked content' : 'No file'}</span></div>)}{!related(tab === 'PYQs' ? 'pyq' : tab === 'Notes' ? 'note' : 'pyq').length && <div className="empty-state">No {tab.toLowerCase()} linked to this subject.</div>}</div>}
      {tab === 'Preview' && <Preview subject={subject} syllabus={topics} documents={documents} />}
    </main><aside className="card editor-rail"><h3>Content Summary</h3><div className="detail-row"><span>Syllabus PDF</span><strong>{syllabus ? (syllabus.status || 'active') : 'Missing'}</strong></div><div className="detail-row"><span>Topics</span><strong>{units.length} units</strong></div><div className="detail-row"><span>PYQs</span><strong>{related('pyq').length}</strong></div><div className="detail-row"><span>Notes</span><strong>{related('note').length}</strong></div>{syllabus?.status === 'draft' && <button className="btn" type="button" onClick={approveSyllabus} disabled={saving}>Approve syllabus</button>}<button className="btn primary" type="button" onClick={() => setTab('Preview')}>Preview in App</button></aside></div>
    {copyOpen && <div className="modal-backdrop" onClick={() => setCopyOpen(false)}><div className="modal-card" onClick={(event) => event.stopPropagation()}><div className="modal-header"><h3>Copy Subject</h3><button className="text-button" type="button" onClick={() => setCopyOpen(false)}>Close</button></div><form className="modal-form" onSubmit={copySubject}><div className="copy-source-list"><strong>{subject.name}</strong><span>{subject.code} · Semester {subject.semester_id?.slice(0, 8)}...</span></div><fieldset className="copy-destination-list"><legend>Copy to</legend>{copyDestinations.map((item, index) => <label className="copy-destination-row" key={item.department.id}><span><input type="checkbox" checked={item.selected} onChange={(event) => setCopyDestinations((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, selected: event.target.checked } : row))} /> {item.department.name}</span><select value={item.semesterId} disabled={!item.selected} onChange={(event) => setCopyDestinations((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, semesterId: event.target.value } : row))}>{item.semesters.map((semester) => <option key={semester.id} value={semester.id}>Semester {semester.semester_number}</option>)}</select></label>)}</fieldset><div className="copy-options">{Object.entries(copyOptions).map(([key, value]) => <label key={key}><input type="checkbox" checked={value} onChange={(event) => setCopyOptions({ ...copyOptions, [key]: event.target.checked })} /> {key.replace('copy_', '').replace('_', ' ')}</label>)}</div><p className="modal-hint">Copies use the live API. Existing content is never changed.</p><div className="modal-actions"><button className="btn" type="button" onClick={() => setCopyOpen(false)}>Cancel</button><button className="btn primary" disabled={saving}>{saving ? 'Copying...' : 'Copy Subject'}</button></div></form></div></div>}
  </div>
}

function Preview({ subject, syllabus, documents }){
  const units = Array.isArray(syllabus.Units) ? syllabus.Units : []
  return <div className="preview-wrap"><div className="phone-preview"><div className="phone-status">9:41 <span>ExamBuddy</span></div><div className="phone-header">← <strong>Subject Details</strong></div><h2>{subject.name}</h2><p>{subject.code} · Credits: {subject.credits || 0}</p><span className="phone-chip">Semester</span><div className="phone-tabs">Syllabus　 PYQs　 Notes　 Videos</div>{units.map((unit, index) => <section className="phone-unit" key={index}><strong>Unit {index + 1}: {unit['Unit Name'] || unit.name || ''}</strong>{(unit.Topics || unit.topics || []).map((topic, topicIndex) => <div key={topicIndex}>• {typeof topic === 'string' ? topic : topic?.Topic || topic?.name || ''}</div>)}</section>)}<footer>{documents.filter((document) => ['pyq', 'note'].includes(document.document_type)).length} content resources</footer></div></div>
}
