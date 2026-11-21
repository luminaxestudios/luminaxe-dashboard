'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { crearCliente } from './lib/db.js';
import {
  PERSONAS, ETAPAS, MOTIVOS_DESCARTE, OBJETIVO_DIARIO, DIAS_LABORABLES, TIPOS_EVENTO,
  esLaborable, proximoLaborable, lunesSemana,
  etapaDe, personaDe, fechaLocal, sumarDias, relativo,
} from './lib/config.js';

const PESTANAS = [
  { id: 'guion', etiqueta: 'Guión', ph: 'Apertura, gancho, pregunta de calificación, propuesta, cierre...' },
  { id: 'tono', etiqueta: 'Tono', ph: 'Tuteo o usted, ritmo, frases a evitar, frases que funcionan...' },
  { id: 'objeciones', etiqueta: 'Objeciones', ph: '"Ya tenemos vídeo" → ...\n"No tengo tiempo" → ...\n"Cuánto cuesta" → ...' },
  { id: 'oferta', etiqueta: 'Oferta y cierre', ph: 'Qué ofrecemos, precio orientativo, enlace a la demo, siguiente paso único...' },
  { id: 'aprendizajes', etiqueta: 'Aprendizajes', ph: 'Fecha — qué funcionó / qué falló en las llamadas...' },
  { id: 'plantillas', etiqueta: 'Plantillas', ph: 'WhatsApp / email de seguimiento listos para copiar...' },
  { id: 'correos', etiqueta: 'Correos promo', ph: 'Un correo por línea. Correos a los que tenemos que enviar la info...' },
];

const ETIQUETA_GUARDADO = {
  cargando: 'Cargando...',
  guardando: 'Guardando...',
  guardado: 'Guardado',
  error: 'Error al guardar las notas',
};

// Vistas personales (solo ven lo suyo) y comunes (las ven los dos igual)
const VISTAS = [
  { id: 'hoy', etiqueta: 'Hoy' },
  { id: 'todas', etiqueta: 'Mis contactos' },
  { id: 'emails', etiqueta: 'Emails' },
  { id: 'actividad', etiqueta: 'Mi actividad' },
  { id: 'clientes', etiqueta: 'Clientes (común)' },
  { id: 'descartadas', etiqueta: 'Descartadas (común)' },
];
const MODOS = [
  { valor: 'gonzalo', etiqueta: 'Soy Gonzalo', color: '#db2777' },
  { valor: 'rafael', etiqueta: 'Soy Rafael', color: '#0d9488' },
  { valor: 'estadisticas', etiqueta: 'Estadísticas', color: '#0f172a' },
];

const CERRADAS = ['cliente', 'descartada'];

