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

function colorDe(valor) {
  return ESTADOS.find((e) => e.valor === valor)?.color || '#999';
}

function ajustarAltura(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

export default function Dashboard() {
  const [inmobiliarias, setInmobiliarias] = useState([]);
  const [filtro, setFiltro] = useState('Todas provincias');
  const [busqueda, setBusqueda] = useState('');
  const [borradores, setBorradores] = useState({});
  const [guardadaAhora, setGuardadaAhora] = useState(null);
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
  };

  const guardarNotas = async (inmo) => {
    if (!supabase) return;
    const texto = borradores[inmo.id];
    if (texto === undefined) return;
    if (texto === (inmo.notas || '')) return;

    setAviso(null);

    const { data, error } = await supabase
      .from('inmobiliarias')
      .update({ notas: texto })
      .eq('id', inmo.id)
      .select();

    if (error) {
      setAviso('No se pudieron guardar las notas: ' + error.message);
      return;
    }
    if (!data || data.length === 0) {
      setAviso('Las notas no se guardaron. Falta la politica RLS de UPDATE en Supabase.');
      return;
    }

    setInmobiliarias((prev) => prev.map((i) => (i.id === inmo.id ? data[0] : i)));
    setGuardadaAhora(inmo.id);
    setTimeout(() => setGuardadaAhora((actual) => (actual === inmo.id ? null : actual)), 1500);
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

  const th = { textAlign: 'left', padding: '10px 12px', fontWeight: 700, fontSize: '12px', color: '#555' };
  const td = { padding: '8px 12px', verticalAlign: 'top' };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1600px', margin: '0 auto' }}>
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

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f9f9f9' }}>
              <th style={{ ...th, width: '20%' }}>Nombre</th>
              <th style={{ ...th, width: '10%' }}>Provincia</th>
              <th style={{ ...th, width: '10%' }}>Telefono</th>
              <th style={{ ...th, width: '7%', textAlign: 'center' }}>Viviendas</th>
              <th style={{ ...th, width: '16%' }}>Estado</th>
              <th style={{ ...th, width: '37%' }}>Anotaciones</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((inmo) => {
              const actual = estadoDe(inmo);
              const color = colorDe(actual);
              const texto = borradores[inmo.id] !== undefined ? borradores[inmo.id] : (inmo.notas || '');
              return (
                <tr key={inmo.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={td}>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(inmo.nombre)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#0f172a', fontWeight: 700, textDecoration: 'none', borderBottom: '1px dotted #94a3b8' }}
                      title="Buscar en Google"
                    >
                      {inmo.nombre}
                    </a>
                  </td>
                  <td style={td}>{inmo.provincia}</td>
                  <td style={td}>
                    <a href={`tel:${inmo.telefono}`} style={{ color: '#0066cc', textDecoration: 'none' }}>{inmo.telefono}</a>
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>{inmo.viviendas_idealista}</td>
                  <td style={td}>
                    <select
                      value={actual}
                      onChange={(e) => cambiarEstado(inmo.id, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: `2px solid ${actual ? color : '#ddd'}`,
                        backgroundColor: 'white',
                        color: actual ? color : '#666',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {ESTADOS.map((e) => (
                        <option key={e.valor} value={e.valor}>{e.etiqueta}</option>
                      ))}
                    </select>
                  </td>
                  <td style={td}>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        ref={ajustarAltura}
                        value={texto}
                        rows={1}
                        placeholder="Anotaciones..."
                        onChange={(e) => {
                          ajustarAltura(e.target);
                          setBorradores((prev) => ({ ...prev, [inmo.id]: e.target.value }));
                        }}
                        onBlur={() => guardarNotas(inmo)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          fontSize: '12px',
                          fontFamily: 'inherit',
                          lineHeight: 1.4,
                          resize: 'none',
                          overflow: 'hidden',
                          boxSizing: 'border-box',
                          display: 'block',
                        }}
                      />
                      {guardadaAhora === inmo.id && (
                        <span style={{ position: 'absolute', right: '6px', top: '-14px', fontSize: '10px', color: '#16a34a', fontWeight: 700 }}>
                          guardado
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
