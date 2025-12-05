import React, { useEffect, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend, ArcElement } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ArcElement)
import io from 'socket.io-client'
import { API_BASE_URL } from '../config'

function SummaryCard({ title, value }: { title: string, value: any }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  )
}

export default function Dashboard({ data }: { data: any }) {
  const [toasts, setToasts] = useState<string[]>([]);

  useEffect(() => {
    const socket = io(API_BASE_URL);
    socket.on('severity_alert', (d: any) => setToasts(t => [...t, `Severity ${d.severity} for ${d.fileName} (${Math.round(d.qualityScore)})`]))
    socket.on('cross_file_duplicates', (d: any) => setToasts(t => [...t, `Cross-file duplicates detected: ${d.duplicates.length}`]))
    socket.on('financial_alert', (d: any) => setToasts(t => [...t, `High affected amount: ${d.totalAffectedAmount}`]))
    socket.on('quality_alert', (d: any) => setToasts(t => [...t, `Low quality score: ${Math.round(d.qualityScore)}`]))
    return () => { socket.disconnect(); }
  }, [])

  const breakdown = data.issuesBreakdown && data.issuesBreakdown.length ? data.issuesBreakdown : (data.issues || []).map((s: string) => {
    const [k, v] = s.split(':').map((x: string) => x.trim())
    return { name: k, count: Number(v || 0), affectedAmount: 0 }
  })

  const issueLabels = breakdown.map((b: any) => b.name)
  const issueCounts = breakdown.map((b: any) => b.count)

  const barData = {
    labels: issueLabels,
    datasets: [
      {
        label: 'Issue Count',
        data: issueCounts,
        backgroundColor: '#60a5fa'
      }
    ]
  }

  function rowClassForRow(r: any, idx: number) {
    const base = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
    const hasIssues = Array.isArray(r.issues) && r.issues.length > 0;
    if (!hasIssues) return base;
    if (data.severity === 'CRITICAL' || data.severity === 'HIGH') return 'bg-red-100';
    if (data.severity === 'MEDIUM') return 'bg-orange-100';
    return 'bg-yellow-100';
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <SummaryCard title="Total Records" value={data.totalRecords} />
        <SummaryCard title="Total Issues" value={data.totalIssues} />
        <SummaryCard title="Quality Score" value={Math.round(data.qualityScore)} />
        <SummaryCard title="Severity" value={data.severity} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Data Table</h3>
          <div className="overflow-auto max-h-64">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th>claimId</th><th>patient</th><th>diagnosis</th><th>amount</th><th>provider</th><th>date</th><th>issues</th>
                </tr>
              </thead>
              <tbody>
                {data.parsed.map((r: any, idx: number) => {
                  const cls = rowClassForRow(r, idx);
                  return (
                    <tr key={idx} className={`${cls}`}>
                      <td className="p-1">{r.claimId}</td>
                      <td className="p-1">{r.patientName}</td>
                      <td className="p-1">{r.diagnosisCode}</td>
                      <td className="p-1">{r.amount}</td>
                      <td className="p-1">{r.provider}</td>
                      <td className="p-1">{r.date}</td>
                      <td className="p-1">
                        {Array.isArray(r.issues) && r.issues.length ? (
                          <div className="text-xs text-red-700">
                            {r.issues.map((it: any, i: number) => <div key={i}>{it.type}{it.detail ? ` (${it.detail})` : ''}</div>)}
                          </div>
                        ) : <span className="text-xs text-gray-500">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Issue Distribution (Counts)</h3>
          <div style={{ width: '100%', height: 220 }}>
            <Bar data={barData} />
          </div>

          <h4 className="mt-4 font-semibold">Impact Analysis</h4>
          <div className="mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left"><th>Issue</th><th>Count</th><th>Amount At Risk</th></tr>
              </thead>
              <tbody>
                {breakdown.map((b: any, idx: number) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-1">{b.name}</td>
                    <td className="p-1">{b.count}</td>
                    <td className="p-1">${(b.affectedAmount || 0).toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="p-1">Total at Risk (unique records)</td>
                  <td className="p-1">{data.totalIssues > 0 ? '—' : '0'}</td>
                  <td className="p-1">${(data.totalAffectedAmount || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {data.anomalies && data.anomalies.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-purple-700">Anomaly Detection</h4>
              <div className="mt-2 max-h-40 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left"><th>Type</th><th>Detail</th><th>Severity</th></tr>
                  </thead>
                  <tbody>
                    {data.anomalies
                      .filter((a: any) => !a.type.startsWith('Schema Error'))
                      .map((a: any, idx: number) => (
                        <tr key={idx} className="bg-purple-50">
                          <td className="p-1">{a.type}</td>
                          <td className="p-1 text-xs">{a.detail}</td>
                          <td className="p-1">
                            <span className={`px-2 py-1 rounded text-xs ${a.severity === 'CRITICAL' ? 'bg-red-200 text-red-800' :
                              a.severity === 'HIGH' ? 'bg-orange-200 text-orange-800' :
                                a.severity === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' :
                                  'bg-blue-200 text-blue-800'
                              }`}>{a.severity}</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed right-4 bottom-4 space-y-2">
        {toasts.slice(-4).map((t, i) => (
          <div key={i} className="bg-white p-3 rounded shadow">{t}</div>
        ))}
      </div>
    </div >
  )
}
