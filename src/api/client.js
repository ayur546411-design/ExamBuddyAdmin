import axios from 'axios'

const baseURL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').trim().replace(/\/?$/, '/')

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  if (typeof config.url === 'string') {
    config.url = config.url.replace(/^\/+/, '')
  }
  return config
})

export function setAuthToken(token){
  if(token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  else delete api.defaults.headers.common['Authorization']
}

export default api
