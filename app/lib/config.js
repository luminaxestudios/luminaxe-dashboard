// Configuración común del CRM de Luminaxe

export const PERSONAS = [
  { valor: 'rafael', etiqueta: 'Rafael', color: '#0d9488' },
  { valor: 'gonzalo', etiqueta: 'Gonzalo', color: '#db2777' },
];

// Etapas del embudo (orden = avance del proceso)
export const ETAPAS = [
  { valor: 'sin_contactar', etiqueta: 'Sin contactar', color: '#64748b' },
  { valor: 'no_coge', etiqueta: 'No coge', color: '#f59e0b' },
  { valor: 'hablo', etiqueta: 'Habló', color: '#2563eb' },
  { valor: 'cualificada', etiqueta: 'Cualificada', color: '#7c3aed' },
  { valor: 'prueba_enviada', etiqueta: 'Prueba enviada', color: '#0d9488' },
  { valor: 'cliente', etiqueta: 'Cliente', color: '#16a34a' },
  { valor: 'descartada', etiqueta: 'Descartada', color: '#dc2626' },
];

export const MOTIVOS_DESCARTE = [
  'Ya tiene vídeo',
  'Muy grande / cadena',
  'No le interesa',
  'Sin presupuesto',
  'Teléfono o negocio no válido',
  'Otro',
];

// Objetivo de llamadas cogidas por persona y por día LABORABLE (lunes a viernes). Fines de semana no se llama.
export const OBJETIVO_DIARIO = 12;
export const DIAS_LABORABLES = 5;

export const TIPOS_EVENTO = {
  no_coge: 'no cogió la llamada',
  cogida: 'habló por teléfono',
  etapa: 'cambió de etapa',
  email: 'marcó el email como enviado',
  responsable: 'cambió el responsable',
};

export const etapaDe = (valor) => ETAPAS.find((e) => e.valor === valor) || ETAPAS[0];
export const personaDe = (valor) => PERSONAS.find((p) => p.valor === valor);

// Fecha local en formato AAAA-MM-DD
export function fechaLocal(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function sumarDias(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return fechaLocal(d);
}

export function esLaborable(d = new Date()) {
  const n = d.getDay();
  return n >= 1 && n <= 5;
}

// Próximo día laborable a partir de mañana (salta sábados y domingos)
export function proximoLaborable() {
  const d = new Date();
  do { d.setDate(d.getDate() + 1); } while (!esLaborable(d));
  return fechaLocal(d);
}

// Lunes de la semana actual (AAAA-MM-DD)
export function lunesSemana() {
  const d = new Date();
  const n = d.getDay() === 0 ? 6 : d.getDay() - 1;
  d.setDate(d.getDate() - n);
  return fechaLocal(d);
}

export function relativo(iso) {
  if (!iso) return '—';
  const f = fechaLocal(new Date(iso));
  const hoy = fechaLocal();
  if (f === hoy) return 'hoy';
  const dias = Math.round((new Date(hoy) - new Date(f)) / 86400000);
  if (dias === 1) return 'ayer';
  return `hace ${dias} d`;
}
