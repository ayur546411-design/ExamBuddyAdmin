import React, { useEffect, useMemo, useState } from 'react'
import api from '../../api/client'

export default function FeedbackPage(){
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load(){
      try {
        setLoading(true)
        const res = await api.get('/feedback/')
        setItems(res.data || [])
      } catch (e) {
        console.error(e)
        setError('Unable to load feedback submissions.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const stats = useMemo(() => ({
    total: items.length,
    suggestions: items.filter(item => item.feedback_type === 'Suggestion').length,
    bugs: items.filter(item => item.feedback_type === 'Bug Report').length,
    compliments: items.filter(item => item.feedback_type === 'Compliment').length,
  }), [items])

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Feedback</h1>
          <p>Review student feedback and support requests from the app.</p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {!loading && !error && (
        <>
          <div className="stats-grid">
            <div className="stat-card primary">
              <span className="stat-label">Total</span>
              <strong>{stats.total}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Suggestions</span>
              <strong>{stats.suggestions}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Bug Reports</span>
              <strong>{stats.bugs}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Compliments</span>
              <strong>{stats.compliments}</strong>
            </div>
          </div>

          <section className="card section-card">
            <div className="section-header">
              <div>
                <h2>Submissions</h2>
                <p>Latest feedback from users.</p>
              </div>
            </div>

            {items.length === 0 ? (
              <p>No feedback submissions yet.</p>
            ) : (
              <div className="recent-list">
                {items.map(item => (
                  <div className="recent-item" key={item.id} style={{ alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div className="item-title">{item.full_name}</div>
                      <div className="item-meta">
                        {item.feedback_type} · {new Date(item.created_at).toLocaleString()}
                      </div>
                      <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{item.message}</div>
                    </div>
                    <div className="item-badge">{item.feedback_type}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {loading && <p>Loading feedback...</p>}
    </div>
  )
}
