import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function Login() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', {
        username,
        password,
      })

      const data = response.data

      // Store authentication data
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      // Redirect based on role
      if (data.user.role === 'coordinator') {
        navigate('/admin/coordinator')
      } else if (data.user.role === 'shelter_admin') {
        navigate('/admin/shelter')
      } else {
        navigate('/')
      }
    } catch (error) {
      if (error.response) {
        setError(error.response.data?.error || 'Login failed')
      } else {
        setError('Unable to connect to the server')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <div className="login-card">

        {/* Login Header */}
        <div className="login-header">
          <div className="login-icon">
            🛡️
          </div>

          <h1>Shaastra Login</h1>

          <p className="login-subtitle">
            Secure access to the disaster response system
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label htmlFor="username">
              Username
            </label>

            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="login-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in to Shaastra'}
          </button>
        </form>

        {/* Security Note */}
        <div className="login-security">
          <span>🔒</span>
          <span>Authorized emergency personnel only</span>
        </div>

      </div>
    </div>
  )
}