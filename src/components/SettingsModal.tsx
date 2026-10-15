import React, { useState } from 'react';
import { LTASettings } from '../types/bus';
import { X, Key, Server, Cpu, Check, AlertCircle, Copy, ExternalLink, RefreshCw } from 'lucide-react';

interface SettingsModalProps {
  settings: LTASettings;
  onSave: (newSettings: LTASettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave, onClose }) => {
  const [form, setForm] = useState<LTASettings>({ ...settings });
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Connecting to endpoint...');

    try {
      if (!form.backendProxyUrl && !form.apiKey) {
        throw new Error('Please specify a Backend Proxy URL or LTA AccountKey');
      }

      const endpoint = form.backendProxyUrl
        ? `${form.backendProxyUrl}?BusStopCode=09048`
        : `https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=09048`;

      const headers: Record<string, string> = { Accept: 'application/json' };
      if (form.apiKey) headers['AccountKey'] = form.apiKey;

      const res = await fetch(endpoint, { method: 'GET', headers });
      if (!res.ok) {
        throw new Error(`Endpoint returned status ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.Services) {
        setTestStatus('success');
        setTestMessage(`Successfully connected! Found ${data.Services.length} bus services.`);
      } else {
        setTestStatus('success');
        setTestMessage('Connected to endpoint successfully.');
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(err.message || 'Connection test failed. Check CORS or URL.');
    }
  };

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  const sampleBackendSnippet = `// Sample Node.js / Express backend route to proxy LTA DataMall
app.get('/api/bus-arrivals', async (req, res) => {
  const { BusStopCode } = req.query;
  const LTA_API_KEY = process.env.LTA_DATAMALL_KEY;
  
  const response = await fetch(
    \`https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=\${BusStopCode}\`,
    {
      headers: {
        'AccountKey': LTA_API_KEY,
        'Accept': 'application/json',
      }
    }
  );
  const data = await response.json();
  res.json(data);
});`;

  const copySnippet = () => {
    navigator.clipboard.writeText(sampleBackendSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Data Provider & Backend Settings</h3>
              <p className="text-xs text-slate-400">
                Configure real-time simulation or connect to LTA DataMall v3 API
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
          {/* Provider Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Data Source Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, useMockSimulation: true })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  form.useMockSimulation
                    ? 'bg-emerald-950/40 border-emerald-500/80 text-white shadow-sm ring-1 ring-emerald-500/40'
                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs">Simulated Engine</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  High-fidelity Singapore bus simulation with live physics, GPS movement, and real LTA stops.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, useMockSimulation: false })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  !form.useMockSimulation
                    ? 'bg-blue-950/40 border-blue-500/80 text-white shadow-sm ring-1 ring-blue-500/40'
                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Server className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-xs">Live API / Backend</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Connect to your backend server proxy or official LTA DataMall AccountKey.
                </p>
              </button>
            </div>
          </div>

          {/* Backend Proxy / API Key Options if Live Mode */}
          {!form.useMockSimulation && (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Backend Proxy URL (Recommended)
                </label>
                <input
                  type="text"
                  value={form.backendProxyUrl}
                  onChange={(e) => setForm({ ...form, backendProxyUrl: e.target.value })}
                  placeholder="/api/busarrival"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Built-in serverless proxy at <code className="text-emerald-400">/api/busarrival</code> that forwards to LTA DataMall v3.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  LTA DataMall AccountKey (Optional if backend injects it)
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="password"
                    value={form.apiKey}
                    onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                    placeholder="Enter your LTA DataMall AccountKey..."
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Test Button */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing'}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
                  <span>Test Connection</span>
                </button>

                {testStatus === 'success' && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {testMessage}
                  </span>
                )}
                {testStatus === 'error' && (
                  <span className="text-xs text-rose-400 flex items-center gap-1 max-w-[260px] truncate" title={testMessage}>
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {testMessage}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Auto Refresh Interval */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Auto-Refresh Cadence
            </label>
            <div className="flex items-center gap-2">
              {[10, 15, 30, 60].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setForm({ ...form, refreshIntervalSeconds: sec })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    form.refreshIntervalSeconds === sec
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-white'
                  }`}
                >
                  {sec} seconds
                </button>
              ))}
            </div>
          </div>

          {/* Backend Connection Guide & Sample Code */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>Backend Implementation Contract</span>
              </span>
              <button
                type="button"
                onClick={copySnippet}
                className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'Copied' : 'Copy Express Code'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono overflow-x-auto leading-relaxed">
              {sampleBackendSnippet}
            </pre>
            <p className="text-[10px] text-slate-500">
              When you deploy your backend, simply enter your proxy route above or mount it in your server file.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
