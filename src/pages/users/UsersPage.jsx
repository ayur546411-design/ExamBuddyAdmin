import React, { useEffect, useState } from 'react'
import api from '../../api/client'

export default function UsersPage(){
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    async function load(){
      setLoading(true)
      try{
        const res = await api.get('/users')
        setUsers(res.data || [])
      }catch(e){
        console.error(e)
      }finally{ setLoading(false) }
    }
    load()
  },[])

  return (
    <div className="page">
      <h1>Users</h1>
      {loading && <p>Loading...</p>}
      {!loading && users.length===0 && <p>No users available.</p>}
      {!loading && users.length>0 && (
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
          <tbody>
            {users.map(user=> (
              <tr key={user.id}>
                <td>{user.name || user.username}</td>
                <td>{user.email}</td>
                <td>{user.role || user.access_level}</td>
                <td>{user.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
