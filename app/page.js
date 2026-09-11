'use client';

import { useEffect, useState } from 'react';

const ESTADOS = [
  { valor: '', etiqueta: '— Sin estado —', color: '#999' },
  { valor: 'contactada', etiqueta: 'Contactada', color: '#16a34a' },
  { valor: 'no_contactada', etiqueta: 'No contactada', color: '#f59e0b' },
  { valor: 'descartada', etiqueta: 'Descartada', color: '#dc2626' },
  { valor: 'agendada', etiqueta: 'Agendada', color: '#2563eb' },
  { valor: 'no_contesta', etiqueta: 'No contesta', color: '#8b5cf6' },
];

function estadoDe(inmo) {
  if (inmo.contactado) return 'contactada';
  if (inmo.no_contactado) return 'no_contactada';
  if (inmo.descartado) return 'descartada';
  if (inmo.agendado) return 'agendada';
  if (inmo.no_contesta) return 'no_contesta';
  return '';
}

export default function Dashboard() {
  const [inmobiliarias, setInmobiliarias] = useState([]);
  const [filtro, setFiltro] = useState('Todas provincias');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionada, setSeleccionada] = useState(null);
  const [notas, setNotas] = useState('');
  const [supabase, setSupabase] = useState(null);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    const init = async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const client = createClient(
        'https://aqassltxvrtegatlzkkl.supabase.co',
        'sb_publishable_u5A3pcpkyLXqQa6s2x-pxg_Vci2xypW'
      );
      setSupabase(client);
      await recargar(client);

      client
        .channel('inmobiliarias-cambios')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inmobiliarias' }, () => {
          recargar(client);
        })
        .subscribe();
    };
    init();
  }, []);

  const recargar = async (client) => {
    const { data, error } = await client.from('inmobiliarias').select('*').order('id');
    if (error) {
      setAviso('Error al leer datos: ' + error.message);
      return;
    }
    setInmobiliarias(data || []);
    setSeleccionada((prev) => (prev ? data.find((i) => i.id === prev.id) || null : null));
  };

  const cambiarEstado = async (id, tipo) => {
    if (!supabase) return;
    setAviso(null);

    const cambios = {
      contactado: tipo === 'contactada',
      no_contactado: tipo === 'no_contactada',
      descartado: tipo === 'descartada',
      agendado: tipo === 'agendada',
      no_contesta: tipo === 'no_contesta',
    };

    const { data, error } = await supabase
      .from('inmobiliarias')
      .update(cambios)
      .eq('id', id)
      .select();

    if (error) {
      setAviso('No se pudo guardar: ' + error.message);
      return;
    }
    if (!data || data.length === 0) {
      setAviso('No se guardo nada. Falta la politica RLS de UPDATE en Supabase.');
      return;
    }

    setInmobiliarias((prev) => prev.map((i) => (i.id === id ? data[0] : i)));
    setSeleccionada(data[0]);
  };

  const guardarNotas = async () => {
    if (!seleccionada || !supabase) return;
    setAviso(null);

    const { data, error } = await supabase
      .from('inmobiliarias')
      .update({ notas })
      .eq('id', seleccionada.id)
      .select();

    if (error) {
      setAviso('No se pudieron guardar las notas: ' + error.message);
      return;
    }
    if (!data || data.length === 0) {
      setAviso('Las notas no se guardaron. Falta la politica RLS de UPDATE en Supabase.');
      return;
    }

    setInmobiliarias((prev) => prev.map((i) => (i.id === seleccionada.id ? data[0] : i)));
    setSeleccionada(data[0]);
    setAviso('Notas guardadas.');
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

  const etiquetaEstado = (inmo) => {
    const actual = estadoDe(inmo);
    if (!actual) return <span style={{ color: '#999' }}>—</span>;
    const def = ESTADOS.find((e) => e.valor === actual);
    return (
      <span style={{ backgroundColor: def.color, color: 'white', padding: '4px 12px', borderRadius: '4px', fontWeight: 600, fontSize: '12px' }}>
        {def.etiqueta}
      </span>
    );
  };

  const estadoActual = seleccionada ? estadoDe(seleccionada) : '';
  const colorActual = ESTADOS.find((e) => e.valor === estadoActual)?.color || '#ddd';

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>Dashboard Luminaxe</h1>

      {aviso && (
        <div style={{ padding: '10px 14px', marginBottom: '1rem', borderRadius: '4px', backgroundColor: '#fff4e5', border: '1px solid #f59e0b', fontSize: '13px' }}>
          {aviso}
        </div>
      )}

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
          {provincias.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
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
              {filtradas.map((inmo) => (
                <tr
                  key={inmo.id}
                  onClick={() => { setSeleccionada(inmo); setNotas(inmo.notas || ''); setAviso(null); }}
                  style={{
                    borderBottom: '1px solid #eee',
                    backgroundColor: seleccionada?.id === inmo.id ? '#e8f4f8' : 'white',
                    cursor: 'pointer',
                  }}
                >
                  <td style={{ padding: '12px' }}><strong>{inmo.nombre}</strong></td>
                  <td style={{ padding: '12px' }}>{inmo.provincia}</td>
                  <td style={{ padding: '12px' }}>
                    <a href={`tel:${inmo.telefono}`} style={{ color: '#0066cc' }}>{inmo.telefono}</a>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{inmo.viviendas_idealista}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{etiquetaEstado(inmo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {seleccionada && (
          <div style={{ backgroundColor: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem', height: 'fit-content', position: 'sticky', top: '20px' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '16px', fontWeight: 700 }}>{seleccionada.nombre}</h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#999', fontWeight: 700, textTransform: 'uppercase' }}>Estado</p>
              <select
                value={estadoActual}
                onChange={(e) => cambiarEstado(seleccionada.id, e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: `2px solid ${colorActual}`,
                  backgroundColor: 'white',
                  color: estadoActual ? colorActual : '#666',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {ESTADOS.map((e) => (
                  <option key={e.valor} value={e.valor}>{e.etiqueta}</option>
                ))}
              </select>
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
                  fontFamily: 'inherit',
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
                padding: '8px',
                backgroundColor: '#f0f0f0',
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
