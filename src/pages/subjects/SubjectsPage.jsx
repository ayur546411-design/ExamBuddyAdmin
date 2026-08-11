import React, { useEffect, useMemo, useState } from 'react'

function createSeedData(){
  return [
    {
      id: 'dept-cs',
      name: 'Computer Science',
      semesters: [
        {
          id: 'sem-1',
          name: 'Semester 1',
          subjects: [
            {
              id: 'sub-101',
              name: 'Programming Fundamentals',
              code: 'CS101',
              description: 'Introductory programming concepts and problem solving.',
              content: 'Focus on variables, control flow, functions, loops, and debugging basics.',
              pdfName: 'programming-fundamentals.pdf',
              pdfUrl: '#'
            },
            {
              id: 'sub-102',
              name: 'Discrete Mathematics',
              code: 'CS102',
              description: 'Logic, sets, relations, and combinatorics.',
              content: 'Practice proofs, truth tables, and graph theory fundamentals.',
              pdfName: '',
              pdfUrl: ''
            }
          ]
        },
        {
          id: 'sem-2',
          name: 'Semester 2',
          subjects: [
            {
              id: 'sub-201',
              name: 'Data Structures',
              code: 'CS201',
              description: 'Arrays, stacks, queues, trees, and hashing.',
              content: 'Students should understand complexity and everyday implementation patterns.',
              pdfName: 'data-structures.pdf',
              pdfUrl: '#'
            }
          ]
        }
      ]
    },
    {
      id: 'dept-ec',
      name: 'Electronics',
      semesters: [
        {
          id: 'sem-1',
          name: 'Semester 1',
          subjects: [
            {
              id: 'sub-301',
              name: 'Basic Electronics',
              code: 'EC101',
              description: 'Circuit basics and semiconductor devices.',
              content: 'Begin with resistor networks, transistors, and diode behaviour.',
              pdfName: 'basic-electronics.pdf',
              pdfUrl: '#'
            }
          ]
        },
        {
          id: 'sem-2',
          name: 'Semester 2',
          subjects: [
            {
              id: 'sub-302',
              name: 'Digital Logic',
              code: 'EC201',
              description: 'Boolean algebra and logic circuits.',
              content: 'Cover gates, flip-flops, and sequence design.',
              pdfName: '',
              pdfUrl: ''
            }
          ]
        }
      ]
    }
  ]
}

function loadInitialData(){
  if (typeof window === 'undefined') return createSeedData()
  try {
    const saved = window.localStorage.getItem('exambuddy-subjects')
    if (saved) return JSON.parse(saved)
  } catch (error) {
    console.error('Could not restore subject data', error)
  }
  return createSeedData()
}

export default function SubjectsPage(){
  const [departments, setDepartments] = useState(loadInitialData)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')
  const [selectedSemesterId, setSelectedSemesterId] = useState('')
  const [modalState, setModalState] = useState(null)
  const [formState, setFormState] = useState({ name: '', code: '', description: '', content: '' })
  const [shiftTargetId, setShiftTargetId] = useState('')
  const [pdfFile, setPdfFile] = useState(null)

  useEffect(() => {
    if (!departments.length) return
    if (!selectedDepartmentId) {
      setSelectedDepartmentId(departments[0].id)
      return
    }
    const departmentExists = departments.some((dept) => dept.id === selectedDepartmentId)
    if (!departmentExists) {
      setSelectedDepartmentId(departments[0].id)
      return
    }
  }, [departments, selectedDepartmentId])

  useEffect(() => {
    if (!departments.length) return
    const currentDepartment = departments.find((dept) => dept.id === selectedDepartmentId)
    if (!currentDepartment) return
    if (!selectedSemesterId || !currentDepartment.semesters.some((semester) => semester.id === selectedSemesterId)) {
      setSelectedSemesterId(currentDepartment.semesters[0]?.id || '')
    }
  }, [departments, selectedDepartmentId, selectedSemesterId])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('exambuddy-subjects', JSON.stringify(departments))
    }
  }, [departments])

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

  function handleSaveSubject(event){
    event.preventDefault()
    if (!formState.name.trim() || !formState.code.trim()) return

    if (modalState?.type === 'edit') {
      updateSubject(modalState.subjectId, {
        name: formState.name.trim(),
        code: formState.code.trim(),
        description: formState.description.trim(),
        content: formState.content.trim()
      })
      closeModal()
      return
    }

    const newSubject = {
      id: `subject-${Date.now()}`,
      name: formState.name.trim(),
      code: formState.code.trim(),
      description: formState.description.trim(),
      content: formState.content.trim(),
      pdfName: '',
      pdfUrl: ''
    }

    setDepartments((prev) => prev.map((dept) => {
      if (dept.id !== selectedDepartmentId) return dept
      return {
        ...dept,
        semesters: dept.semesters.map((semester) => {
          if (semester.id !== selectedSemesterId) return semester
          return {
            ...semester,
            subjects: [...semester.subjects, newSubject]
          }
        })
      }
    }))
    closeModal()
  }

  function handleRemoveSubject(subjectId){
    setDepartments((prev) => prev.map((dept) => {
      if (dept.id !== selectedDepartmentId) return dept
      return {
        ...dept,
        semesters: dept.semesters.map((semester) => {
          if (semester.id !== selectedSemesterId) return semester
          return {
            ...semester,
            subjects: semester.subjects.filter((subject) => subject.id !== subjectId)
          }
        })
      }
    }))
  }

  function handleShiftSubject(event){
    event.preventDefault()
    if (!modalState?.subjectId || !shiftTargetId) return

    const subjectToMove = selectedSemester?.subjects.find((subject) => subject.id === modalState.subjectId)
    if (!subjectToMove) return

    setDepartments((prev) => prev.map((dept) => {
      if (dept.id !== selectedDepartmentId) return dept
      return {
        ...dept,
        semesters: dept.semesters.flatMap((semester) => {
          if (semester.id === selectedSemesterId) {
            return [{
              ...semester,
              subjects: semester.subjects.filter((subject) => subject.id !== modalState.subjectId)
            }]
          }
          if (semester.id === shiftTargetId) {
            return [{
              ...semester,
              subjects: [...semester.subjects, { ...subjectToMove }]
            }]
          }
          return [semester]
        })
      }
    }))
    closeModal()
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
          <p>Switch semesters from the admin dashboard, then manage subjects, notes, uploads, and content in one place.</p>
        </div>
        <div className="pill-box">
          <span className="pill">{subjectCount} subjects</span>
          <span className="pill accent">Live admin view</span>
        </div>
      </div>

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
            <button className="btn primary" onClick={openAddModal}>Add subject</button>
          </div>
          <div className="tree-list">
            {departments.map((department) => (
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
            ))}
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
                    <button className="text-button danger" onClick={() => handleRemoveSubject(subject.id)}>Remove</button>
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
                <label>
                  Content / notes
                  <textarea value={formState.content} onChange={(event) => setFormState((prev) => ({ ...prev, content: event.target.value }))} rows="6" />
                </label>
                <div className="modal-actions">
                  <button className="btn" type="button" onClick={closeModal}>Cancel</button>
                  <button className="btn primary" type="submit">Save subject</button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
