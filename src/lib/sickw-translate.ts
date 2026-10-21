// Translates check results from the provider ("Label: Value" lines in English) into Spanish,
// adding a short help note for the fields that matter at the repair counter.

export type ResultTone = 'good' | 'bad' | 'warn' | 'neutral';

export interface TranslatedLine {
  label: string;
  value: string;
  original: string;
  tone: ResultTone;
  help?: string;
}

type FieldRule = {
  match: RegExp;
  label: string;
  // Returns tone/help for a given (normalized, uppercase) value.
  describe?: (value: string) => { tone: ResultTone; help?: string } | undefined;
};

const isOn = (v: string) => /^(ON|YES|TRUE|ACTIVE|ENABLED|LOCKED)\b/.test(v);
const isOff = (v: string) => /^(OFF|NO|FALSE|DISABLED|UNLOCKED|NOT ACTIVE)\b/.test(v);

const FIELDS: FieldRule[] = [
  { match: /^IMEI ?2$/, label: 'IMEI 2' },
  { match: /^IMEI$/, label: 'IMEI' },
  { match: /^MEID$/, label: 'MEID' },
  { match: /^(SERIAL( NUMBER)?|SN|S\/N)$/, label: 'Número de serie' },
  { match: /^(MANUFACTURER|BRAND)$/, label: 'Fabricante / Marca' },
  { match: /^MODEL ?(NAME|DESCRIPTION|DESC)?$/, label: 'Modelo' },
  { match: /^MODEL ?(CODE|NUMBER)$/, label: 'Código de modelo' },
  { match: /^(PART NUMBER|MPN)$/, label: 'Número de parte' },
  { match: /^COLOU?R$/, label: 'Color' },
  { match: /^(CAPACITY|STORAGE|MEMORY)$/, label: 'Capacidad' },
  { match: /^(PRODUCTION|MANUFACTURE|MANUFACTURING) ?DATE$/, label: 'Fecha de fabricación' },
  { match: /^(ESTIMATED )?PURCHASE DATE$/, label: 'Fecha de compra' },
  { match: /^VALID PURCHASE DATE$/, label: 'Fecha de compra validada' },
  { match: /^(PURCHASE )?COUNTRY$|^SOLD (IN|TO) COUNTRY$/, label: 'País de venta' },
  { match: /^SOLD BY$/, label: 'Vendido por' },
  {
    match: /^(FIND MY( IPHONE)?|FMI|FMIP|ICLOUD( LOCK)?|ICLOUD ON\/OFF)$/,
    label: 'Buscar mi iPhone (iCloud)',
    describe: v => isOn(v)
      ? { tone: 'bad', help: 'El equipo está ligado a una cuenta de iCloud. El dueño debe desactivarlo con su Apple ID antes de restaurar o reparar; si se restaura así, quedará bloqueado.' }
      : isOff(v) ? { tone: 'good', help: 'Sin bloqueo de iCloud: se puede restaurar y reparar sin problema.' } : undefined,
  },
  {
    match: /^ICLOUD STATUS$|^(CLEAN\/LOST|LOST MODE)( STATUS)?$/,
    label: 'Estado de iCloud',
    describe: v => /LOST|STOLEN/.test(v)
      ? { tone: 'bad', help: 'El dueño reportó el equipo como perdido en iCloud. No se puede desbloquear sin el dueño; desconfía si el cliente no es el propietario.' }
      : /CLEAN/.test(v) ? { tone: 'good', help: 'No está reportado como perdido en iCloud.' } : undefined,
  },
  {
    match: /^(GSMA )?BLACKLIST( STATUS)?$|^(WW )?BLACKLIST$|^BLACKLISTED$/,
    label: 'Lista negra (IMEI)',
    describe: v => /BLACKLISTED|BLOCKED|YES|LOST|STOLEN|BARRED/.test(v)
      ? { tone: 'bad', help: 'El IMEI está reportado por robo, extravío o adeudo. Puede no tener señal con ningún operador del país del reporte.' }
      : /CLEAN|NO\b|NOT/.test(v) ? { tone: 'good', help: 'El IMEI no tiene reportes: puede usarse con normalidad.' } : undefined,
  },
  { match: /^BLACKLIST (RECORDS?|HISTORY|DETAILS)$/, label: 'Historial de lista negra' },
  {
    match: /^(SIM[- ]?LOCK( STATUS)?|CARRIER LOCK|NETWORK LOCK|LOCK STATUS|SIMLOCK)$/,
    label: 'Bloqueo de operador (SIM lock)',
    describe: v => /UNLOCKED|OFF|NO\b/.test(v)
      ? { tone: 'good', help: 'Equipo liberado: funciona con cualquier compañía.' }
      : /LOCKED|ON|YES/.test(v) ? { tone: 'warn', help: 'Solo funciona con la compañía indicada. Para usar otro chip necesita liberación de operador.' } : undefined,
  },
  { match: /^(LOCKED )?CARRIER$|^(INITIAL |FIRST )?CARRIER$|^NETWORK$|^OPERATOR$/, label: 'Operador / Compañía' },
  { match: /^NEXT TETHER POLICY$|^TETHER POLICY$/, label: 'Política de operador (siguiente)' },
  { match: /^(INITIAL )?ACTIVATION POLICY$/, label: 'Política de activación' },
  {
    match: /^ACTIVATION( STATUS)?$|^ACTIVATED$/,
    label: 'Estado de activación',
    describe: v => /NOT|NO\b|UNACTIVATED/.test(v)
      ? { tone: 'warn', help: 'El equipo nunca ha sido activado (posiblemente nuevo o de exhibición).' }
      : /ACTIVATED|YES/.test(v) ? { tone: 'neutral', help: 'El equipo ya fue activado al menos una vez.' } : undefined,
  },
  {
    match: /^(WARRANTY( STATUS)?|COVERAGE|REPAIR COVERAGE|HARDWARE COVERAGE)$/,
    label: 'Garantía',
    describe: v => /OUT OF|EXPIRED|NO\b|INACTIVE/.test(v)
      ? { tone: 'neutral', help: 'Sin garantía del fabricante: la reparación corre por cuenta del cliente.' }
      : /LIMITED|APPLECARE|ACTIVE|IN WARRANTY|YES/.test(v) ? { tone: 'warn', help: 'Tiene garantía vigente. Abrir el equipo en taller puede anularla; considera enviarlo al fabricante.' } : undefined,
  },
  { match: /^(TECHNICAL|TELEPHONE) SUPPORT$/, label: 'Soporte técnico' },
  { match: /^APPLECARE( ELIGIBLE| ELIGIBILITY)?$/, label: 'AppleCare' },
  {
    match: /^(MDM( LOCK| STATUS)?|DEP|REMOTE MANAGEMENT)$/,
    label: 'Bloqueo MDM (empresa)',
    describe: v => isOn(v)
      ? { tone: 'bad', help: 'El equipo está administrado por una empresa o escuela. Al restaurarlo pedirá las credenciales de esa organización.' }
      : isOff(v) ? { tone: 'good', help: 'No pertenece a una empresa: sin restricciones de administración.' } : undefined,
  },
  {
    match: /^(DEMO( UNIT)?|DEMO DEVICE)$/,
    label: 'Equipo de exhibición',
    describe: v => /YES|TRUE/.test(v) ? { tone: 'warn', help: 'Es un equipo de exhibición de tienda; puede tener restricciones o software especial.' } : undefined,
  },
  {
    match: /^(LOANER( DEVICE)?)$/,
    label: 'Equipo de préstamo',
    describe: v => /YES|TRUE/.test(v) ? { tone: 'warn', help: 'Equipo de préstamo del fabricante; normalmente debe devolverse.' } : undefined,
  },
  {
    match: /^(REFURBISHED( DEVICE)?)$/,
    label: 'Reacondicionado',
    describe: v => /YES|TRUE/.test(v) ? { tone: 'neutral', help: 'El equipo fue reacondicionado por el fabricante.' } : undefined,
  },
  {
    match: /^(REPLACED|REPLACEMENT|REPLACED DEVICE|REPLACED BY APPLE)$/,
    label: 'Reemplazado',
    describe: v => /YES|TRUE/.test(v) ? { tone: 'warn', help: 'Este IMEI/serie fue reemplazado por otro equipo en garantía; puede estar dado de baja.' } : undefined,
  },
  {
    match: /^(KNOX GUARD|KG STATUS|KNOX GUARD STATUS)$/,
    label: 'Knox Guard (Samsung)',
    describe: v => /LOCKED|ACTIVE|ON|ENROLLED/.test(v) && !/UNLOCKED|NOT/.test(v)
      ? { tone: 'bad', help: 'Bloqueo de financiamiento o empresa de Samsung. El equipo puede bloquearse por completo hasta que se libere.' }
      : { tone: 'good', help: 'Sin bloqueo Knox Guard.' },
  },
  {
    match: /^(MI (ACCOUNT|LOCK|CLOUD)( STATUS)?|MI ACCOUNT LOCK)$/,
    label: 'Cuenta Mi (Xiaomi)',
    describe: v => isOn(v)
      ? { tone: 'bad', help: 'Ligado a una cuenta Xiaomi. El dueño debe cerrar sesión antes de restaurar, o quedará bloqueado.' }
      : isOff(v) ? { tone: 'good', help: 'Sin cuenta Mi vinculada.' } : undefined,
  },
  { match: /^(ICCID)$/, label: 'ICCID (chip)' },
  { match: /^(IMSI)$/, label: 'IMSI' },
  { match: /^(ORDER ID|ID)$/, label: 'Folio de consulta' },
];

