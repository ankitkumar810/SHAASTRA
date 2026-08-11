// src/api.js
// Shared Axios instance for the entire frontend.

import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// Attach JWT to every API request when available.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

export default api