'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://aqassltxvrtegatlzkkl.supabase.co',
  'sb_publishable_u5A3pcpkyLXqQa6s2x-pxg_Vci2xypW'
);

export default function Dashboard() {
  const [inmobiliarias, setInmobiliarias] = useState([]);
  const [filtro, setFiltro] = useState('Todas provincias');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionada, setSeleccionada] = useState(null);
  const [notas, setNotas] = useState('');

  useEffect(() => {
    cargarDatos();
    const subscription = supabase
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inmobiliarias' }, cargarDatos)
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  const cargarDatos = async () => {
    const { data } = await supabase.from('inmobiliarias').select('*');
    setInmobiliarias(data || []);
  };

  const actualizarEstado = async (id, estado) => {
    const updates = {
      contactado: estado === 'contactada',
      no_contactado: estado === 'no_contactada',
      descartado: estado === 'descartada',
      agendado: estado === 'agendada',
    };
    await supabase.from('inmobiliarias').update(updates).eq('id', id);
    cargarDatos();
  };

  const guardarNotas = async () => {
    if (!seleccionada) return;
    await supabase.from('inmobiliarias').update({ notas }).eq('id', seleccionada.id);
    cargarDatos();
    setSeleccionada(null);
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
        <Metrica label="TOTAL" valor={total} />
        <Metrica label="CON VÍDEO" valor={`${conVideo} (${total ? Math.round((conVideo / total) * 100) : 0}%)`} />
        <Metrica label="CONTACTADAS" valor={contactadas} />
        <Metrica label="AGENDADAS" valor={agendadas} />
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Nombre</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Provincia</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Teléfono</th>
                <th style={{ textAlign: 'center', padding: '12px', fontWeight: 600 }}>Viviendas</th>
                <th style={{ textAlign: 'center', padding: '12px', fontWeight: 600 }}>Vídeo</th>
                <th style={{ textAlign: 'center', padding: '12px', fontWeight: 600 }}>Estado</th>
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
                    {inmo.produccion_visual && inmo.produccion_visual !== 'Solo fotos' ? '✓' : ''}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px' }}>
                    {inmo.contactado && <span style={{ color: '#16a34a' }}>✓ Contactada</span>}
                    {inmo.descartado && <span style={{ color: '#dc2626' }}>✗ Descartada</span>}
                    {inmo.agendado && <span style={{ color: '#2563eb' }}>📅 Agendada</span>}
                    {!inmo.contactado && !inmo.descartado && !inmo.agendado && <span style={{ color: '#999' }}>—</span>}
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
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', fontWeight: 600 }}>ESTADO</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <Boton
                  label="Contactada"
                  activo={seleccionada.contactado}
                  onClick={() => actualizarEstado(seleccionada.id, 'contactada')}
                  color="#16a34a"
                />
                <Boton
                  label="No contactada"
                  activo={seleccionada.no_contactado}
                  onClick={() => actualizarEstado(seleccionada.id, 'no_contactada')}
                  color="#f59e0b"
                />
                <Boton
                  label="Descartada"
                  activo={seleccionada.descartado}
                  onClick={() => actualizarEstado(seleccionada.id, 'descartada')}
                  color="#dc2626"
                />
                <Boton
                  label="Agendada"
                  activo={seleccionada.agendado}
                  onClick={() => actualizarEstado(seleccionada.id, 'agendada')}
                  color="#2563eb"
                />
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
                  minHeight: '120px',
                  resize: 'vertical',
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

function Metrica({ label, valor }) {
  return (
    <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
      <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>{valor}</p>
    </div>
  );
}

function Boton({ label, activo, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 12px',
        fontSize: '12px',
        border: `2px solid ${color}`,
        backgroundColor: activo ? color : 'white',
        color: activo ? 'white' : color,
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 600,
        transition: 'all 0.2s',
      }}
    >
      {label}
    </button>
  );
}
