import React, { useEffect, useState } from 'react'
import api from '../../api/client'

export default function ErrorsPage(){
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    async function load(){
      setLoading(true)
      try{
        const res = await api.get('/errors')
        setErrors(res.data.items || [])
      }catch(e){
        console.error(e)
      }finally{ setLoading(false) }
    }
    load()
  },[])

  return (
    <div className="page">
      <h1>Error Management</h1>
      {loading && <p>Loading...</p>}
      {!loading && errors.length===0 && <p>No recent errors.</p>}
      {!loading && errors.length>0 && (
        <table className="table">
          <thead><tr><th>Document</th><th>Type</th><th>Time</th><th>Message</th></tr></thead>
          <tbody>
            {errors.map(err=> (
              <tr key={err.id || `${err.document_id}-${err.time}`}>
                <td>{err.document_title || err.document_id}</td>
                <td>{err.error_type}</td>
                <td>{err.time}</td>
                <td>{err.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
