import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

type RecordType = 'safe' | 'looking_for'

type PersonRow = {
  id: number
  record_type: RecordType
  full_name: string
  age: number | null
  photo_url?: string | null
  shelter_id?: number | null
  reporter_contact: string
  created_at: string
  match_score?: number
}

const VALID_TYPES: RecordType[] = ['safe', 'looking_for']
const fallbackPersons: PersonRow[] = []

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    })
  : null

pool?.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err)
})

function isDatabaseUnavailableError(err: any) {
  if (!err) return false

  const candidates: string[] = []
  let current = err

  while (current) {
    if (typeof current.message === 'string') candidates.push(current.message)
    if (typeof current.code === 'string') candidates.push(current.code)
    if (Array.isArray(current.errors)) {
      current.errors.forEach((item: any) => candidates.push(item?.message || ''))
    }
    current = current.cause || null
  }

  const joined = candidates.join(' ').toLowerCase()

  return (
    joined.includes('econnrefused') ||
    joined.includes('password authentication failed') ||
    joined.includes('does not exist') ||
    joined.includes('relation') ||
    joined.includes('connect') ||
    joined.includes('timeout') ||
    joined.includes('database') ||
    joined.includes('enotfound') ||
    joined.includes('28p01') ||
    joined.includes('08001')
  )
}

function normalizeType(value: string | null | undefined): RecordType | undefined {
  if (!value) return undefined
  return VALID_TYPES.includes(value as RecordType) ? (value as RecordType) : undefined
}

