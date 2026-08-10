import api from './client'

export function getDocuments(params){
  return api.get('/documents', { params })
}

export function uploadDocument(formData, onUploadProgress){
  return api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress })
}

export function getDocument(id){
  return api.get(`/documents/${id}`)
}

export function reprocessDocument(id){
  return api.post(`/documents/${id}/process`)
}

export function getProcessingStatus(id){
  return api.get(`/documents/${id}/processing-status`)
}

export function publishDocument(id, data = {}){
  return api.post(`/documents/${id}/publish`, data)
}

export function unpublishDocument(id){
  return api.post(`/documents/${id}/unpublish`)
}

export function updateDocument(id, data){
  return api.put(`/documents/${id}`, data)
}

export function deleteDocument(id){
  return api.delete(`/documents/${id}`)
}
