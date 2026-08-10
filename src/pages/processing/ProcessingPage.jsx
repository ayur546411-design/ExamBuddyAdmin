import React, { useEffect, useState } from 'react'
import api from '../../api/client'

export default function ProcessingPage(){
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    async function load(){
      setLoading(true)
      try{
        const res = await api.get('/processing')
        setJobs(res.data.items || [])
      }catch(e){
        console.error(e)
      }finally{ setLoading(false) }
    }
    load()
  },[])

  return (
    <div className="page">
      <h1>Processing</h1>
      {loading && <p>Loading...</p>}
      {!loading && jobs.length===0 && <p>No active processing jobs.</p>}
      {!loading && jobs.length>0 && (
        <table className="table">
          <thead><tr><th>Document</th><th>Status</th><th>Progress</th><th>Started</th><th>Error</th></tr></thead>
          <tbody>
            {jobs.map(job => (
              <tr key={job.job_id}>
                <td>{job.document_title || job.document_id}</td>
                <td>{job.status}</td>
                <td>{job.progress ?? 0}%</td>
                <td>{job.started_at}</td>
                <td>{job.error_message || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