function getFallbackResults(type: string | null | undefined, q: string | null | undefined, limit: number) {
  let results = [...fallbackPersons]

  const normalizedType = normalizeType(type ?? undefined)
  if (normalizedType) {
    results = results.filter((person) => person.record_type === normalizedType)
  }

  if (q && q.trim() !== '') {
    const needle = q.trim().toLowerCase()
    results = results.filter((person) => person.full_name.toLowerCase().includes(needle))
  }

  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return results.slice(0, limit)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const q = searchParams.get('q')
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)

  if (type && !normalizeType(type)) {
    return NextResponse.json({ error: "type must be 'safe' or 'looking_for'" }, { status: 400 })
  }

  if (pool) {
    try {
      const conditions: string[] = []
      const values: any[] = []
      let similaritySelect = ''
      let orderClause = 'ORDER BY created_at DESC'

      if (q && q.trim() !== '') {
        values.push(q.trim())
        const valueIndex = `$${values.length}`
        similaritySelect = `, similarity(full_name, ${valueIndex}) AS match_score`
        conditions.push(`full_name % ${valueIndex}`)
        orderClause = 'ORDER BY match_score DESC'
      }

      if (type) {
        values.push(type)
        conditions.push(`record_type = $${values.length}`)
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
      values.push(limit)
      const limitClause = `LIMIT $${values.length}`

      const queryText = `
        SELECT id, record_type, full_name, age, photo_url, shelter_id, reporter_contact, created_at${similaritySelect}
        FROM persons
        ${whereClause}
        ${orderClause}
        ${limitClause};
      `

      const result = await pool.query(queryText, values)
      return NextResponse.json({ count: result.rowCount ?? result.rows.length, results: result.rows })
    } catch (err) {
      console.error('GET /api/persons error:', err)

      if (isDatabaseUnavailableError(err)) {
        const results = getFallbackResults(type, q, limit)
        return NextResponse.json({ count: results.length, results })
      }

      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

  const results = getFallbackResults(type, q, limit)
  return NextResponse.json({ count: results.length, results })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { record_type, full_name, age, photo_url, shelter_id, reporter_contact } = body

  if (!record_type || !VALID_TYPES.includes(record_type)) {
    return NextResponse.json({ error: "record_type must be 'safe' or 'looking_for'" }, { status: 400 })
  }
  if (!full_name || !String(full_name).trim()) {
    return NextResponse.json({ error: 'full_name is required' }, { status: 400 })
  }
  if (!reporter_contact || !String(reporter_contact).trim()) {
    return NextResponse.json({ error: 'reporter_contact is required' }, { status: 400 })
  }

  let parsedAge: number | null = null
  if (age !== undefined && age !== null && age !== '') {
    parsedAge = Number(age)
    if (Number.isNaN(parsedAge)) {
      return NextResponse.json({ error: 'age must be a valid number' }, { status: 400 })
    }
  }

  if (!pool) {
    const newPerson: PersonRow = {
      id: fallbackPersons.length ? fallbackPersons[fallbackPersons.length - 1].id + 1 : 1,
      record_type,
      full_name: String(full_name).trim(),
      age: parsedAge,
      photo_url: photo_url || null,
      shelter_id: shelter_id ?? null,
      reporter_contact: String(reporter_contact).trim(),
      created_at: new Date().toISOString(),
    }
    fallbackPersons.push(newPerson)

    const matches =
      record_type === 'looking_for'
        ? getFallbackResults('safe', newPerson.full_name, 5).filter((person) =>
            person.full_name.toLowerCase().includes(newPerson.full_name.toLowerCase()) ||
            newPerson.full_name.toLowerCase().includes(person.full_name.toLowerCase())
          )
        : []

    return NextResponse.json({
      message: 'Person record created successfully',
      person: newPerson,
      matchFound: matches.length > 0,
      matches,
    }, { status: 201 })
  }

  try {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const insertText = `
        INSERT INTO persons (record_type, full_name, age, photo_url, shelter_id, reporter_contact)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, record_type, full_name, age, photo_url, shelter_id, reporter_contact, created_at;
      `
      const insertValues = [
        record_type,
        String(full_name).trim(),
        parsedAge,
        photo_url || null,
        shelter_id || null,
        String(reporter_contact).trim(),
      ]

      const { rows: [newPerson] } = await client.query(insertText, insertValues)
      let matches: PersonRow[] = []

      if (record_type === 'looking_for') {
        await client.query(`SET LOCAL pg_trgm.similarity_threshold = 0.4`)

        const matchText = `
          SELECT id, record_type, full_name, age, photo_url, shelter_id, reporter_contact, created_at,
                 similarity(full_name, $1) AS match_score
          FROM persons
          WHERE record_type = 'safe'
            AND full_name % $1
          ORDER BY match_score DESC
          LIMIT 5;
        `
        const matchResult = await client.query(matchText, [newPerson.full_name])
        matches = matchResult.rows

        for (const match of matches) {
          const message = `Potential match: new "looking_for" report "${newPerson.full_name}" (ID ${newPerson.id}) is a ${(match.match_score * 100).toFixed(0)}% name match with existing "safe" record "${match.full_name}" (ID ${match.id}).`

          await client.query(
            `INSERT INTO notification_log (event_type, shelter_id, person_id, message)
             VALUES ('person_matched', $1, $2, $3)`,
            [match.shelter_id, newPerson.id, message]
          )
        }
      }

      await client.query('COMMIT')

      return NextResponse.json(
        {
          message: 'Person record created successfully',
          person: newPerson,
          matchFound: matches.length > 0,
          matches,
        },
        { status: 201 }
      )
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('POST /api/persons error:', err)

    if (isDatabaseUnavailableError(err)) {
      const newPerson: PersonRow = {
        id: fallbackPersons.length ? fallbackPersons[fallbackPersons.length - 1].id + 1 : 1,
        record_type,
        full_name: String(full_name).trim(),
        age: parsedAge,
        photo_url: photo_url || null,
        shelter_id: shelter_id ?? null,
        reporter_contact: String(reporter_contact).trim(),
        created_at: new Date().toISOString(),
      }

      fallbackPersons.push(newPerson)
      const matches =
        record_type === 'looking_for'
          ? getFallbackResults('safe', newPerson.full_name, 5).filter((person) =>
              person.full_name.toLowerCase().includes(newPerson.full_name.toLowerCase()) ||
              newPerson.full_name.toLowerCase().includes(person.full_name.toLowerCase())
            )
          : []

      return NextResponse.json(
        {
          message: 'Person record created successfully',
          person: newPerson,
          matchFound: matches.length > 0,
          matches,
        },
        { status: 201 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
