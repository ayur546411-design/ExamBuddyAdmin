import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDocuments, reprocessDocument, publishDocument } from '../../api/documentsApi'
import StatusBadge from '../../components/StatusBadge'

const statusOptions = ['', 'published', 'draft', 'processing', 'incomplete', 'failed']
const typeOptions = ['', 'syllabus', 'pyq', 'academic_calendar', 'note', 'other']

export default function DocumentsPage(){
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')

  useEffect(()=>{
    async function load(){
      setLoading(true)
      try{
        const res = await getDocuments({ document_type: typeFilter || undefined, page: 1, page_size: 25 })
        setDocs(res.data || [])
      }catch(e){
        console.error(e)
      }finally{ setLoading(false) }
    }
    load()
  }, [typeFilter])

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
