import React, { useEffect, useState } from 'react'
import api from '../../api/client'

export default function SubjectsPage(){
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    async function load(){
      setLoading(true)
      try{
        const res = await api.get('/subjects')
        setSubjects(res.data || [])
      }catch(e){
        console.error(e)
      }finally{ setLoading(false) }
    }
    load()
  },[])

  return (
    <div className="page">
      <h1>Subjects</h1>
      {loading && <p>Loading...</p>}
      {!loading && subjects.length===0 && <p>No subjects found.</p>}
      {!loading && subjects.length>0 && (
        <table className="table">
          <thead><tr><th>Name</th><th>Code</th><th>Semester</th><th>Department</th></tr></thead>
          <tbody>
            {subjects.map(sub=> (
              <tr key={sub.id}>
                <td>{sub.name}</td>
                <td>{sub.code}</td>
                <td>{sub.semester_id}</td>
                <td>{sub.department_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