const VALUES: [RegExp, string][] = [
  [/^ON$/i, 'Activado'],
  [/^OFF$/i, 'Desactivado'],
  [/^YES$/i, 'Sí'],
  [/^NO$/i, 'No'],
  [/^CLEAN$/i, 'Limpio (sin reportes)'],
  [/^LOST( MODE)?$/i, 'Perdido'],
  [/^STOLEN$/i, 'Robado'],
  [/^BLACKLISTED$/i, 'En lista negra'],
  [/^LOCKED$/i, 'Bloqueado'],
  [/^UNLOCKED$/i, 'Liberado'],
  [/^ACTIVATED$/i, 'Activado'],
  [/^NOT ACTIVATED$/i, 'No activado'],
  [/^ACTIVE$/i, 'Activo'],
  [/^EXPIRED$/i, 'Vencida'],
  [/^OUT OF WARRANTY$/i, 'Sin garantía'],
  [/^LIMITED WARRANTY$/i, 'Garantía limitada'],
  [/^IN WARRANTY$/i, 'En garantía'],
  [/^VALID$/i, 'Válido'],
  [/^INVALID$/i, 'Inválido'],
  [/^UNKNOWN$/i, 'Desconocido'],
  [/^NOT ENROLLED$/i, 'No inscrito'],
  [/^ENROLLED$/i, 'Inscrito'],
  [/^N\/?A$/i, 'No disponible'],
  [/^TRUE$/i, 'Sí'],
  [/^FALSE$/i, 'No'],
];

