'use client'

import { FormEvent, useState } from 'react'
import axios from 'axios'

export type RecordType = 'safe' | 'looking_for'

export type PersonFormProps = {
  initialRecordType?: RecordType
  onSubmitted?: () => void
}

const shelters = ['Civic Center Shelter', 'Riverbend High School', 'Northside Community Hall']

export function PersonForm({ initialRecordType = 'safe', onSubmitted }: PersonFormProps) {
  const [recordType, setRecordType] = useState<RecordType>(initialRecordType)
  const [matchData, setMatchData] = useState<any>(null) // State to hold match results

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    const payload = {
      record_type: recordType,
      full_name: String(formData.get('fullName') ?? '').trim(),
      age: formData.get('age') ? Number(formData.get('age')) : null,
      shelter_id: 1,
      reporter_contact: String(formData.get('contactNumber') ?? '').trim(),
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
    const apiUrl = apiBaseUrl ? `${apiBaseUrl}/api/persons` : '/api/persons'

    try {
      const response = await axios.post(apiUrl, payload)

      if (response.data.matchFound) {
        setMatchData(response.data.matches[0])
      } else {
        alert('Record submitted successfully!')
        onSubmitted?.()
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to submit.'
      alert('Error: ' + errorMsg)
      console.error('Submission error:', error)
    }
  }

  return (
    <>
      <form className="person-form" onSubmit={handleSubmit}>
        <div className="form-intro">
          <span className="eyebrow">Public registry</span>
          <h2>{recordType === 'safe' ? 'Mark someone as safe' : 'Report someone you are looking for'}</h2>
          <p>Share only what you know. Emergency teams use this information to reconnect families.</p>
        </div>

        <div className="segmented-control" aria-label="Record type">
          <button className={recordType === 'safe' ? 'segment active' : 'segment'} type="button" onClick={() => setRecordType('safe')}>Mark as Safe</button>
          <button className={recordType === 'looking_for' ? 'segment active' : 'segment'} type="button" onClick={() => setRecordType('looking_for')}>Looking For</button>
        </div>

        <div className="form-grid">
          <label className="field field-wide">
            <span>Full name <b aria-hidden="true">*</b></span>
            <input name="fullName" required placeholder="e.g. Jordan Lee" />
          </label>
          <label className="field">
            <span>Age</span>
            <input name="age" type="number" min="0" max="120" placeholder="Optional" />
          </label>
          <label className="field">
            <span>District</span>
            <select name="district" defaultValue="Central">
              <option>Central</option><option>Eastside</option><option>Northside</option><option>Riverside</option>
            </select>
          </label>
          
          {/* I added this missing field required by your database */}
          <label className="field field-wide">
            <span>Your Contact Number <b aria-hidden="true">*</b></span>
            <input name="contactNumber" required placeholder="Phone number for updates" />
          </label>

          {recordType === 'safe' ? (
            <label className="field field-wide">
              <span>Current shelter or location</span>
              <select name="shelter" defaultValue="">
                <option value="">Select a known shelter</option>
                {shelters.map((shelter) => <option key={shelter}>{shelter}</option>)}
              </select>
            </label>
          ) : (
            <label className="field field-wide">
              <span>Last known location</span>
              <input name="lastLocation" placeholder="Street, landmark, or neighborhood" />
            </label>
          )}
        </div>

        <div className="form-actions">
          <p className="privacy-note">Your submission is visible to verified response partners.</p>
          <button className="primary-button" type="submit">{recordType === 'safe' ? 'Submit Safe Record' : 'Submit Looking For Report'}</button>
        </div>
      </form>

      {/* The Match Alert Modal (Your Differentiator Feature) */}
      {matchData && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true">
            <button className="modal-close" type="button" onClick={() => { setMatchData(null); onSubmitted?.() }}>×</button>
            <span className="modal-mark" aria-hidden="true">🚨</span>
            <span className="eyebrow">Automated System Alert</span>
            <h2>Potential Match Found!</h2>
            <p>Our system found a highly similar name in the "Safe" registry.</p>
            <div style={{ background: '#f4f4f4', padding: '10px', borderRadius: '5px', marginTop: '10px', marginBottom: '15px' }}>
              <strong>Matched Name:</strong> {matchData.full_name} <br/>
              <strong>Match Score:</strong> {(matchData.match_score * 100).toFixed(0)}% <br/>
              <strong>Status:</strong> Marked as Safe
            </div>
            <div className="modal-actions">
              <button className="primary-button" type="button" onClick={() => { setMatchData(null); onSubmitted?.() }}>Acknowledge & Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}