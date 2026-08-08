import { NavLink, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()

  const token = localStorage.getItem('token')

  let user = null

  try {
    const storedUser = localStorage.getItem('user')

    if (storedUser) {
      user = JSON.parse(storedUser)
    }
  } catch (err) {
    console.error('Invalid stored user:', err)
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')

    navigate('/login')
  }

  const linkClass = ({ isActive }) =>
    `navbar-link${isActive ? ' active' : ''}`

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* BRAND */}
        <NavLink to="/" className="navbar-brand">
          <span className="navbar-brand-dot">●</span>
          Shaastra
        </NavLink>

        {/* PUBLIC NAVIGATION */}
        <div className="navbar-links">

          <NavLink
            to="/"
            className={linkClass}
            end
          >
            Map
          </NavLink>

          <NavLink
            to="/shelters"
            className={linkClass}
          >
            List
          </NavLink>

          <NavLink
            to="/find-someone"
            className={linkClass}
          >
            Find Someone
          </NavLink>

          <NavLink
            to="/report-safe"
            className={linkClass}
          >
            Report Safe
          </NavLink>

          {/* AUTHENTICATED USER LINKS */}
          {token && user?.role === 'coordinator' && (
            <NavLink
              to="/admin/coordinator"
              className={linkClass}
            >
              Coordinator
            </NavLink>
          )}

          {token && user?.role === 'shelter_admin' && (
            <NavLink
              to="/admin/shelter"
              className={linkClass}
            >
              Shelter Admin
            </NavLink>
          )}

          {/* LOGIN / LOGOUT */}
          {!token ? (
            <NavLink
              to="/login"
              className={linkClass}
            >
              Login
            </NavLink>
          ) : (
            <button
              type="button"
              className="navbar-link navbar-logout"
              onClick={handleLogout}
            >
              Logout
            </button>
          )}

        </div>
      </div>
    </nav>
  )
}