const translateValue = (value: string) => {
  const trimmed = value.trim();
  for (const [re, es] of VALUES) if (re.test(trimmed)) return es;
  return trimmed;
};

const normalizeLabel = (label: string) => label.trim().replace(/\s+/g, ' ').replace(/[.:]+$/, '').toUpperCase();

export const translateResult = (text: string): TranslatedLine[] =>
  text.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const idx = line.indexOf(':');
    if (idx <= 0) return { label: '', value: line, original: line, tone: 'neutral' as ResultTone };

    const rawLabel = line.slice(0, idx);
    const rawValue = line.slice(idx + 1).trim();
    const rule = FIELDS.find(f => f.match.test(normalizeLabel(rawLabel)));
    const info = rule?.describe?.(rawValue.toUpperCase());
    return {
      label: rule?.label ?? rawLabel.trim(),
      value: translateValue(rawValue),
      original: line,
      tone: info?.tone ?? 'neutral',
      help: info?.help,
    };
  });

// Known provider error codes ("Error A01: ...").
const ERRORS: Record<string, { message: string; help: string }> = {
  A01: { message: 'La clave de acceso del Server es incorrecta.', help: 'Revisa que la clave configurada en el servidor (SICKW_API_KEY) sea la vigente.' },
  A05: { message: 'La IP del servidor no está autorizada.', help: 'Registra la IP indicada en la lista de IPs permitidas de tu panel del Server.' },
  E01: { message: 'El IMEI es incorrecto.', help: 'Verifica que tenga 15 dígitos y su dígito verificador sea correcto (márcalo con *#06# en el equipo).' },
  E02: { message: 'El IMEI o número de serie es incorrecto.', help: 'Revisa que esté completo y sin espacios. Algunos servicios solo aceptan IMEI y otros solo número de serie.' },
  S01: { message: 'El ID de servicio no es válido.', help: 'Revisa el ID en la pestaña Servicios; puede que el servicio ya no esté disponible.' },
};

export const translateError = (text: string): { message: string; help?: string; original: string } => {
  const code = text.match(/Error\s+([A-Z]\d{2})/i)?.[1]?.toUpperCase();
  if (code && ERRORS[code]) return { ...ERRORS[code], original: text };
  if (/balance|credit|insufficient|not enough/i.test(text)) {
    return { message: 'Saldo insuficiente en el Server.', help: 'Recarga saldo en tu cuenta del Server antes de consultar.', original: text };
  }
  if (/no (result|data|info)|not found/i.test(text)) {
    return { message: 'El Server no encontró información para este equipo.', help: 'Prueba con otro servicio o verifica el IMEI / número de serie.', original: text };
  }
  return { message: text, original: text };
};
