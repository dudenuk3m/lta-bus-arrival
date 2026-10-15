const LTA_DATAMALL_URL = 'https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival';

// Helper to extract query parameters across Express and Web Request models
function getQueryParams(req: any): { busStopCode?: string; serviceNo?: string } {
  if (req.query) {
    return {
      busStopCode: req.query.BusStopCode || req.query.busStopCode,
      serviceNo: req.query.ServiceNo || req.query.serviceNo,
    };
  }

  try {
    const url = new URL(req.url, 'http://localhost');
    return {
      busStopCode: url.searchParams.get('BusStopCode') || url.searchParams.get('busStopCode') || undefined,
      serviceNo: url.searchParams.get('ServiceNo') || url.searchParams.get('serviceNo') || undefined,
    };
  } catch (e) {
    return {};
  }
}

// Helper to extract header across Express and Web Request models
function getHeader(req: any, headerName: string): string | undefined {
  if (req.headers) {
    if (typeof req.headers.get === 'function') {
      return req.headers.get(headerName) || req.headers.get(headerName.toLowerCase()) || undefined;
    }
    return req.headers[headerName] || req.headers[headerName.toLowerCase()] || undefined;
  }
  return undefined;
}

// Serverless Handler for /api/busarrival
export default async function handler(req: any, res?: any) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    if (res && typeof res.status === 'function') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, AccountKey, x-account-key');
      return res.status(204).end();
    }
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, AccountKey, x-account-key',
      },
    });
  }

  // 1. Get query parameters
  const { busStopCode, serviceNo } = getQueryParams(req);

  if (!busStopCode) {
    const errPayload = {
      error: 'Missing required query parameter: BusStopCode',
      usage: '/api/busarrival?BusStopCode=83139',
      example: '/api/busarrival?BusStopCode=83139&ServiceNo=15',
    };
    if (res && typeof res.status === 'function') {
      return res.status(400).json(errPayload);
    }
    return new Response(JSON.stringify(errPayload), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // 2. Resolve AccountKey from process.env or request headers (do not hardcode)
  const envKey = process.env.LTA_ACCOUNT_KEY || process.env.LTA_API_KEY;
  const headerKey = getHeader(req, 'AccountKey') || getHeader(req, 'x-account-key');
  const accountKey = envKey || headerKey;

  if (!accountKey) {
    const errPayload = {
      error: 'LTA AccountKey not configured',
      message:
        'Please set the LTA_ACCOUNT_KEY environment variable on your server/environment, or pass the AccountKey header.',
      documentation:
        'Request an AccountKey at https://datamall.lta.gov.sg/content/datamall/en/request-for-api.html',
      targetEndpoint: `${LTA_DATAMALL_URL}?BusStopCode=${busStopCode}`,
    };

    if (res && typeof res.status === 'function') {
      return res.status(401).json(errPayload);
    }
    return new Response(JSON.stringify(errPayload), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // 3. Build upstream LTA DataMall URL
  const queryParams = new URLSearchParams();
  queryParams.set('BusStopCode', busStopCode.trim());
  if (serviceNo && serviceNo.trim()) {
    queryParams.set('ServiceNo', serviceNo.trim());
  }

  const upstreamUrl = `${LTA_DATAMALL_URL}?${queryParams.toString()}`;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        AccountKey: accountKey.trim(),
        accept: 'application/json',
      },
    });

    if (!upstreamResponse.ok) {
      const errText = await upstreamResponse.text();
      const errorData = {
        error: `LTA DataMall responded with HTTP status ${upstreamResponse.status}`,
        status: upstreamResponse.status,
        details: errText,
      };

      if (res && typeof res.status === 'function') {
        return res.status(upstreamResponse.status).json(errorData);
      }
      return new Response(JSON.stringify(errorData), {
        status: upstreamResponse.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const data = await upstreamResponse.json();

    if (res && typeof res.status === 'function') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=15'); // 15-second cache to prevent throttling
      return res.status(200).json(data);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=15',
      },
    });
  } catch (err: any) {
    const errPayload = {
      error: 'Failed to connect to LTA DataMall service',
      message: err.message,
    };

    if (res && typeof res.status === 'function') {
      return res.status(502).json(errPayload);
    }
    return new Response(JSON.stringify(errPayload), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

// Web standard GET handler
export async function GET(req: Request) {
  return handler(req);
}
