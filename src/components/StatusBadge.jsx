import React from 'react'

const classes = {
  active: 'status-badge active',
  draft: 'status-badge draft',
  processing: 'status-badge processing',
  incomplete: 'status-badge incomplete',
  failed: 'status-badge failed',
  published: 'status-badge published'
}

export default function StatusBadge({ status }){
  const cls = classes[status] || 'status-badge'
  return <span className={cls}>{status?.toUpperCase() || 'UNKNOWN'}</span>
}
