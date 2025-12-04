import React, { useState } from 'react'
import Upload from './components/Upload'
import Dashboard from './components/Dashboard'

export default function App(){
  const [result, setResult] = useState<any>(null)

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Healthcare Claim Data Quality Dashboard</h1>
        <Upload onResult={setResult} />
        {result && <Dashboard data={result} />}
      </div>
    </div>
  )
}
