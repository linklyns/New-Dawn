import { useState } from 'react'
import './App.css'

type HealthResponse = {
  success: boolean
  message: string
  sampleValue?: string | null
  error?: string
}

function App() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<HealthResponse | null>(null)

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7251'

  const runDbCheck = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch(`${apiBaseUrl}/health/db`)
      const data = (await response.json()) as HealthResponse

      if (!response.ok) {
        setResult({
          success: false,
          message: data.message ?? 'Database connection failed.',
          error: data.error,
        })
        return
      }

      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: 'Could not reach backend API.',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app">
      <h1>New Dawn Connection Check</h1>
      <p className="hint">Backend: {apiBaseUrl}</p>

      <button type="button" onClick={runDbCheck} disabled={loading}>
        {loading ? 'Checking...' : 'Test Supabase Connection'}
      </button>

      {result && (
        <section className={`result ${result.success ? 'ok' : 'error'}`}>
          <p>{result.message}</p>
          {result.sampleValue && <p>Sample value: {result.sampleValue}</p>}
          {result.error && <p>Error: {result.error}</p>}
        </section>
      )}
    </main>
  )
}

export default App
