'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aqassltxvrtegatlzkkl.supabase.co'
const supabaseKey = 'sb_publishable_u5A3pcpkyLXqQa6s2x-pxg_Vci2xypW'
const supabase = createClient(supabaseUrl, supabaseKey)

export default function Dashboard() {
  const [data, setData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [search, setSearch] = useState('')
  const [provincia, setProvincia] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const subscription = supabase
      .channel('inmobiliarias')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inmobiliarias' }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function loadData() {
    try {
      const { data: result } = await supabase
        .from('inmobiliarias')
        .select('*')
        .order('fecha_agregada', { ascending: false })

      setData(result || [])
      setFilteredData(result || [])
      setLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = data

    if (search) {
      filtered = filtered.filter((i: any) =>
        i.nombre.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (provincia) {
      filtered = filtered.filter((i: any) => i.provincia === provincia)
    }

    setFilteredData(filtered)
  }, [search, provincia, data])

  const provincias = [...new Set(data.map((i: any) => i.provincia).filter(Boolean))].sort()
  const selectedItem = data.find((i: any) => i.id === selectedId)

  const total = data.length
  const conVideo = data.filter((i: any) => i.produccion_visual && i.produccion_visual.toLowerCase() !== 'no').length
  const contactados = data.filter((i: any) => i.contactado).length
  const agendados = data.filter((i: any) => i.agendado).length

  if (loading) return <div style={{padding: '2rem'}}>Cargando...</div>

  return (
    <div style={{maxWidth: '1200px', margin: '0 auto', padding: '2rem'}}>
      <h1>Dashboard Luminaxe</h1>

      {/* Metrics */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '2rem'}}>
        <div style={{padding: '1rem', background: '#f5f5f5', borderRadius: '6px'}}>
          <div style={{fontSize: '12px', color: '#666'}}>TOTAL</div>
          <div style={{fontSize: '22px', fontWeight: 600}}>{total}</div>
        </div>
        <div style={{padding: '1rem', background: '#f5f5f5', borderRadius: '6px'}}>
          <div style={{fontSize: '12px', color: '#666'}}>CON VÍDEO</div>
          <div style={{fontSize: '22px', fontWeight: 600}}>{conVideo} ({total ? Math.round((conVideo / total) * 100) : 0}%)</div>
        </div>
        <div style={{padding: '1rem', background: '#f5f5f5', borderRadius: '6px'}}>
          <div style={{fontSize: '12px', color: '#666'}}>CONTACTADAS</div>
          <div style={{fontSize: '22px', fontWeight: 600}}>{contactados}</div>
        </div>
        <div style={{padding: '1rem', background: '#f5f5f5', borderRadius: '6px'}}>
          <div style={{fontSize: '12px', color: '#666'}}>AGENDADAS</div>
          <div style={{fontSize: '22px', fontWeight: 600}}>{agendados}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{flex: 1, minWidth: '180px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px'}}
        />
        <select 
          value={provincia} 
          onChange={(e) => setProvincia(e.target.value)}
          style={{padding: '8px', border: '1px solid #ddd', borderRadius: '4px'}}
        >
          <option value="">Todas provincias</option>
          {provincias.map((p: any) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{overflowX: 'auto', border: '1px solid #ddd', borderRadius: '4px'}}>
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{background: '#f5f5f5'}}>
              <th style={{padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd'}}>Nombre</th>
              <th style={{padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd'}}>Provincia</th>
              <th style={{padding: '12px', textAlign: 'center', borderBottom: '1px solid #ddd'}}>Viviendas</th>
              <th style={{padding: '12px', textAlign: 'center', borderBottom: '1px solid #ddd'}}>Vídeo</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item: any) => (
              <tr 
                key={item.id} 
                onClick={() => setSelectedId(item.id)}
                style={{cursor: 'pointer', borderBottom: '1px solid #eee'}}
              >
                <td style={{padding: '12px'}}>{item.nombre}</td>
                <td style={{padding: '12px', color: '#666'}}>{item.provincia}</td>
                <td style={{padding: '12px', textAlign: 'center'}}>{item.viviendas_idealista || 0}</td>
                <td style={{padding: '12px', textAlign: 'center'}}>
                  <span style={{display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: item.produccion_visual?.toLowerCase() !== 'no' ? '#d4edda' : '#fff3cd', color: item.produccion_visual?.toLowerCase() !== 'no' ? '#155724' : '#856404'}}>
                    {item.produccion_visual || 'No'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Panel */}
      {selectedItem && (
        <div style={{marginTop: '2rem', padding: '1.5rem', background: '#f5f5f5', borderRadius: '6px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start'}}>
            <div>
              <h2 style={{margin: '0 0 8px', fontSize: '18px', fontWeight: 600}}>{selectedItem.nombre}</h2>
              <p style={{margin: 0, fontSize: '13px', color: '#666'}}>{selectedItem.provincia}</p>
            </div>
            <button onClick={() => setSelectedId(null)} style={{background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer'}}>✕</button>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem'}}>
            {selectedItem.telefono && (
              <div>
                <p style={{margin: 0, fontSize: '12px', color: '#666', textTransform: 'uppercase'}}>Teléfono</p>
                <p style={{margin: '4px 0 0', fontSize: '14px'}}>{selectedItem.telefono}</p>
              </div>
            )}
            {selectedItem.jefe && (
              <div>
                <p style={{margin: 0, fontSize: '12px', color: '#666', textTransform: 'uppercase'}}>Jefe</p>
                <p style={{margin: '4px 0 0', fontSize: '14px'}}>{selectedItem.jefe}</p>
              </div>
            )}
            {selectedItem.horarios && (
              <div>
                <p style={{margin: 0, fontSize: '12px', color: '#666', textTransform: 'uppercase'}}>Horarios</p>
                <p style={{margin: '4px 0 0', fontSize: '14px'}}>{selectedItem.horarios}</p>
              </div>
            )}
          </div>

          {selectedItem.notas && (
            <div style={{marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #ddd'}}>
              <p style={{margin: 0, fontSize: '12px', color: '#666', textTransform: 'uppercase'}}>Notas</p>
              <p style={{margin: '8px 0 0', fontSize: '14px', lineHeight: 1.6}}>{selectedItem.notas}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
