import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'

export default function SubjectsPage(){
  const [departments, setDepartments] = useState([])
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(() => sessionStorage.getItem('subj_filter_dept') || '')
  const [selectedSemesterId, setSelectedSemesterId] = useState(() => sessionStorage.getItem('subj_filter_sem') || '')
  const [modalState, setModalState] = useState(null)
  const [semesterModalOpen, setSemesterModalOpen] = useState(false)
  const [formState, setFormState] = useState({ name: '', code: '', description: '', content: '' })
  const [semesterForm, setSemesterForm] = useState({ department_id: '', semester_number: '', academic_year: '', description: '' })
  const [shiftTargetId, setShiftTargetId] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteSubjectState, setDeleteSubjectState] = useState(null)

  async function loadData(){
    setLoading(true)
    setError('')
    try {
      const schoolsRes = await api.get('/schools/')
      const schools = schoolsRes.data || []

      const deptRows = []
      for (const school of schools) {
        const departmentsRes = await api.get(`/schools/${school.id}/departments/`)
        const departmentsForSchool = departmentsRes.data || []
        deptRows.push(...departmentsForSchool.map((dept) => ({ ...dept, schoolName: school.name, school_id: dept.school_id || school.id, semesters: [] })))
      }

      setDepartments(deptRows)
      if (deptRows.length) {
        const firstDept = deptRows[0]
        setSelectedDepartmentId((current) => current || firstDept.id)
        setSemesterForm((prev) => ({ ...prev, department_id: firstDept.id }))
      } else {
        setSelectedDepartmentId('')
        setSelectedSemesterId('')
      }
    } catch (err) {
      console.error('Failed to load department data', err)
      setError(err?.response?.data?.detail || 'Failed to load departments and subjects')
    } finally {
      setLoading(false)
    }
  }

  async function loadDepartmentData(departmentId){
    setLoading(true)
    setError('')
    try {
      const [semestersRes, subjectsRes] = await Promise.all([
        api.get('/semesters/', { params: { department_id: departmentId } }),
        api.get('/subjects/', { params: { department_id: departmentId } })
      ])

      const semesters = (semestersRes.data || []).map((sem) => ({
        id: sem.id,
        name: `Semester ${sem.semester_number}`,
        semester_number: sem.semester_number,
        academic_year: sem.academic_year || '',
        description: sem.description || '',
        subjects: []
      }))

      const subjects = (subjectsRes.data || []).map((subject) => ({
        ...subject,
        description: subject.description || '',
        content: subject.description || '',
        pdfName: '',
        pdfUrl: ''
      }))

      const subjectsBySemester = new Map(semesters.map((sem) => [sem.id, []]))
      subjects.forEach((subject) => {
        if (subject.semester_id && subjectsBySemester.has(subject.semester_id)) {
          subjectsBySemester.get(subject.semester_id).push(subject)
        }
      })

      setDepartments((prev) => prev.map((dept) => {
        if (dept.id !== departmentId) return dept
        return {
          ...dept,
          semesters: semesters.map((sem) => ({ ...sem, subjects: subjectsBySemester.get(sem.id) || [] }))
        }
      }))
    } catch (err) {
      console.error('Failed to load department details', err)
      setError(err?.response?.data?.detail || 'Failed to load semesters and subjects for this department')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedDepartmentId) {
      loadDepartmentData(selectedDepartmentId)
    }
  }, [selectedDepartmentId])

  useEffect(() => {
    sessionStorage.setItem('subj_filter_dept', selectedDepartmentId)
    sessionStorage.setItem('subj_filter_sem', selectedSemesterId)
  }, [selectedDepartmentId, selectedSemesterId])

  useEffect(() => {
    if (!departments.length) {
      setSelectedDepartmentId('')
      setSelectedSemesterId('')
      return
    }

    if (!selectedDepartmentId || !departments.some((dept) => dept.id === selectedDepartmentId)) {
      setSelectedDepartmentId(departments[0].id)
      return
    }
  }, [departments, selectedDepartmentId])

  const selectedDepartment = useMemo(() => {
    return departments.find((dept) => dept.id === selectedDepartmentId) || departments[0] || null
  }, [departments, selectedDepartmentId])

  const semestersToRender = useMemo(() => {
    if (!selectedDepartment) return []
    if (selectedSemesterId) {
      return selectedDepartment.semesters.filter((sem) => sem.id === selectedSemesterId)
    }
    return selectedDepartment.semesters || []
  }, [selectedDepartment, selectedSemesterId])

  const selectedSemester = useMemo(() => {
    if (!selectedDepartment) return null
    return selectedDepartment.semesters.find((semester) => semester.id === selectedSemesterId) || selectedDepartment.semesters[0] || null
  }, [selectedDepartment, selectedSemesterId])

  const hasSemesters = Boolean(selectedDepartment && selectedDepartment.semesters.length > 0)

  const subjectCount = useMemo(() => {
    return departments.reduce((total, department) => total + department.semesters.reduce((sum, semester) => sum + semester.subjects.length, 0), 0)
  }, [departments])

  function closeModal(){
    setModalState(null)
    setFormState({ name: '', code: '', description: '', content: '' })
    setShiftTargetId('')
    setPdfFile(null)
  }

  function openAddModal(){
    setModalState({ type: 'add' })
    setFormState({ name: '', code: '', description: '', content: '' })
    setShiftTargetId('')
    setPdfFile(null)
  }

  function openEditModal(subject){
    setModalState({ type: 'edit', subjectId: subject.id })
    setFormState({
      name: subject.name,
      code: subject.code,
      description: subject.description,
      content: subject.content
    })
    setShiftTargetId('')
    setPdfFile(null)
  }

  function openShiftModal(subject){
    const availableSemesters = selectedDepartment?.semesters.filter((semester) => semester.id !== subject.semester_id) || []
    setModalState({ type: 'shift', subjectId: subject.id })
    setShiftTargetId(availableSemesters[0]?.id || '')
    setPdfFile(null)
  }

  function openContentModal(subject){
    setModalState({ type: 'content', subjectId: subject.id })
    setFormState({
      name: subject.name,
      code: subject.code,
      description: subject.description,
      content: subject.content
    })
    setShiftTargetId('')
    setPdfFile(null)
  }

  function openPdfModal(subject){
    setModalState({ type: 'pdf', subjectId: subject.id })
    setFormState({
      name: subject.name,
      code: subject.code,
      description: subject.description,
      content: subject.content
    })
    setShiftTargetId('')
    setPdfFile(null)
  }

  async function openDeleteModal(subject) {
    setDeleteSubjectState({ subject, warningInfo: null, loading: true, error: '' })
    try {
      const res = await api.delete(`/subjects/${subject.id}`, { params: { confirm: false } })
      if (res.data?.status === 'warning') {
        setDeleteSubjectState({
          subject,
          warningInfo: res.data,
          loading: false,
          error: ''
        })
      } else {
        setDeleteSubjectState({
          subject,
          warningInfo: { status: 'safe', message: 'No documents are linked to this subject.' },
          loading: false,
          error: ''
        })
      }
    } catch (err) {
      console.error(err)
      setDeleteSubjectState({
        subject,
        warningInfo: null,
        loading: false,
        error: err?.response?.data?.detail || 'Failed to check subject contents before deletion.'
      })
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteSubjectState?.subject) return
    const { subject } = deleteSubjectState
    setDeleteSubjectState(prev => ({ ...prev, loading: true, error: '' }))
    try {
      await api.delete(`/subjects/${subject.id}`, { params: { confirm: true } })
      await loadDepartmentData(selectedDepartmentId)
      setDeleteSubjectState(null)
    } catch (err) {
      console.error(err)
      setDeleteSubjectState(prev => ({
        ...prev,
        loading: false,
        error: err?.response?.data?.detail || 'Failed to delete subject.'
      }))
    }
  }

  async function handleSaveSubject(event){
    event.preventDefault()
    const trimmedName = formState.name.trim()
    const trimmedCode = formState.code.trim()
    const trimmedDescription = (formState.description || '').trim() || (formState.content || '').trim()

    // Determine destination semester
    const targetSemId = selectedSemesterId || selectedDepartment?.semesters[0]?.id
    if (!selectedDepartment || !targetSemId) {
      setError('Select a department and semester before saving a subject.')
      return
    }
    if (!trimmedName) {
      setError('Subject name is required before saving.')
      return
    }
    if (!trimmedCode) {
      setError('Subject code is required before saving.')
      return
    }

    setSaving(true)
    setError('')
    try {
      if (modalState?.type === 'edit' && modalState.subjectId) {
        await persistSubjectUpdate(modalState.subjectId, {
          name: trimmedName,
          code: trimmedCode,
          description: trimmedDescription
        })
      } else {
        const response = await api.post('/subjects/', {
          name: trimmedName,
          code: trimmedCode,
          description: trimmedDescription,
          credits: 0,
          faculty_name: '',
          subject_type: 'theory',
          school_id: selectedDepartment.school_id,
          department_id: selectedDepartment.id,
          semester_id: targetSemId,
          is_active: true
        })

        if (response?.data?.id) {
          await loadDepartmentData(selectedDepartment.id)
        }
      }
      closeModal()
    } catch (err) {
      const backendDetail = err?.response?.data?.detail || err?.response?.data?.message
      const friendlyMessage = backendDetail || 'The subject could not be saved because the data conflicts with an existing subject in this department/semester.'
      console.error('Failed to save subject', err)
      setError(friendlyMessage)
    } finally {
      setSaving(false)
    }
  }

  async function handleShiftSubject(event){
    event.preventDefault()
    if (!modalState?.subjectId || !shiftTargetId) return

    const currentDepartment = departments.find((dept) => dept.id === selectedDepartmentId)
    if (!currentDepartment) return

    let sourceSemester = null
    let subjectToMove = null

    for (const semester of currentDepartment.semesters) {
      const found = semester.subjects.find((subject) => subject.id === modalState.subjectId)
      if (found) {
        sourceSemester = semester
        subjectToMove = found
        break
      }
    }

    const targetSemester = currentDepartment.semesters.find((semester) => semester.id === shiftTargetId)
    if (!sourceSemester || !targetSemester || !subjectToMove) return

    setSaving(true)
    setError('')
    try {
      await api.put(`/subjects/${modalState.subjectId}`, {
        semester_id: shiftTargetId
      })

      setDepartments((prev) => prev.map((dept) => {
        if (dept.id !== selectedDepartmentId) return dept
        return {
          ...dept,
          semesters: dept.semesters.map((semester) => {
            if (semester.id === sourceSemester.id) {
              return {
                ...semester,
                subjects: semester.subjects.filter((subject) => subject.id !== modalState.subjectId)
              }
            }
            if (semester.id === targetSemester.id) {
              return {
                ...semester,
                subjects: [...semester.subjects, { ...subjectToMove, semester_id: shiftTargetId }]
              }
            }
            return semester
          })
        }
      }))
      closeModal()
    } catch (err) {
      console.error('Failed to shift subject', err)
      setError(err?.response?.data?.detail || 'Could not shift subject')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateSemester(event){
    event.preventDefault()
    if (!semesterForm.department_id || !semesterForm.semester_number) return

    setSaving(true)
    setError('')
    try {
      const res = await api.post('/semesters/', {
        department_id: semesterForm.department_id,
        semester_number: Number(semesterForm.semester_number),
        academic_year: semesterForm.academic_year.trim(),
        description: semesterForm.description.trim(),
        is_active: true
      })
      const createdSemester = res.data
      await loadData()
      setSelectedDepartmentId(createdSemester.department_id)
      setSelectedSemesterId(createdSemester.id)
      setSemesterModalOpen(false)
      setSemesterForm({ department_id: selectedDepartment?.id || '', semester_number: '', academic_year: '', description: '' })
    } catch (err) {
      console.error('Failed to create semester', err)
      setError(err?.response?.data?.detail || 'Could not create semester')
    } finally {
      setSaving(false)
    }
  }

  async function persistSubjectUpdate(subjectId, patch){
    const response = await api.put(`/subjects/${subjectId}`, patch)
    const updatedSubject = response.data

    setDepartments((prev) => prev.map((dept) => {
      if (dept.id !== selectedDepartmentId) return dept
      return {
        ...dept,
        semesters: dept.semesters.map((semester) => {
          if (!semester.subjects.some(s => s.id === subjectId)) return semester
          return {
            ...semester,
            subjects: semester.subjects.map((subject) => subject.id === subjectId ? { ...subject, ...updatedSubject } : subject)
          }
        })
      }
    }))
  }

  function updateLocalSubject(subjectId, patch){
    setDepartments((prev) => prev.map((dept) => {
      if (dept.id !== selectedDepartmentId) return dept
      return {
        ...dept,
        semesters: dept.semesters.map((semester) => {
          if (!semester.subjects.some(s => s.id === subjectId)) return semester
          return {
            ...semester,
            subjects: semester.subjects.map((subject) => subject.id === subjectId ? { ...subject, ...patch } : subject)
          }
        })
      }
    }))
  }

  function handleContentSave(event){
    event.preventDefault()
    if (!modalState?.subjectId) return
    updateLocalSubject(modalState.subjectId, { content: formState.content.trim() })
    closeModal()
  }

  function handlePdfSave(event){
    event.preventDefault()
    if (!modalState?.subjectId || !pdfFile) return
    const objectUrl = typeof window !== 'undefined' ? window.URL.createObjectURL(pdfFile) : ''
    updateLocalSubject(modalState.subjectId, {
      pdfName: pdfFile.name,
      pdfUrl: objectUrl
    })
    closeModal()
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Department & Semester Subject Manager</h1>
          <p>Manage departments, semesters, and subjects from one live admin view.</p>
        </div>
        <div className="pill-box">
          <span className="pill">{subjectCount} subjects</span>
          <span className="pill accent">Live backend data</span>
        </div>
      </div>

      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-title">Department</div>
          <div className="stat-card-value">{selectedDepartment?.name || '—'}</div>
          <div className="stat-card-subtitle">Current department scope</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">Semester Filter</div>
          <div className="stat-card-value">{selectedSemesterId ? `Semester ${selectedDepartment?.semesters.find(s=>s.id === selectedSemesterId)?.semester_number || ''}` : 'All Semesters'}</div>
          <div className="stat-card-subtitle">Current semester filter</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">Total Subjects Listed</div>
          <div className="stat-card-value">{semestersToRender.reduce((sum, sem) => sum + sem.subjects.length, 0)}</div>
          <div className="stat-card-subtitle">Available in matching scope</div>
        </div>
      </div>

      <div className="subject-shell">
        <aside className="card subject-tree">
          <div className="tree-header">
            <h3>Departments</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" type="button" onClick={() => { setSemesterForm((prev) => ({ ...prev, department_id: selectedDepartment?.id || '' })); setSemesterModalOpen(true) }}>Add semester</button>
              <button className="btn primary" onClick={openAddModal} disabled={!selectedDepartment || !hasSemesters}>{selectedSemester ? 'Add subject' : 'Add subject after semester'}</button>
            </div>
          </div>
          <div className="tree-list">
            {loading ? (
              <div className="empty-state">Loading departments...</div>
            ) : departments.length === 0 ? (
              <div className="empty-state">No departments found yet.</div>
            ) : (
              departments.map((department) => (
                <div key={department.id} className="tree-group">
                  <button className={`tree-toggle ${selectedDepartmentId === department.id ? 'active' : ''}`} onClick={() => setSelectedDepartmentId(department.id)}>
                    <span>{department.name}</span>
                    <small>{department.semesters.reduce((sum, semester) => sum + semester.subjects.length, 0)} subjects</small>
                  </button>
                  <div className="tree-nested">
                    <button className={`tree-node ${!selectedSemesterId && selectedDepartmentId === department.id ? 'active' : ''}`} onClick={() => { setSelectedDepartmentId(department.id); setSelectedSemesterId('') }}>
                      <span>All Semesters</span>
                    </button>
                    {department.semesters.map((semester) => (
                      <button key={semester.id} className={`tree-node ${selectedSemesterId === semester.id && selectedDepartmentId === department.id ? 'active' : ''}`} onClick={() => { setSelectedDepartmentId(department.id); setSelectedSemesterId(semester.id) }}>
                        <span>{semester.name}</span>
                        <small>{semester.subjects.length} subjects</small>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        <section className="card subject-main">
          <div className="section-header">
            <div>
              <h3>{selectedDepartment?.name || 'Choose department'}</h3>
              <p>{selectedSemesterId ? `Viewing ${selectedSemester?.name}` : 'Viewing all semesters'}</p>
            </div>
            <div className="inline-controls">
              <label>
                Department
                <select value={selectedDepartmentId} onChange={(event) => setSelectedDepartmentId(event.target.value)}>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Semester
                <select value={selectedSemesterId} onChange={(event) => setSelectedSemesterId(event.target.value)}>
                  <option value="">All Semesters</option>
                  {(selectedDepartment?.semesters || []).map((semester) => (
                    <option key={semester.id} value={semester.id}>{semester.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {semestersToRender.length === 0 ? (
            <div className="empty-state">
              {selectedDepartment
                ? 'This department has no semesters yet. Create one to start adding subjects.'
                : 'Select a department to start managing subjects.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {semestersToRender.map((semester) => (
                <div key={semester.id} className="semester-group-section" style={{ borderBottom: '1px solid #F3F4F6', paddingBottom: 20 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{semester.name}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#6B7280' }}>{semester.subjects.length} subjects</span>
                  </h3>

                  {semester.subjects.length === 0 ? (
                    <div className="empty-state" style={{ padding: '16px' }}>No subjects added to this semester yet.</div>
                  ) : (
                    <div className="subject-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                      {semester.subjects.map((subject) => (
                        <article key={subject.id} className="subject-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div className="subject-card-header">
                            <div>
                              <h4>
                                <Link to={`/subjects/${subject.id}`} style={{ color: '#2563EB', textDecoration: 'none' }} className="subject-link-title">
                                  {subject.name}
                                </Link>
                              </h4>
                              <p>{subject.description || 'No description provided.'}</p>
                            </div>
                            <div className="subject-code">{subject.code}</div>
                          </div>
                          <div className="subject-card-body" style={{ marginTop: 12 }}>
                            <div className="subject-meta">
                              <span className="meta-pill success">View details & contents</span>
                            </div>
                          </div>
                          <div className="subject-actions" style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            <button className="text-button" type="button" onClick={() => openEditModal(subject)}>Edit</button>
                            <button className="text-button" type="button" onClick={() => openShiftModal(subject)}>Shift</button>
                            <button className="text-button" type="button" onClick={() => openDeleteModal(subject)} style={{ color: '#DC2626' }}>Delete</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {semesterModalOpen && (
        <div className="modal-backdrop" onClick={() => setSemesterModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Add semester</h3>
              <button className="text-button" onClick={() => setSemesterModalOpen(false)}>Close</button>
            </div>
            <form className="modal-form" onSubmit={handleCreateSemester}>
              <label>
                Department
                <select value={semesterForm.department_id} onChange={(event) => setSemesterForm((prev) => ({ ...prev, department_id: event.target.value }))}>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
              </label>
              <div className="form-grid">
                <label>
                  Semester number
                  <input type="number" min="1" value={semesterForm.semester_number} onChange={(event) => setSemesterForm((prev) => ({ ...prev, semester_number: event.target.value }))} required />
                </label>
                <label>
                  Academic year
                  <input value={semesterForm.academic_year} onChange={(event) => setSemesterForm((prev) => ({ ...prev, academic_year: event.target.value }))} placeholder="2026-2027" />
                </label>
              </div>
              <label>
                Description
                <textarea value={semesterForm.description} onChange={(event) => setSemesterForm((prev) => ({ ...prev, description: event.target.value }))} rows="4" />
              </label>
              <div className="modal-actions">
                <button className="btn" type="button" onClick={() => setSemesterModalOpen(false)}>Cancel</button>
                <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create semester'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteSubjectState && (
        <div className="modal-backdrop" onClick={() => setDeleteSubjectState(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: '#DC2626' }}>Confirm Subject Deletion</h3>
              <button className="text-button" onClick={() => setDeleteSubjectState(null)}>Close</button>
            </div>
            <div className="modal-body" style={{ padding: '12px 0' }}>
              <p>Are you sure you want to delete the following subject?</p>
              <div style={{ backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, margin: '12px 0', border: '1px solid #E5E7EB' }}>
                <strong>Name:</strong> {deleteSubjectState.subject.name}<br />
                <strong>Code:</strong> {deleteSubjectState.subject.code}<br />
                <strong>Department:</strong> {selectedDepartment?.name}<br />
              </div>

              {deleteSubjectState.loading ? (
                <p>Checking subject dependencies...</p>
              ) : deleteSubjectState.error ? (
                <div className="error">{deleteSubjectState.error}</div>
              ) : deleteSubjectState.warningInfo ? (
                <div style={{ padding: 12, backgroundColor: deleteSubjectState.warningInfo.status === 'warning' ? '#FEF2F2' : '#EFF6FF', borderRadius: 8, border: '1px solid', borderColor: deleteSubjectState.warningInfo.status === 'warning' ? '#FEE2E2' : '#BFDBFE', margin: '12px 0' }}>
                  <h4 style={{ color: deleteSubjectState.warningInfo.status === 'warning' ? '#991B1B' : '#1E40AF', marginTop: 0, marginBottom: 6 }}>
                    {deleteSubjectState.warningInfo.status === 'warning' ? '⚠️ Warning: Linked Content Found' : 'ℹ️ Clean Deletion'}
                  </h4>
                  <p style={{ fontSize: 14, color: deleteSubjectState.warningInfo.status === 'warning' ? '#7F1D1D' : '#1E3A8A', margin: 0 }}>
                    {deleteSubjectState.warningInfo.message}
                  </p>
                  {deleteSubjectState.warningInfo.status === 'warning' && (
                    <div style={{ marginTop: 10, fontSize: 13, color: '#7F1D1D' }}>
                      <strong>Documents to be deleted (Syllabus, PYQs, Notes):</strong>
                      <ul style={{ paddingLeft: 20, marginTop: 4, marginBottom: 0 }}>
                        {deleteSubjectState.warningInfo.documents.map(d => (
                          <li key={d.id}>{d.title} ({d.type})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className="modal-actions" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn" type="button" onClick={() => setDeleteSubjectState(null)} disabled={deleteSubjectState.loading}>Cancel</button>
              <button className="btn" type="button" onClick={handleDeleteConfirm} disabled={deleteSubjectState.loading} style={{ backgroundColor: '#DC2626', color: '#fff' }}>
                {deleteSubjectState.loading ? 'Deleting...' : 'Yes, Delete Subject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalState && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalState.type === 'add' && 'Add new subject'}
                {modalState.type === 'edit' && 'Edit subject'}
                {modalState.type === 'shift' && 'Shift subject'}
                {modalState.type === 'content' && 'Add content'}
                {modalState.type === 'pdf' && 'Upload PDF'}
              </h3>
              <button className="text-button" onClick={closeModal}>Close</button>
            </div>

            {modalState.type === 'shift' ? (
              <form className="modal-form" onSubmit={handleShiftSubject}>
                <label>
                  Move to another semester
                  <select value={shiftTargetId} onChange={(event) => setShiftTargetId(event.target.value)}>
                    {(selectedDepartment?.semesters || []).filter((semester) => semester.id !== selectedSemesterId).map((semester) => (
                      <option key={semester.id} value={semester.id}>{semester.name}</option>
                    ))}
                  </select>
                </label>
                <div className="modal-actions">
                  <button className="btn" type="button" onClick={closeModal}>Cancel</button>
                  <button className="btn primary" type="submit">Move subject</button>
                </div>
              </form>
            ) : null}

            {modalState.type === 'content' ? (
              <form className="modal-form" onSubmit={handleContentSave}>
                <label>
                  Subject notes
                  <textarea value={formState.content} onChange={(event) => setFormState((prev) => ({ ...prev, content: event.target.value }))} rows="8" />
                </label>
                <div className="modal-actions">
                  <button className="btn" type="button" onClick={closeModal}>Cancel</button>
                  <button className="btn primary" type="submit">Save content</button>
                </div>
              </form>
            ) : null}

            {modalState.type === 'pdf' ? (
              <form className="modal-form" onSubmit={handlePdfSave}>
                <label>
                  Upload PDF
                  <input type="file" accept="application/pdf" onChange={(event) => setPdfFile(event.target.files?.[0] || null)} />
                </label>
                <p className="modal-hint">The selected file will be attached to this subject and stored in the browser for this admin session.</p>
                <div className="modal-actions">
                  <button className="btn" type="button" onClick={closeModal}>Cancel</button>
                  <button className="btn primary" type="submit">Attach PDF</button>
                </div>
              </form>
            ) : null}

            {(modalState.type === 'add' || modalState.type === 'edit') ? (
              <form className="modal-form" onSubmit={handleSaveSubject}>
                <div className="form-grid">
                  <label>
                    Subject name
                    <input value={formState.name} onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))} required />
                  </label>
                  <label>
                    Subject code
                    <input value={formState.code} onChange={(event) => setFormState((prev) => ({ ...prev, code: event.target.value }))} required />
                  </label>
                </div>
                <label>
                  Description
                  <textarea value={formState.description} onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))} rows="4" />
                </label>
                <div className="modal-actions">
                  <button className="btn" type="button" onClick={closeModal}>Cancel</button>
                  <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save subject'}</button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
