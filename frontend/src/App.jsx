import { Routes, Route, Navigate } from 'react-router-dom'

import Navbar from './components/Navbar'

import Home from './pages/Home'
import ShelterList from './pages/ShelterList'
import ShelterDetail from './pages/ShelterDetail'
import Login from './pages/Login'
import AdminCoordinator from './pages/AdminCoordinator'
import AdminShelter from './pages/AdminShelter'

// --------------------------------------------------
// Protected Route
// --------------------------------------------------

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token')

  // User is not logged in
  if (!token) {
    return <Navigate to="/login" replace />
  }

  let user = null

  try {
    const storedUser = localStorage.getItem('user')

    if (storedUser) {
      user = JSON.parse(storedUser)
    }
  } catch (error) {
    console.error('Invalid user data in localStorage:', error)

    localStorage.removeItem('token')
    localStorage.removeItem('user')

    return <Navigate to="/login" replace />
  }

  // Token exists but user data does not
  if (!user) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')

    return <Navigate to="/login" replace />
  }

  // Logged in but wrong role
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children
}


// --------------------------------------------------
// Main Application
// --------------------------------------------------

export default function App() {
  return (
    <div>

      {/* Navigation */}
      <Navbar />

      <Routes>

        {/* ========================================== */}
        {/* PUBLIC PAGES                               */}
        {/* ========================================== */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/shelters"
          element={<ShelterList />}
        />

        <Route
          path="/shelters/:id"
          element={<ShelterDetail />}
        />


        {/* ========================================== */}
        {/* AUTHENTICATION                             */}
        {/* ========================================== */}

        <Route
          path="/login"
          element={<Login />}
        />


        {/* ========================================== */}
        {/* COORDINATOR                               */}
        {/* ========================================== */}

        <Route
          path="/admin/coordinator"
          element={
            <ProtectedRoute allowedRoles={['coordinator']}>
              <AdminCoordinator />
            </ProtectedRoute>
          }
        />


        {/* ========================================== */}
        {/* SHELTER ADMIN                             */}
        {/* ========================================== */}

        <Route
          path="/admin/shelter"
          element={
            <ProtectedRoute allowedRoles={['shelter_admin']}>
              <AdminShelter />
            </ProtectedRoute>
          }
        />


        {/* ========================================== */}
        {/* PERSON B — FUTURE ROUTES                  */}
        {/* ========================================== */}

        {/*
        <Route
          path="/admin/shelters/manage"
          element={<ManageShelters />}
        />

        <Route
          path="/admin/users/manage"
          element={<ManageUsers />}
        />
        */}


        {/* ========================================== */}
        {/* PERSON C — FUTURE ROUTES                  */}
        {/* ========================================== */}

        {/*
        <Route
          path="/report-safe"
          element={<ReportSafe />}
        />

        <Route
          path="/looking-for"
          element={<LookingFor />}
        />

        <Route
          path="/find-someone"
          element={<FindSomeone />}
        />

        <Route
          path="/persons/:id"
          element={<PersonDetail />}
        />
        */}


        {/* ========================================== */}
        {/* FALLBACK                                  */}
        {/* ========================================== */}

        <Route
          path="*"
          element={
            <div className="page-container">
              <div className="state-message">
                <h3>Page not found</h3>
                <p>
                  This route doesn't exist yet, or belongs to a module
                  that hasn't been merged in.
                </p>
              </div>
            </div>
          }
        />

      </Routes>

    </div>
  )
}