'use client';

import { useEffect, useRef, useState } from 'react';

const ESTADOS = [
  { valor: '', etiqueta: '\u2014 Sin estado \u2014', color: '#999' },
  { valor: 'interesado_rafael', etiqueta: 'Interesados (Rafael)', color: '#0d9488' },
  { valor: 'interesado_gonzalo', etiqueta: 'Interesados (Gonzalo)', color: '#db2777' },
  { valor: 'no_contactada', etiqueta: 'No contactada', color: '#f59e0b' },
  { valor: 'descartada', etiqueta: 'Descartada', color: '#dc2626' },
  { valor: 'agendada', etiqueta: 'Agendada', color: '#2563eb' },
  { valor: 'no_contesta', etiqueta: 'No contesta', color: '#8b5cf6' },
];

const PESTANAS = [
  { id: 'guion', etiqueta: 'Gui\u00f3n', ph: 'Apertura, gancho, pregunta de calificaci\u00f3n, propuesta, cierre...' },
  { id: 'tono', etiqueta: 'Tono', ph: 'Tuteo o usted, ritmo, frases a evitar, frases que funcionan...' },
  { id: 'objeciones', etiqueta: 'Objeciones', ph: '"Ya tenemos v\u00eddeo" \u2192 ...\n"No tengo tiempo" \u2192 ...\n"Cu\u00e1nto cuesta" \u2192 ...' },
  { id: 'oferta', etiqueta: 'Oferta y cierre', ph: 'Qu\u00e9 ofrecemos, precio orientativo, enlace a la demo, siguiente paso \u00fanico...' },
  { id: 'aprendizajes', etiqueta: 'Aprendizajes', ph: 'Fecha \u2014 qu\u00e9 funcion\u00f3 / qu\u00e9 fall\u00f3 en las llamadas...' },
  { id: 'plantillas', etiqueta: 'Plantillas', ph: 'WhatsApp / email de seguimiento listos para copiar...' },
];

const ETIQUETA_GUARDADO = {
  cargando: 'Cargando...',
  guardando: 'Guardando...',
  guardado: 'Guardado',
  error: 'Error: revisa que exista la tabla notas en Supabase',
};

