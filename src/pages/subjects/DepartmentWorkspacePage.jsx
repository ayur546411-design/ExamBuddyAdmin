import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../api/client'

export default function DepartmentWorkspacePage(){
  const { departmentId } = useParams()
  const [department, setDepartment] = useState(null)
  const [semesters, setSemesters] = useState([])
  const [open, setOpen] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', code: '', description: '', duration_years: '', total_semesters: '' })
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [subject, setSubject] = useState(null)
  const [syllabusDocument, setSyllabusDocument] = useState(null)
  const [editorTab, setEditorTab] = useState('Syllabus / Units')
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', credits: 0, description: '' })
  const [editorSaving, setEditorSaving] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [copyDestinations, setCopyDestinations] = useState([])
   const [addSubjectOpen, setAddSubjectOpen] = useState(false)
   const [newSubject, setNewSubject] = useState({ name: '', code: '', description: '' })
  const [addSemesterOpen, setAddSemesterOpen] = useState(false)
  const [newSemesterNumber, setNewSemesterNumber] = useState('')

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
        if (found) setEditForm({ name: found.name || '', code: found.code || '', description: found.description || '', duration_years: found.duration_years || '', total_semesters: found.total_semesters || '' })
        setSemesters(grouped)
        setOpen(Object.fromEntries(grouped.map((semester) => [semester.id, true])))
      } catch (err) { setError(err?.response?.data?.detail || 'Failed to load department workspace.') }
    }
    load()
  }, [departmentId])

  const subjectCount = semesters.reduce((total, semester) => total + semester.subjects.length, 0)
  const departmentName = department?.name?.replace(/^Department of\s+/i, '') || '...'
  const selectedSemester = semesters.find((semester) => open[semester.id]) || semesters[0]
  const allSubjects = useMemo(() => semesters.flatMap((semester) => semester.subjects), [semesters])
  const syllabus = useMemo(() => {
    const data = syllabusDocument?.structured_json
    return data && typeof data === 'object' && !Array.isArray(data) ? data : { Units: [] }
  }, [syllabusDocument])
  const units = Array.isArray(syllabus.Units) ? syllabus.Units : []

  useEffect(() => {
    if (!selectedSubjectId && allSubjects.length) setSelectedSubjectId(allSubjects[0].id)
    if (selectedSubjectId && !allSubjects.some((item) => item.id === selectedSubjectId)) setSelectedSubjectId(allSubjects[0]?.id || '')
  }, [allSubjects, selectedSubjectId])

  useEffect(() => {
    async function loadSubject(){
      if (!selectedSubjectId) return
      setError('')
      try {
        const subjectResponse = await api.get(`/subjects/${selectedSubjectId}`)
        let documentResponse = { data: [] }
        try {
          documentResponse = await api.get('/documents/', { params: { subject_id: selectedSubjectId, document_type: 'syllabus', page_size: 0 } })
        } catch (documentError) {
          if (documentError?.response?.status !== 404) throw documentError
        }
        const nextSubject = subjectResponse.data
        setSubject(nextSubject)
        setSubjectForm({ name: nextSubject.name || '', code: nextSubject.code || '', credits: nextSubject.credits || 0, description: nextSubject.description || '' })
        setSyllabusDocument((documentResponse.data || []).find((document) => document.document_type === 'syllabus') || null)
      } catch (err) {
        const detail = err?.response?.data?.detail
        if (detail === 'Document not found' || err?.response?.status === 404) {
          setSyllabusDocument(null)
          setError('')
          return
        }
        setError(detail || 'Failed to load subject content.')
      }
    }
    loadSubject()
  }, [selectedSubjectId])

  function updateUnit(unitIndex, patch){ setSyllabusDocument((current) => ({ ...current, structured_json: { ...syllabus, Units: units.map((unit, index) => index === unitIndex ? { ...unit, ...patch } : unit) } })) }
  function updateTopic(unitIndex, topicIndex, value){ updateUnit(unitIndex, { Topics: (units[unitIndex].Topics || units[unitIndex].topics || []).map((topic, index) => index === topicIndex ? value : topic) }) }
  function addUnit(){ setSyllabusDocument((current) => ({ ...current, structured_json: { ...syllabus, Units: [...units, { 'Unit Name': `Unit ${units.length + 1}`, Topics: [] }] } })) }
  function addTopic(unitIndex){ updateUnit(unitIndex, { Topics: [...(units[unitIndex].Topics || units[unitIndex].topics || []), 'New topic'] }) }
  function deleteUnit(unitIndex){ setSyllabusDocument((current) => ({ ...current, structured_json: { ...syllabus, Units: units.filter((_, index) => index !== unitIndex) } })) }
  function deleteTopic(unitIndex, topicIndex){ updateUnit(unitIndex, { Topics: (units[unitIndex].Topics || units[unitIndex].topics || []).filter((_, index) => index !== topicIndex) }) }
  function moveUnit(unitIndex, direction){ const target = unitIndex + direction; if (target < 0 || target >= units.length) return; const next = [...units]; [next[unitIndex], next[target]] = [next[target], next[unitIndex]]; setSyllabusDocument((current) => ({ ...current, structured_json: { ...syllabus, Units: next } })) }
  async function saveEditor(){
    setEditorSaving(true); setError(''); setSuccess('')
    try {
      if (subject) { const response = await api.put(`/subjects/${subject.id}`, { ...subjectForm, credits: Number(subjectForm.credits) }); setSubject(response.data) }
      if (syllabusDocument) await api.put(`/documents/${syllabusDocument.id}`, { structured_json: syllabus })
      setSuccess('All changes saved. Updates are now visible in the student app.')
    } catch (err) { setError(err?.response?.data?.detail || 'Failed to save subject changes.') } finally { setEditorSaving(false) }
  }
  async function openCopy(){
    try {
      const schools = (await api.get('/schools/')).data || []
      const destinations = []
      for (const school of schools) {
        const departments = (await api.get(`/schools/${school.id}/departments`)).data || []
        for (const destinationDepartment of departments) {
          if (destinationDepartment.id === departmentId) continue
          const semesters = (await api.get('/semesters/', { params: { department_id: destinationDepartment.id } })).data || []
          if (semesters.length) destinations.push({ department: destinationDepartment, semesters, semesterId: semesters[0].id, selected: false })
        }
      }
      setCopyDestinations(destinations); setCopyOpen(true)
    } catch (err) { setError(err?.response?.data?.detail || 'Failed to load copy destinations.') }
  }
  useEffect(() => {
    function handleCopyButton(event){
      if (event.target.closest('button')?.textContent?.trim() === 'Copy Subject' && subject) openCopy()
    }
    document.addEventListener('click', handleCopyButton)
    return () => document.removeEventListener('click', handleCopyButton)
  }, [subject, departmentId])
  async function copySubject(event){
    event.preventDefault()
    const destinations = copyDestinations.filter((item) => item.selected).map((item) => ({ department_id: item.department.id, semester_id: item.semesterId }))
    if (!destinations.length) { setError('Select a destination department and semester.'); return }
    setEditorSaving(true); setError('')
    try { await api.post('/subjects/bulk-copy', { source_subject_ids: [subject.id], destinations }); setCopyOpen(false); setSuccess('Subject copied successfully.') }
    catch (err) { setError(err?.response?.data?.detail || 'Failed to copy subject.') }
    finally { setEditorSaving(false) }
  }
  async function addSubject(event){
    event.preventDefault()
    if (!selectedSemester || !newSubject.name.trim() || !newSubject.code.trim()) return
    setEditorSaving(true); setError(''); setSuccess('')
    try {
      const response = await api.post('/subjects/', { ...newSubject, name: newSubject.name.trim(), code: newSubject.code.trim().toUpperCase(), credits: 0, faculty_name: '', subject_type: 'theory', school_id: department.school_id, department_id: department.id, semester_id: selectedSemester.id, is_active: true })
      setSemesters((current) => current.map((semester) => semester.id === selectedSemester.id ? { ...semester, subjects: [...semester.subjects, response.data] } : semester))
      setSelectedSubjectId(response.data.id); setNewSubject({ name: '', code: '', description: '' }); setAddSubjectOpen(false); setSuccess('Subject created successfully.')
    } catch (err) { setError(err?.response?.data?.detail || 'Failed to create subject.') }
    finally { setEditorSaving(false) }
  }
  async function addSemester(event){
    const semesterNumber = typeof event === 'string' ? event : newSemesterNumber
    if (event?.preventDefault) event.preventDefault()
    const numericSemester = Number(semesterNumber)
    if (!department || !semesterNumber || !Number.isInteger(numericSemester) || numericSemester < 1) {
      setError('Enter a valid semester number, such as 1, 2, or 3.')
      return
    }
    if (semesters.some((semester) => Number(semester.semester_number) === numericSemester)) {
      setError(`Semester ${numericSemester} already exists in this department.`)
      return
    }
    setEditorSaving(true); setError(''); setSuccess('')
    try {
      const response = await api.post('/semesters/', { department_id: department.id, semester_number: numericSemester, academic_year: '', description: '', is_active: true })
      const created = { ...response.data, subjects: [] }
      setSemesters((current) => [...current, created].sort((first, second) => first.semester_number - second.semester_number))
      setNewSemesterNumber(''); setAddSemesterOpen(false); setSuccess('Semester created successfully.')
    } catch (err) { setError(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to create semester.') }
    finally { setEditorSaving(false) }
  }
  async function deleteSemester(semester){
    if (!window.confirm(`Delete Semester ${semester.semester_number}? This may delete its subjects and content.`)) return
    setEditorSaving(true); setError(''); setSuccess('')
    try {
      const preview = await api.delete(`/semesters/${semester.id}`, { params: { confirm: false } })
      if (preview.data?.status === 'warning' && !window.confirm(`${preview.data.message} Continue deleting it?`)) return
      await api.delete(`/semesters/${semester.id}`, { params: { confirm: true } })
      const remaining = semesters.filter((item) => item.id !== semester.id)
      setSemesters(remaining); setSelectedSubjectId(''); setSuccess(`Semester ${semester.semester_number} deleted successfully.`)
    } catch (err) {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail
      setError(status === 401 || status === 403 ? 'You are not authorized to delete semesters. Sign in again with an admin account.' : detail || 'Failed to delete semester.')
    }
    finally { setEditorSaving(false) }
  }
  async function deleteSelectedSubject(){
    if (!subject || !window.confirm(`Delete ${subject.name}? Linked syllabus and documents may also be deleted.`)) return
    setEditorSaving(true); setError(''); setSuccess('')
    try {
      const preview = await api.delete(`/subjects/${subject.id}`, { params: { confirm: false } })
      if (preview.data?.status === 'warning' && !window.confirm(preview.data.message + ' Continue deleting it?')) return
      await api.delete(`/subjects/${subject.id}`, { params: { confirm: true } })
      setSemesters((current) => current.map((semester) => ({ ...semester, subjects: semester.subjects.filter((item) => item.id !== subject.id) })))
      setSelectedSubjectId(''); setSubject(null); setSyllabusDocument(null); setSuccess('Subject deleted successfully.')
    } catch (err) { setError(err?.response?.data?.detail || 'Failed to delete subject.') }
    finally { setEditorSaving(false) }
  }
  async function shiftSelectedSubject(){
    if (!subject) return
    const targetNumber = window.prompt('Move subject to semester number:')
    const targetSemester = semesters.find((semester) => Number(semester.semester_number) === Number(targetNumber))
    if (!targetSemester || targetSemester.id === subject.semester_id) { setError('Choose another existing semester in this department.'); return }
    setEditorSaving(true); setError('')
    try {
      const response = await api.put(`/subjects/${subject.id}`, { semester_id: targetSemester.id })
      setSemesters((current) => current.map((semester) => semester.id === subject.semester_id ? { ...semester, subjects: semester.subjects.filter((item) => item.id !== subject.id) } : semester.id === targetSemester.id ? { ...semester, subjects: [...semester.subjects, { ...subject, ...response.data }] } : semester))
      setSelectedSubjectId(''); setSubject(null); setSyllabusDocument(null); setSuccess(`Subject moved to Semester ${targetSemester.semester_number}.`)
    } catch (err) { setError(err?.response?.data?.detail || 'Failed to shift subject.') }
    finally { setEditorSaving(false) }
  }
  async function saveDepartment(event){
    event.preventDefault(); setSaving(true); setError('')
    try {
      const response = await api.put(`/schools/${department.school_id}/departments/${department.id}`, { ...editForm, name: editForm.name.trim(), code: editForm.code.trim().toUpperCase(), duration_years: editForm.duration_years ? Number(editForm.duration_years) : null, total_semesters: editForm.total_semesters ? Number(editForm.total_semesters) : null })
      setDepartment((current) => ({ ...current, ...response.data })); setEditing(false)
    } catch (err) { setError(err?.response?.data?.detail || 'Failed to update department.') } finally { setSaving(false) }
  }
  return <div className="page department-workspace-page">
    <div className="workspace-breadcrumb"><Link className="text-link" to="/subjects">Departments</Link><span>›</span><span>{departmentName}</span><span>›</span><strong>Content Workspace</strong></div>
    <div className="workspace-topbar"><div><span className="eyebrow">{department?.school?.name || 'School'}</span><h1>{departmentName}</h1><div className="workspace-meta"><span>Department workspace</span><span>{semesters.length} Semesters</span><span>{subjectCount} Subjects</span></div></div><div className="pill-box"><button className="btn" type="button" onClick={() => setEditing(true)} disabled={!department}>Edit department</button><span className="pill accent">Published structure</span></div></div>
    {error && <div className="error">{error}</div>}
    {success && <div className="success">{success}</div>}
    {editing && <form className="card department-edit-form" onSubmit={saveDepartment}><div className="form-grid"><label>Department name<input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} required /></label><label>Department code<input value={editForm.code} onChange={(event) => setEditForm({ ...editForm, code: event.target.value.toUpperCase() })} required /></label><label>Duration (years)<input type="number" min="1" value={editForm.duration_years} onChange={(event) => setEditForm({ ...editForm, duration_years: event.target.value })} /></label><label>Total semesters<input type="number" min="1" value={editForm.total_semesters} onChange={(event) => setEditForm({ ...editForm, total_semesters: event.target.value })} /></label></div><label className="full-width-field">Description<textarea rows="4" value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} /></label><div className="modal-actions"><button className="btn" type="button" onClick={() => setEditing(false)}>Cancel</button><button className="btn primary" disabled={saving}>{saving ? 'Saving...' : 'Save department'}</button></div></form>}
    <div className="academic-shell">
      <aside className="academic-sidebar">
        <div className="academic-card department-summary"><div className="department-mark">{departmentName.charAt(0)}</div><div><strong>Department of {departmentName}</strong><small>{department?.code || 'Department code'}</small></div><div className="summary-stats"><span><b>{semesters.length}</b> Semesters</span><span><b>{subjectCount}</b> Subjects</span></div></div>
        <div className="academic-card semester-navigation"><div className="panel-heading"><strong>Semesters</strong><span>{semesters.length}</span></div>{semesters.map((semester) => <div className="semester-nav-row" key={semester.id}><button className={`semester-nav-item ${selectedSemester?.id === semester.id ? 'active' : ''}`} type="button" onClick={() => setOpen(Object.fromEntries(semesters.map((item) => [item.id, item.id === semester.id])))}><span>Semester {semester.semester_number}</span><small>{semester.subjects.length} Subjects ›</small></button><button className="semester-delete-button" type="button" title={`Delete Semester ${semester.semester_number}`} onClick={() => deleteSemester(semester)}>×</button></div>)}</div>
        <button className="btn primary workspace-add-semester" type="button" onClick={() => { const semesterNumber = window.prompt('Enter semester number'); if (semesterNumber) addSemester(semesterNumber) }} disabled={!department}>+ Add Semester</button>
        <button className="btn workspace-add-semester" type="button" onClick={() => setAddSubjectOpen(true)} disabled={!selectedSemester}>+ Add Subject</button>
        <button className="btn workspace-add-semester" type="button" onClick={(event) => { event.stopPropagation(); openCopy() }} disabled={!subject}>Copy Subject</button>
        <button className="btn workspace-add-semester" type="button" onClick={shiftSelectedSubject} disabled={!subject}>Shift Subject</button>
        <button className="btn danger workspace-add-semester" type="button" onClick={deleteSelectedSubject} disabled={!subject}>Delete Subject</button>
      </aside>
      <main className="academic-main academic-card"><div className="content-header"><div><span className="eyebrow">Semester {selectedSemester?.semester_number || '...'}</span><h2>Subjects</h2><p>Select a subject to edit its complete content below.</p></div><div className="pill-box"><button className="btn" type="button">Copy Subject</button><button className="btn primary" type="button" onClick={saveEditor} disabled={editorSaving}>{editorSaving ? 'Saving...' : 'Save Changes'}</button></div></div><div className="subject-directory">{selectedSemester?.subjects.map((item) => <button className={`subject-directory-row ${selectedSubjectId === item.id ? 'selected' : ''}`} type="button" onClick={() => setSelectedSubjectId(item.id)} key={item.id}><span className="subject-directory-icon">⠿</span><span><strong>{item.name}</strong><small>{item.code || 'No code'}</small></span><span className="subject-directory-arrow">›</span></button>)}{!selectedSemester?.subjects.length && <div className="empty-state">No subjects in this semester.</div>}</div>{subject && <section className="subject-editor-inline"><div className="subject-editor-heading"><div><h2>{subject.name}</h2><div className="workspace-meta"><span>{subject.code}</span><span>{subject.subject_type || 'Theory'}</span><span>{units.length} Units</span><span>{units.reduce((total, unit) => total + (unit.Topics || unit.topics || []).length, 0)} Topics</span></div></div><span className="pill success-pill">Active</span></div><div className="inline-subject-form"><label>Subject name<input value={subjectForm.name} onChange={(event) => setSubjectForm({ ...subjectForm, name: event.target.value })} /></label><label>Code<input value={subjectForm.code} onChange={(event) => setSubjectForm({ ...subjectForm, code: event.target.value })} /></label><label>Credits<input type="number" min="0" value={subjectForm.credits} onChange={(event) => setSubjectForm({ ...subjectForm, credits: event.target.value })} /></label></div><nav className="inline-editor-tabs">{['Overview', 'Syllabus / Units', 'PYQs', 'Notes', 'Videos', 'Preview'].map((tab) => <button type="button" className={editorTab === tab ? 'active' : ''} onClick={() => setEditorTab(tab)} key={tab}>{tab}</button>)}</nav>{editorTab === 'Syllabus / Units' && <div className="syllabus-editor"><div className="syllabus-actions"><strong>Syllabus / Content</strong><div><button className="btn" type="button" onClick={addUnit}>+ Add Unit</button><button className="btn" type="button" onClick={() => units.length && moveUnit(units.length - 1, -1)}>Reorder Units</button></div></div>{units.map((unit, unitIndex) => <article className="inline-unit" key={unitIndex}><div className="inline-unit-heading"><span className="unit-number">{unitIndex + 1}</span><input value={unit['Unit Name'] || unit.name || ''} onChange={(event) => updateUnit(unitIndex, { 'Unit Name': event.target.value })} /><button className="text-button" type="button" onClick={() => moveUnit(unitIndex, -1)}>↑</button><button className="text-button" type="button" onClick={() => moveUnit(unitIndex, 1)}>↓</button><button className="text-button danger" type="button" onClick={() => deleteUnit(unitIndex)}>Delete</button></div><div className="inline-topics">{(unit.Topics || unit.topics || []).map((topic, topicIndex) => <div className="inline-topic" key={topicIndex}><span>⠿</span><input value={typeof topic === 'string' ? topic : topic?.Topic || topic?.name || ''} onChange={(event) => updateTopic(unitIndex, topicIndex, event.target.value)} /><button className="text-button danger" type="button" onClick={() => deleteTopic(unitIndex, topicIndex)}>×</button></div>)}<button className="text-button add-topic" type="button" onClick={() => addTopic(unitIndex)}>+ Add Topic</button></div></article>)}{!units.length && <div className="empty-state">No units yet. Add a unit to start building this syllabus.</div>}</div>}{editorTab === 'Overview' && <label className="inline-description">Description<textarea rows="5" value={subjectForm.description} onChange={(event) => setSubjectForm({ ...subjectForm, description: event.target.value })} /></label>}{['PYQs', 'Notes', 'Videos'].includes(editorTab) && <div className="editor-placeholder">{editorTab} connected to this subject. Add or upload content from the Documents tools.</div>}{editorTab === 'Preview' && <div className="preview-wrap"><div className="phone-preview"><div className="phone-status">9:41 <span>ExamBuddy</span></div><h2>{subject.name}</h2><p>{subject.code} · Credits: {subjectForm.credits}</p>{units.map((unit, index) => <div className="phone-unit" key={index}><strong>Unit {index + 1}: {unit['Unit Name'] || unit.name}</strong>{(unit.Topics || unit.topics || []).slice(0, 3).map((topic, topicIndex) => <div key={topicIndex}>• {typeof topic === 'string' ? topic : topic?.Topic || topic?.name}</div>)}</div>)}</div></div>}</section>}</main>
      <aside className="academic-preview academic-card"><div className="panel-heading"><strong>Department preview</strong><span className="pill accent">Mobile</span></div><div className="phone-preview compact-phone"><div className="phone-status">9:41 <span>ExamBuddy</span></div><div className="phone-header"><strong>{departmentName}</strong></div><h2>Semester {selectedSemester?.semester_number || 1}</h2><p>{selectedSemester?.subjects.length || 0} subjects available</p>{selectedSemester?.subjects.slice(0, 4).map((subject) => <div className="phone-unit" key={subject.id}><strong>{subject.name}</strong><div>{subject.code || 'Subject content'}</div></div>)}<footer>Live app structure</footer></div></aside>
    </div>
    {copyOpen && <div className="modal-backdrop" onClick={() => setCopyOpen(false)}><div className="modal-card" onClick={(event) => event.stopPropagation()}><div className="modal-header"><h3>Copy {subject?.name}</h3><button className="text-button" type="button" onClick={() => setCopyOpen(false)}>Close</button></div><form className="modal-form" onSubmit={copySubject}><p className="modal-hint">Choose another department and semester.</p>{copyDestinations.map((destination, index) => <label className="copy-destination-row" key={destination.department.id}><span><input type="checkbox" checked={destination.selected} onChange={(event) => setCopyDestinations((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, selected: event.target.checked } : item))} /> {destination.department.name}</span><select value={destination.semesterId} disabled={!destination.selected} onChange={(event) => setCopyDestinations((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, semesterId: event.target.value } : item))}>{destination.semesters.map((semester) => <option key={semester.id} value={semester.id}>Semester {semester.semester_number}</option>)}</select></label>)}{!copyDestinations.length && <div className="empty-state">No other departments with semesters found.</div>}<div className="modal-actions"><button className="btn" type="button" onClick={() => setCopyOpen(false)}>Cancel</button><button className="btn primary" disabled={editorSaving || !copyDestinations.length}>Copy subject</button></div></form></div></div>}
    {addSubjectOpen && <div className="modal-backdrop" onClick={() => setAddSubjectOpen(false)}><div className="modal-card" onClick={(event) => event.stopPropagation()}><div className="modal-header"><h3>Add subject to Semester {selectedSemester?.semester_number}</h3><button className="text-button" type="button" onClick={() => setAddSubjectOpen(false)}>Close</button></div><form className="modal-form" onSubmit={addSubject}><label>Subject name<input value={newSubject.name} onChange={(event) => setNewSubject({ ...newSubject, name: event.target.value })} required /></label><label>Subject code<input value={newSubject.code} onChange={(event) => setNewSubject({ ...newSubject, code: event.target.value })} required /></label><label>Description<textarea rows="4" value={newSubject.description} onChange={(event) => setNewSubject({ ...newSubject, description: event.target.value })} /></label><div className="modal-actions"><button className="btn" type="button" onClick={() => setAddSubjectOpen(false)}>Cancel</button><button className="btn primary" disabled={editorSaving}>Create subject</button></div></form></div></div>}
  </div>
}
