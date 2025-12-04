import React, { useState } from 'react'
import axios from 'axios'

export default function Upload({ onResult }:{ onResult: (r:any)=>void }){
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent){
    e.preventDefault();
    if (!file) return alert('Select CSV');
    const fd = new FormData();
    fd.append('file', file);
    setLoading(true);
    try{
      const res = await axios.post('http://localhost:3000/api/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onResult(res.data);
    }catch(err:any){
      alert(err?.response?.data?.error || err.message);
    }finally{ setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="bg-white p-4 rounded shadow mb-4">
      <div className="flex items-center gap-3">
        <input type="file" accept="text/csv" onChange={e=>setFile(e.target.files?.[0]||null)} />
        <button className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>{loading? 'Uploading...':'Upload CSV'}</button>
      </div>
    </form>
  )
}
