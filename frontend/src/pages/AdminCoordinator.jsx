import { useEffect, useState } from 'react';

export default function AdminCoordinator() {
  const [user, setUser] = useState(null);
  const [shelters, setShelters] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editingShelterId, setEditingShelterId] = useState(null);

  const [resourceEditing, setResourceEditing] = useState(false);
  const [resourceEditingShelterId, setResourceEditingShelterId] =
    useState(null);

  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    total_capacity: '',
    contact_name: '',
    contact_phone: '',
    district: '',
  });

  const [resourceForm, setResourceForm] = useState({
    current_occupancy: '',
    beds_available: '',
    food_status: 'adequate',
    medicine_status: 'adequate',
  });

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    const storedUser = localStorage.getItem('user');

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Invalid stored user:', err);
        localStorage.removeItem('user');
      }
    }

    fetchShelters();
  }, []);

  // ============================================================
  // FETCH SHELTERS
  // ============================================================

  async function fetchShelters() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        'http://localhost:4000/api/shelters'
      );

      if (!response.ok) {
        throw new Error('Failed to load shelters');
      }

      const data = await response.json();

      setShelters(data);
    } catch (err) {
      console.error('Error loading shelters:', err);
      setError('Unable to load shelters.');
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // FORM HANDLERS
  // ============================================================

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleResourceChange(event) {
    const { name, value } = event.target;

    setResourceForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function resetForm() {
    setFormData({
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      total_capacity: '',
      contact_name: '',
      contact_phone: '',
      district: '',
    });
  }

  function resetResourceForm() {
    setResourceForm({
      current_occupancy: '',
      beds_available: '',
      food_status: 'adequate',
      medicine_status: 'adequate',
    });
  }

  // ============================================================
  // CREATE SHELTER
  // ============================================================

  async function handleCreateShelter(event) {
    event.preventDefault();

    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(
        'http://localhost:4000/api/shelters',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            address: formData.address,
            latitude: Number(formData.latitude),
            longitude: Number(formData.longitude),
            total_capacity: Number(formData.total_capacity),
            contact_name: formData.contact_name || null,
            contact_phone: formData.contact_phone || null,
            district: formData.district || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to create shelter'
        );
      }

      setSuccess(
        `Shelter "${data.name}" created successfully.`
      );

      resetForm();
      setShowForm(false);

      await fetchShelters();
    } catch (err) {
      console.error('Create shelter error:', err);
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  // ============================================================
  // EDIT SHELTER
  // ============================================================

  async function handleEditShelter(event) {
    event.preventDefault();

    setEditing(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(
        `http://localhost:4000/api/shelters/${editingShelterId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            address: formData.address,
            latitude: Number(formData.latitude),
            longitude: Number(formData.longitude),
            total_capacity: Number(formData.total_capacity),
            contact_name: formData.contact_name || null,
            contact_phone: formData.contact_phone || null,
            district: formData.district || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to update shelter'
        );
      }

      setSuccess(
        `Shelter "${data.name}" updated successfully.`
      );

      setEditingShelterId(null);
      resetForm();

      await fetchShelters();
    } catch (err) {
      console.error('Edit shelter error:', err);
      setError(err.message);
    } finally {
      setEditing(false);
    }
  }

  function startEditingShelter(shelter) {
    setEditingShelterId(shelter.id);

    setFormData({
      name: shelter.name || '',
      address: shelter.address || '',
      latitude: shelter.latitude ?? '',
      longitude: shelter.longitude ?? '',
      total_capacity: shelter.total_capacity ?? '',
      contact_name: shelter.contact_name || '',
      contact_phone: shelter.contact_phone || '',
      district: shelter.district || '',
    });

    setShowForm(false);
    setResourceEditingShelterId(null);

    setSuccess('');
    setError('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function cancelEditing() {
    setEditingShelterId(null);
    resetForm();
    setError('');
    setSuccess('');
  }

  // ============================================================
  // RESOURCE UPDATE
  // ============================================================

  function startResourceEditing(shelter) {
    setResourceEditingShelterId(shelter.id);

    setResourceForm({
      current_occupancy:
        shelter.current_occupancy ?? '',
      beds_available:
        shelter.beds_available ?? '',
      food_status:
        shelter.food_status || 'adequate',
      medicine_status:
        shelter.medicine_status || 'adequate',
    });

    setEditingShelterId(null);
    setShowForm(false);

    setError('');
    setSuccess('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function cancelResourceEditing() {
    setResourceEditingShelterId(null);
    resetResourceForm();
    setError('');
    setSuccess('');
  }

  async function handleResourceUpdate(event) {
    event.preventDefault();

    setResourceEditing(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Authentication token not found');
      }

      if (!user) {
        throw new Error('User information not found');
      }

      if (user.role !== 'shelter_admin') {
        throw new Error(
          'Only a shelter administrator can update shelter resources.'
        );
      }

      if (
        user.shelter_id == null ||
        String(user.shelter_id) !==
          String(resourceEditingShelterId)
      ) {
        throw new Error(
          'You can only update resources for your assigned shelter.'
        );
      }

      const response = await fetch(
        `http://localhost:4000/api/shelters/${resourceEditingShelterId}/updates`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_occupancy: Number(
              resourceForm.current_occupancy
            ),
            beds_available: Number(
              resourceForm.beds_available
            ),
            food_status: resourceForm.food_status,
            medicine_status: resourceForm.medicine_status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Failed to update shelter resources'
        );
      }

      setSuccess(
        'Shelter resources updated successfully.'
      );

      setResourceEditingShelterId(null);
      resetResourceForm();

      await fetchShelters();
    } catch (err) {
      console.error(
        'Resource update error:',
        err
      );

      setError(err.message);
    } finally {
      setResourceEditing(false);
    }
  }

  // ============================================================
  // DASHBOARD CALCULATIONS
  // ============================================================

  const totalShelters = shelters.length;

  const totalCapacity = shelters.reduce(
    (sum, shelter) =>
      sum + Number(shelter.total_capacity || 0),
    0
  );

  const totalOccupancy = shelters.reduce(
    (sum, shelter) =>
      sum + Number(shelter.current_occupancy || 0),
    0
  );

  const totalBeds = shelters.reduce(
    (sum, shelter) =>
      sum + Number(shelter.beds_available || 0),
    0
  );

  const occupancyRate =
    totalCapacity > 0
      ? Math.round(
          (totalOccupancy / totalCapacity) * 100
        )
      : 0;

  const criticalShelters = shelters.filter(
    (shelter) => {
      const occupancy =
        Number(shelter.current_occupancy || 0);

      const capacity =
        Number(shelter.total_capacity || 0);

      const occupancyPercentage =
        capacity > 0
          ? (occupancy / capacity) * 100
          : 0;

      return (
        shelter.food_status === 'critical' ||
        shelter.medicine_status === 'critical' ||
        occupancyPercentage >= 90
      );
    }
  ).length;

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="page-container coordinator-dashboard">

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="dashboard-hero">

        <div className="dashboard-hero-content">

          <div className="dashboard-eyebrow">
            SHA A S T R A&nbsp; • &nbsp;EMERGENCY OPERATIONS
          </div>

          <h1>
            Coordinator Dashboard
          </h1>

          <p className="dashboard-subtitle">
            Welcome back,{' '}
            <strong>
              {user?.username || 'Coordinator'}
            </strong>
            . Monitor shelter capacity, resources and
            emergency readiness.
          </p>

        </div>


        <button
          className="btn btn-primary hero-action"
          onClick={() => {
            setShowForm(!showForm);

            setEditingShelterId(null);
            setResourceEditingShelterId(null);

            resetForm();
            resetResourceForm();

            setSuccess('');
            setError('');
          }}
        >
          {showForm
            ? 'Cancel'
            : '+ Add New Shelter'}
        </button>

      </section>


      {/* =====================================================
          ALERTS
      ====================================================== */}

      {success && (
        <div className="alert alert-success">

          <strong>✓ Success</strong>

          <span>
            {success}
          </span>

        </div>
      )}


      {error && (
        <div className="alert alert-error">

          <strong>⚠ Action Required</strong>

          <span>
            {error}
          </span>

        </div>
      )}


      {/* =====================================================
          SUMMARY CARDS
      ====================================================== */}

      <section className="summary-grid">

        <div className="summary-card">

          <div className="summary-card-label">
            ACTIVE SHELTERS
          </div>

          <div className="summary-card-value">
            {totalShelters}
          </div>

          <div className="summary-card-note">
            Registered locations
          </div>

        </div>


        <div className="summary-card">

          <div className="summary-card-label">
            TOTAL CAPACITY
          </div>

          <div className="summary-card-value">
            {totalCapacity}
          </div>

          <div className="summary-card-note">
            People accommodated
          </div>

        </div>


        <div className="summary-card">

          <div className="summary-card-label">
            OCCUPANCY
          </div>

          <div className="summary-card-value">
            {occupancyRate}%
          </div>

          <div className="summary-card-note">
            {totalOccupancy} people currently sheltered
          </div>

        </div>


        <div className="summary-card">

          <div className="summary-card-label">
            BEDS AVAILABLE
          </div>

          <div className="summary-card-value">
            {totalBeds}
          </div>

          <div className="summary-card-note">
            Ready for allocation
          </div>

        </div>


        <div className="summary-card summary-card-alert">

          <div className="summary-card-label">
            ATTENTION
          </div>

          <div className="summary-card-value">
            {criticalShelters}
          </div>

          <div className="summary-card-note">
            Shelters requiring attention
          </div>

        </div>

      </section>


      {/* =====================================================
          CREATE SHELTER
      ====================================================== */}

      {showForm && (
        <section className="dashboard-panel">

          <div className="section-heading">

            <div>

              <div className="section-kicker">
                SHELTER MANAGEMENT
              </div>

              <h2>
                Create New Shelter
              </h2>

              <p>
                Register a new emergency shelter location.
              </p>

            </div>

          </div>


          <form onSubmit={handleCreateShelter}>

            <div className="form-grid">

              <div className="form-group">

                <label htmlFor="create-name">
                  Shelter Name *
                </label>

                <input
                  id="create-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Central Relief Centre"
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="create-district">
                  District
                </label>

                <input
                  id="create-district"
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  placeholder="Vadodara"
                />

              </div>


              <div className="form-group form-group-wide">

                <label htmlFor="create-address">
                  Address *
                </label>

                <input
                  id="create-address"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Full shelter address"
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="create-latitude">
                  Latitude *
                </label>

                <input
                  id="create-latitude"
                  type="number"
                  step="any"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  placeholder="22.3072"
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="create-longitude">
                  Longitude *
                </label>

                <input
                  id="create-longitude"
                  type="number"
                  step="any"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  placeholder="73.1812"
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="create-capacity">
                  Total Capacity *
                </label>

                <input
                  id="create-capacity"
                  type="number"
                  min="1"
                  name="total_capacity"
                  value={formData.total_capacity}
                  onChange={handleChange}
                  placeholder="200"
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="create-contact">
                  Contact Name
                </label>

                <input
                  id="create-contact"
                  type="text"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  placeholder="Shelter coordinator"
                />

              </div>


              <div className="form-group">

                <label htmlFor="create-phone">
                  Contact Phone
                </label>

                <input
                  id="create-phone"
                  type="text"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  placeholder="+91 XXXXX XXXXX"
                />

              </div>

            </div>


            <div className="form-actions">

              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating}
              >
                {creating
                  ? 'Creating Shelter...'
                  : 'Create Shelter'}
              </button>


              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancel
              </button>

            </div>

          </form>

        </section>
      )}


      {/* =====================================================
          EDIT SHELTER
      ====================================================== */}

      {editingShelterId && (
        <section className="dashboard-panel">

          <div className="section-heading">

            <div>

              <div className="section-kicker">
                SHELTER MANAGEMENT
              </div>

              <h2>
                Edit Shelter
              </h2>

              <p>
                Update location and contact information.
              </p>

            </div>


            <button
              className="btn btn-secondary"
              onClick={cancelEditing}
            >
              Cancel
            </button>

          </div>


          <form onSubmit={handleEditShelter}>

            <div className="form-grid">

              <div className="form-group">

                <label htmlFor="edit-name">
                  Shelter Name *
                </label>

                <input
                  id="edit-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="edit-district">
                  District
                </label>

                <input
                  id="edit-district"
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                />

              </div>


              <div className="form-group form-group-wide">

                <label htmlFor="edit-address">
                  Address *
                </label>

                <input
                  id="edit-address"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="edit-latitude">
                  Latitude *
                </label>

                <input
                  id="edit-latitude"
                  type="number"
                  step="any"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="edit-longitude">
                  Longitude *
                </label>

                <input
                  id="edit-longitude"
                  type="number"
                  step="any"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="edit-capacity">
                  Total Capacity *
                </label>

                <input
                  id="edit-capacity"
                  type="number"
                  min="1"
                  name="total_capacity"
                  value={formData.total_capacity}
                  onChange={handleChange}
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="edit-contact">
                  Contact Name
                </label>

                <input
                  id="edit-contact"
                  type="text"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                />

              </div>


              <div className="form-group">

                <label htmlFor="edit-phone">
                  Contact Phone
                </label>

                <input
                  id="edit-phone"
                  type="text"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                />

              </div>

            </div>


            <div className="form-actions">

              <button
                type="submit"
                className="btn btn-primary"
                disabled={editing}
              >
                {editing
                  ? 'Saving Changes...'
                  : 'Save Changes'}
              </button>


              <button
                type="button"
                className="btn btn-secondary"
                onClick={cancelEditing}
              >
                Cancel
              </button>

            </div>

          </form>

        </section>
      )}


      {/* =====================================================
          RESOURCE UPDATE
      ====================================================== */}

      {resourceEditingShelterId && (
        <section className="dashboard-panel">

          <div className="section-heading">

            <div>

              <div className="section-kicker">
                RESOURCE STATUS
              </div>

              <h2>
                Update Shelter Resources
              </h2>

              <p>
                Update occupancy, beds and essential resources.
              </p>

            </div>


            <button
              className="btn btn-secondary"
              onClick={cancelResourceEditing}
            >
              Cancel
            </button>

          </div>


          <form onSubmit={handleResourceUpdate}>

            <div className="form-grid">

              <div className="form-group">

                <label htmlFor="resource-occupancy">
                  Current Occupancy *
                </label>

                <input
                  id="resource-occupancy"
                  type="number"
                  min="0"
                  name="current_occupancy"
                  value={resourceForm.current_occupancy}
                  onChange={handleResourceChange}
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="resource-beds">
                  Beds Available *
                </label>

                <input
                  id="resource-beds"
                  type="number"
                  min="0"
                  name="beds_available"
                  value={resourceForm.beds_available}
                  onChange={handleResourceChange}
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="resource-food">
                  Food Status *
                </label>

                <select
                  id="resource-food"
                  name="food_status"
                  value={resourceForm.food_status}
                  onChange={handleResourceChange}
                  required
                >
                  <option value="adequate">
                    Adequate
                  </option>

                  <option value="low">
                    Low
                  </option>

                  <option value="critical">
                    Critical
                  </option>
                </select>

              </div>


              <div className="form-group">

                <label htmlFor="resource-medicine">
                  Medicine Status *
                </label>

                <select
                  id="resource-medicine"
                  name="medicine_status"
                  value={resourceForm.medicine_status}
                  onChange={handleResourceChange}
                  required
                >
                  <option value="adequate">
                    Adequate
                  </option>

                  <option value="low">
                    Low
                  </option>

                  <option value="critical">
                    Critical
                  </option>
                </select>

              </div>

            </div>


            <div className="form-actions">

              <button
                type="submit"
                className="btn btn-primary"
                disabled={resourceEditing}
              >
                {resourceEditing
                  ? 'Updating Resources...'
                  : 'Save Resource Update'}
              </button>


              <button
                type="button"
                className="btn btn-secondary"
                onClick={cancelResourceEditing}
              >
                Cancel
              </button>

            </div>

          </form>

        </section>
      )}


      {/* =====================================================
          SHELTER OVERVIEW
      ====================================================== */}

      <section className="shelter-overview-section">

        <div className="section-heading">

          <div>

            <div className="section-kicker">
              LIVE SHELTER STATUS
            </div>

            <h2>
              Shelter Overview
            </h2>

            <p>
              Current capacity and resource availability across
              registered emergency shelters.
            </p>

          </div>


          <div className="result-count">

            {shelters.length}{' '}
            {shelters.length === 1
              ? 'shelter'
              : 'shelters'}

          </div>

        </div>


        {/* LOADING */}

        {loading && (
          <div className="state-message">

            <div className="loading-indicator">
              <span />
              <span />
              <span />
            </div>

            <h3>
              Loading shelter data...
            </h3>

            <p>
              Retrieving the latest emergency status.
            </p>

          </div>
        )}


        {/* EMPTY */}

        {!loading &&
          !error &&
          shelters.length === 0 && (
            <div className="state-message">

              <div className="empty-icon">
                +
              </div>

              <h3>
                No shelters registered
              </h3>

              <p>
                Add a shelter to begin monitoring
                emergency capacity.
              </p>

            </div>
          )}


        {/* SHELTERS */}

        {!loading &&
          !error &&
          shelters.length > 0 && (

            <div className="shelter-grid">

              {shelters.map((shelter) => {

                const isAssignedShelter =
                  user?.role === 'shelter_admin' &&
                  user?.shelter_id != null &&
                  String(user.shelter_id) ===
                    String(shelter.id);


                const occupancy =
                  shelter.current_occupancy;


                const capacity =
                  Number(
                    shelter.total_capacity || 0
                  );


                const occupancyPercentage =
                  capacity > 0 &&
                  occupancy != null
                    ? Math.round(
                        (Number(occupancy) /
                          capacity) *
                          100
                      )
                    : null;


                const isFull =
                  shelter.beds_available === 0;


                const hasCriticalResource =
                  shelter.food_status === 'critical' ||
                  shelter.medicine_status === 'critical';


                let status = 'Operational';
                let statusClass =
                  'badge badge-safe';


                if (
                  hasCriticalResource ||
                  occupancyPercentage >= 90
                ) {
                  status = 'Critical';
                  statusClass =
                    'badge badge-critical';
                } else if (
                  shelter.food_status === 'low' ||
                  shelter.medicine_status === 'low' ||
                  occupancyPercentage >= 75
                ) {
                  status = 'Attention';
                  statusClass =
                    'badge badge-warn';
                }


                return (

                  <article
                    className="shelter-card"
                    key={shelter.id}
                  >

                    {/* CARD HEADER */}

                    <div className="shelter-card-top">

                      <div>

                        <div className="shelter-card-kicker">
                          EMERGENCY SHELTER
                        </div>

                        <h3 className="shelter-card-name">
                          {shelter.name}
                        </h3>

                      </div>


                      <span className={statusClass}>

                        <span className="badge-dot" />

                        {status}

                      </span>

                    </div>


                    {/* LOCATION */}

                    <div className="shelter-card-meta">

                      <strong>
                        {shelter.district ||
                          'District not specified'}
                      </strong>

                      <br />

                      {shelter.address}

                    </div>


                    {/* OCCUPANCY */}

                    <div className="shelter-card-section">

                      <div className="shelter-stat-row">

                        <span>
                          Occupancy
                        </span>

                        <strong>

                          {occupancy != null
                            ? `${occupancy} / ${capacity}`
                            : 'Not available'}

                        </strong>

                      </div>


                      {occupancyPercentage != null && (
                        <>

                          <div className="occupancy-track">

                            <div
                              className={`occupancy-fill ${
                                occupancyPercentage >= 90
                                  ? 'occupancy-critical'
                                  : occupancyPercentage >= 75
                                    ? 'occupancy-warning'
                                    : 'occupancy-safe'
                              }`}
                              style={{
                                width: `${Math.min(
                                  occupancyPercentage,
                                  100
                                )}%`,
                              }}
                            />

                          </div>


                          <div className="occupancy-percent">

                            {occupancyPercentage}%
                            {' '}occupied

                          </div>

                        </>
                      )}

                    </div>


                    {/* RESOURCE GRID */}

                    <div className="resource-grid">

                      <div className="resource-item">

                        <span>
                          Capacity
                        </span>

                        <strong>
                          {capacity}
                        </strong>

                      </div>


                      <div className="resource-item">

                        <span>
                          Beds Available
                        </span>

                        <strong>
                          {shelter.beds_available ??
                            'N/A'}
                        </strong>

                      </div>


                      <div className="resource-item">

                        <span>
                          Food
                        </span>

                        <strong
                          className={
                            shelter.food_status ===
                            'critical'
                              ? 'resource-critical'
                              : shelter.food_status ===
                                  'low'
                                ? 'resource-warning'
                                : ''
                          }
                        >
                          {shelter.food_status ||
                            'Not specified'}
                        </strong>

                      </div>


                      <div className="resource-item">

                        <span>
                          Medicine
                        </span>

                        <strong
                          className={
                            shelter.medicine_status ===
                            'critical'
                              ? 'resource-critical'
                              : shelter.medicine_status ===
                                  'low'
                                ? 'resource-warning'
                                : ''
                          }
                        >
                          {shelter.medicine_status ||
                            'Not specified'}
                        </strong>

                      </div>

                    </div>


                    {/* FULL WARNING */}

                    {isFull && (
                      <div className="card-alert card-alert-critical">

                        ⚠ Shelter is currently full

                      </div>
                    )}


                    {/* RESOURCE WARNING */}

                    {hasCriticalResource && (
                      <div className="card-alert card-alert-critical">

                        ⚠ Critical resource shortage

                      </div>
                    )}


                    {/* CONTACT */}

                    <div className="shelter-contact">

                      <div>

                        <span>
                          Contact
                        </span>

                        <strong>
                          {shelter.contact_name ||
                            'Not specified'}
                        </strong>

                      </div>


                      <div>

                        <span>
                          Phone
                        </span>

                        <strong>
                          {shelter.contact_phone ||
                            'Not specified'}
                        </strong>

                      </div>

                    </div>


                    {/* UPDATED */}

                    {shelter.updated_at && (
                      <div className="shelter-updated">

                        Last updated:{' '}

                        {new Date(
                          shelter.updated_at
                        ).toLocaleString()}

                      </div>
                    )}


                    {/* ACTIONS */}

                    <div className="shelter-card-actions">

                      {user?.role === 'coordinator' && (
                        <button
                          className="btn btn-secondary"
                          onClick={() =>
                            startEditingShelter(
                              shelter
                            )
                          }
                        >
                          Edit Shelter
                        </button>
                      )}


                      {isAssignedShelter && (
                        <button
                          className="btn btn-primary"
                          onClick={() =>
                            startResourceEditing(
                              shelter
                            )
                          }
                        >
                          Update Resources
                        </button>
                      )}

                    </div>

                  </article>

                );
              })}

            </div>

          )}

      </section>

    </div>
  );
}