function estadoDe(inmo) {
  if (inmo.interesado_rafael) return 'interesado_rafael';
  if (inmo.interesado_gonzalo) return 'interesado_gonzalo';
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
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [borradores, setBorradores] = useState({});
  const [guardadaAhora, setGuardadaAhora] = useState(null);
  const [supabase, setSupabase] = useState(null);
  const [aviso, setAviso] = useState(null);

  const [pestana, setPestana] = useState('guion');
  const [notasGenerales, setNotasGenerales] = useState({});
  const [estadoNotas, setEstadoNotas] = useState('cargando');
  const timersNotas = useRef({});

  useEffect(() => {
    const init = async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const client = createClient(
        'https://aqassltxvrtegatlzkkl.supabase.co',
        'sb_publishable_u5A3pcpkyLXqQa6s2x-pxg_Vci2xypW'
      );
      setSupabase(client);
      await recargar(client);
      await cargarNotasGenerales(client);

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

  const cargarNotasGenerales = async (client) => {
    const { data, error } = await client.from('notas').select('id, contenido');
    if (error) {
      setEstadoNotas('error');
      return;
    }
    const m = {};
    (data || []).forEach((r) => {
      m[r.id] = r.contenido || '';
    });
    setNotasGenerales(m);
    setEstadoNotas('guardado');
  };

  const cambiarNotaGeneral = (id, valor) => {
    setNotasGenerales((prev) => ({ ...prev, [id]: valor }));
    setEstadoNotas('guardando');
    if (timersNotas.current[id]) clearTimeout(timersNotas.current[id]);
    timersNotas.current[id] = setTimeout(async () => {
      if (!supabase) return;
      const { error } = await supabase
        .from('notas')
        .upsert({ id, contenido: valor, updated_at: new Date().toISOString() });
      setEstadoNotas(error ? 'error' : 'guardado');
    }, 800);
  };

  const cambiarEstado = async (id, tipo) => {
    if (!supabase) return;
    setAviso(null);

    const cambios = {
      contactado: false,
      interesado_rafael: tipo === 'interesado_rafael',
      interesado_gonzalo: tipo === 'interesado_gonzalo',
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

  // Filtro por provincia + busqueda (sin estado): sirve para contar cuantas hay de cada estado
  const baseFiltrada = inmobiliarias.filter((inmo) => {
    const provinciaOk = filtro === 'Todas provincias' || inmo.provincia === filtro;
    const nombreOk = (inmo.nombre || '').toLowerCase().includes(busqueda.toLowerCase());
    return provinciaOk && nombreOk;
  });

  const conteoEstados = baseFiltrada.reduce((acc, inmo) => {
    const e = estadoDe(inmo);
    acc[e] = (acc[e] || 0) + 1;
    return acc;
  }, {});

  const filtradas = baseFiltrada.filter(
    (inmo) => filtroEstado === 'todos' || estadoDe(inmo) === filtroEstado
  );

  const provincias = ['Todas provincias', ...new Set(inmobiliarias.map((i) => i.provincia))];

  const th = { textAlign: 'left', padding: '10px 12px', fontWeight: 700, fontSize: '12px', color: '#555' };
  const td = { padding: '8px 12px', verticalAlign: 'top' };

  const pestanaActiva = PESTANAS.find((p) => p.id === pestana) || PESTANAS[0];

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1600px', margin: '0 auto' }}>
      <h1>Dashboard Luminaxe</h1>

      {aviso && (
        <div style={{ padding: '10px 14px', marginBottom: '1rem', borderRadius: '4px', backgroundColor: '#fff4e5', border: '1px solid #f59e0b', fontSize: '13px' }}>
          {aviso}
        </div>
      )}

      <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: 700, marginRight: '4px' }}>NOTAS</span>
          {PESTANAS.map((p) => {
            const activa = pestana === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPestana(p.id)}
                aria-pressed={activa}
                style={{
                  padding: '6px 12px',
                  borderRadius: '999px',
                  border: '2px solid #0f172a',
                  backgroundColor: activa ? '#0f172a' : 'white',
                  color: activa ? 'white' : '#0f172a',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {p.etiqueta}
              </button>
            );
          })}
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '11px',
              fontWeight: 700,
              color: estadoNotas === 'error' ? '#dc2626' : estadoNotas === 'guardado' ? '#16a34a' : '#666',
            }}
          >
            {ETIQUETA_GUARDADO[estadoNotas]}
          </span>
        </div>
        <textarea
          value={notasGenerales[pestana] || ''}
          onChange={(e) => cambiarNotaGeneral(pestana, e.target.value)}
          placeholder={pestanaActiva.ph}
          disabled={estadoNotas === 'cargando'}
          style={{
            width: '100%',
            minHeight: '200px',
            padding: '10px 12px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '13px',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            resize: 'vertical',
            boxSizing: 'border-box',
            display: 'block',
            backgroundColor: 'white',
          }}
        />
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem' }}>
        {[{ valor: 'todos', etiqueta: 'Todos', color: '#0f172a' }, ...ESTADOS.slice(1), { ...ESTADOS[0], etiqueta: 'Sin estado' }].map((e) => {
          const activo = filtroEstado === e.valor;
          const n = e.valor === 'todos' ? baseFiltrada.length : conteoEstados[e.valor] || 0;
          return (
            <button
              key={e.valor || 'sin'}
              onClick={() => setFiltroEstado(e.valor)}
              aria-pressed={activo}
              style={{
                padding: '6px 12px',
                borderRadius: '999px',
                border: `2px solid ${e.color}`,
                backgroundColor: activo ? e.color : 'white',
                color: activo ? 'white' : e.color,
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {e.etiqueta} ({n})
            </button>
          );
        })}
      </div>

      {filtradas.length === 0 && inmobiliarias.length > 0 && (
        <p style={{ color: '#666', fontSize: '13px' }}>Ninguna inmobiliaria con este estado. Pulsa "Todos" para ver la lista completa.</p>
      )}

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
