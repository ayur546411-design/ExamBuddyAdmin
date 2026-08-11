import React, { useEffect, useMemo, useState } from 'react'
import api from '../../api/client'

export default function SubjectsPage(){
  const [departments, setDepartments] = useState([])
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')
  const [selectedSemesterId, setSelectedSemesterId] = useState('')
  const [modalState, setModalState] = useState(null)
  const [semesterModalOpen, setSemesterModalOpen] = useState(false)
  const [formState, setFormState] = useState({ name: '', code: '', description: '', content: '' })
  const [semesterForm, setSemesterForm] = useState({ department_id: '', semester_number: '', academic_year: '', description: '' })
  const [shiftTargetId, setShiftTargetId] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
        deptRows.push(...departmentsForSchool.map((dept) => ({ ...dept, schoolName: school.name, school_id: dept.school_id || school.id })))
      }

      const departmentData = await Promise.all(
        deptRows.map(async (dept) => {
          const [semestersRes, subjectsRes] = await Promise.all([
            api.get('/semesters/', { params: { department_id: dept.id } }),
            api.get('/subjects/', { params: { department_id: dept.id } })
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

          return {
            ...dept,
            semesters: semesters.map((sem) => ({ ...sem, subjects: subjectsBySemester.get(sem.id) || [] }))
          }
        })
      )

      setDepartments(departmentData)
      if (departmentData.length) {
        const firstDepartment = departmentData[0]
        setSelectedDepartmentId((current) => current || firstDepartment.id)
        setSelectedSemesterId((current) => current || firstDepartment.semesters?.[0]?.id || '')
        setSemesterForm((prev) => ({ ...prev, department_id: firstDepartment.id }))
      } else {
        setSelectedDepartmentId('')
        setSelectedSemesterId('')
      }
    } catch (err) {
      console.error('Failed to load department data', err)
      setError(err?.response?.data?.detail || 'Failed to load departments, semesters, and subjects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

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

    const currentDepartment = departments.find((dept) => dept.id === selectedDepartmentId)
    if (!currentDepartment) return
    if (!selectedSemesterId || !currentDepartment.semesters.some((semester) => semester.id === selectedSemesterId)) {
      setSelectedSemesterId(currentDepartment.semesters[0]?.id || '')
    }
  }, [departments, selectedDepartmentId, selectedSemesterId])

  const selectedDepartment = useMemo(() => {
    return departments.find((dept) => dept.id === selectedDepartmentId) || departments[0] || null
  }, [departments, selectedDepartmentId])

  const selectedSemester = useMemo(() => {
    if (!selectedDepartment) return null
    return selectedDepartment.semesters.find((semester) => semester.id === selectedSemesterId) || selectedDepartment.semesters[0] || null
  }, [selectedDepartment, selectedSemesterId])

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
    const availableSemesters = selectedDepartment?.semesters.filter((semester) => semester.id !== selectedSemesterId) || []
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

  async function handleSaveSubject(event){
    event.preventDefault()
    if (!formState.name.trim() || !formState.code.trim() || !selectedDepartment || !selectedSemester) return

    setSaving(true)
    setError('')
    try {
      await api.post('/subjects/', {
        name: formState.name.trim(),
        code: formState.code.trim(),
        description: formState.description.trim() || formState.content.trim(),
        credits: 0,
        faculty_name: '',
        subject_type: 'theory',
        school_id: selectedDepartment.school_id,
        department_id: selectedDepartment.id,
        semester_id: selectedSemester.id,
        is_active: true
      })
      await loadData()
      closeModal()
    } catch (err) {
      console.error('Failed to create subject', err)
      setError(err?.response?.data?.detail || 'Could not create subject')
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
      await api.post('/semesters/', {
        department_id: semesterForm.department_id,
        semester_number: Number(semesterForm.semester_number),
        academic_year: semesterForm.academic_year.trim(),
        description: semesterForm.description.trim(),
        is_active: true
      })
      await loadData()
      setSemesterModalOpen(false)
      setSemesterForm({ department_id: selectedDepartment?.id || '', semester_number: '', academic_year: '', description: '' })
    } catch (err) {
      console.error('Failed to create semester', err)
      setError(err?.response?.data?.detail || 'Could not create semester')
    } finally {
      setSaving(false)
    }
  }

  function updateSubject(subjectId, patch){
    setDepartments((prev) => prev.map((dept) => {
      if (dept.id !== selectedDepartmentId) return dept
      return {
        ...dept,
        semesters: dept.semesters.map((semester) => {
          if (semester.id !== selectedSemesterId) return semester
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
    updateSubject(modalState.subjectId, { content: formState.content.trim() })
    closeModal()
  }

  function handlePdfSave(event){
    event.preventDefault()
    if (!modalState?.subjectId || !pdfFile) return
    const objectUrl = typeof window !== 'undefined' ? window.URL.createObjectURL(pdfFile) : ''
    updateSubject(modalState.subjectId, {
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
          <div className="stat-card-title">Semester</div>
          <div className="stat-card-value">{selectedSemester?.name || '—'}</div>
          <div className="stat-card-subtitle">Current semester scope</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">Subjects</div>
          <div className="stat-card-value">{selectedSemester?.subjects.length || 0}</div>
          <div className="stat-card-subtitle">Available in this semester</div>
        </div>
      </div>

      <div className="subject-shell">
        <aside className="card subject-tree">
          <div className="tree-header">
            <h3>Departments</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" type="button" onClick={() => { setSemesterForm((prev) => ({ ...prev, department_id: selectedDepartment?.id || '' })); setSemesterModalOpen(true) }}>Add semester</button>
              <button className="btn primary" onClick={openAddModal}>Add subject</button>
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
              <p>{selectedSemester?.name || 'Choose a semester to view subjects'}</p>
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
                  {(selectedDepartment?.semesters || []).map((semester) => (
                    <option key={semester.id} value={semester.id}>{semester.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {!selectedSemester ? (
            <div className="empty-state">Select a department and semester to start managing subjects.</div>
          ) : (
            <div className="subject-list">
              {selectedSemester.subjects.map((subject) => (
                <article key={subject.id} className="subject-card">
                  <div className="subject-card-header">
                    <div>
                      <h4>{subject.name}</h4>
                      <p>{subject.description}</p>
                    </div>
                    <div className="subject-code">{subject.code}</div>
                  </div>
                  <div className="subject-card-body">
                    <div className="subject-meta">
                      <span className="meta-pill">Content ready</span>
                      {subject.pdfName ? <span className="meta-pill success">PDF attached</span> : <span className="meta-pill">No PDF</span>}
                    </div>
                    <div className="subject-content">
                      <strong>Notes</strong>
                      <p>{subject.content || 'No content added yet.'}</p>
                    </div>
                  </div>
                  <div className="subject-actions">
                    <button className="text-button" onClick={() => openEditModal(subject)}>Edit</button>
                    <button className="text-button" onClick={() => openShiftModal(subject)}>Shift</button>
                    <button className="text-button" onClick={() => openPdfModal(subject)}>Upload PDF</button>
                    <button className="text-button" onClick={() => openContentModal(subject)}>Add content</button>
                  </div>
                </article>
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
              <form className="modal-form" onSubmit={(event) => { event.preventDefault(); closeModal() }}>
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
                <label>
                  Content / notes
                  <textarea value={formState.content} onChange={(event) => setFormState((prev) => ({ ...prev, content: event.target.value }))} rows="6" />
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