function ajustarAltura(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

const esEmail = (t) => !!t && t.includes('@');

export default function Dashboard() {
  const [filas, setFilas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [supabase, setSupabase] = useState(null);
  const [aviso, setAviso] = useState(null);

  const [modo, setModo] = useState('estadisticas');
  const yo = modo === 'estadisticas' ? '' : modo;
  const [vista, setVista] = useState('hoy');
  const [filtroEtapa, setFiltroEtapa] = useState('activas');
  const [filtroProv, setFiltroProv] = useState('Todas provincias');
  const [busqueda, setBusqueda] = useState('');
  const [borradores, setBorradores] = useState({});
  const [copiado, setCopiado] = useState(null);
  const [deshacer, setDeshacer] = useState({}); // por inmobiliaria: estado anterior para poder deshacer Cogió / No coge
  const [ultima, setUltima] = useState(null);

  const [notasAbiertas, setNotasAbiertas] = useState(false);
  const [pestana, setPestana] = useState('guion');
  const [notasGenerales, setNotasGenerales] = useState({});
  const [estadoNotas, setEstadoNotas] = useState('cargando');
  const timersNotas = useRef({});

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem('luminaxe_modo') || window.localStorage.getItem('luminaxe_yo');
      if (guardado && MODOS.some((m) => m.valor === guardado)) setModo(guardado);
    } catch (e) {}
  }, []);

  const elegirModo = (valor) => {
    setModo(valor);
    setVista('hoy');
    setBusqueda('');
    setFiltroEtapa('activas');
    try { window.localStorage.setItem('luminaxe_modo', valor); } catch (e) {}
  };

  useEffect(() => {
    const init = async () => {
      const client = await crearCliente();
      setSupabase(client);
      await recargar(client);
      await recargarEventos(client);
      await cargarNotasGenerales(client);

      client
        .channel('crm-cambios')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inmobiliarias' }, () => recargar(client))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos' }, () => recargarEventos(client))
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
    setFilas(data || []);
  };

  const recargarEventos = async (client) => {
    const desde = new Date(Date.now() - 14 * 86400000).toISOString();
    const { data, error } = await client
      .from('eventos')
      .select('*')
      .gte('creado', desde)
      .order('creado', { ascending: false })
      .limit(2000);
    if (error) {
      setAviso('Error al leer la actividad: ' + error.message);
      return;
    }
    setEventos(data || []);
  };

  const cargarNotasGenerales = async (client) => {
    const { data, error } = await client.from('notas').select('id, contenido');
    if (error) {
      setEstadoNotas('error');
      return;
    }
    const m = {};
    (data || []).forEach((r) => { m[r.id] = r.contenido || ''; });
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

  // Guarda cambios en una fila y, si se indica, registra un evento en el historial
  const actualizar = async (id, cambios, evento) => {
    if (!supabase) return;
    setAviso(null);

    const { data, error } = await supabase.from('inmobiliarias').update(cambios).eq('id', id).select();
    if (error) {
      setAviso('No se pudo guardar: ' + error.message);
      return null;
    }
    if (!data || data.length === 0) {
      setAviso('No se guardó nada. Falta la política RLS de UPDATE en Supabase.');
      return null;
    }
    setFilas((prev) => prev.map((f) => (f.id === id ? data[0] : f)));

    if (evento) {
      const nuevo = { inmobiliaria_id: String(id), persona: yo || null, ...evento };
      const res = await supabase.from('eventos').insert(nuevo).select();
      if (res.error) {
        setAviso('Se guardó el cambio, pero no el historial: ' + res.error.message);
        return null;
      }
      setEventos((prev) => [...(res.data || []), ...prev]);
      return (res.data || [])[0] || { id: null };
    }
    return { id: null };
  };

  // Llamada (Cogió / No coge) con posibilidad de deshacer: guarda el estado anterior de la fila
  const registrarLlamada = async (f, cambios, tipo) => {
    const previo = {};
    Object.keys(cambios).forEach((k) => { previo[k] = f[k] === undefined ? null : f[k]; });
    const ev = await actualizar(f.id, cambios, { tipo });
    if (!ev) return;
    setDeshacer((prev) => ({ ...prev, [f.id]: { previo, eventoId: ev.id, tipo } }));
    setUltima({ id: f.id, nombre: f.nombre, tipo });
  };

  const deshacerLlamada = async (id) => {
    const d = deshacer[id];
    if (!d) return;
    // Se restaura la fila y se anota un evento "deshacer" que anula la llamada en estadísticas y actividad
    const ev = await actualizar(id, d.previo, { tipo: 'deshacer', de: String(d.eventoId) });
    if (!ev) return;
    setDeshacer((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setUltima((u) => (u && u.id === id ? null : u));
  };

  const requiereYo = () => {
    if (yo) return false;
    setAviso('Elige arriba quién eres (Rafael o Gonzalo) para registrar la actividad.');
    return true;
  };

  const marcarNoCoge = (f) => {
    if (requiereYo()) return;
    const cambios = {
      intentos: (f.intentos || 0) + 1,
      ultimo_contacto: new Date().toISOString(),
      proxima_accion: 'Volver a llamar',
      proxima_fecha: esLaborable() ? fechaLocal() : proximoLaborable(),
    };
    // No coge NO cambia la etapa: sigue en "Sin contactar" hasta que se hable con ellos.
    if (!f.responsable) cambios.responsable = yo;
    registrarLlamada(f, cambios, 'no_coge');
  };

  const marcarCogio = (f) => {
    if (requiereYo()) return;
    const cambios = {
      intentos: (f.intentos || 0) + 1,
      ultimo_contacto: new Date().toISOString(),
    };
    if (!f.etapa || f.etapa === 'sin_contactar' || f.etapa === 'no_coge') cambios.etapa = 'hablo';
    if (!f.responsable) cambios.responsable = yo;
    registrarLlamada(f, cambios, 'cogida');
  };

  const cambiarEtapa = (f, nueva) => {
    const cambios = { etapa: nueva };
    if (nueva !== 'descartada') cambios.motivo_descarte = null;
    if (!f.responsable && !CERRADAS.includes(nueva)) cambios.responsable = yo || 'rafael';
    actualizar(f.id, cambios, { tipo: 'etapa', de: f.etapa || 'sin_contactar', a: nueva });
  };

  const cambiarResponsable = (f, nuevo) => {
    actualizar(f.id, { responsable: nuevo || null }, { tipo: 'responsable', de: f.responsable || '', a: nuevo || '' });
  };

  const marcarEmailEnviado = (f) => {
    if (requiereYo()) return;
    actualizar(f.id, { email_enviado_at: new Date().toISOString() }, { tipo: 'email' });
  };

  // Campos de texto con guardado al salir (nombre del decisor, email, próxima acción, notas)
  const borrador = (f, campo) => {
    const clave = `${f.id}:${campo}`;
    return borradores[clave] !== undefined ? borradores[clave] : (f[campo] || '');
  };
  const escribir = (f, campo, valor) => setBorradores((prev) => ({ ...prev, [`${f.id}:${campo}`]: valor }));
  const guardarCampo = (f, campo) => {
    const clave = `${f.id}:${campo}`;
    const valor = borradores[clave];
    if (valor === undefined || valor === (f[campo] || '')) return;
    actualizar(f.id, { [campo]: valor });
  };

  const copiar = async (f) => {
    try {
      await navigator.clipboard.writeText(f.jefe);
      setCopiado(f.id);
      setTimeout(() => setCopiado((a) => (a === f.id ? null : a)), 1200);
    } catch (e) {}
  };

  // ---------- Cálculos ----------
  const hoy = fechaLocal();
  const laborable = esLaborable();
  // Fin de semana: no se llama, "Hoy" muestra lo que toca el próximo día laborable
  const fechaTrabajo = laborable ? hoy : proximoLaborable();
  const etapaFila = (f) => f.etapa || 'sin_contactar';

  const provincias = useMemo(
    () => ['Todas provincias', ...new Set(filas.map((f) => f.provincia).filter(Boolean))],
    [filas]
  );

  // Los eventos anulados con "Deshacer" no cuentan en ningún sitio
  const eventosValidos = useMemo(() => {
    const anulados = new Set(eventos.filter((e) => e.tipo === 'deshacer').map((e) => String(e.de)));
    return eventos.filter((e) => e.tipo !== 'deshacer' && !anulados.has(String(e.id)));
  }, [eventos]);

  const kpis = useMemo(() => {
    const hoyEv = eventosValidos.filter((e) => fechaLocal(new Date(e.creado)) === hoy);
    const porPersona = PERSONAS.map((p) => ({
      ...p,
      cogidas: hoyEv.filter((e) => e.persona === p.valor && e.tipo === 'cogida').length,
      llamadas: hoyEv.filter((e) => e.persona === p.valor && (e.tipo === 'cogida' || e.tipo === 'no_coge')).length,
    }));
    const lunes = lunesSemana();
    const delaSemana = eventosValidos.filter((e) => fechaLocal(new Date(e.creado)) >= lunes);
    porPersona.forEach((p) => {
      p.cogidasSemana = delaSemana.filter((e) => e.persona === p.valor && e.tipo === 'cogida').length;
    });
    const semana = delaSemana;
    const llamadas = semana.filter((e) => e.tipo === 'cogida' || e.tipo === 'no_coge').length;
    const cogidas = semana.filter((e) => e.tipo === 'cogida').length;
    const etapaN = (v) => semana.filter((e) => e.tipo === 'etapa' && e.a === v).length;
    const pasos = [
      { etiqueta: 'Llamadas', n: llamadas },
      { etiqueta: 'Cogidas', n: cogidas },
      { etiqueta: 'Cualificadas', n: etapaN('cualificada') },
      { etiqueta: 'Pruebas enviadas', n: etapaN('prueba_enviada') },
      { etiqueta: 'Clientes', n: etapaN('cliente') },
    ];
    const tasa = (lista) => {
      const l = lista.filter((e) => e.tipo === 'cogida' || e.tipo === 'no_coge').length;
      const c = lista.filter((e) => e.tipo === 'cogida').length;
      return { llamadas: l, cogidas: c, pct: l ? Math.round((c / l) * 100) : null };
    };
    porPersona.forEach((p) => { p.tasa = tasa(delaSemana.filter((e) => e.persona === p.valor)); });
    return { porPersona, pasos, tasaTotal: tasa(delaSemana) };
  }, [eventosValidos, hoy]);

  const conteoEtapas = useMemo(() => {
    const c = {};
    filas.filter((f) => f.responsable === yo).forEach((f) => { const e = etapaFila(f); c[e] = (c[e] || 0) + 1; });
    return c;
  }, [filas, yo]);

  const coincideBusqueda = (f) => {
    const q = busqueda.toLowerCase();
    return !q || (f.nombre || '').toLowerCase().includes(q) || (f.decisor || '').toLowerCase().includes(q);
  };

  const hechaHoy = (f) => f.ultimo_contacto && fechaLocal(new Date(f.ultimo_contacto)) === hoy;

  const visibles = useMemo(() => {
    const mias = filas.filter((f) => f.responsable === yo && coincideBusqueda(f));
    if (vista === 'hoy') {
      return mias
        .filter((f) => {
          const e = etapaFila(f);
          if (CERRADAS.includes(e)) return false;
          const pendiente = e === 'sin_contactar' || e === 'no_coge';
          const vence = f.proxima_fecha && f.proxima_fecha <= fechaTrabajo;
          return pendiente || vence;
        })
        .sort((a, b) => {
          // las ya llamadas hoy (no cogieron) pasan al final; el resto por fecha
          const ha = hechaHoy(a) ? 1 : 0;
          const hb = hechaHoy(b) ? 1 : 0;
          if (ha !== hb) return ha - hb;
          const fa = a.proxima_fecha || '9999';
          const fb = b.proxima_fecha || '9999';
          return fa < fb ? -1 : fa > fb ? 1 : 0;
        });
    }
    if (vista === 'clientes') return filas.filter((f) => etapaFila(f) === 'cliente' && coincideBusqueda(f));
    if (vista === 'descartadas') return filas.filter((f) => etapaFila(f) === 'descartada' && coincideBusqueda(f));
    return mias.filter((f) => {
      const e = etapaFila(f);
      if (CERRADAS.includes(e)) return false;
      if (filtroEtapa !== 'activas' && e !== filtroEtapa) return false;
      if (filtroProv !== 'Todas provincias' && f.provincia !== filtroProv) return false;
      return true;
    });
  }, [filas, vista, yo, filtroEtapa, filtroProv, busqueda, hoy, fechaTrabajo]);

  const emailsPendientes = filas.filter((f) => f.responsable === yo && esEmail(f.jefe) && !CERRADAS.includes(etapaFila(f)) && !f.email_enviado_at && coincideBusqueda(f));
  const emailsEnviados = filas
    .filter((f) => f.responsable === yo && esEmail(f.jefe) && f.email_enviado_at && coincideBusqueda(f))
    .sort((a, b) => (a.email_enviado_at < b.email_enviado_at ? 1 : -1));

  const nombreDe = (id) => filas.find((f) => String(f.id) === String(id))?.nombre || `#${id}`;
  const pestanaActiva = PESTANAS.find((p) => p.id === pestana) || PESTANAS[0];

  // ---------- Estilos ----------
  const th = { textAlign: 'left', padding: '10px 12px', fontWeight: 700, fontSize: '12px', color: '#555' };
  const td = { padding: '10px 12px', verticalAlign: 'top' };
  const campo = { width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' };
  const chip = (color, activo, pequeno) => ({
    padding: pequeno ? '4px 10px' : '6px 12px',
    borderRadius: '999px',
    border: `2px solid ${color}`,
    backgroundColor: activo ? color : 'white',
    color: activo ? 'white' : color,
    fontSize: pequeno ? '12px' : '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  });
  const boton = (color) => ({
    padding: '6px 10px', borderRadius: '6px', border: `2px solid ${color}`, backgroundColor: 'white',
    color, fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%',
  });

  const tabla = (conLlamada) => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f9f9f9' }}>
            <th style={{ ...th, width: '17%' }}>Inmobiliaria</th>
            <th style={{ ...th, width: '16%' }}>Contacto</th>
            <th style={{ ...th, width: '14%' }}>Responsable y etapa</th>
            <th style={{ ...th, width: '8%' }}>Último contacto</th>
            <th style={{ ...th, width: '14%' }}>Próxima acción</th>
            <th style={{ ...th, width: '21%' }}>Anotaciones</th>
            {conLlamada && <th style={{ ...th, width: '10%' }}>Llamada</th>}
          </tr>
        </thead>
        <tbody>
          {visibles.map((f) => {
            const e = etapaFila(f);
            const info = etapaDe(e);
            const vencida = f.proxima_fecha && f.proxima_fecha < hoy;
            const texto = borrador(f, 'notas');
            return (
              <tr key={f.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={td}>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(f.nombre)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ color: '#0f172a', fontWeight: 700, textDecoration: 'none', borderBottom: '1px dotted #94a3b8' }}
                    title="Buscar en Google"
                  >
                    {f.nombre}
                  </a>
                  <div style={{ fontSize: '11px', color: '#777', margin: '2px 0 6px' }}>
                    {f.provincia}{f.horarios ? ` · ${f.horarios}` : ''}
                  </div>
                  <input
                    style={campo} placeholder="Nombre del decisor"
                    value={borrador(f, 'decisor')}
                    onChange={(ev) => escribir(f, 'decisor', ev.target.value)}
                    onBlur={() => guardarCampo(f, 'decisor')}
                  />
                </td>
                <td style={td}>
                  <a href={`tel:${f.telefono}`} style={{ color: '#0066cc', textDecoration: 'none', fontWeight: 600 }}>{f.telefono}</a>
                  <input
                    style={{ ...campo, marginTop: '6px' }} placeholder="Email"
                    value={borrador(f, 'jefe')}
                    onChange={(ev) => escribir(f, 'jefe', ev.target.value)}
                    onBlur={() => guardarCampo(f, 'jefe')}
                  />
                </td>
                <td style={td}>
                  <select
                    value={f.responsable || 'rafael'}
                    onChange={(ev) => cambiarResponsable(f, ev.target.value)}
                    style={{ ...campo, marginBottom: '6px', fontWeight: 600, color: personaDe(f.responsable)?.color || '#666' }}
                  >
                    {PERSONAS.map((p) => <option key={p.valor} value={p.valor}>{p.etiqueta}</option>)}
                  </select>
                  <select
                    value={e}
                    onChange={(ev) => cambiarEtapa(f, ev.target.value)}
                    style={{ ...campo, border: `2px solid ${info.color}`, color: info.color, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {ETAPAS.map((x) => <option key={x.valor} value={x.valor}>{x.etiqueta}</option>)}
                  </select>
                  {e === 'descartada' && (
                    <select
                      value={f.motivo_descarte || ''}
                      onChange={(ev) => actualizar(f.id, { motivo_descarte: ev.target.value || null })}
                      style={{ ...campo, marginTop: '6px', color: '#444' }}
                    >
                      <option value="">Motivo (opcional)</option>
                      {MOTIVOS_DESCARTE.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  )}
                </td>
                <td style={{ ...td, fontSize: '12px', color: '#555' }}>
                  <div style={{ fontWeight: 600 }}>{relativo(f.ultimo_contacto)}</div>
                  <div style={{ color: '#888', marginTop: '2px' }}>{f.intentos || 0} {(f.intentos || 0) === 1 ? 'intento' : 'intentos'}</div>
                </td>
                <td style={td}>
                  <input
                    style={campo} placeholder="Qué toca hacer"
                    value={borrador(f, 'proxima_accion')}
                    onChange={(ev) => escribir(f, 'proxima_accion', ev.target.value)}
                    onBlur={() => guardarCampo(f, 'proxima_accion')}
                  />
                  <input
                    type="date"
                    style={{ ...campo, marginTop: '6px', color: vencida ? '#dc2626' : '#333', fontWeight: vencida ? 700 : 400 }}
                    value={f.proxima_fecha || ''}
                    onChange={(ev) => actualizar(f.id, { proxima_fecha: ev.target.value || null })}
                  />
                </td>
                <td style={td}>
                  <textarea
                    ref={ajustarAltura}
                    value={texto}
                    rows={1}
                    placeholder="Anotaciones..."
                    onChange={(ev) => { ajustarAltura(ev.target); escribir(f, 'notas', ev.target.value); }}
                    onBlur={() => guardarCampo(f, 'notas')}
                    style={{ ...campo, lineHeight: 1.4, resize: 'none', overflow: 'hidden', display: 'block' }}
                  />
                </td>
                {conLlamada && (
                  <td style={td}>
                    <button style={boton('#16a34a')} onClick={() => marcarCogio(f)}>✓ Cogió</button>
                    <button style={{ ...boton('#f59e0b'), marginTop: '6px' }} onClick={() => marcarNoCoge(f)}>✗ No coge</button>
                    {deshacer[f.id] ? (
                      <button style={{ ...boton('#64748b'), marginTop: '6px' }} onClick={() => deshacerLlamada(f.id)}>↶ Deshacer</button>
                    ) : hechaHoy(f) && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', textAlign: 'center' }}>llamada hoy</div>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const bloqueEmails = (lista, enviados) => (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ margin: '0 0 8px', fontSize: '15px' }}>{enviados ? `Enviados (${lista.length})` : `Pendientes de enviar (${lista.length})`}</h3>
      {lista.length === 0 && <p style={{ color: '#666', fontSize: '13px' }}>{enviados ? 'Todavía no se ha marcado ningún email como enviado.' : 'No hay emails pendientes.'}</p>}
      {lista.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <tbody>
            {lista.map((f) => (
              <tr key={f.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ ...td, width: '28%', fontWeight: 700 }}>{f.nombre}</td>
                <td style={{ ...td, width: '30%' }}>{f.jefe}</td>
                <td style={{ ...td, width: '14%', color: '#555' }}>{etapaDe(etapaFila(f)).etiqueta}</td>
                <td style={{ ...td, width: '12%', color: '#555' }}>{enviados ? relativo(f.email_enviado_at) : f.responsable ? personaDe(f.responsable)?.etiqueta : ''}</td>
                <td style={{ ...td, width: '16%' }}>
                  {!enviados && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button style={{ ...boton('#0f172a'), width: 'auto' }} onClick={() => copiar(f)}>{copiado === f.id ? 'Copiado' : 'Copiar'}</button>
                      <button style={{ ...boton('#16a34a'), width: 'auto' }} onClick={() => marcarEmailEnviado(f)}>Enviado</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const persona = personaDe(yo);
  const esStats = modo === 'estadisticas';
  const miKpi = kpis.porPersona.find((p) => p.valor === yo);
  const vistasVisibles = VISTAS;
  const etapasMias = ETAPAS.filter((x) => !CERRADAS.includes(x.valor));
  const conteoActivas = etapasMias.reduce((n, x) => n + (conteoEtapas[x.valor] || 0), 0);

  const cajaPersona = (p, grande) => {
    const pct = Math.min(100, Math.round((p.cogidas / OBJETIVO_DIARIO) * 100));
    return (
      <div key={p.valor} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px', backgroundColor: 'white', minWidth: grande ? '320px' : '260px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: p.color }}>
          <span>{p.etiqueta.toUpperCase()} · {laborable ? 'HOY' : 'FIN DE SEMANA'}</span>
          <span>{laborable ? `${p.cogidas}/${OBJETIVO_DIARIO} cogidas` : 'sin llamadas'}</span>
        </div>
        <div style={{ height: '8px', borderRadius: '4px', backgroundColor: '#eef2f7', margin: '8px 0 6px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: p.color }} />
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          {laborable ? `${p.llamadas} llamadas hoy · ` : ''}semana: {p.cogidasSemana}/{OBJETIVO_DIARIO * DIAS_LABORABLES} cogidas
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1600px', margin: '0 auto', borderTop: `6px solid ${persona ? persona.color : '#0f172a'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Dashboard Luminaxe{persona ? <span style={{ color: persona.color }}> · {persona.etiqueta}</span> : ' · Estadísticas'}</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {MODOS.map((m) => (
            <button key={m.valor} onClick={() => elegirModo(m.valor)} aria-pressed={modo === m.valor} style={chip(m.color, modo === m.valor)}>
              {m.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {aviso && (
        <div style={{ padding: '10px 14px', marginBottom: '1rem', borderRadius: '4px', backgroundColor: '#fff4e5', border: '1px solid #f59e0b', fontSize: '13px' }}>
          {aviso}
        </div>
      )}

      {ultima && deshacer[ultima.id] && !esStats && (
        <div style={{ position: 'fixed', left: '50%', bottom: '20px', transform: 'translateX(-50%)', zIndex: 20, display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderRadius: '8px', backgroundColor: '#0f172a', color: 'white', fontSize: '13px', boxShadow: '0 4px 14px rgba(0,0,0,.25)' }}>
          <span>{ultima.tipo === 'cogida' ? 'Cogió' : 'No coge'}: <b>{ultima.nombre}</b></span>
          <button onClick={() => deshacerLlamada(ultima.id)} style={{ padding: '4px 12px', borderRadius: '6px', border: '2px solid white', backgroundColor: 'transparent', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>↶ Deshacer</button>
          <button onClick={() => setUltima(null)} aria-label="Cerrar" style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}>×</button>
        </div>
      )}

      {esStats && (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '1.5rem' }}>
            {kpis.porPersona.map((p) => cajaPersona(p, true))}
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px', backgroundColor: 'white', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>EMBUDO · ESTA SEMANA (desde el lunes, los dos juntos)</div>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: '6px' }}>
              {kpis.pasos.map((p, i) => {
                const ant = i > 0 ? kpis.pasos[i - 1].n : 0;
                const conv = i > 0 && ant > 0 ? Math.round((p.n / ant) * 100) : null;
                return (
                  <div key={p.etiqueta} style={{ flex: 1, textAlign: 'center', padding: '6px 4px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{p.n}</div>
                    <div style={{ fontSize: '11px', color: '#555' }}>{p.etiqueta}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', height: '12px' }}>{conv !== null ? `${conv}% del paso anterior` : ''}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px', backgroundColor: 'white', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>TASA DE COGER · ESTA SEMANA</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={th}></th><th style={th}>Llamadas</th><th style={th}>Cogidas</th><th style={th}>No cogen</th><th style={th}>Tasa de coger</th>
                </tr>
              </thead>
              <tbody>
                {[...kpis.porPersona.map((p) => ({ nombre: p.etiqueta, color: p.color, t: p.tasa })), { nombre: 'Total', color: '#0f172a', t: kpis.tasaTotal }].map((r) => (
                  <tr key={r.nombre} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ ...td, fontWeight: 700, color: r.color }}>{r.nombre}</td>
                    <td style={td}>{r.t.llamadas}</td>
                    <td style={td}>{r.t.cogidas}</td>
                    <td style={td}>{r.t.llamadas - r.t.cogidas}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{r.t.pct === null ? '—' : `${r.t.pct}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px', backgroundColor: 'white' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>CONTACTOS POR ETAPA</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={th}>Etapa</th>
                  {PERSONAS.map((p) => <th key={p.valor} style={{ ...th, color: p.color }}>{p.etiqueta}</th>)}
                  <th style={th}>Total</th>
                </tr>
              </thead>
              <tbody>
                {ETAPAS.map((x) => {
                  const n = (v) => filas.filter((f) => etapaFila(f) === x.valor && (v ? f.responsable === v : true)).length;
                  const comun = CERRADAS.includes(x.valor);
                  return (
                    <tr key={x.valor} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ ...td, fontWeight: 700, color: x.color }}>{x.etiqueta}</td>
                      {PERSONAS.map((p) => <td key={p.valor} style={td}>{comun ? '—' : n(p.valor)}</td>)}
                      <td style={{ ...td, fontWeight: 700 }}>{n(null)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!esStats && (
        <>
          {miKpi && <div style={{ marginBottom: '1.25rem', maxWidth: '420px' }}>{cajaPersona(miKpi, true)}</div>}

          {/* Notas generales (plegables) */}
          <div style={{ backgroundColor: '#f5f5f5', padding: '10px 14px', borderRadius: '4px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setNotasAbiertas((a) => !a)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '12px', color: '#444', fontFamily: 'inherit' }}
              >
                {notasAbiertas ? '▾' : '▸'} NOTAS Y GUIÓN (comunes)
              </button>
              {notasAbiertas && PESTANAS.map((p) => (
                <button key={p.id} onClick={() => setPestana(p.id)} aria-pressed={pestana === p.id} style={chip('#0f172a', pestana === p.id, true)}>
                  {p.etiqueta}
                </button>
              ))}
              {notasAbiertas && (
                <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 700, color: estadoNotas === 'error' ? '#dc2626' : estadoNotas === 'guardado' ? '#16a34a' : '#666' }}>
                  {ETIQUETA_GUARDADO[estadoNotas]}
                </span>
              )}
            </div>
            {notasAbiertas && (
              <textarea
                value={notasGenerales[pestana] || ''}
                onChange={(ev) => cambiarNotaGeneral(pestana, ev.target.value)}
                placeholder={pestanaActiva.ph}
                disabled={estadoNotas === 'cargando'}
                style={{ width: '100%', minHeight: '200px', marginTop: '10px', padding: '10px 12px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px', fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical', boxSizing: 'border-box', display: 'block', backgroundColor: 'white' }}
              />
            )}
          </div>

          {/* Vistas */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', borderBottom: '2px solid #eee', paddingBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {vistasVisibles.map((v) => (
              <button key={v.id} onClick={() => setVista(v.id)} aria-pressed={vista === v.id} style={chip(v.id === 'clientes' || v.id === 'descartadas' ? '#64748b' : persona.color, vista === v.id)}>
                {v.etiqueta}
              </button>
            ))}
            {vista !== 'actividad' && (
              <input
                type="text" placeholder="Buscar inmobiliaria o decisor..." value={busqueda}
                onChange={(ev) => setBusqueda(ev.target.value)}
                style={{ marginLeft: 'auto', padding: '7px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', minWidth: '260px' }}
              />
            )}
          </div>

          {vista === 'hoy' && (
            <>
              <p style={{ fontSize: '13px', color: '#555', margin: '0 0 12px' }}>
                {laborable
                  ? `${visibles.length} para llamar: tus contactos sin contactar y los que tienen fecha vencida. Los que no cogieron hoy pasan al final.`
                  : `Hoy no se llama (fin de semana). El lunes tienes ${visibles.length} para llamar.`}
              </p>
              {visibles.length === 0 && <p style={{ color: '#666', fontSize: '13px' }}>Nada pendiente. Mira "Mis contactos".</p>}
              {tabla(true)}
            </>
          )}

          {vista === 'todas' && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {[
                  { valor: 'activas', etiqueta: `Todas (${conteoActivas})`, color: '#0f172a' },
                  ...etapasMias.map((x) => ({ valor: x.valor, etiqueta: `${x.etiqueta} (${conteoEtapas[x.valor] || 0})`, color: x.color })),
                ].map((x) => (
                  <button key={x.valor} onClick={() => setFiltroEtapa(x.valor)} aria-pressed={filtroEtapa === x.valor} style={chip(x.color, filtroEtapa === x.valor)}>
                    {x.etiqueta}
                  </button>
                ))}
                <select value={filtroProv} onChange={(ev) => setFiltroProv(ev.target.value)} style={{ padding: '7px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}>
                  {provincias.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <span style={{ fontSize: '13px', color: '#666', alignSelf: 'center' }}>{visibles.length} resultados</span>
              </div>
              {tabla(true)}
            </>
          )}

          {vista === 'clientes' && (
            <>
              <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px' }}>Clientes: lista común de los dos.</p>
              {tabla(false)}
            </>
          )}

          {vista === 'descartadas' && (
            <>
              <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px' }}>
                Lista común de los dos. No se borran nunca: es la lista negra que el agente de prospección consulta para no volver a proponerlas.
              </p>
              {tabla(false)}
            </>
          )}

          {vista === 'emails' && (
            <>
              {bloqueEmails(emailsPendientes, false)}
              {bloqueEmails(emailsEnviados, true)}
            </>
          )}

          {vista === 'actividad' && (
            <div>
              {eventosValidos.filter((e) => e.persona === yo).length === 0 && <p style={{ color: '#666', fontSize: '13px' }}>Todavía no hay actividad tuya registrada.</p>}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <tbody>
                  {eventosValidos.filter((e) => e.persona === yo).slice(0, 60).map((e) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ ...td, width: '14%', color: '#777' }}>{new Date(e.creado).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={{ ...td, width: '30%', fontWeight: 600 }}>{nombreDe(e.inmobiliaria_id)}</td>
                      <td style={td}>
                        {TIPOS_EVENTO[e.tipo] || e.tipo}
                        {e.tipo === 'etapa' && ` — ${etapaDe(e.de).etiqueta} → ${etapaDe(e.a).etiqueta}`}
                        {e.tipo === 'responsable' && ` — ${personaDe(e.de)?.etiqueta || 'nadie'} → ${personaDe(e.a)?.etiqueta || 'nadie'}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
