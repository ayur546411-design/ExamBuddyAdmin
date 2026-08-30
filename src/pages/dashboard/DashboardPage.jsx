import React, { useEffect, useState } from 'react'
import api from '../../api/client'
import { Link } from 'react-router-dom'
import StatCard from '../../components/StatCard'

export default function DashboardPage(){
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(()=>{
    async function load(){
      try{
        const res = await api.get('/documents', { params: { page_size: 0 } })
        const docs = res.data || []
        const total = docs.length
        const published = docs.filter(d=>d.status==='published').length
        const draft = docs.filter(d=>d.status==='draft').length
        const processing = docs.filter(d=>d.status==='processing').length
        const incomplete = docs.filter(d=>d.status==='incomplete').length
        const failed = docs.filter(d=>d.status==='failed').length
        setStats({ total, published, draft, processing, incomplete, failed, recent: docs.slice(0,5) })
      }catch(e){
        console.error(e)
        setError('Unable to load dashboard stats')
      }
    }
    load()
  },[])

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Monitor uploads, extraction health, and publication status.</p>
        </div>
      </div>

      {!stats && !error && <p>Loading dashboard...</p>}
      {error && <div className="error">{error}</div>}
      {stats && (
        <>
          <div className="stats-grid">
            <StatCard title="Total Documents" value={stats.total} accent="primary" />
            <StatCard title="Published" value={stats.published} />
            <StatCard title="Draft" value={stats.draft} />
            <StatCard title="Processing" value={stats.processing} />
            <StatCard title="Incomplete" value={stats.incomplete} />
            <StatCard title="Failed" value={stats.failed} accent="danger" />
          </div>

          <section className="card section-card">
            <div className="section-header">
              <div>
                <h2>Recent Uploads</h2>
                <p>Quick access to latest document processing and review.</p>
              </div>
              <Link to="/documents" className="btn">View all documents</Link>
            </div>
            <div className="recent-list">
              {stats.recent.map(d=> (
                <div className="recent-item" key={d.id}>
                  <div>
                    <Link to={`/documents/${d.id}`} className="item-title">{d.title || 'Untitled document'}</Link>
                    <div className="item-meta">{d.document_type} · {d.status}</div>
                  </div>
                  <div className="item-badge">{d.uploaded_by_admin ? 'Admin' : 'Auto'}</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
