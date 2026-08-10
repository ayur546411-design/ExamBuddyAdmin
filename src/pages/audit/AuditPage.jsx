import React, { useEffect, useState } from 'react'
import api from '../../api/client'

export default function AuditPage(){
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    async function load(){
      setLoading(true)
      try{
        const res = await api.get('/audit')
        setLogs(res.data.items || [])
      }catch(e){
        console.error(e)
      }finally{ setLoading(false) }
    }
    load()
  },[])

  return (
    <div className="page">
      <h1>Audit Log</h1>
      {loading && <p>Loading...</p>}
      {!loading && logs.length===0 && <p>No audit records.</p>}
      {!loading && logs.length>0 && (
        <table className="table">
          <thead><tr><th>Admin</th><th>Action</th><th>Document</th><th>Details</th><th>Time</th></tr></thead>
          <tbody>
            {logs.map(log=> (
              <tr key={log.id}>
                <td>{log.admin_name || log.admin_id}</td>
                <td>{log.action}</td>
                <td>{log.document_title || log.document_id}</td>
                <td>{log.details}</td>
                <td>{log.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
