// src/api.js
// Shared Axios instance for the entire frontend.
//
// Authentication:
// - Login.jsx stores the JWT in localStorage as "token".
// - This interceptor automatically attaches that JWT to API requests.
// - Protected backend routes can therefore read:
//     Authorization: Bearer <token>

import axios from 'axios'

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:4000/api',
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