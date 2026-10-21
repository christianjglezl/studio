import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Server-only proxy for the sickw.com API so the API key never reaches the browser.
const SICKW_URL = 'https://sickw.com/api.php';
const PROJECT_ID = 'techcheck-x5724';
const DEMO_SERVICE_ID = '999';

if (!getApps().length) {
  initializeApp({ projectId: PROJECT_ID });
}

type SickwResponse = {
  status?: string;
  result?: string;
  imei?: string;
  balance?: string;
  price?: string;
  id?: string;
  [key: string]: unknown;
};

// sickw returns the check result as HTML (<br>, <font>, ...); convert it to plain text lines.
const htmlToText = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');

const callSickw = async (params: Record<string, string>): Promise<SickwResponse> => {
  const key = process.env.SICKW_API_KEY;
  if (!key) throw new Error('La clave del Server no está configurada.');

  const url = new URL(SICKW_URL);
  url.search = new URLSearchParams({ format: 'json', key, ...params }).toString();
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(60_000) });
  const text = await res.text();
  try {
    return JSON.parse(text) as SickwResponse;
  } catch {
    return { status: 'error', result: text };
  }
};

const isAuthorized = async (req: NextRequest) => {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return false;
  try {
    await getAuth().verifyIdToken(token);
    return true;
  } catch {
    return false;
  }
};

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ status: 'error', result: 'No autorizado.' }, { status: 401 });
  }

  let body: { action?: string; imei?: string; serviceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: 'error', result: 'Solicitud inválida.' }, { status: 400 });
  }

  try {
    if (body.action === 'balance') {
      const data = await callSickw({ action: 'balance' });
      return NextResponse.json({ status: data.balance !== undefined ? 'success' : 'error', balance: data.balance, result: data.result });
    }

    if (body.action === 'services') {
      const data = await callSickw({ action: 'services' });
      const list = data['Service List'];
      if (!Array.isArray(list)) {
        return NextResponse.json({ status: 'error', result: data.result || 'No se pudo obtener la lista de servicios.' });
      }
      const services = list.map((s: any) => ({
        serviceId: String(s.service ?? '').trim(),
        name: htmlToText(String(s.name ?? '')).replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16))),
        price: String(s.price ?? '').trim(),
      }));
      return NextResponse.json({ status: 'success', services });
    }

    if (body.action === 'check') {
      const imei = String(body.imei || '').trim().toUpperCase();
      const serviceId = String(body.serviceId || '').trim();
      if (!/^[A-Z0-9]{8,20}$/.test(imei)) {
        return NextResponse.json({ status: 'error', result: 'IMEI o número de serie inválido.' }, { status: 400 });
      }
      if (!/^\d+$/.test(serviceId)) {
        return NextResponse.json({ status: 'error', result: 'ID de servicio inválido.' }, { status: 400 });
      }
      // The app only stores numeric IDs; 999 stands for the provider's free "demo" test service.
      const data = await callSickw({ imei, service: serviceId === DEMO_SERVICE_ID ? 'demo' : serviceId });
      return NextResponse.json({
        status: data.status === 'success' ? 'success' : 'error',
        result: htmlToText(String(data.result ?? '')),
        price: data.price,
        balance: data.balance,
        orderId: data.id,
      });
    }

    return NextResponse.json({ status: 'error', result: 'Acción no soportada.' }, { status: 400 });
  } catch (error: any) {
    console.error('sickw request failed:', error);
    return NextResponse.json({ status: 'error', result: error?.message || 'Error al conectar con Server.' }, { status: 502 });
  }
}
