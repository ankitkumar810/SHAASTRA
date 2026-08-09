'use client'

import { FormEvent, useState } from 'react'
import axios from 'axios'

export type RegistryPerson = {
  id: number
  name: string
  age: number | null
  district: string
  status: 'safe' | 'looking'
  location: string
  updated: string
  contact: string
}

type FindSomeoneProps = {
  onSelectPerson: (person: RegistryPerson) => void
  onReportMissing: () => void
}

function mapPerson(person: any): RegistryPerson {
  return {
    id: person.id,
    name: person.full_name || 'Unknown person',
    age: person.age ?? null,
    district: person.shelter_id ? `Shelter ${person.shelter_id}` : 'Pending update',
    status: person.record_type === 'safe' ? 'safe' : 'looking',
    location: person.shelter_id ? `Shelter ${person.shelter_id}` : 'Location pending',
    updated: person.created_at ? new Date(person.created_at).toLocaleString() : 'Recently added',
    contact: person.reporter_contact || 'Contact not provided',
  }
}

export function FindSomeone({ onSelectPerson, onReportMissing }: FindSomeoneProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [recordType, setRecordType] = useState('safe')
  const [results, setResults] = useState<any[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
    const apiUrl = apiBaseUrl ? `${apiBaseUrl}/api/persons` : '/api/persons'

    try {
      const response = await axios.get(apiUrl, {
        params: { type: recordType, q: searchQuery },
      })
      setResults(response.data.results ?? [])
      setHasSearched(true)
    } catch (error) {
      console.error('Search error:', error)
      alert('Failed to search the database.')
    }
  }

  return (
    <div className="search-page" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Search Registry</h2>
      <p>Search for individuals marked as safe or missing.</p>

      <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
        <input 
          type="text" 
          placeholder="Search by name (e.g. Jordan Lee)" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          required
          style={{ padding: '10px', fontSize: '16px' }}
        />
        
        <select 
          value={recordType} 
          onChange={(e) => setRecordType(e.target.value)}
          style={{ padding: '10px', fontSize: '16px' }}
        >
          <option value="safe">Safe Records</option>
          <option value="looking_for">Looking For Records</option>
        </select>

        <button type="submit" className="primary-button" style={{ padding: '10px', fontSize: '16px', background: '#0056b3', color: 'white', border: 'none', cursor: 'pointer' }}>
          Search Database
        </button>
      </form>

      <div className="results-container">
        {hasSearched && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', background: '#ffebee', borderRadius: '8px' }}>
            <h3>No matches found.</h3>
            <p>If you cannot find who you are looking for, please submit a report.</p>
            {/* In a full app, this would use react-router to navigate to the form */}
            <button className="secondary-button" style={{ marginTop: '10px', padding: '10px' }} type="button" onClick={onReportMissing}>
              Report as Looking For
            </button>
          </div>
        )}

        {results.map((person) => (
          <div key={person.id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '10px', borderRadius: '8px' }}>
            <h3>{person.full_name}</h3>
            <p><strong>Status:</strong> {person.record_type === 'safe' ? '🟢 Safe' : '🔴 Missing'}</p>
            {person.age && <p><strong>Age:</strong> {person.age}</p>}
            
            <button style={{ marginTop: '10px', padding: '5px 10px' }} type="button" onClick={() => onSelectPerson(mapPerson(person))}>
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}