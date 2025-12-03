import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://recs-production.up.railway.app'
const api = axios.create({
  baseURL: API_URL,
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth
export const signup = (username, email, password) => 
  api.post('/auth/signup', { username, email, password })

export const login = async (email, password) => {
  const formData = new URLSearchParams()
  formData.append('username', email)
  formData.append('password', password)
  const res = await api.post('/auth/login', formData)
  localStorage.setItem('token', res.data.access_token)
  return res
}

export const logout = () => {
  localStorage.removeItem('token')
}

// Users
export const getMe = () => api.get('/users/me')
export const getUser = (username) => api.get(`/users/${username}`)
export const followUser = (username) => api.post(`/users/${username}/follow`)
export const unfollowUser = (username) => api.delete(`/users/${username}/follow`)

// Recs
export const createRec = (data) => api.post('/recs/', data)
export const getFeed = () => api.get('/recs/feed')
export const getUserRecs = (username) => api.get(`/recs/user/${username}`)
export const likeRec = (recId) => api.post(`/recs/${recId}/like`)
export const unlikeRec = (recId) => api.delete(`/recs/${recId}/like`)

export default api