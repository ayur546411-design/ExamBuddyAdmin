import axios from 'axios'

const baseURL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').trim().replace(/\/?$/, '/')

console.log('[API Client] Base URL:', baseURL)

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
  console.log('[API Request]', config.method?.toUpperCase(), `${baseURL}${config.url}`)
  return config
})

api.interceptors.response.use(
  (response) => {
    console.log('[API Response]', response.status, response.config.url)
    return response
  },
  (error) => {
    console.error('[API Error]', {
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      url: error?.config?.url,
      data: error?.response?.data,
      message: error?.message,
    })
    return Promise.reject(error)
  }
)

export function setAuthToken(token){
  if(token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    console.log('[Auth] Token set')
  } else {
    delete api.defaults.headers.common['Authorization']
    console.log('[Auth] Token cleared')
  }
}

export default api
