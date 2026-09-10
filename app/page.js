'use client';

import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [inmobiliarias, setInmobiliarias] = useState([]);
  const [filtro, setFiltro] = useState('Todas provincias');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionada, setSeleccionada] = useState(null);
  const [notas, setNotas] = useState('');
  const [supabase, setSupabase] = useState(null);

  useEffect(() => {
    const init = async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const client = createClient(
        'https://aqassltxvrtegatlzkkl.supabase.co',
        'sb_publishable_u5A3pcpkyLXqQa6s2x-pxg_Vci2xypW'
      );
      setSupabase(client);
      
      const { data } = await client.from('inmobiliarias').select('*');
      setInmobiliarias(data || []);
      
      client
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inmobiliarias' }, async () => {
          const { data } = await client.from('inmobiliarias').select('*');
          setInmobiliarias(data || []);
        })
        .subscribe();
    };
    init();
  }, []);

  const actualizarEstado = async (id, tipo) => {
    if (!supabase) return;

    // Actualizar estado local primero
    const updated = inmobiliarias.map(inmo => {
      if (inmo.id === id) {
        return {
          ...inmo,
          contactado: tipo === 'contactada',
          no_contactado: tipo === 'no_contactada',
          descartado: tipo === 'descartada',
          agendado: tipo === 'agendada'
        };
      }
      return inmo;
    });
    setInmobiliarias(updated);
    setSeleccionada(updated.find(i => i.id === id) || null);

    // Guardar en BD
    await supabase.from('inmobiliarias').update({
      contactado: tipo === 'contactada',
      no_contactado: tipo === 'no_contactada',
      descartado: tipo === 'descartada',
      agendado: tipo === 'agendada'
    }).eq('id', id);
  };

  const guardarNotas = async () => {
    if (!seleccionada || !supabase) return;
    await supabase.from('inmobiliarias').update({ notas }).eq('id', seleccionada.id);
    setSeleccionada(null);
  };

  const filtradas = inmobiliarias.filter(inmo => {
    const provinciaOk = filtro === 'Todas provincias' || inmo.provincia === filtro;
    const nombreOk = inmo.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return provinciaOk && nombreOk;
  });

  const provincias = ['Todas provincias', ...new Set(inmobiliarias.map(i => i.provincia))];
  const total = inmobiliarias.length;
  const conVideo = inmobiliarias.filter(i => i.produccion_visual && i.produccion_visual !== 'Solo fotos').length;
  const contactadas = inmobiliarias.filter(i => i.contactado).length;
  const agendadas = inmobiliarias.filter(i => i.agendado).length;

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>Dashboard Luminaxe</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666' }}>TOTAL</p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>{total}</p>
        </div>
        <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666' }}>CON VIDEO</p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>{conVideo} ({total ? Math.round((conVideo / total) * 100) : 0}%)</p>
        </div>
        <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666' }}>CONTACTADAS</p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>{contactadas}</p>
        </div>
        <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666' }}>AGENDADAS</p>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>{agendadas}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Buscar..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
        />
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
        >
          {provincias.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '1.5rem' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f9f9f9' }}>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 700 }}>Nombre</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 700 }}>Provincia</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 700 }}>Telefono</th>
                <th style={{ textAlign: 'center', padding: '12px', fontWeight: 700 }}>Viviendas</th>
                <th style={{ textAlign: 'center', padding: '12px', fontWeight: 700 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(inmo => (
                <tr
                  key={inmo.id}
                  onClick={() => { setSeleccionada(inmo); setNotas(inmo.notas || ''); }}
                  style={{
                    borderBottom: '1px solid #eee',
                    backgroundColor: seleccionada?.id === inmo.id ? '#e8f4f8' : 'white',
                    cursor: 'pointer',
                  }}
                >
                  <td style={{ padding: '12px' }}><strong>{inmo.nombre}</strong></td>
                  <td style={{ padding: '12px' }}>{inmo.provincia}</td>
                  <td style={{ padding: '12px' }}><a href={`tel:${inmo.telefono}`} style={{ color: '#0066cc' }}>{inmo.telefono}</a></td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{inmo.viviendas_idealista}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {inmo.contactado && <span style={{ backgroundColor: '#16a34a', color: 'white', padding: '4px 12px', borderRadius: '4px', fontWeight: 600, fontSize: '12px' }}>Contactada</span>}
                    {inmo.no_contactado && <span style={{ backgroundColor: '#f59e0b', color: 'white', padding: '4px 12px', borderRadius: '4px', fontWeight: 600, fontSize: '12px' }}>No contactada</span>}
                    {inmo.descartado && <span style={{ backgroundColor: '#dc2626', color: 'white', padding: '4px 12px', borderRadius: '4px', fontWeight: 600, fontSize: '12px' }}>Descartada</span>}
                    {inmo.agendado && <span style={{ backgroundColor: '#2563eb', color: 'white', padding: '4px 12px', borderRadius: '4px', fontWeight: 600, fontSize: '12px' }}>Agendada</span>}
                    {!inmo.contactado && !inmo.no_contactado && !inmo.descartado && !inmo.agendado && <span style={{ color: '#999' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {seleccionada && (
          <div style={{ backgroundColor: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem', height: 'fit-content', position: 'sticky', top: '20px' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '16px', fontWeight: 700 }}>{seleccionada.nombre}</h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#999', fontWeight: 700, textTransform: 'uppercase' }}>Selecciona Estado</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                <button
                  onClick={() => actualizarEstado(seleccionada.id, 'contactada')}
                  style={{
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: seleccionada.contactado ? '#16a34a' : '#e5e5e5',
                    color: seleccionada.contactado ? 'white' : '#333',
                    transition: 'all 0.2s'
                  }}
                >
                  ✓ Contactada
                </button>
                <button
                  onClick={() => actualizarEstado(seleccionada.id, 'no_contactada')}
                  style={{
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: seleccionada.no_contactado ? '#f59e0b' : '#e5e5e5',
                    color: seleccionada.no_contactado ? 'white' : '#333',
                    transition: 'all 0.2s'
                  }}
                >
                  ⏱ No contactada
                </button>
                <button
                  onClick={() => actualizarEstado(seleccionada.id, 'descartada')}
                  style={{
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: seleccionada.descartado ? '#dc2626' : '#e5e5e5',
                    color: seleccionada.descartado ? 'white' : '#333',
                    transition: 'all 0.2s'
                  }}
                >
                  ✗ Descartada
                </button>
                <button
                  onClick={() => actualizarEstado(seleccionada.id, 'agendada')}
                  style={{
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: seleccionada.agendado ? '#2563eb' : '#e5e5e5',
                    color: seleccionada.agendado ? 'white' : '#333',
                    transition: 'all 0.2s'
                  }}
                >
                  📅 Agendada
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#999', fontWeight: 700, textTransform: 'uppercase' }}>Anotaciones</p>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Anade notas..."
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '12px',
                  minHeight: '100px',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
              <button
                onClick={guardarNotas}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  padding: '8px',
                  backgroundColor: '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Guardar notas
              </button>
            </div>

            <button
              onClick={() => setSeleccionada(null)}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
