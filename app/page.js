'use client';

import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [inmobiliarias, setInmobiliarias] = useState([]);
  const [filtro, setFiltro] = useState('Todas provincias');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionada, setSeleccionada] = useState(null);
  const [notas, setNotas] = useState('');
  const [supabase, setSupabase] = useState(null);
  const [actualizando, setActualizando] = useState(false);

  useEffect(() => {
    const initSupabase = async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const client = createClient(
        'https://aqassltxvrtegatlzkkl.supabase.co',
        'sb_publishable_u5A3pcpkyLXqQa6s2x-pxg_Vci2xypW'
      );
      setSupabase(client);
      cargarDatos(client);
      
      const subscription = client
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inmobiliarias' }, () => cargarDatos(client))
        .subscribe();
      
      return () => subscription.unsubscribe();
    };
    
    initSupabase();
  }, []);

  const cargarDatos = async (client) => {
    const { data } = await client.from('inmobiliarias').select('*');
    setInmobiliarias(data || []);
  };

  const cambiarEstado = async (id, estado) => {
    if (!supabase || actualizando) return;
    
    setActualizando(true);
    
    try {
      const updates = {
        contactado: estado === 'contactada',
        no_contactado: estado === 'no_contactada',
        descartado: estado === 'descartada',
        agendado: estado === 'agendada',
      };
      
      const { error } = await supabase
        .from('inmobiliarias')
        .update(updates)
        .eq('id', id);
      
      if (!error) {
        await cargarDatos(supabase);
        if (seleccionada?.id === id) {
          setSeleccionada({ ...seleccionada, ...updates });
        }
      }
    } catch (err) {
      console.error('Error al actualizar:', err);
    } finally {
      setActualizando(false);
    }
  };

  const guardarNotas = async () => {
    if (!seleccionada || !supabase) return;
    
    const { error } = await supabase
      .from('inmobiliarias')
      .update({ notas })
      .eq('id', seleccionada.id);
    
    if (!error) {
      cargarDatos(supabase);
      setSeleccionada(null);
    }
  };

  const filtradas = inmobiliarias.filter((inmo) => {
    const provinciaOk = filtro === 'Todas provincias' || inmo.provincia === filtro;
    const nombreOk = inmo.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return provinciaOk && nombreOk;
  });

  const provincias = ['Todas provincias', ...new Set(inmobiliarias.map((i) => i.provincia))];
  const total = inmobiliarias.length;
  const conVideo = inmobiliarias.filter((i) => i.produccion_visual && i.produccion_visual !== 'Solo fotos').length;
  const contactadas = inmobiliarias.filter((i) => i.contactado).length;
  const agendadas = inmobiliarias.filter((i) => i.agendado).length;

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
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        />
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          {provincias.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Nombre</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Provincia</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Telefono</th>
                <th style={{ textAlign: 'center', padding: '12px', fontWeight: 600 }}>Viviendas</th>
                <th style={{ textAlign: 'center', padding: '12px', fontWeight: 600 }}>Video</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((inmo) => (
                <tr
                  key={inmo.id}
                  onClick={() => {
                    setSeleccionada(inmo);
                    setNotas(inmo.notas || '');
                  }}
                  style={{
                    borderBottom: '1px solid #eee',
                    backgroundColor: seleccionada?.id === inmo.id ? '#f0f0f0' : 'white',
                    cursor: 'pointer',
                  }}
                >
                  <td style={{ padding: '12px' }}>{inmo.nombre}</td>
                  <td style={{ padding: '12px' }}>{inmo.provincia}</td>
                  <td style={{ padding: '12px' }}>
                    <a href={`tel:${inmo.telefono}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
                      {inmo.telefono}
                    </a>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{inmo.viviendas_idealista}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {inmo.produccion_visual && inmo.produccion_visual !== 'Solo fotos' ? 'Si' : 'No'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', fontWeight: 500 }}>
                    {inmo.contactado && <span style={{ backgroundColor: '#16a34a', color: 'white', padding: '3px 8px', borderRadius: '3px' }}>Contactada</span>}
                    {inmo.no_contactado && <span style={{ backgroundColor: '#f59e0b', color: 'white', padding: '3px 8px', borderRadius: '3px' }}>No contactada</span>}
                    {inmo.descartado && <span style={{ backgroundColor: '#dc2626', color: 'white', padding: '3px 8px', borderRadius: '3px' }}>Descartada</span>}
                    {inmo.agendado && <span style={{ backgroundColor: '#2563eb', color: 'white', padding: '3px 8px', borderRadius: '3px' }}>Agendada</span>}
                    {!inmo.contactado && !inmo.no_contactado && !inmo.descartado && !inmo.agendado && <span style={{ color: '#999' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {seleccionada && (
          <div
            style={{
              backgroundColor: '#f9f9f9',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '1rem',
              height: 'fit-content',
              position: 'sticky',
              top: '20px',
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px' }}>{seleccionada.nombre}</h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', fontWeight: 600 }}>CAMBIAR ESTADO</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
                <button
                  onClick={() => cambiarEstado(seleccionada.id, 'contactada')}
                  disabled={actualizando}
                  style={{
                    padding: '10px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: actualizando ? 'not-allowed' : 'pointer',
                    backgroundColor: seleccionada.contactado ? '#16a34a' : '#f3f3f3',
                    color: seleccionada.contactado ? 'white' : '#333',
                    opacity: actualizando ? 0.6 : 1,
                  }}
                >
                  ✓ Contactada
                </button>
                <button
                  onClick={() => cambiarEstado(seleccionada.id, 'no_contactada')}
                  disabled={actualizando}
                  style={{
                    padding: '10px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: actualizando ? 'not-allowed' : 'pointer',
                    backgroundColor: seleccionada.no_contactado ? '#f59e0b' : '#f3f3f3',
                    color: seleccionada.no_contactado ? 'white' : '#333',
                    opacity: actualizando ? 0.6 : 1,
                  }}
                >
                  ⏱ No contactada
                </button>
                <button
                  onClick={() => cambiarEstado(seleccionada.id, 'descartada')}
                  disabled={actualizando}
                  style={{
                    padding: '10px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: actualizando ? 'not-allowed' : 'pointer',
                    backgroundColor: seleccionada.descartado ? '#dc2626' : '#f3f3f3',
                    color: seleccionada.descartado ? 'white' : '#333',
                    opacity: actualizando ? 0.6 : 1,
                  }}
                >
                  ✗ Descartada
                </button>
                <button
                  onClick={() => cambiarEstado(seleccionada.id, 'agendada')}
                  disabled={actualizando}
                  style={{
                    padding: '10px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: actualizando ? 'not-allowed' : 'pointer',
                    backgroundColor: seleccionada.agendado ? '#2563eb' : '#f3f3f3',
                    color: seleccionada.agendado ? 'white' : '#333',
                    opacity: actualizando ? 0.6 : 1,
                  }}
                >
                  📅 Agendada
                </button>
              </div>
            </div>

            <div>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', fontWeight: 600 }}>ANOTACIONES</p>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Añade notas sobre esta inmobiliaria..."
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  minHeight: '100px',
                  resize: 'vertical',
                  boxSizing: 'border-box',
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
                  cursor: 'pointer',
                }}
              >
                Guardar notas
              </button>
            </div>

            <button
              onClick={() => setSeleccionada(null)}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '8px',
                backgroundColor: '#f3f3f3',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
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
