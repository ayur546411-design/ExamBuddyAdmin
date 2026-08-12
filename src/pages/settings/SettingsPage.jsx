import React, { useState } from 'react'
import api from '../../api/client'

export default function SettingsPage(){
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targetUserId, setTargetUserId] = useState('')
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSendNotification(e){
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      setStatus('Title and message are required.')
      return
    }

    try {
      setSaving(true)
      setStatus('')
      const payload = { title: title.trim(), body: body.trim(), user_id: targetUserId.trim() || undefined }
      if (targetUserId.trim()) {
        await api.post('/notifications/', payload)
        setStatus('Notification sent.')
      } else {
        await api.post('/notifications/broadcast', payload)
        setStatus('Broadcast sent to all active users.')
      }
      setTitle('')
      setBody('')
      setTargetUserId('')
    } catch (err) {
      console.error(err)
      setStatus(err?.response?.data?.detail || 'Unable to send notification.')
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
      </section>
    </div>
  )
}
