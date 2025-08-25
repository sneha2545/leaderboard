import React, { useEffect, useMemo, useRef, useState } from 'react'
import './styles.css'

const API_BASE = '' // Vite dev proxy handles /api to server

function RankBadge({ rank }){
  const cls = rank === 1 ? 'rank gold' : rank === 2 ? 'rank silver' : rank === 3 ? 'rank bronze' : 'rank'
  return <div className={cls}>{rank}</div>
}

export default function App() {
  const [scores, setScores] = useState([])
  const [name, setName] = useState(() => localStorage.getItem('lb:name') || '')
  const [score, setScore] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dbMode, setDbMode] = useState('')
  const confettiRef = useRef(null)
  const [pending, setPending] = useState(false)
  const [toast, setToast] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editScore, setEditScore] = useState('')
  const [editFocus, setEditFocus] = useState('name') // 'name' | 'score'
  const nameEditRef = useRef(null)
  const scoreEditRef = useRef(null)
  const [showTopModal, setShowTopModal] = useState(false)
  const [topSnapshot, setTopSnapshot] = useState(null)
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [filter, setFilter] = useState('')
  const [sortDir, setSortDir] = useState('desc') // 'desc' | 'asc'

  async function loadScores(retry = 0) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/scores?limit=10`)
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      const data = await res.json()
      setScores(data)
      if (data.length > 0) setTopSnapshot(data[0])
      return data
    } catch (e) {
      setError(e.message)
      if (retry < 3) {
        await new Promise(r => setTimeout(r, 500 * (retry + 1)))
        return loadScores(retry + 1)
      }
      return []
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadScores(); loadHealth() }, [])
  useEffect(() => {
    const t = setInterval(loadHealth, 10000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { localStorage.setItem('lb:name', name) }, [name])

  const canSubmit = useMemo(() => {
    const n = name.trim()
    const s = String(score).trim()
    if (!n) return false
    if (!/^\d+$/.test(s)) return false
    const v = Number(s)
    return Number.isFinite(v) && v >= 0 && v <= 1000000
  }, [name, score])

  const displayedScores = useMemo(() => {
    let arr = scores
    const q = filter.trim().toLowerCase()
    if (q) arr = arr.filter(x => x.name.toLowerCase().includes(q))
    arr = [...arr].sort((a,b) => sortDir === 'desc' ? (b.score - a.score) : (a.score - b.score))
    return arr
  }, [scores, filter, sortDir])

  async function onSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setError('')
    try {
      setPending(true)
      const res = await fetch(`${API_BASE}/api/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), score: Number(score) })
      })
      if (!res.ok) throw new Error(`Failed to submit: ${res.status}`)
      setScore('')
      const beforeTop = scores[0]?.score ?? -Infinity
  const newScores = await loadScores()
  const afterTop = newScores[0]?.score ?? -Infinity
  if (Number(score) >= afterTop && Number(score) > beforeTop) {
        triggerConfetti()
        setShowTopModal(true)
      }
      showToast('Score submitted')
    } catch (e) {
      setError(e.message)
    }
    finally {
      setPending(false)
    }
  }

  async function loadHealth(){
    try{
      const res = await fetch(`${API_BASE}/api/health`)
      if(!res.ok) return
      const data = await res.json()
      setDbMode(data.dbMode)
    }catch{}
  }

  function triggerConfetti(){
    const el = confettiRef.current
    if(!el) return
    el.animate([
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(-20px)', opacity: 0 }
    ], { duration: 800, easing: 'cubic-bezier(.2,.8,.2,1)' })
  }

  function showToast(msg){
    setToast(msg)
    setTimeout(() => setToast(''), 1500)
  }

  function copySummary(){
    const top = displayedScores.slice(0,3)
    if(top.length === 0){ showToast('No data'); return }
    const lines = ['Leaderboard Top 3:']
    top.forEach((r,i)=> lines.push(`${i+1}. ${r.name} — ${r.score}`))
    const text = lines.join('\n')
    navigator.clipboard?.writeText(text).then(()=> showToast('Copied top 3')).catch(()=> showToast('Copy failed'))
  }

  function exportCSV(){
    const rows = [['rank','name','score'], ...displayedScores.map((r,i)=>[String(i+1), r.name, String(r.score)])]
    const csv = rows.map(r => r.map(v => /[,"\n]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'leaderboard.csv'; document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
    showToast('Exported CSV')
  }

  async function startEdit(row, focus = 'name'){
    setEditingId(row._id)
    setEditName(row.name)
    setEditScore(String(row.score))
    setEditFocus(focus)
  }

  function cancelEdit(){
    setEditingId(null)
    setEditName('')
    setEditScore('')
  setMenuOpenId(null)
  }

  async function saveEdit(id){
  const payload = {}
  const n = editName.trim()
  const s = editScore.trim()
  if (n) payload.name = n
  if (/^\d+$/.test(s)) payload.score = Number(s)
  const current = scores.find(x => x._id === id) || {}
  const noChanges = (payload.name ?? current.name) === current.name && (payload.score ?? current.score) === current.score
  if (!('name' in payload) && !('score' in payload)) return showToast('Nothing to update')
  if (noChanges) return showToast('No changes')
  const ok = confirm(`Save changes for ${current.name ?? 'this score'}?`)
  if (!ok) return
    try{
      setPending(true)
      const res = await fetch(`${API_BASE}/api/scores/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      if(!res.ok) throw new Error(`Failed to update: ${res.status}`)
      await loadScores()
      showToast('Updated')
      cancelEdit()
    }catch(e){ setError(e.message) }
    finally{ setPending(false) }
  }

  useEffect(() => {
    if (!editingId) return
    const t = setTimeout(() => {
      if (editFocus === 'score') {
        scoreEditRef.current?.focus()
      } else {
        nameEditRef.current?.focus()
      }
    }, 0)
    return () => clearTimeout(t)
  }, [editingId, editFocus])

  async function deleteRow(id){
  const row = scores.find(x => x._id === id)
  const ok = confirm(`Delete ${row ? `${row.name} (${row.score})` : 'this score'}?`)
  if (!ok) return
    try{
      setPending(true)
      const res = await fetch(`${API_BASE}/api/scores/${id}`, { method:'DELETE' })
      if(res.status !== 204) throw new Error(`Failed to delete: ${res.status}`)
      await loadScores()
      showToast('Deleted')
    }catch(e){ setError(e.message) }
    finally{ setPending(false) }
  }

  function toggleMenu(id){
    setMenuOpenId(prev => prev === id ? null : id)
  }

  // Close menu when clicking outside or pressing Esc
  useEffect(() => {
    function onDocClick(){
      if (menuOpenId !== null) setMenuOpenId(null)
    }
    function onKey(e){
      if (e.key === 'Escape') {
        if (menuOpenId !== null) setMenuOpenId(null)
        if (editingId) cancelEdit()
      }
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpenId, editingId])

  return (
    <div className="container">
      <div className="header">
        <div className="brand">
          <div className="brand-badge">LB</div>
          <div>
            <h1 className="title">Leaderboard</h1>
            <p className="subtitle">Add your name and score — climb to the top!</p>
          </div>
        </div>
        {dbMode && (
          <div className="panel" style={{padding: '6px 10px'}}>
            <span style={{fontSize:12, color:'#94a3b8'}}>Database:</span>{' '}
            <strong style={{color: dbMode==='mongo' ? '#22d3ee' : '#f59e0b'}}>{dbMode==='mongo' ? 'MongoDB' : 'Memory (temp)'}</strong>
          </div>
        )}
      </div>

      <div className="panel" style={{marginTop: 16}}>
        <form onSubmit={onSubmit} className="form">
          <input className="input" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} maxLength={50} />
          <input className="input" placeholder="Score" value={score} onChange={e => setScore(e.target.value)} inputMode="numeric" />
          <button className="button" disabled={!canSubmit || pending}>{pending ? 'Saving…' : 'Submit'}</button>
        </form>
        {error && <p style={{ color: '#fca5a5', marginTop: 10 }}>Error: {error}</p>}
      </div>

      <div className="panel leaderboard">
        {loading ? (
          <div>
            {Array.from({length:5}).map((_,i)=> (
              <div className="row" key={i}>
                <div className="rank" style={{opacity:.6, background:'rgba(255,255,255,.03)'}}>{i+1}</div>
                <div className="name" style={{opacity:.5, background:'rgba(255,255,255,.03)', height:16, borderRadius:6, width:'60%'}} />
                <div className="score" style={{opacity:.5, background:'rgba(255,255,255,.03)', height:16, borderRadius:6}} />
              </div>
            ))}
          </div>
        ) : scores.length === 0 ? (
          <p className="subtitle">No scores yet. Be the first!</p>
        ) : (
          <div>
            <div className="controls" style={{marginBottom:12}}>
              <input className="control-input" placeholder="Filter by name" value={filter} onChange={e=>setFilter(e.target.value)} />
              <button className="control-btn" onClick={()=>setSortDir(d=>d==='desc'?'asc':'desc')}>Sort: {sortDir==='desc' ? 'High → Low' : 'Low → High'}</button>
              <button className="control-btn" onClick={copySummary}>Copy Top 3</button>
              <button className="control-btn" onClick={exportCSV}>Export CSV</button>
            </div>
            {displayedScores.length === 0 ? (
              <p className="subtitle">No matches. Try clearing the filter.</p>
            ) : null}
            {displayedScores.map((s, i) => (
              <div className="row" key={s._id ?? i} style={{gridTemplateColumns:'56px 1fr 160px 80px'}}>
                <RankBadge rank={i + 1} />
                <div className="name">
                  {editingId===s._id ? (
                    <input
                      className="input"
                      value={editName}
                      onChange={e=>setEditName(e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter') saveEdit(s._id); if(e.key==='Escape') cancelEdit() }}
                      ref={nameEditRef}
                      maxLength={50}
                    />
                  ) : s.name}
                </div>
                <div className="score">
                  {editingId===s._id ? (
                    <input
                      className="input"
                      value={editScore}
                      onChange={e=>setEditScore(e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter') saveEdit(s._id); if(e.key==='Escape') cancelEdit() }}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={1000000}
                      step={1}
                      ref={scoreEditRef}
                      style={{textAlign:'right'}}
                    />
                  ) : s.score}
                </div>
                <div style={{display:'flex', gap:8, justifyContent:'flex-end', position:'relative'}}>
                  {editingId===s._id ? (
                    <>
                      <button className="button" onClick={()=>saveEdit(s._id)} disabled={pending}>Save</button>
                      <button className="button" onClick={cancelEdit} disabled={pending} style={{background:'linear-gradient(135deg,#64748b,#334155)'}}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="icon-btn" aria-haspopup="menu" aria-expanded={menuOpenId===s._id} onClick={(e)=>{ e.stopPropagation(); toggleMenu(s._id) }} disabled={pending} title="Options">
                        ✏️
                      </button>
                      {menuOpenId===s._id && (
                        <div className="menu" role="menu" onClick={(e)=>e.stopPropagation()}>
                          <button className="menu-item" role="menuitem" onClick={()=>{ setMenuOpenId(null); startEdit(s,'name') }}>Edit</button>
                          <button className="menu-item danger" role="menuitem" onClick={()=>{ setMenuOpenId(null); deleteRow(s._id) }}>Delete</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

  <div ref={confettiRef} style={{position:'fixed', right:20, bottom:20, pointerEvents:'none'}}>🎉</div>
  {toast && <div className="toast">{toast}</div>}
      <div className="footer">Built with MERN • Dev: 5173 → 5050</div>

      {showTopModal && topSnapshot && (
        <div className="modal-backdrop" onClick={()=>setShowTopModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="popper">🎉🎊</div>
            <h3 className="modal-title">Top Score!</h3>
            <p className="modal-body">
              <strong>{topSnapshot.name}</strong> is leading with <strong>{topSnapshot.score}</strong> points.
            </p>
            <div className="modal-actions">
              <button className="button" onClick={()=>setShowTopModal(false)}>Nice!</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
