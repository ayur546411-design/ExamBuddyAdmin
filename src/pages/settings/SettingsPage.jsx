import React from 'react'

export default function SettingsPage(){
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
    </div>
  )
}
