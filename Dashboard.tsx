'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aqassltxvrtegatlzkkl.supabase.co'
const supabaseKey = 'sb_publishable_u5A3pcpkyLXqQa6s2x-pxg_Vci2xypW'
const supabase = createClient(supabaseUrl, supabaseKey)

interface Inmobiliaria {
  id: number
  nombre: string
  provincia: string
  telefono?: string
  jefe?: string
  viviendas_idealista?: number
  produccion_visual?: string
  contactado: boolean
  agendado: boolean
  no_contesta: boolean
  descartado: boolean
  no_contactado: boolean
  notas?: string
  horarios?: string
  fecha_agregada?: string
}

export default function Dashboard() {
  const [data, setData] = useState<Inmobiliaria[]>([])
  const [filteredData, setFilteredData] = useState<Inmobiliaria[]>([])
  const [search, setSearch] = useState('')
  const [provincia, setProvincia] = useState('')
  const [estado, setEstado] = useState('')
  const [provincias, setProvincias] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [metrics, setMetrics] = useState({
    total: 0,
    conVideo: 0,
    contactados: 0,
    agendados: 0,
  })

  // Cargar datos iniciales
  useEffect(() => {
    loadData()
  }, [])

  // Suscribirse a cambios en realtime
  useEffect(() => {
    const subscription = supabase
      .channel('inmobiliarias')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inmobiliarias' },
        () => {
          loadData()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function loadData() {
    try {
      const { data: result, error } = await supabase
        .from('inmobiliarias')
        .select('*')
        .order('fecha_agregada', { ascending: false })

      if (error) throw error

      const items = result || []
      setData(items)
      setFilteredData(items)

      // Extraer provincias únicas
      const provs = [...new Set(items.map((i) => i.provincia).filter(Boolean))]
        .sort() as string[]
      setProvincias(provs)

      // Calcular métricas
      const conVideo = items.filter(
        (i) => i.produccion_visual && i.produccion_visual.toLowerCase() !== 'no'
      ).length
      setMetrics({
        total: items.length,
        conVideo,
        contactados: items.filter((i) => i.contactado).length,
        agendados: items.filter((i) => i.agendado).length,
      })

      setLoading(false)
    } catch (err) {
      console.error('Error loading data:', err)
      setLoading(false)
    }
  }

  // Aplicar filtros
  useEffect(() => {
    let filtered = data

    if (search) {
      filtered = filtered.filter((i) =>
        i.nombre.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (provincia) {
      filtered = filtered.filter((i) => i.provincia === provincia)
    }

    if (estado) {
      if (estado === 'contactado') filtered = filtered.filter((i) => i.contactado)
      else if (estado === 'agendado') filtered = filtered.filter((i) => i.agendado)
      else if (estado === 'no_contesta') filtered = filtered.filter((i) => i.no_contesta)
      else if (estado === 'descartado') filtered = filtered.filter((i) => i.descartado)
      else if (estado === 'no_contactado') filtered = filtered.filter((i) => i.no_contactado)
    }

    setFilteredData(filtered)
  }, [search, provincia, estado, data])

  function getEstado(item: Inmobiliaria) {
    if (item.agendado) return 'Agendado'
    if (item.contactado) return 'Contactado'
    if (item.no_contesta) return 'No contesta'
    if (item.descartado) return 'Descartado'
    if (item.no_contactado) return 'No contactado'
    return '—'
  }

  const selectedItem = data.find((i) => i.id === selectedId)

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando datos...</div>
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1>Dashboard Inmobiliarias Luminaxe</h1>

      {/* Métricas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginBottom: '2rem',
          marginTop: '1rem',
        }}
      >
        <div style={{ padding: '1rem', background: '#f5f5f5', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            TOTAL INMOBILIARIAS
          </div>
          <div style={{ fontSize: '22px', fontWeight: 600 }}>{metrics.total}</div>
        </div>
        <div style={{ padding: '1rem', background: '#f5f5f5', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            CON VÍDEO
          </div>
          <div style={{ fontSize: '22px', fontWeight: 600 }}>
            {metrics.conVideo} ({metrics.total ? Math.round((metrics.conVideo / metrics.total) * 100) : 0}%)
          </div>
        </div>
        <div style={{ padding: '1rem', background: '#f5f5f5', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            CONTACTADAS
          </div>
          <div style={{ fontSize: '22px', fontWeight: 600 }}>{metrics.contactados}</div>
        </div>
        <div style={{ padding: '1rem', background: '#f5f5f5', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            AGENDADAS
          </div>
          <div style={{ fontSize: '22px', fontWeight: 600 }}>{metrics.agendados}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '180px' }}
        />
        <select value={provincia} onChange={(e) => setProvincia(e.target.value)}>
          <option value="">Todas las provincias</option>
          {provincias.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="contactado">Contactado</option>
          <option value="agendado">Agendado</option>
          <option value="no_contesta">No contesta</option>
          <option value="descartado">Descartado</option>
          <option value="no_contactado">No contactado</option>
        </select>
      </div>

      {/* Tabla */}
      <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Provincia</th>
              <th style={{ textAlign: 'center' }}>Viviendas</th>
              <th style={{ textAlign: 'center' }}>Vídeo</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th>Contacto</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                style={{ cursor: 'pointer' }}
              >
                <td>{item.nombre}</td>
                <td style={{ fontSize: '13px', color: '#666' }}>{item.provincia || '—'}</td>
                <td style={{ textAlign: 'center', fontSize: '13px', color: '#666' }}>
                  {item.viviendas_idealista || 0}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: item.produccion_visual && item.produccion_visual.toLowerCase() !== 'no' ? '#d4edda' : '#fff3cd',
                      color: item.produccion_visual && item.produccion_visual.toLowerCase() !== 'no' ? '#155724' : '#856404',
                    }}
                  >
                    {item.produccion_visual || 'No'}
                  </span>
                </td>
                <td style={{ fontSize: '13px', textAlign: 'center' }}>
                  {getEstado(item)}
                </td>
                <td style={{ fontSize: '13px', color: '#666' }}>
                  {item.telefono || item.jefe || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Panel de detalles */}
      {selectedItem && (
        <div
          style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: '#f5f5f5',
            borderRadius: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h2 style={{ marginTop: 0, marginBottom: '8px' }}>{selectedItem.nombre}</h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                {selectedItem.provincia}
              </p>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#666',
              }}
            >
              ✕
            </button>
          </div>

          {[selectedItem.agendado && 'Agendado',
            selectedItem.contactado && 'Contactado',
            selectedItem.no_contesta && 'No contesta',
            selectedItem.descartado && 'Descartado',
            selectedItem.no_contactado && 'No contactado',
          ]
            .filter(Boolean)
            .length > 0 && (
            <div style={{ display: 'flex', gap: '8px', margin: '1rem 0', flexWrap: 'wrap' }}>
              {[selectedItem.agendado && 'Agendado',
                selectedItem.contactado && 'Contactado',
                selectedItem.no_contesta && 'No contesta',
                selectedItem.descartado && 'Descartado',
                selectedItem.no_contactado && 'No contactado',
              ]
                .filter(Boolean)
                .map((badge) => (
                  <span
                    key={badge}
                    style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: '#e3f2fd',
                      color: '#1976d2',
                    }}
                  >
                    {badge}
                  </span>
                ))}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginTop: '1.5rem',
            }}
          >
            {selectedItem.telefono && (
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
                  Teléfono
                </p>
                <p style={{ margin: 0, marginTop: '4px', fontSize: '14px' }}>
                  {selectedItem.telefono}
                </p>
              </div>
            )}
            {selectedItem.jefe && (
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
                  Jefe
                </p>
                <p style={{ margin: 0, marginTop: '4px', fontSize: '14px' }}>
                  {selectedItem.jefe}
                </p>
              </div>
            )}
            {selectedItem.viviendas_idealista && (
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
                  Viviendas (Idealista)
                </p>
                <p style={{ margin: 0, marginTop: '4px', fontSize: '14px' }}>
                  {selectedItem.viviendas_idealista}
                </p>
              </div>
            )}
            {selectedItem.produccion_visual && (
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
                  Producción visual
                </p>
                <p style={{ margin: 0, marginTop: '4px', fontSize: '14px' }}>
                  {selectedItem.produccion_visual}
                </p>
              </div>
            )}
            {selectedItem.horarios && (
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
                  Horarios
                </p>
                <p style={{ margin: 0, marginTop: '4px', fontSize: '14px' }}>
                  {selectedItem.horarios}
                </p>
              </div>
            )}
          </div>

          {selectedItem.notas && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #ddd' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
                Notas
              </p>
              <p style={{ margin: 0, marginTop: '8px', fontSize: '14px', lineHeight: 1.6 }}>
                {selectedItem.notas}
              </p>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        h1 {
          font-size: 22px;
          font-weight: 500;
          margin-bottom: 1rem;
        }

        h2 {
          font-size: 18px;
          font-weight: 500;
          color: #1a1a1a;
        }

        @media (prefers-color-scheme: dark) {
          h2 {
            color: #ffffff;
          }

          div[style*='background: #f5f5f5'] {
            background: #1a1a1a !important;
          }
        }
      `}</style>
    </div>
  )
}
