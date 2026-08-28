import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getDocument, reprocessDocument, publishDocument, unpublishDocument, updateDocument, getProcessingStatus } from '../../api/documentsApi'
import ConfirmDialog from '../../components/ConfirmDialog'
import StatusBadge from '../../components/StatusBadge'
import usePolling from '../../hooks/usePolling'

const statusOptions = ['active', 'draft', 'published', 'processing', 'incomplete', 'failed']

export default function DocumentDetailPage(){
  const { id } = useParams()
  const navigate = useNavigate()
  const [doc, setDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [extractJson, setExtractJson] = useState('')
  const [contentData, setContentData] = useState(null)
  const [previewMode, setPreviewMode] = useState('preview')
  const [saving, setSaving] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishLoading, setPublishLoading] = useState(false)

  useEffect(()=>{
    async function load(){
      setLoading(true)
      setError(null)
      try{
        const res = await getDocument(id)
        setDoc(res.data)
        const parsed = res.data?.structured_json || {}
        setContentData(parsed)
        setExtractJson(JSON.stringify(parsed, null, 2))
      }catch(e){
        console.error(e)
        setError(e?.response?.data?.detail || e?.message || 'Failed to load document')
      }finally{ setLoading(false) }
    }
    load()
  },[id])

  const polling = usePolling(()=> getProcessingStatus(id).then(r=> r.data), 3000, false)

  useEffect(()=>{
    if(polling.data){
      const status = polling.data.status
      if(status === 'completed' || status === 'failed'){
        polling.stop()
        getDocument(id).then(r=>{
          setDoc(r.data)
          const parsed = r.data?.structured_json || {}
          setContentData(parsed)
          setExtractJson(JSON.stringify(parsed, null, 2))
        }).catch(()=>{})
      }
    }
  }, [polling.data, id])

  const expected = useMemo(()=> {
    return Array.isArray(contentData?.Subjects) ? contentData.Subjects.length : null
  }, [contentData])

  const extracted = useMemo(()=> {
    if(!Array.isArray(contentData?.Subjects)) return 0
    return contentData.Subjects.filter(s => s['Subject Name'] || s.name).length
  }, [contentData])

  const coverage = expected === null ? 'Unknown' : Math.round((extracted / Math.max(expected, 1)) * 100)

  function updateMetadata(field, value){
    setDoc(prev => ({ ...prev, [field]: value }))
  }

  function updateContentField(path, value){
    setContentData(prev => {
      const next = JSON.parse(JSON.stringify(prev || {}))
      const keys = path.split('.')
      let obj = next
      for(let i=0; i<keys.length-1; i++){
        obj = obj[keys[i]] = obj[keys[i]] || {}
      }
      obj[keys[keys.length-1]] = value
      setExtractJson(JSON.stringify(next, null, 2))
      return next
    })
  }

  function handleSubjectChange(index, field, value){
    setContentData(prev => {
      const next = JSON.parse(JSON.stringify(prev || {}))
      if(Array.isArray(next.Subjects) && next.Subjects[index]){
        next.Subjects[index][field] = value
      }
      setExtractJson(JSON.stringify(next, null, 2))
      return next
    })
  }

  function addUnit(){
    setContentData(prev => {
      const next = JSON.parse(JSON.stringify(prev || {}))
      if(!Array.isArray(next.Units)) next.Units = []
      const nextNumber = next.Units.length + 1
      next.Units.push({
        'Unit Name': `Unit ${nextNumber}`,
        Number: nextNumber,
        Topics: []
      })
      setExtractJson(JSON.stringify(next, null, 2))
      return next
    })
  }

  function updateUnitField(index, field, value){
    setContentData(prev => {
      const next = JSON.parse(JSON.stringify(prev || {}))
      if(Array.isArray(next.Units) && next.Units[index]){
        next.Units[index][field] = value
      }
      setExtractJson(JSON.stringify(next, null, 2))
      return next
    })
  }

  function addTopic(unitIndex){
    setContentData(prev => {
      const next = JSON.parse(JSON.stringify(prev || {}))
      if(Array.isArray(next.Units) && next.Units[unitIndex]){
        if(!Array.isArray(next.Units[unitIndex].Topics)) next.Units[unitIndex].Topics = []
        next.Units[unitIndex].Topics.push('')
      }
      setExtractJson(JSON.stringify(next, null, 2))
      return next
    })
  }

  function updateTopic(unitIndex, topicIndex, value){
    setContentData(prev => {
      const next = JSON.parse(JSON.stringify(prev || {}))
      if(Array.isArray(next.Units) && next.Units[unitIndex]?.Topics && next.Units[unitIndex].Topics[topicIndex] !== undefined){
        next.Units[unitIndex].Topics[topicIndex] = value
      }
      setExtractJson(JSON.stringify(next, null, 2))
      return next
    })
  }

  function removeTopic(unitIndex, topicIndex){
    setContentData(prev => {
      const next = JSON.parse(JSON.stringify(prev || {}))
      if(Array.isArray(next.Units) && next.Units[unitIndex]?.Topics){
        next.Units[unitIndex].Topics.splice(topicIndex, 1)
      }
      setExtractJson(JSON.stringify(next, null, 2))
      return next
    })
  }

  function renderPreviewValue(value){
    if(value === null || value === undefined) return <span style={{ color: '#64748b' }}>—</span>
    if(Array.isArray(value)){
      return (
        <div className="preview-list">
          {value.map((item, index) => (
            <div className="preview-list-item" key={index}>{renderPreviewValue(item)}</div>
          ))}
        </div>
      )
    }
    if(typeof value === 'object'){
      return (
        <div className="preview-object">
          {Object.entries(value).map(([key, item]) => (
            <div className="preview-item" key={key}>
              <strong>{key}</strong>: {renderPreviewValue(item)}
            </div>
          ))}
        </div>
      )
    }
    return <span>{String(value)}</span>
  }

  function renderStructuredPreview(data){
    if(!data || typeof data !== 'object'){
      return <p>No structured content has been extracted yet.</p>
    }

    if(Array.isArray(data.Subjects) && data.Subjects.length > 0){
      return (
        <div className="preview-grid">
          {data.Subjects.map((subject, index) => (
            <div className="preview-card" key={index}>
              <h4>{subject['Subject Name'] || subject.name || `Subject ${index + 1}`}</h4>
              <div className="preview-row"><strong>Code</strong><span>{subject['Subject Code'] || subject.code || 'N/A'}</span></div>
              <div className="preview-row"><strong>Semester</strong><span>{subject.Semester || 'N/A'}</span></div>
              <div className="preview-row"><strong>Credits</strong><span>{subject.Credits ?? subject.credits ?? 'N/A'}</span></div>
              {subject.Topics && (
                <div className="preview-subsection">
                  <strong>Topics</strong>
                  {renderPreviewValue(subject.Topics)}
                </div>
              )}
            </div>
          ))}
        </div>
      )
    }

    if(Array.isArray(data.Units) && data.Units.length > 0){
      return (
        <div className="preview-grid">
          {data.Units.map((unit, index) => (
            <div className="preview-card" key={index}>
              <h4>{unit.Title || unit.title || `Unit ${index + 1}`}</h4>
              <div className="preview-row"><strong>Number</strong><span>{unit.Number || unit.number || 'N/A'}</span></div>
              <div className="preview-row"><strong>Semester</strong><span>{unit.Semester || unit.semester || 'N/A'}</span></div>
              {unit.Topics && (
                <div className="preview-subsection">
                  <strong>Topics</strong>
                  {renderPreviewValue(unit.Topics)}
                </div>
              )}
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="preview-object">
        {Object.entries(data).map(([key, value]) => (
          <div className="preview-item" key={key}>
            <strong>{key}</strong>: {renderPreviewValue(value)}
          </div>
        ))}
      </div>
    )
  }

  async function handleReprocess(){
    try{
      await reprocessDocument(id)
      alert('Reprocess started')
      polling.start()
    }catch(e){
      console.error(e)
      alert('Failed to start reprocess')
    }
  }

  async function handlePublish(force=false){
    setPublishLoading(true)
    try{
      await publishDocument(id, force ? { force_publish_incomplete: true } : {})
      alert('Published')
      const r = await getDocument(id)
      setDoc(r.data)
      const parsed = r.data?.structured_json || {}
      setContentData(parsed)
      setExtractJson(JSON.stringify(parsed, null, 2))
      setPublishOpen(false)
    }catch(e){
      console.error(e)
      alert('Publish failed')
    }finally{ setPublishLoading(false) }
  }

  async function handleUnpublish(){
    try{
      await unpublishDocument(id)
      alert('Document unpublished')
      const r = await getDocument(id)
      setDoc(r.data)
      const parsed = r.data?.structured_json || {}
      setContentData(parsed)
      setExtractJson(JSON.stringify(parsed, null, 2))
    }catch(e){
      console.error(e)
      alert('Unpublish failed')
    }
  }

  async function handleSaveExtraction(){
    setSaving(true)
    try{
      const parsed = JSON.parse(extractJson)
      const data = {
        title: doc.title,
        description: doc.description,
        academic_year: doc.academic_year,
        keywords: doc.keywords,
        status: doc.status,
        semester_id: doc.semester_id,
        subject_id: doc.subject_id,
        youtube_url: doc.youtube_url || '',
        video_title: doc.video_title || '',
        structured_json: parsed
      }
      await updateDocument(id, data)
      alert('Document saved successfully')
      const r = await getDocument(id)
      setDoc(r.data)
      const refreshed = r.data?.structured_json || {}
      setContentData(refreshed)
      setExtractJson(JSON.stringify(refreshed, null, 2))
    }catch(err){
      console.error(err)
      alert('Save failed. Ensure JSON is valid.')
    }finally{ setSaving(false) }
  }

  if(loading) return <div className="page"><p>Loading document...</p></div>
  if(error) return <div className="page"><div className="card"><h2>Unable to open this document</h2><p>{error === 'Document not found' ? 'This document may have been removed or the upload did not save a document.' : error}</p><div className="modal-actions"><button className="btn" type="button" onClick={() => navigate('/documents')}>Back to documents</button><button className="btn primary" type="button" onClick={() => navigate('/documents/upload')}>Upload syllabus</button></div></div></div>
  if(!doc) return <div className="page"><div className="card"><h2>No document available</h2><p>Upload a syllabus and select its subject to create a document.</p><div className="modal-actions"><button className="btn primary" type="button" onClick={() => navigate('/documents/upload')}>Upload syllabus</button></div></div></div>

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{doc.title || 'Document Detail'}</h1>
          <p>Review extracted content and edit document metadata directly.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={handleReprocess}>Re-process</button>
          <button className="btn primary" onClick={()=>setPublishOpen(true)}>Publish</button>
          <button className="btn" onClick={handleUnpublish}>Unpublish</button>
          <button className="btn" onClick={()=>navigate('/documents')}>Back</button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="card">
          <div className="detail-row"><span>ID</span><strong>{doc.id}</strong></div>
          <div className="detail-row"><span>Title</span><strong>{doc.title}</strong></div>
          <div className="detail-row"><span>Type</span><strong>{doc.document_type}</strong></div>
          <div className="detail-row"><span>School</span><strong>{doc.school_id}</strong></div>
          <div className="detail-row"><span>Department</span><strong>{doc.department_id}</strong></div>
          <div className="detail-row"><span>Semester</span><strong>{doc.semester_id}</strong></div>
          <div className="detail-row"><span>Status</span><strong><StatusBadge status={doc.status} /></strong></div>
          <div className="detail-row"><span>Expected</span><strong>{expected ?? 'Unknown'}</strong></div>
          <div className="detail-row"><span>Extracted</span><strong>{extracted}</strong></div>
          <div className="detail-row"><span>Coverage</span><strong>{coverage === 'Unknown' ? 'Unknown' : `${coverage}%`}</strong></div>
          <div className="detail-row"><span>PDF</span><strong><a href={doc.cloudinary_url} target="_blank" rel="noreferrer">Open source</a></strong></div>
          {polling.running && polling.data && (
            <div className="detail-row"><span>Processing</span><strong>{polling.data.status} · {polling.data.progress ?? 0}%</strong></div>
          )}
        </div>

        <div className="card">
          <h3>Document metadata</h3>
          <div className="form-group"><label>Title</label><input value={doc.title || ''} onChange={e=>updateMetadata('title', e.target.value)} /></div>
          <div className="form-group"><label>Description</label><textarea rows={3} value={doc.description || ''} onChange={e=>updateMetadata('description', e.target.value)} /></div>
          <div className="form-group"><label>Academic year</label><input value={doc.academic_year || ''} onChange={e=>updateMetadata('academic_year', e.target.value)} /></div>
          <div className="form-group"><label>Keywords</label><input value={doc.keywords || ''} onChange={e=>updateMetadata('keywords', e.target.value)} /></div>
          <div className="form-group"><label>PYQ solution video URL</label><input value={doc.youtube_url || ''} onChange={e=>updateMetadata('youtube_url', e.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></div>
          <div className="form-group"><label>Video title</label><input value={doc.video_title || ''} onChange={e=>updateMetadata('video_title', e.target.value)} placeholder="Optional video label" /></div>
          <div className="form-group"><label>Status</label><select value={doc.status || 'active'} onChange={e=>updateMetadata('status', e.target.value)}>
            {statusOptions.map(option => <option key={option} value={option}>{option}</option>)}
          </select></div>
        </div>
      </div>

      {Array.isArray(contentData?.Subjects) && (
        <div className="card">
          <h3>Extracted Subjects</h3>
          <table className="table">
            <thead>
              <tr><th>#</th><th>Name</th><th>Code</th><th>Semester</th><th>Credits</th></tr>
            </thead>
            <tbody>
              {contentData.Subjects.map((subject, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td><input value={subject['Subject Name'] || subject.name || ''} onChange={e=>handleSubjectChange(index, 'Subject Name', e.target.value)} /></td>
                  <td><input value={subject['Subject Code'] || subject.code || ''} onChange={e=>handleSubjectChange(index, 'Subject Code', e.target.value)} /></td>
                  <td><input value={subject.Semester || ''} onChange={e=>handleSubjectChange(index, 'Semester', e.target.value)} /></td>
                  <td><input value={subject.Credits ?? subject.credits ?? ''} onChange={e=>handleSubjectChange(index, 'Credits', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <div className="section-header">
          <div>
            <h3>Units & Topics</h3>
            <p>Add or edit the units and topics shown in the app syllabus screen.</p>
          </div>
          <button className="btn primary" onClick={addUnit}>Add unit</button>
        </div>

        {Array.isArray(contentData?.Units) && contentData.Units.length > 0 ? (
          <div className="preview-grid">
            {contentData.Units.map((unit, index) => (
              <div className="preview-card" key={index}>
                <div className="form-group">
                  <label>Unit name</label>
                  <input value={unit['Unit Name'] || unit['unitName'] || unit.Title || unit.title || ''} onChange={e=>updateUnitField(index, 'Unit Name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Number</label>
                  <input value={unit.Number ?? unit.number ?? ''} onChange={e=>updateUnitField(index, 'Number', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Topics</label>
                  {Array.isArray(unit.Topics) ? unit.Topics.map((topic, topicIndex) => (
                    <div key={topicIndex} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input value={topic || ''} onChange={e=>updateTopic(index, topicIndex, e.target.value)} />
                      <button className="btn" type="button" onClick={()=>removeTopic(index, topicIndex)}>Remove</button>
                    </div>
                  )) : <p>No topics yet.</p>}
                  <button className="btn" type="button" onClick={()=>addTopic(index)}>Add topic</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No units yet. Add one and the app syllabus view will show it immediately after you save.</p>
        )}
      </div>

      <div className="card extraction-summary">
        <div className="section-header">
          <div>
            <h3>Structured JSON</h3>
            <p>Toggle between a rendered preview and the raw JSON payload.</p>
          </div>
          <div className="preview-tabs">
            <button type="button" className={previewMode === 'preview' ? 'btn primary' : 'btn'} onClick={()=>setPreviewMode('preview')}>Preview</button>
            <button type="button" className={previewMode === 'json' ? 'btn primary' : 'btn'} onClick={()=>setPreviewMode('json')}>JSON</button>
          </div>
        </div>

        {previewMode === 'preview' ? (
          <div className="preview-panel">
            {renderStructuredPreview(contentData)}
          </div>
        ) : (
          <>
            <p>Directly edit the payload saved for this document.</p>
            <textarea value={extractJson} onChange={e=>setExtractJson(e.target.value)} rows={18} />
          </>
        )}

        <div className="editor-actions">
          <button className="btn primary" onClick={handleSaveExtraction} disabled={saving}>{saving ? 'Saving...' : 'Save document'}</button>
        </div>
      </div>

      <ConfirmDialog
        open={publishOpen}
        title="Publish Document"
        danger={true}
        message={
          expected === null ? `Expected units unknown. Extracted units ${extracted}. Publishing will expose this document to students.` :
          (extracted < expected ? `Only ${extracted} of ${expected} units were extracted (${coverage}%). Publishing may expose incomplete content. Continue?` : `All extracted units are present. Ready to publish.`)
        }
        confirmLabel={expected === null || extracted < expected ? 'Publish anyway' : 'Publish'}
        onCancel={()=>setPublishOpen(false)}
        onConfirm={async ()=>{
          if(expected === null || extracted < expected){
            const ok = window.confirm('Publish incomplete extraction?')
            if(!ok) return
            await handlePublish(true)
          }else{
            await handlePublish(false)
          }
        }}
      />
    </div>
  )
}
