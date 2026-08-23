import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import { getDocuments, reprocessDocument, publishDocument } from '../../api/documentsApi'
import StatusBadge from '../../components/StatusBadge'

const statusOptions = ['', 'published', 'draft', 'processing', 'incomplete', 'failed']
const typeOptions = ['', 'syllabus', 'pyq', 'academic_calendar', 'note', 'other']

export default function DocumentsPage(){
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(() => sessionStorage.getItem('doc_filter_status') || '')
  const [typeFilter, setTypeFilter] = useState(() => sessionStorage.getItem('doc_filter_type') || '')
  const [search, setSearch] = useState(() => sessionStorage.getItem('doc_filter_search') || '')
  const [departments, setDepartments] = useState([])
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(() => sessionStorage.getItem('doc_filter_dept') || '')
  const [semesters, setSemesters] = useState([])
  const [selectedSemesterId, setSelectedSemesterId] = useState(() => sessionStorage.getItem('doc_filter_sem') || '')
  const [pageSize, setPageSize] = useState(() => sessionStorage.getItem('doc_filter_pagesize') || '25')

  useEffect(() => {
    sessionStorage.setItem('doc_filter_status', statusFilter)
    sessionStorage.setItem('doc_filter_type', typeFilter)
    sessionStorage.setItem('doc_filter_search', search)
    sessionStorage.setItem('doc_filter_dept', selectedDepartmentId)
    sessionStorage.setItem('doc_filter_sem', selectedSemesterId)
    sessionStorage.setItem('doc_filter_pagesize', pageSize)
  }, [statusFilter, typeFilter, search, selectedDepartmentId, selectedSemesterId, pageSize])

  useEffect(()=>{
    async function load(){
      setLoading(true)
      try{
        const params = {
          document_type: typeFilter || undefined,
          page: 1,
          page_size: pageSize === 'all' ? 0 : Number(pageSize || 25),
          department_id: selectedDepartmentId || undefined,
          semester_id: selectedSemesterId || undefined
        }
        const res = await getDocuments(params)
        setDocs(res.data || [])
      }catch(e){
        console.error(e)
      }finally{ setLoading(false) }
    }
    load()
  }, [typeFilter, pageSize, selectedDepartmentId, selectedSemesterId])

  useEffect(() => {
    async function loadDepartments(){
      try{
        const schoolsRes = await api.get('/schools/')
        const schools = schoolsRes.data || []
        const deptRows = []
        for(const school of schools){
          const departmentsRes = await api.get(`/schools/${school.id}/departments/`)
          const departmentsForSchool = departmentsRes.data || []
          deptRows.push(...departmentsForSchool.map((d)=>({ ...d, schoolName: school.name, school_id: d.school_id || school.id })))
        }
        setDepartments(deptRows)
        if(deptRows.length){
          setSelectedDepartmentId((cur) => cur || deptRows[0].id)
        }
      }catch(e){
        console.error('Failed to load departments for filters', e)
      }
    }
    loadDepartments()
  }, [])

  useEffect(() => {
    async function loadSemesters(){
      if(!selectedDepartmentId) { setSemesters([]); setSelectedSemesterId(''); return }
      try{
        const res = await api.get('/semesters/', { params: { department_id: selectedDepartmentId } })
        const sems = res.data || []
        setSemesters(sems)
        setSelectedSemesterId((cur) => cur || (sems[0]?.id || ''))
      }catch(e){
        console.error('Failed to load semesters for department', e)
      }
    }
    loadSemesters()
  }, [selectedDepartmentId])

  const filteredDocs = useMemo(()=>{
    return docs.filter(doc => {
      const matchesStatus = statusFilter ? doc.status === statusFilter : true
      const matchesSearch = search ? (doc.title || '').toLowerCase().includes(search.toLowerCase()) : true
      return matchesStatus && matchesSearch
    })
  }, [docs, statusFilter, search])

  async function handleReprocess(id){
    try{
      await reprocessDocument(id)
      alert('Reprocess request sent')
    }catch(e){
      console.error(e)
      alert('Unable to reprocess document')
    }
  }

  async function handlePublish(id){
    try{
      await publishDocument(id)
      alert('Publish requested')
    }catch(e){
      console.error(e)
      alert('Unable to publish document')
    }
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Documents</h1>
          <p>Review and manage uploaded syllabus and academic documents.</p>
        </div>
        <Link to="/documents/upload" className="btn primary">Upload PDF</Link>
      </div>

      <div className="filter-bar">
        <div>
          <label>Department</label>
          <select value={selectedDepartmentId} onChange={e=>{ setSelectedDepartmentId(e.target.value); setSelectedSemesterId('') }}>
            <option value="">All</option>
            {departments.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label>Semester</label>
          <select value={selectedSemesterId} onChange={e=>setSelectedSemesterId(e.target.value)}>
            <option value="">All</option>
            {semesters.map(s=> <option key={s.id} value={s.id}>{`Semester ${s.semester_number} ${s.academic_year || ''}`}</option>)}
          </select>
        </div>
        <div>
          <label>Status</label>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
            {statusOptions.map(option => <option key={option} value={option}>{option || 'All'}</option>)}
          </select>
        </div>
        <div>
          <label>Type</label>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
            {typeOptions.map(option => <option key={option} value={option}>{option || 'All'}</option>)}
          </select>
        </div>
        <div>
          <label>Page size</label>
          <select value={pageSize} onChange={e=>setPageSize(e.target.value)}>
            <option value="25">25</option>
            <option value="100">100</option>
            <option value="all">All</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label>Search</label>
          <input placeholder="Search title..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
      </div>

      {loading && <p>Loading documents...</p>}
      {!loading && filteredDocs.length===0 && <p>No documents found for the current filter.</p>}
      {!loading && filteredDocs.length>0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Department</th>
                <th>Semester</th>
                <th>Status</th>
                <th>Expected</th>
                <th>Extracted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map(d=> {
                const expected = d.structured_json?.Subjects?.length ?? '—'
                const extracted = Array.isArray(d.structured_json?.Subjects) ? d.structured_json.Subjects.filter(s=>s['Subject Name'] || s['name']).length : '—'
                return (
                  <tr key={d.id}>
                    <td><Link to={`/documents/${d.id}`}>{d.title || 'Untitled'}</Link></td>
                    <td>{d.document_type}</td>
                    <td>{d.department_id?.slice(0,8)}</td>
                    <td>{d.semester_id?.slice(0,8)}</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td>{expected}</td>
                    <td>{extracted}</td>
                    <td className="actions-cell">
                      <Link to={`/documents/${d.id}`} className="text-link">View</Link>
                      {(d.status === 'failed' || d.status === 'incomplete') && <button className="text-button" onClick={()=>handleReprocess(d.id)}>Reprocess</button>}
                      {d.status === 'draft' && <button className="text-button" onClick={()=>handlePublish(d.id)}>Publish</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
