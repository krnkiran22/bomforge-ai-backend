import { Router, Request, Response } from 'express';
import logger from '../utils/logger';

const router = Router();

// ── helpers ──────────────────────────────────────────────────────────────────

function authHeader(key: string, secret: string) {
  return { Authorization: `token ${key}:${secret}` };
}

async function erpFetch(
  baseUrl: string,
  apiKey: string,
  apiSecret: string,
  path: string,
  options: RequestInit = {}
) {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...authHeader(apiKey, apiSecret),
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    },
  });
  const data = await res.json() as Record<string, any>;
  if (!res.ok) throw new Error(data?.['exc_type'] || data?.['message'] || `HTTP ${res.status}`);
  return data;
}

// ── POST /api/erpnext/test  ───────────────────────────────────────────────────
// Verify connection to an ERPNext instance
router.post('/test', async (req: Request, res: Response) => {
  const { baseUrl, apiKey, apiSecret } = req.body;
  if (!baseUrl || !apiKey || !apiSecret) {
    return res.status(400).json({ success: false, message: 'baseUrl, apiKey and apiSecret are required' });
  }
  try {
    const data = await erpFetch(baseUrl, apiKey, apiSecret, '/api/method/frappe.auth.get_logged_user') as Record<string, any>;
    return res.json({ success: true, user: data['message'], message: 'Connected successfully' });
  } catch (err: any) {
    logger.error('ERPNext test failed:', err.message);
    return res.status(400).json({ success: false, message: err.message || 'Connection failed' });
  }
});

// ── GET /api/erpnext/boms  ────────────────────────────────────────────────────
// List all BOMs from ERPNext
router.get('/boms', async (req: Request, res: Response) => {
  const { baseUrl, apiKey, apiSecret } = req.query as Record<string, string>;
  if (!baseUrl || !apiKey || !apiSecret) {
    return res.status(400).json({ success: false, message: 'baseUrl, apiKey and apiSecret are required as query params' });
  }
  try {
    const data = await erpFetch(
      baseUrl, apiKey, apiSecret,
      '/api/resource/BOM?fields=["name","item","item_name","quantity","uom","is_active","is_default","creation"]&limit=100&order_by=creation desc'
    ) as Record<string, any>;
    return res.json({ success: true, boms: data['data'] || [] });
  } catch (err: any) {
    logger.error('ERPNext list BOMs failed:', err.message);
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ── GET /api/erpnext/bom/:name  ───────────────────────────────────────────────
// Fetch a single BOM and convert to BOMForge eBOM format
router.get('/bom/:name', async (req: Request, res: Response) => {
  const { baseUrl, apiKey, apiSecret } = req.query as Record<string, string>;
  const { name } = req.params;
  if (!baseUrl || !apiKey || !apiSecret) {
    return res.status(400).json({ success: false, message: 'baseUrl, apiKey and apiSecret required as query params' });
  }
  try {
    const data = await erpFetch(baseUrl, apiKey, apiSecret, `/api/resource/BOM/${encodeURIComponent(name)}`) as Record<string, any>;
    const bom = data['data'] as Record<string, any>;

    // Convert ERPNext BOM format → BOMForge eBOM rows
    const ebomRows = (bom.items || []).map((item: any, idx: number) => ({
      sno:         idx + 1,
      partNumber:  item.item_code,
      description: item.item_name || item.description || item.item_code,
      quantity:    item.qty,
      unit:        item.uom || 'EA',
      material:    item.description || '',
      drawingRef:  item.item_code,
      revision:    'A',
    }));

    return res.json({
      success: true,
      bomName:   bom.name,
      product:   bom.item_name || bom.item,
      quantity:  bom.quantity,
      currency:  bom.currency,
      ebomRows,
      rawBom: bom,
    });
  } catch (err: any) {
    logger.error('ERPNext fetch BOM failed:', err.message);
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ── POST /api/erpnext/push  ───────────────────────────────────────────────────
// Push a converted mBOM back to ERPNext as a new BOM revision
router.post('/push', async (req: Request, res: Response) => {
  const { baseUrl, apiKey, apiSecret, mBOM, itemCode } = req.body;
  if (!baseUrl || !apiKey || !apiSecret || !mBOM || !itemCode) {
    return res.status(400).json({ success: false, message: 'baseUrl, apiKey, apiSecret, mBOM and itemCode are required' });
  }
  try {
    // Build ERPNext BOM payload from mBOM output
    const bomPayload = {
      doctype:        'BOM',
      item:           itemCode,
      quantity:       1,
      with_operations: 1,
      items: (mBOM.components || []).map((c: any) => ({
        item_code:   c.partNumber,
        qty:         c.quantity || 1,
        uom:         c.unit || 'Nos',
        description: c.description,
      })),
      operations: (mBOM.routing || []).map((op: any, idx: number) => ({
        operation:    op.operation,
        workstation:  op.workCenter || `WC-${idx + 1}`,
        time_in_mins: Math.round((op.plannedHours || 1) * 60),
        description:  op.operation,
      })),
    };

    const data = await erpFetch(baseUrl, apiKey, apiSecret, '/api/resource/BOM', {
      method: 'POST',
      body: JSON.stringify(bomPayload),
    }) as Record<string, any>;

    return res.json({ success: true, bomName: (data['data'] as any)?.name, message: 'mBOM pushed to ERPNext successfully' });
  } catch (err: any) {
    logger.error('ERPNext push mBOM failed:', err.message);
    return res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
