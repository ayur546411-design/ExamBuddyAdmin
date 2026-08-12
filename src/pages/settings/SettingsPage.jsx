import React, { useState, useEffect } from 'react'
import api from '../../api/client'

export default function SettingsPage(){
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targetUserId, setTargetUserId] = useState('')
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingRole, setCheckingRole] = useState(true)

  useEffect(() => {
    checkAdminStatus()
  }, [])

  async function checkAdminStatus(){
    try {
      setCheckingRole(true)
      const response = await api.get('/users/me')
      const user = response.data
      const userIsAdmin = user.role === 'admin' || user.is_admin
      setIsAdmin(userIsAdmin)
    } catch (err) {
      console.error('Error checking admin status:', err)
      console.error('Full error object:', JSON.stringify({
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        data: err?.response?.data,
        message: err?.message,
        url: err?.config?.url,
      }, null, 2))
      setStatus(`Failed to check admin status: ${err?.message || 'Network error'}`)
    } finally {
      setCheckingRole(false)
    }
  }

  async function promoteToAdmin(){
    try {
      setSaving(true)
      setStatus('')
      console.log('Promoting user to admin...')
      await api.post('/users/me/promote-to-admin')
      setStatus('Successfully promoted to admin! You can now send notifications.')
      setIsAdmin(true)
    } catch (err) {
      console.error('Error promoting to admin:', err)
      console.error('Full error:', JSON.stringify({
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
        config: err?.config?.url,
      }, null, 2))
      const errorDetail = err?.response?.data?.detail || err?.message || 'Unable to promote to admin.'
      setStatus(`Error: ${errorDetail}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleSendNotification(e){
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      setStatus('Title and message are required.')
      return
    }

    try {
      setSaving(true)
      setStatus('')
      const titleTrimmed = title.trim()
      const bodyTrimmed = body.trim()
      const userIdTrimmed = targetUserId.trim()
      
      if (userIdTrimmed) {
        // Send to specific user
        const payload = { title: titleTrimmed, body: bodyTrimmed, user_id: userIdTrimmed }
        console.log('Sending notification to user:', payload)
        await api.post('/notifications/', payload)
        setStatus('Notification sent.')
      } else {
        // Broadcast to all users - don't include user_id
        const payload = { title: titleTrimmed, body: bodyTrimmed }
        console.log('Broadcasting notification:', payload)
        await api.post('/notifications/broadcast', payload)
        setStatus('Broadcast sent to all active users.')
      }
      setTitle('')
      setBody('')
      setTargetUserId('')
    } catch (err) {
      console.error('Error sending notification:', err)
      console.error('Response data:', err?.response?.data)
      console.error('Error message:', err?.message)
      const errorDetail = err?.response?.data?.detail || err?.message || 'Unable to send notification.'
      
      // If 403 and not admin, offer to promote
      if (err?.response?.status === 403 && !isAdmin) {
        setStatus(`Error: ${errorDetail} - Click "Promote to Admin" below to enable this feature.`)
      } else {
        setStatus(`Error: ${errorDetail}`)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <h1>Settings</h1>
      <section className="card">
        <h2>Integration</h2>
        <p>Configure API base URL, school sync, and extraction behavior.</p>
      </section>
      <section className="card">
        <h2>User management</h2>
        <p>Manage admin access, roles, and authentication settings.</p>
      </section>
      <section className="card">
        <h2>System health</h2>
        <p>View worker status, queue health, and API availability.</p>
      </section>

      <section className="card" style={{ marginTop: 24 }}>
        <h2>Send announcement</h2>
        <p>Publish a notice to the mobile app without hardcoding anything in the app UI.</p>

        {checkingRole ? (
          <p>Checking admin privileges...</p>
        ) : !isAdmin ? (
          <div style={{ backgroundColor: '#fef3c7', padding: 12, borderRadius: 8, marginBottom: 16, border: '1px solid #fcd34d' }}>
            <p style={{ margin: 0, marginBottom: 8, color: '#92400e' }}>
              <strong>Admin privileges required:</strong> You need to be promoted to admin to send announcements.
            </p>
            <button 
              onClick={promoteToAdmin} 
              disabled={saving}
              style={{ padding: '8px 16px', borderRadius: 6, border: 'none', backgroundColor: '#fbbf24', color: '#000', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 500 }}
            >
              {saving ? 'Promoting...' : 'Promote to Admin'}
            </button>
          </div>
        ) : null}

        {isAdmin && (
          <form onSubmit={handleSendNotification} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            <div>
              <label htmlFor="notif-title">Title</label>
              <input id="notif-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Welcome back" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <label htmlFor="notif-body">Message</label>
              <textarea id="notif-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Final exam schedule is now available." rows={4} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db', resize: 'vertical' }} />
            </div>
            <div>
              <label htmlFor="notif-user">Target user ID (optional)</label>
              <input id="notif-user" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} placeholder="Leave blank for everyone" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button type="submit" className="btn" disabled={saving}>{saving ? 'Sending...' : 'Send notification'}</button>
              {status ? <span>{status}</span> : null}
            </div>
          </form>
        )}

        {!isAdmin && !checkingRole && status && (
          <div style={{ marginTop: 16 }}>
            <span>{status}</span>
          </div>
        )}
      </section>
    </div>
  )
}
