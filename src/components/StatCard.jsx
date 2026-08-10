import React from 'react'

export default function StatCard({ title, value, subtitle, accent }){
  return (
    <div className={`stat-card ${accent || ''}`}>
      <div className="stat-card-title">{title}</div>
      <div className="stat-card-value">{value}</div>
      {subtitle && <div className="stat-card-subtitle">{subtitle}</div>}
    </div>
  )
}
