import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptimeSeconds: number;
  environment: {
    ltaKeyConfigured: boolean;
    nodeEnv: string;
  };
}

// Serverless Handler (Vercel, Express, Node.js serverless)
export default async function handler(req: any, res?: any) {
  const ltaKey = process.env.LTA_ACCOUNT_KEY || process.env.LTA_API_KEY;

  const data: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: {
      ltaKeyConfigured: Boolean(ltaKey && ltaKey.trim().length > 0),
      nodeEnv: process.env.NODE_ENV || 'development',
    },
  };

  // If invoked with Express/Vercel (req, res)
  if (res && typeof res.status === 'function') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
  }

  // If invoked with Web Request API (Next.js / Edge / Cloudflare)
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

// Web standard GET handler
export async function GET(req: Request) {
  return handler(req);
}
