'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Server, Settings, Search, Upload, RefreshCw, Trash2, Download, Package,
  Layers, Cpu, Heart, Terminal, X, CheckCircle, AlertCircle, Info,
  ChevronLeft, ChevronRight, Copy, Wifi, HardDrive, FolderOpen, Filter,
  Activity, Plus, Globe, Edit2, Signal, Zap, Monitor, Car, FileText, Key,
  Users, ToggleLeft, ToggleRight, ExternalLink, ShieldCheck, Wrench
} from 'lucide-react';

const CATEGORIES = [
  'All', 'Adventure', 'Cursed', 'Decoration', 'Economy', 'Equipment', 'Food',
  'Game Mechanics', 'Library', 'Magic', 'Management', 'Minigame', 'Mobs',
  'Optimization', 'Social', 'Storage', 'Technology', 'Transportation', 'Utility', 'Worldgen'
];

const PLATFORM_COLORS = {
  bukkit:   { bg: 'rgba(217,119,6,0.15)',  color: '#f59e0b', border: '1px solid rgba(217,119,6,0.3)' },
  fabric:   { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' },
  forge:    { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' },
  neoforge: { bg: 'rgba(236,72,153,0.15)', color: '#f472b6', border: '1px solid rgba(236,72,153,0.3)' },
  paper:    { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' },
  purpur:   { bg: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' },
  spigot:   { bg: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)' },
};

function fmt(num) {
  if (!num) return '0';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
}

function fmtBytes(b) {
  if (!b) return '0 B';
  if (b >= 1073741824) return (b / 1073741824).toFixed(2) + ' GB';
  if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
  if (b >= 1024) return (b / 1024).toFixed(1) + ' KB';
  return b + ' B';
}

function timeAgo(d) {
  if (!d) return '';
  const days = Math.ceil(Math.abs(Date.now() - new Date(d)) / 86400000);
  if (days <= 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function logColor(line) {
  if (/\[ERROR\]|\[SEVERE\]/i.test(line)) return '#f87171';
  if (/\[WARN\]/i.test(line)) return '#fbbf24';
  if (/done \(|ready|started successfully/i.test(line)) return '#34d399';
  return '#8e95a5';
}

function Toasts({ items, onRemove }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999, pointerEvents: 'none' }}>
      {items.map(t => {
        const colors = {
          success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', icon: <CheckCircle size={16} color="#34d399" /> },
          error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',  icon: <AlertCircle size={16} color="#f87171" /> },
          info:    { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.35)', icon: <Info size={16} color="#818cf8" /> },
        }[t.type] || {};
        return (
          <div key={t.id} style={{ pointerEvents: 'all', display: 'flex', alignItems: 'center', gap: 10, background: colors.bg, border: `1px solid ${colors.border}`, backdropFilter: 'blur(12px)', padding: '11px 14px', borderRadius: 10, minWidth: 260, maxWidth: 400, animation: 'slideIn 0.2s ease' }}>
            <span style={{ flexShrink: 0 }}>{colors.icon}</span>
            <span style={{ flex: 1, fontSize: 13, color: '#e5e7eb', lineHeight: 1.4 }}>{t.msg}</span>
            <button onClick={() => onRemove(t.id)} style={{ color: '#4b5563', flexShrink: 0, padding: 2 }}><X size={13} /></button>
          </div>
        );
      })}
    </div>
  );
}

function ConfirmModal({ modal, onOk, onCancel }) {
  if (!modal) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#111217', border: '1px solid #2b303b', borderRadius: 16, padding: 28, width: 380, boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ background: 'rgba(239,68,68,0.12)', padding: 8, borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)' }}>
            <Trash2 size={18} color="#f87171" />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{modal.title}</h3>
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 22 }}>{modal.message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '9px 20px', background: '#1a1d24', border: '1px solid #2b303b', borderRadius: 8, color: '#9ca3af', fontSize: 13, fontWeight: 500 }}>Cancel</button>
          <button onClick={onOk} style={{ padding: '9px 20px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, color: '#f87171', fontSize: 13, fontWeight: 700 }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, note, children }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 6 }}>
        {label} {note && <span style={{ color: '#374151', fontWeight: 400 }}>{note}</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = { width: '100%', background: '#060709', border: '1px solid #1f2128', color: 'white', padding: '11px 14px', borderRadius: 8, fontSize: 14, outline: 'none', transition: 'border-color 0.2s' };

export default function Home() {
  // Game mode: 'minecraft' | 'fivem'
  const [gameMode, setGameMode] = useState('minecraft');

  const [activeTab, setActiveTab] = useState('server');
  const [serverSubTab, setServerSubTab] = useState('mods');
  const [configReady, setConfigReady] = useState(false);

  const [ftpConfig, setFtpConfig] = useState({
    host: '', port: 21, user: '', password: '',
    path: '/plugins', logsPath: '/logs/latest.log', serverVersion: ''
  });
  const [ftpStatus, setFtpStatus] = useState('idle');

  const [plugins, setPlugins] = useState([]);
  const [loadingPlugins, setLoadingPlugins] = useState(false);
  const [pluginError, setPluginError] = useState('');
  const [pluginSearch, setPluginSearch] = useState('');
  const [pluginSort, setPluginSort] = useState('name');

  const [logs, setLogs] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const logsEndRef = useRef(null);

  const [detectingVersion, setDetectingVersion] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('downloads');
  const [searchResults, setSearchResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [installingMod, setInstallingMod] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Search filters
  const [activePlatform, setActivePlatform] = useState('all');
  const [installedIds, setInstalledIds] = useState(new Set());

  // Live console + command input
  const [liveMode, setLiveMode] = useState(false);
  const [consoleInput, setConsoleInput] = useState('');

  // Server status monitoring
  const [servers, setServers] = useState([]);
  const [serverStatuses, setServerStatuses] = useState({});
  const [addServerModal, setAddServerModal] = useState(false);
  const [editingServer, setEditingServer] = useState(null);

  // Settings sub-tab + saved connections
  const [settingsSubTab, setSettingsSubTab] = useState('ftp');
  const [savedConnections, setSavedConnections] = useState([]);

  // Local server
  const [localSoftware, setLocalSoftware] = useState('paper');
  const [localVersions, setLocalVersions] = useState([]);
  const [localVersion, setLocalVersion] = useState('');
  const [localRam, setLocalRam] = useState('2');
  const [loadingLocalVersions, setLoadingLocalVersions] = useState(false);
  const [localStatus, setLocalStatus] = useState('stopped');
  const [localLog, setLocalLog] = useState('');
  const [localLogSearch, setLocalLogSearch] = useState('');
  const [localCmd, setLocalCmd] = useState('');
  const localPollRef = useRef(null);

  // FiveM state
  const [fivemStatus, setFivemStatus] = useState('stopped');
  const [fivemLog, setFivemLog] = useState('');
  const [fivemLogSearch, setFivemLogSearch] = useState('');
  const [fivemCmd, setFivemCmd] = useState('');
  const [fivemHasServer, setFivemHasServer] = useState(false);
  const [fivemServerDir, setFivemServerDir] = useState('');
  const [fivemConfig, setFivemConfig] = useState('');
  const [fivemResources, setFivemResources] = useState([]);
  const [fivemSubTab, setFivemSubTab] = useState('setup');
  const [fivemSettings, setFivemSettings] = useState({ licenseKey: '', hostname: 'WolfStudiosInc FiveM Server', maxClients: '32', port: '30120' });
  const [fivemSettingUp, setFivemSettingUp] = useState(false);
  const fivemPollRef = useRef(null);

  // Auto-updater state
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle | checking | available | downloading | downloaded | error
  const [updateVersion, setUpdateVersion] = useState('');
  const [updateProgress, setUpdateProgress] = useState(0);

  const [toasts, setToasts] = useState([]);
  const toastCounter = useRef(0);
  const addToast = useCallback((msg, type = 'info') => {
    const id = ++toastCounter.current;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);
  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const [confirmModal, setConfirmModal] = useState(null);
  const confirmResolve = useRef(null);
  const showConfirm = (title, message) =>
    new Promise(res => { confirmResolve.current = res; setConfirmModal({ title, message }); });
  const handleConfirmOk = () => { setConfirmModal(null); confirmResolve.current?.(true); };
  const handleConfirmCancel = () => { setConfirmModal(null); confirmResolve.current?.(false); };

  // IPC: auto-updater events from main process
  useEffect(() => {
    let ipc;
    try { ipc = window.require('electron').ipcRenderer; } catch { return; }
    const onAvail   = (_, info) => { setUpdateStatus('available');   setUpdateVersion(info.version); };
    const onNone    = ()       => setUpdateStatus('idle');
    const onProg    = (_, p)   => { setUpdateStatus('downloading'); setUpdateProgress(Math.round(p.percent)); };
    const onDone    = (_, info) => { setUpdateStatus('downloaded');  setUpdateVersion(info.version); };
    const onErr     = (_, msg) => { setUpdateStatus('error');       setUpdateVersion(msg); };
    ipc.on('update-available',     onAvail);
    ipc.on('update-not-available', onNone);
    ipc.on('download-progress',    onProg);
    ipc.on('update-downloaded',    onDone);
    ipc.on('update-error',         onErr);
    return () => {
      ipc.removeListener('update-available',     onAvail);
      ipc.removeListener('update-not-available', onNone);
      ipc.removeListener('download-progress',    onProg);
      ipc.removeListener('update-downloaded',    onDone);
      ipc.removeListener('update-error',         onErr);
    };
  }, []);

  const sendIpc = cmd => { try { window.require('electron').ipcRenderer.send(cmd); } catch {} };
  const checkForUpdates = () => { setUpdateStatus('checking'); sendIpc('check-for-updates'); };
  const installUpdate   = () => sendIpc('install-update');

  useEffect(() => {
    const saved = localStorage.getItem('ws_ftp_config');
    if (saved) {
      try { setFtpConfig(prev => ({ ...prev, ...JSON.parse(saved) })); } catch (_) {}
    }
    const savedSrv = localStorage.getItem('ws_servers');
    if (savedSrv) { try { setServers(JSON.parse(savedSrv)); } catch (_) {} }
    const savedConns = localStorage.getItem('ws_saved_connections');
    if (savedConns) { try { setSavedConnections(JSON.parse(savedConns)); } catch (_) {} }
    setConfigReady(true);
  }, []);

  // Auto-save ftpConfig whenever it changes
  useEffect(() => {
    if (configReady) localStorage.setItem('ws_ftp_config', JSON.stringify(ftpConfig));
  }, [ftpConfig, configReady]);

  useEffect(() => {
    if (configReady && serverSubTab === 'plugins' && ftpConfig.host) {
      fetchPlugins();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configReady, serverSubTab]);

  useEffect(() => {
    if (activeTab === 'server' && serverSubTab === 'mods') executeSearch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, sortBy, offset, serverSubTab, activeTab, activePlatform]);

  // Live console — recursive, no gap between polls
  useEffect(() => {
    let active = true;
    if (liveMode && ftpConfig.host) {
      const poll = async () => { if (!active) return; await fetchLogs(true); if (active) poll(); };
      poll();
    }
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMode, ftpConfig.host]);

  // Server status polling every 10s
  useEffect(() => {
    if (!servers.length) return;
    const pingOne = async (s) => {
      try {
        const res = await fetch('/api/server/ping', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host: s.host, port: parseInt(s.port) || 25565 })
        });
        const data = await res.json();
        setServerStatuses(prev => ({ ...prev, [s.id]: { ...data, lastChecked: Date.now() } }));
      } catch (_) {
        setServerStatuses(prev => ({ ...prev, [s.id]: { online: false, lastChecked: Date.now() } }));
      }
    };
    servers.forEach(pingOne);
    const id = setInterval(() => servers.forEach(pingOne), 10000);
    return () => clearInterval(id);
  }, [servers]);

  // Local server — fetch versions when software changes
  useEffect(() => {
    fetchLocalVersions(localSoftware);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSoftware]);

  // Local server — poll status when on local server tab
  useEffect(() => {
    if (activeTab === 'localserver') {
      pollLocalStatus();
      localPollRef.current = setInterval(pollLocalStatus, 2000);
    } else {
      clearInterval(localPollRef.current);
    }
    return () => clearInterval(localPollRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // FiveM — poll status when on fivem tab
  useEffect(() => {
    if (activeTab === 'fivem') {
      pollFivemStatus();
      fivemPollRef.current = setInterval(pollFivemStatus, 2000);
    } else {
      clearInterval(fivemPollRef.current);
    }
    return () => clearInterval(fivemPollRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const saveConfig = () => {
    localStorage.setItem('ws_ftp_config', JSON.stringify(ftpConfig));
    addToast('Configuration saved!', 'success');
  };

  // ─── Local server functions ─────────────────────────────────────────────────
  const fetchLocalVersions = async (sw) => {
    setLoadingLocalVersions(true);
    setLocalVersions([]);
    setLocalVersion('');
    try {
      const res  = await fetch('/api/local-server', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'versions', software: sw }),
      });
      const data = await res.json();
      const vers = data.versions || [];
      setLocalVersions(vers);
      if (vers.length) setLocalVersion(vers[0]);
    } catch (err) { addToast('Failed to fetch versions: ' + err.message, 'error'); }
    finally { setLoadingLocalVersions(false); }
  };

  const pollLocalStatus = async () => {
    try {
      const res  = await fetch('/api/local-server', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' }),
      });
      const data = await res.json();
      setLocalStatus(data.status || 'stopped');
      if (typeof data.log === 'string') setLocalLog(data.log);
    } catch (_) {}
  };

  const startLocalServer = async () => {
    if (!localVersion) return addToast('Select a version first.', 'error');
    if (['spigot', 'bukkit', 'forge'].includes(localSoftware)) {
      return addToast(`${localSoftware} requires manual installation — see the panel instructions.`, 'error');
    }
    setLocalStatus('starting');
    try {
      const res  = await fetch('/api/local-server', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', software: localSoftware, version: localVersion, ram: localRam }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      addToast('Server starting — check console for progress.', 'info');
    } catch (err) {
      setLocalStatus('stopped');
      addToast('Failed to start: ' + err.message, 'error');
    }
  };

  const stopLocalServer = async () => {
    try {
      const res  = await fetch('/api/local-server', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
    } catch (err) { addToast('Stop failed: ' + err.message, 'error'); }
  };

  const sendLocalCmd = async () => {
    if (!localCmd.trim()) return;
    const cmd = localCmd.trim();
    setLocalCmd('');
    try {
      await fetch('/api/local-server', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'command', command: cmd }),
      });
    } catch (err) { addToast('Command failed: ' + err.message, 'error'); }
  };

  // ─── FiveM server functions ──────────────────────────────────────────────────
  const pollFivemStatus = async () => {
    try {
      const res  = await fetch('/api/fivem-server', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' }),
      });
      const data = await res.json();
      setFivemStatus(data.status || 'stopped');
      if (typeof data.log === 'string') setFivemLog(data.log);
      if (typeof data.hasServer === 'boolean') setFivemHasServer(data.hasServer);
      if (data.serverDir) setFivemServerDir(data.serverDir);
      if (Array.isArray(data.resources)) setFivemResources(data.resources);
      if (typeof data.config === 'string' && data.config && !fivemConfig) setFivemConfig(data.config);
    } catch (_) {}
  };

  const setupFivem = async () => {
    setFivemSettingUp(true);
    try {
      const res  = await fetch('/api/fivem-server', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.alreadyInstalled) addToast('FiveM server already installed.', 'info');
      else addToast('FiveM server installed! Configure settings and click Start.', 'success');
      setFivemHasServer(true);
    } catch (err) { addToast('Setup failed: ' + err.message, 'error'); }
    finally { setFivemSettingUp(false); }
  };

  const startFivemServer = async () => {
    try {
      const res  = await fetch('/api/fivem-server', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', ...fivemSettings }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      addToast('FiveM server starting...', 'info');
    } catch (err) { addToast('Start failed: ' + err.message, 'error'); }
  };

  const stopFivemServer = async () => {
    try {
      const res  = await fetch('/api/fivem-server', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
    } catch (err) { addToast('Stop failed: ' + err.message, 'error'); }
  };

  const sendFivemCmd = async () => {
    if (!fivemCmd.trim()) return;
    const cmd = fivemCmd.trim();
    setFivemCmd('');
    try {
      await fetch('/api/fivem-server', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'command', command: cmd }),
      });
    } catch (err) { addToast('Command failed: ' + err.message, 'error'); }
  };

  const saveFivemConfig = async () => {
    try {
      const res  = await fetch('/api/fivem-server', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'writeConfig', config: fivemConfig }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      addToast('server.cfg saved!', 'success');
    } catch (err) { addToast('Save failed: ' + err.message, 'error'); }
  };

  const testConnection = async () => {
    if (!ftpConfig.host || !ftpConfig.user || !ftpConfig.password)
      return addToast('Fill in Host, Username and Password first.', 'error');
    setFtpStatus('testing');
    try {
      const res = await fetch('/api/ftp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ftpConfig, action: 'list' })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFtpStatus('connected');
      addToast(`Connected! Found ${data.data.length} items in ${ftpConfig.path}`, 'success');
    } catch (err) {
      setFtpStatus('error');
      addToast(`Connection failed: ${err.message}`, 'error');
    }
  };

  const fetchPlugins = async () => {
    if (!ftpConfig.host) { setPluginError('FTP not configured. Go to Settings first.'); return; }
    setLoadingPlugins(true);
    setPluginError('');
    try {
      const res = await fetch('/api/ftp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', ...ftpConfig })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPlugins(data.data.filter(p => p.name !== '.' && p.name !== '..'));
    } catch (err) {
      setPluginError(err.message);
      addToast(`Plugin list error: ${err.message}`, 'error');
    } finally { setLoadingPlugins(false); }
  };

  const deletePlugin = async (name, type) => {
    if (!name) return addToast('Plugin name is missing.', 'error');
    const ok = await showConfirm(`Delete "${name}"?`, `This will permanently remove ${name} from your server. This cannot be undone.`);
    if (!ok) return;
    try {
      const base = ftpConfig.path.replace(/\/$/, '');
      const res = await fetch('/api/ftp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ftpConfig, action: 'delete', path: `${base}/${name}`, type })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      addToast(`${name} deleted.`, 'success');
      fetchPlugins();
    } catch (err) { addToast(`Delete failed: ${err.message}`, 'error'); }
  };

  const autoDetectVersion = async () => {
    if (!ftpConfig.host) return addToast('Save FTP settings first.', 'error');
    setDetectingVersion(true);
    try {
      const res = await fetch('/api/ftp/read', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ftpConfig, path: ftpConfig.logsPath || '/logs/latest.log' })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const match = data.content.match(/Starting minecraft server version (\d+\.\d+(?:\.\d+)?)/i);
      if (match) {
        const v = match[1];
        setFtpConfig(prev => ({ ...prev, serverVersion: v }));
        localStorage.setItem('ws_ftp_config', JSON.stringify({ ...ftpConfig, serverVersion: v }));
        addToast(`Detected MC ${v}`, 'success');
      } else {
        addToast('Could not detect version. Enter it manually.', 'error');
      }
    } catch (err) { addToast(`Error: ${err.message}`, 'error'); }
    finally { setDetectingVersion(false); }
  };

  const fetchLogs = async (silent = false) => {
    if (!ftpConfig.host) return silent ? null : addToast('Configure FTP settings first.', 'error');
    if (!silent) setLoadingLogs(true);
    try {
      const res = await fetch('/api/ftp/read', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ftpConfig, path: ftpConfig.logsPath || '/logs/latest.log' })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLogs(data.content);
      if (!silent) addToast('Logs loaded.', 'success');
    } catch (err) { if (!silent) addToast(`Logs error: ${err.message}`, 'error'); }
    finally { if (!silent) setLoadingLogs(false); }
  };

  const executeSearch = async () => {
    setLoadingSearch(true);
    try {
      const facets = [
        ['project_type:mod', 'project_type:plugin'],
        ['server_side:required', 'server_side:optional'],
        ...(ftpConfig.serverVersion ? [[`versions:${ftpConfig.serverVersion}`]] : []),
        ...(activeCategory !== 'All' ? [[`categories:${activeCategory.toLowerCase().replace(/ /g, '-')}`]] : []),
        ...(activePlatform !== 'all' ? [[`categories:${activePlatform}`]] : []),
      ];
      const res = await fetch(
        `https://api.modrinth.com/v2/search?query=${encodeURIComponent(searchQuery)}&index=${sortBy}&limit=50&offset=${offset}&facets=${encodeURIComponent(JSON.stringify(facets))}`
      );
      const data = await res.json();
      setSearchResults(data.hits || []);
      setTotalResults(data.total_hits || 0);
    } catch (err) { addToast('Search error: ' + err.message, 'error'); }
    finally { setLoadingSearch(false); }
  };

  const installMod = async (project) => {
    if (!ftpConfig.host) return addToast('Configure FTP settings first.', 'error');
    setInstallingMod(project.project_id);
    try {
      let url = `https://api.modrinth.com/v2/project/${project.project_id}/version`;
      if (ftpConfig.serverVersion) url += `?game_versions=${encodeURIComponent(JSON.stringify([ftpConfig.serverVersion]))}`;
      const versions = await (await fetch(url)).json();
      if (!versions?.length) throw new Error(`No compatible version found for MC ${ftpConfig.serverVersion || 'any'}.`);
      const file = versions[0].files.find(f => f.primary) || versions[0].files[0];
      if (!file) throw new Error('No downloadable file found.');
      const form = new FormData();
      Object.entries(ftpConfig).forEach(([k, v]) => form.append(k, v));
      form.append('downloadUrl', file.url);
      form.append('fileName', file.filename);
      const data = await (await fetch('/api/ftp/upload', { method: 'POST', body: form })).json();
      if (data.error) throw new Error(data.error);
      setInstalledIds(prev => new Set([...prev, project.project_id]));
      addToast(`${project.title} installed!`, 'success');
    } catch (err) { addToast(`Install failed: ${err.message}`, 'error'); }
    finally { setInstallingMod(null); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!ftpConfig.host) return addToast('Configure FTP settings first.', 'error');
    setUploadingFile(true);
    try {
      const form = new FormData();
      Object.entries(ftpConfig).forEach(([k, v]) => form.append(k, v));
      form.append('file', file);
      const data = await (await fetch('/api/ftp/upload', { method: 'POST', body: form })).json();
      if (data.error) throw new Error(data.error);
      addToast(`${file.name} uploaded!`, 'success');
      if (serverSubTab === 'plugins') fetchPlugins();
    } catch (err) { addToast(`Upload failed: ${err.message}`, 'error'); }
    finally { setUploadingFile(false); e.target.value = ''; }
  };

  const saveServer = (s) => {
    const entry = { ...s, id: s.id || Date.now().toString() };
    const updated = servers.find(x => x.id === entry.id)
      ? servers.map(x => x.id === entry.id ? entry : x)
      : [...servers, entry];
    setServers(updated);
    localStorage.setItem('ws_servers', JSON.stringify(updated));
    setAddServerModal(false); setEditingServer(null);
  };

  const removeServer = (id) => {
    const updated = servers.filter(s => s.id !== id);
    setServers(updated);
    localStorage.setItem('ws_servers', JSON.stringify(updated));
    setServerStatuses(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const pingAllNow = () => {
    servers.forEach(async (s) => {
      try {
        const res = await fetch('/api/server/ping', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host: s.host, port: parseInt(s.port) || 25565 })
        });
        const data = await res.json();
        setServerStatuses(prev => ({ ...prev, [s.id]: { ...data, lastChecked: Date.now() } }));
      } catch (_) {
        setServerStatuses(prev => ({ ...prev, [s.id]: { online: false, lastChecked: Date.now() } }));
      }
    });
  };

  const sendConsoleCmd = async () => {
    if (!consoleInput.trim()) return;
    const cmd = consoleInput.trim();
    setConsoleInput('');
    try {
      const res = await fetch('/api/rcon', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: ftpConfig.host, port: parseInt(ftpConfig.rconPort) || 25575, password: ftpConfig.rconPassword || '', command: cmd })
      });
      const data = await res.json();
      if (data.error) addToast(`RCON: ${data.error}`, 'error');
      else { addToast(data.response || 'Command sent', 'success'); fetchLogs(true); }
    } catch (err) { addToast(`RCON failed: ${err.message}`, 'error'); }
  };

  const saveConnection = () => {
    if (!ftpConfig.host) return addToast('No host configured.', 'error');
    const name = ftpConfig.host;
    const entry = { ...ftpConfig, label: name, savedAt: Date.now() };
    const updated = savedConnections.find(c => c.host === ftpConfig.host)
      ? savedConnections.map(c => c.host === ftpConfig.host ? entry : c)
      : [...savedConnections, entry];
    setSavedConnections(updated);
    localStorage.setItem('ws_saved_connections', JSON.stringify(updated));
    addToast('Connection saved!', 'success');
  };

  const loadConnection = async (conn) => {
    setFtpConfig(conn);
    addToast(`Loaded ${conn.host} — connecting...`, 'info');
    setTimeout(() => testConnection(), 300);
  };

  const removeConnection = (host) => {
    const updated = savedConnections.filter(c => c.host !== host);
    setSavedConnections(updated);
    localStorage.setItem('ws_saved_connections', JSON.stringify(updated));
  };

  const filteredPlugins = plugins
    .filter(p => p.name.toLowerCase().includes(pluginSearch.toLowerCase()))
    .sort((a, b) => {
      if (pluginSort === 'name') return a.name.localeCompare(b.name);
      if (pluginSort === 'size') return b.size - a.size;
      if (pluginSort === 'type') return a.type.localeCompare(b.type);
      return 0;
    });

  const totalSize = plugins.reduce((s, p) => s + (p.size || 0), 0);

  const platformTags = (cats) => {
    if (!cats) return null;
    return cats.filter(c => PLATFORM_COLORS[c.toLowerCase()]).map(p => {
      const s = PLATFORM_COLORS[p.toLowerCase()];
      return (
        <span key={p} style={{ background: s.bg, color: s.color, border: s.border, padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {p}
        </span>
      );
    });
  };

  const dotColor = { idle: '#4b5563', testing: '#fbbf24', connected: '#34d399', error: '#f87171' }[ftpStatus];
  const onFocus = e => { e.target.style.borderColor = '#7c3aed'; };
  const onBlur  = e => { e.target.style.borderColor = '#1f2128'; };

  const mcNavItems = [
    { id: 'server',      icon: <Layers size={14} />,   label: 'Plugins & Mods',  badge: null },
    { id: 'servers',     icon: <Activity size={14} />, label: 'Server Status',    badge: servers.length || null },
    { id: 'localserver', icon: <Monitor size={14} />,  label: 'Local Server',     badge: localStatus === 'running' ? '●' : null },
    { id: 'logs',        icon: <Terminal size={14} />, label: 'Console Logs',     badge: null },
    { id: 'settings',    icon: <Settings size={14} />, label: 'FTP Settings',     badge: null },
  ];
  const fivemNavItems = [
    { id: 'fivem',          icon: <Car size={14} />,      label: 'FiveM Server', badge: fivemStatus === 'running' ? '●' : null },
    { id: 'fivemresources', icon: <Package size={14} />,  label: 'Resources',    badge: fivemResources.length || null },
    { id: 'fivemconfig',    icon: <FileText size={14} />, label: 'server.cfg',   badge: null },
  ];
  const navItems = gameMode === 'minecraft' ? mcNavItems : fivemNavItems;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#06070a', color: '#e5e7eb', fontFamily: "'Inter', -apple-system, sans-serif", overflow: 'hidden' }}>

      {/* ═══ CUSTOM TITLE BAR ═══════════════════════════════════════════════ */}
      <div style={{
        height: 40, flexShrink: 0,
        background: 'rgba(8,10,14,0.97)',
        borderBottom: '1px solid rgba(124,58,237,0.18)',
        display: 'flex', alignItems: 'center',
        WebkitAppRegion: 'drag',
        userSelect: 'none',
        paddingLeft: 14,
        backdropFilter: 'blur(12px)',
        zIndex: 9999,
      }}>
        {/* Logo + name */}
        <img src="/logo.png" alt="" style={{ width: 22, height: 22, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }}
          onError={e => { e.target.style.display = 'none'; }} />
        <span style={{ marginLeft: 9, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.2px' }}>WolfStudiosInc Server Manager</span>
        <div style={{ flex: 1 }} />
        {/* Window controls — no-drag so they're clickable */}
        <div style={{ display: 'flex', WebkitAppRegion: 'no-drag', height: '100%' }}>
          {/* Minimize — purple */}
          <button
            onClick={() => sendIpc('window-minimize')}
            title="Minimize"
            style={{
              width: 46, height: '100%', border: 'none', background: 'transparent',
              color: 'rgba(255,255,255,0.5)', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#7c3aed'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >─</button>
          {/* Maximize — purple */}
          <button
            onClick={() => sendIpc('window-maximize')}
            title="Maximize"
            style={{
              width: 46, height: '100%', border: 'none', background: 'transparent',
              color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#5b21b6'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >⬜</button>
          {/* Close — red */}
          <button
            onClick={() => sendIpc('window-close')}
            title="Close"
            style={{
              width: 46, height: '100%', border: 'none', background: 'transparent',
              color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >✕</button>
        </div>
      </div>

      {/* ═══ BODY (sidebar + main) ═══════════════════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* ═══ SIDEBAR ═══════════════════════════════════════════════════════════ */}
      <div style={{ width: 248, flexShrink: 0, background: '#080a0e', borderRight: '1px solid #12151c', display: 'flex', flexDirection: 'column', padding: '0 8px 12px' }}>

        {/* Logo + branding */}
        <div style={{ padding: '16px 10px 14px', borderBottom: '1px solid #12151c', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src="/logo.png"
              alt="WolfStudiosInc"
              style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', display: 'block', boxShadow: '0 4px 20px rgba(124,58,237,0.45)' }}
              onError={e => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div style={{ display: 'none', width: 42, height: 42, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', borderRadius: 10, alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(124,58,237,0.45)' }}>
              <Server size={18} color="white" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'white', letterSpacing: '-0.3px', lineHeight: 1.2 }}>WolfStudiosInc</div>
            <div style={{ fontSize: 10, color: '#374151', fontWeight: 500, marginTop: 2, letterSpacing: '0.5px' }}>SERVER MANAGER PRO</div>
          </div>
        </div>

        {/* Game mode switcher */}
        <div className="game-pill">
          <button
            className={gameMode === 'minecraft' ? 'active-mc' : ''}
            onClick={() => { setGameMode('minecraft'); setActiveTab('server'); }}>
            <span style={{ fontSize: 13 }}>⛏</span> Minecraft
          </button>
          <button
            className={gameMode === 'fivem' ? 'active-fivem' : ''}
            onClick={() => { setGameMode('fivem'); setActiveTab('fivem'); }}>
            <Car size={12} /> FiveM
          </button>
        </div>

        {/* FTP status indicator (Minecraft only) */}
        {gameMode === 'minecraft' && ftpConfig.host && (
          <div style={{ background: '#0c0e13', border: '1px solid #161920', borderRadius: 9, padding: '8px 11px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, boxShadow: ftpStatus === 'connected' ? '0 0 8px #34d399' : 'none', flexShrink: 0 }} />
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ftpConfig.host}</div>
              <div style={{ fontSize: 10, color: '#374151' }}>
                {{ idle: 'Not tested', testing: 'Connecting...', connected: 'Connected ✓', error: 'Offline' }[ftpStatus]}
              </div>
            </div>
          </div>
        )}

        {/* FiveM status indicator */}
        {gameMode === 'fivem' && (
          <div style={{ background: '#0c0e13', border: '1px solid #161920', borderRadius: 9, padding: '8px 11px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%',
              background: fivemStatus === 'running' ? '#34d399' : fivemStatus === 'starting' || fivemStatus === 'downloading' || fivemStatus === 'extracting' ? '#fbbf24' : '#374151',
              boxShadow: fivemStatus === 'running' ? '0 0 8px #34d399' : 'none',
              flexShrink: 0 }} />
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'white' }}>FiveM Server</div>
              <div style={{ fontSize: 10, color: fivemStatus === 'running' ? '#34d399' : '#374151', textTransform: 'capitalize' }}>
                {fivemStatus === 'stopped' ? (fivemHasServer ? 'Installed · Stopped' : 'Not installed') : fivemStatus}
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setActiveTab(n.id)} className="nav-btn" style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', borderRadius: 8,
              background: activeTab === n.id ? (gameMode === 'fivem' ? 'rgba(124,58,237,0.14)' : 'rgba(22,163,74,0.12)') : 'transparent',
              color: activeTab === n.id ? (gameMode === 'fivem' ? '#a78bfa' : '#4ade80') : '#4b5563',
              fontWeight: activeTab === n.id ? 600 : 400, fontSize: 13,
              borderLeft: activeTab === n.id ? `2px solid ${gameMode === 'fivem' ? '#7c3aed' : '#16a34a'}` : '2px solid transparent',
              transition: 'all 0.15s', textAlign: 'left', position: 'relative',
            }}>
              {n.icon}
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: n.badge === '●' ? '0' : '1px 6px',
                  borderRadius: n.badge === '●' ? '50%' : 10,
                  background: n.badge === '●' ? 'transparent' : 'rgba(124,58,237,0.2)',
                  color: n.badge === '●' ? '#34d399' : '#a78bfa' }}>
                  {n.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom stats (Minecraft) */}
        {gameMode === 'minecraft' && plugins.length > 0 && (
          <div style={{ marginTop: 'auto', padding: '12px', background: '#0c0e13', borderRadius: 10, border: '1px solid #161920' }}>
            <div style={{ fontSize: 10, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700, marginBottom: 8 }}>Installed</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'white', lineHeight: 1 }}>{plugins.length}</div>
                <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>plugins</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#a78bfa' }}>{fmtBytes(totalSize)}</div>
                <div style={{ fontSize: 10, color: '#4b5563' }}>total size</div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom stats (FiveM) */}
        {gameMode === 'fivem' && fivemHasServer && (
          <div style={{ marginTop: 'auto', padding: '12px', background: '#0c0e13', borderRadius: 10, border: '1px solid #161920' }}>
            <div style={{ fontSize: 10, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700, marginBottom: 8 }}>FiveM Resources</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'white', lineHeight: 1 }}>{fivemResources.length}</div>
            <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>installed</div>
          </div>
        )}

        {/* MC version badge */}
        {gameMode === 'minecraft' && ftpConfig.serverVersion && (
          <div style={{ margin: '10px 2px 0', padding: '7px 11px', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 7 }}>
            <HardDrive size={12} color="#16a34a" />
            <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>MC {ftpConfig.serverVersion}</span>
          </div>
        )}

        {/* ── Update button ───────────────────────────────────────── */}
        <div style={{ marginTop: 'auto', paddingTop: 10 }}>
          {updateStatus === 'downloaded' ? (
            <button onClick={installUpdate} style={{
              width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(22,163,74,0.4)',
              background: 'rgba(22,163,74,0.12)', color: '#4ade80', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Download size={13} /> Restart to Update v{updateVersion}
            </button>
          ) : updateStatus === 'available' ? (
            <div style={{ padding: '8px 11px', borderRadius: 8, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', fontSize: 11 }}>
              <div style={{ color: '#a78bfa', fontWeight: 700, marginBottom: 2 }}>Update v{updateVersion} downloading…</div>
              <div style={{ height: 4, background: '#1f2128', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${updateProgress}%`, background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', transition: 'width 0.3s' }} />
              </div>
            </div>
          ) : updateStatus === 'downloading' ? (
            <div style={{ padding: '8px 11px', borderRadius: 8, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', fontSize: 11 }}>
              <div style={{ color: '#a78bfa', fontWeight: 600, marginBottom: 4 }}>Downloading… {updateProgress}%</div>
              <div style={{ height: 4, background: '#1f2128', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${updateProgress}%`, background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', transition: 'width 0.3s' }} />
              </div>
            </div>
          ) : (
            <button onClick={checkForUpdates} disabled={updateStatus === 'checking'} style={{
              width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #1a1d26',
              background: '#0c0e13', color: updateStatus === 'error' ? '#f87171' : '#4b5563',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.15s',
            }}
              onMouseEnter={e => { if (updateStatus !== 'checking') { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = '#a78bfa'; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1d26'; e.currentTarget.style.color = updateStatus === 'error' ? '#f87171' : '#4b5563'; }}
            >
              <RefreshCw size={11} className={updateStatus === 'checking' ? 'spin' : ''} />
              {updateStatus === 'checking' ? 'Checking…' : updateStatus === 'error' ? 'Update check failed' : 'Check for Updates'}
            </button>
          )}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {activeTab === 'server' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 0, padding: '0 24px', borderBottom: '1px solid #161920', background: '#080a0d', flexShrink: 0 }}>
              {[
                { id: 'mods',    label: 'Search & Install', icon: <Search size={13} /> },
                { id: 'plugins', label: 'Installed Plugins', icon: <Package size={13} />, badge: plugins.length || null },
              ].map(t => (
                <button key={t.id} onClick={() => setServerSubTab(t.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '15px 18px', fontSize: 13, fontWeight: 600,
                  borderBottom: serverSubTab === t.id ? '2px solid #7c3aed' : '2px solid transparent',
                  color: serverSubTab === t.id ? 'white' : '#4b5563', transition: 'all 0.2s',
                }}>
                  {t.icon} {t.label}
                  {t.badge && <span style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa', padding: '1px 7px', borderRadius: 10, fontSize: 11 }}>{t.badge}</span>}
                </button>
              ))}
            </div>

            {serverSubTab === 'mods' && (
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <div style={{ width: 170, flexShrink: 0, borderRight: '1px solid #161920', padding: '14px 8px', overflowY: 'auto', background: '#080a0d' }} className="hide-scroll">
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.7px', padding: '0 8px', marginBottom: 8 }}>Category</div>
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => { if (activeCategory !== cat) { setActiveCategory(cat); setOffset(0); } }} style={{
                      width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 6, marginBottom: 1,
                      background: activeCategory === cat ? 'rgba(124,58,237,0.14)' : 'transparent',
                      color: activeCategory === cat ? '#a78bfa' : '#4b5563',
                      fontSize: 12, fontWeight: activeCategory === cat ? 600 : 400,
                      borderLeft: activeCategory === cat ? '2px solid #7c3aed' : '2px solid transparent',
                      transition: 'all 0.15s',
                    }}>
                      {cat}
                    </button>
                  ))}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 18px', borderBottom: '1px solid #161920', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, background: '#080a0d' }}>
                    <form onSubmit={(e) => { e.preventDefault(); setOffset(0); executeSearch(); }} style={{ flex: 1, position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#374151', pointerEvents: 'none' }} />
                      <input type="text" placeholder="Search server-side plugins and mods..." value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ ...inputStyle, padding: '9px 14px 9px 36px', fontSize: 13 }}
                        onFocus={onFocus} onBlur={onBlur} />
                    </form>
                    <select value={sortBy} onChange={e => { setSortBy(e.target.value); setOffset(0); }}
                      style={{ background: '#0e1116', border: '1px solid #1f2128', color: '#9ca3af', padding: '9px 12px', borderRadius: 8, fontSize: 12, outline: 'none', cursor: 'pointer' }}>
                      <option value="downloads">Most Downloaded</option>
                      <option value="relevance">Relevance</option>
                      <option value="newest">Newest</option>
                      <option value="updated">Recently Updated</option>
                    </select>
                    <button type="button" onClick={() => { setOffset(0); executeSearch(); }}
                      style={{ background: '#7c3aed', color: 'white', padding: '9px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Search size={13} /> Search
                    </button>
                    <input type="file" id="upload-jar" style={{ display: 'none' }} accept=".jar,.zip" onChange={handleFileUpload} disabled={uploadingFile} />
                    <label htmlFor="upload-jar" style={{ background: '#0e1116', border: '1px dashed #2b303b', color: '#6b7280', padding: '9px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {uploadingFile ? <RefreshCw size={13} className="spin" /> : <Upload size={13} />} Upload .jar
                    </label>
                  </div>

                  {/* Platform + version type filter row */}
                  <div style={{ padding: '8px 14px', borderBottom: '1px solid #161920', display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', background: '#050608' }}>
                    <span style={{ fontSize: 10, color: '#374151', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: 2 }}>Platform:</span>
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'bukkit', label: 'Bukkit' },
                      { id: 'paper', label: 'Paper' },
                      { id: 'spigot', label: 'Spigot' },
                      { id: 'purpur', label: 'Purpur' },
                      { id: 'fabric', label: 'Fabric' },
                      { id: 'forge', label: 'Forge' },
                      { id: 'neoforge', label: 'NeoForge' },
                    ].map(p => {
                      const pc = PLATFORM_COLORS[p.id];
                      const active = activePlatform === p.id;
                      return (
                        <button key={p.id} onClick={() => { setActivePlatform(p.id); setOffset(0); }}
                          style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s',
                            background: active ? (pc ? pc.bg : 'rgba(124,58,237,0.15)') : 'transparent',
                            color: active ? (pc ? pc.color : '#a78bfa') : '#374151',
                            border: active ? (pc ? pc.border : '1px solid rgba(124,58,237,0.3)') : '1px solid transparent' }}>
                          {p.label}
                        </button>
                      );
                    })}
                    <div style={{ width: 1, height: 16, background: '#1f2128', margin: '0 4px' }} />
                  </div>

                  <div style={{ padding: '7px 18px', fontSize: 11, color: '#374151', borderBottom: '1px solid #161920', flexShrink: 0 }}>
                    {totalResults > 0 ? `${(offset + 1).toLocaleString()}–${Math.min(offset + 50, totalResults).toLocaleString()} of ${totalResults.toLocaleString()} results` : loadingSearch ? 'Searching...' : 'No results'}
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto' }} className="hide-scroll">
                    {loadingSearch ? (
                      <div style={{ padding: 80, textAlign: 'center' }}>
                        <RefreshCw size={28} className="spin" color="#7c3aed" style={{ margin: '0 auto 12px' }} />
                        <p style={{ color: '#374151', fontSize: 13 }}>Searching Modrinth...</p>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <>
                        {searchResults.map(mod => (
                          <div key={mod.project_id} style={{ padding: '14px 18px', borderBottom: '1px solid #0e1116', display: 'flex', gap: 14, alignItems: 'center', transition: 'background 0.12s' }} className="list-row">
                            {mod.icon_url
                              ? <img src={mod.icon_url} alt="" style={{ width: 48, height: 48, borderRadius: 10, border: '1px solid #161920', objectFit: 'cover', flexShrink: 0 }} />
                              : <div style={{ width: 48, height: 48, borderRadius: 10, background: '#0e1116', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #161920', flexShrink: 0 }}><Package size={22} color="#374151" /></div>
                            }
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: 14, color: 'white' }}>{mod.title}</span>
                                {platformTags(mod.categories)}
                                {mod.versions?.[mod.versions.length - 1] && (
                                  <span style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', padding: '1px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                                    {mod.versions[mod.versions.length - 1]}
                                  </span>
                                )}
                              </div>
                              <p style={{ fontSize: 12, color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5 }}>{mod.description}</p>
                              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#374151' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Download size={11} /> {fmt(mod.downloads)}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Heart size={11} /> {fmt(mod.follows)}</span>
                                <span>by <strong style={{ color: '#6b7280' }}>{mod.author}</strong></span>
                                <span>{timeAgo(mod.date_modified)}</span>
                              </div>
                            </div>
                            {installedIds.has(mod.project_id) ? (
                              <div style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
                                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}>
                                <CheckCircle size={13} /> Installed
                              </div>
                            ) : (
                              <button onClick={() => installMod(mod)} disabled={!!installingMod}
                                style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                                  background: installingMod === mod.project_id ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.14)',
                                  border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa',
                                  cursor: installingMod ? 'not-allowed' : 'pointer' }}>
                                {installingMod === mod.project_id ? <><RefreshCw size={13} className="spin" />Installing...</> : <><Download size={13} />Install</>}
                              </button>
                            )}
                          </div>
                        ))}
                        {totalResults > 50 && (
                          <div style={{ padding: 14, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, borderTop: '1px solid #161920' }}>
                            <button onClick={() => setOffset(Math.max(0, offset - 50))} disabled={offset === 0}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', background: '#0e1116', border: '1px solid #161920', borderRadius: 7, color: offset === 0 ? '#374151' : 'white', fontSize: 12, fontWeight: 500 }}>
                              <ChevronLeft size={13} /> Prev
                            </button>
                            <span style={{ fontSize: 12, color: '#4b5563' }}>Page {Math.floor(offset / 50) + 1} / {Math.ceil(totalResults / 50)}</span>
                            <button onClick={() => setOffset(offset + 50)} disabled={offset + 50 >= totalResults}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', background: '#0e1116', border: '1px solid #161920', borderRadius: 7, color: offset + 50 >= totalResults ? '#374151' : 'white', fontSize: 12, fontWeight: 500 }}>
                              Next <ChevronRight size={13} />
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ padding: 80, textAlign: 'center' }}>
                        <Search size={36} color="#161920" style={{ margin: '0 auto 12px' }} />
                        <p style={{ color: '#374151', fontSize: 13 }}>No plugins found. Try a different search or category.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {serverSubTab === 'plugins' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #161920', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#374151', pointerEvents: 'none' }} />
                    <input type="text" placeholder="Filter installed plugins..." value={pluginSearch} onChange={e => setPluginSearch(e.target.value)}
                      style={{ ...inputStyle, padding: '9px 14px 9px 32px', fontSize: 13 }} />
                  </div>
                  <select value={pluginSort} onChange={e => setPluginSort(e.target.value)}
                    style={{ background: '#0e1116', border: '1px solid #1f2128', color: '#9ca3af', padding: '9px 12px', borderRadius: 8, fontSize: 12, outline: 'none' }}>
                    <option value="name">Name A-Z</option>
                    <option value="size">Largest first</option>
                    <option value="type">Type</option>
                  </select>
                  <button onClick={fetchPlugins} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0e1116', border: '1px solid #1f2128', color: 'white', padding: '9px 14px', borderRadius: 8, fontWeight: 500, fontSize: 12 }}>
                    <RefreshCw size={13} className={loadingPlugins ? 'spin' : ''} /> Refresh
                  </button>
                </div>

                {plugins.length > 0 && (
                  <div style={{ padding: '7px 20px', borderBottom: '1px solid #161920', display: 'flex', gap: 12, fontSize: 11, color: '#374151', flexShrink: 0 }}>
                    <span>{plugins.length} installed</span>
                    <span>·</span>
                    <span>{plugins.filter(p => p.type === 'file').length} files</span>
                    <span>·</span>
                    <span>{plugins.filter(p => p.type === 'directory').length} folders</span>
                    <span>·</span>
                    <span>{fmtBytes(totalSize)}</span>
                    {pluginSearch && <><span>·</span><span style={{ color: '#a78bfa' }}>{filteredPlugins.length} matching</span></>}
                  </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }} className="hide-scroll">
                  {loadingPlugins ? (
                    <div style={{ padding: 80, textAlign: 'center' }}>
                      <RefreshCw size={28} className="spin" color="#7c3aed" style={{ margin: '0 auto 12px' }} />
                      <p style={{ color: '#374151', fontSize: 13 }}>Connecting to FTP...</p>
                    </div>
                  ) : pluginError ? (
                    <div style={{ padding: 60, textAlign: 'center' }}>
                      <AlertCircle size={36} color="#f87171" style={{ margin: '0 auto 14px' }} />
                      <p style={{ color: '#f87171', fontSize: 13, marginBottom: 16 }}>{pluginError}</p>
                      <button onClick={fetchPlugins} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Retry</button>
                    </div>
                  ) : filteredPlugins.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {filteredPlugins.map((plugin, i) => {
                        const isDir = plugin.type === 'directory';
                        return (
                          <div key={i} style={{ background: '#0a0c10', border: '1px solid #161920', borderRadius: 9, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color 0.15s' }} className="plugin-card">
                            <div style={{ width: 34, height: 34, borderRadius: 7, background: isDir ? 'rgba(124,58,237,0.1)' : 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {isDir ? <FolderOpen size={16} color="#a78bfa" /> : <Package size={16} color="#818cf8" />}
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                                <span style={{ fontWeight: 600, fontSize: 13, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plugin.name}</span>
                                <span style={{ flexShrink: 0, background: isDir ? 'rgba(124,58,237,0.1)' : 'rgba(99,102,241,0.08)', color: isDir ? '#a78bfa' : '#818cf8', border: isDir ? '1px solid rgba(124,58,237,0.2)' : '1px solid rgba(99,102,241,0.2)', padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>
                                  {isDir ? 'folder' : 'jar'}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: '#374151' }}>{fmtBytes(plugin.size)}</div>
                            </div>
                            <button onClick={() => deletePlugin(plugin.name, plugin.type)}
                              style={{ padding: 7, color: '#374151', background: 'transparent', borderRadius: 7, border: '1px solid transparent', transition: 'all 0.15s', flexShrink: 0 }} className="del-btn">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : plugins.length > 0 ? (
                    <div style={{ padding: 60, textAlign: 'center' }}>
                      <Filter size={32} color="#161920" style={{ margin: '0 auto 12px' }} />
                      <p style={{ color: '#374151', fontSize: 13 }}>No plugins match "{pluginSearch}"</p>
                    </div>
                  ) : (
                    <div style={{ padding: 80, textAlign: 'center' }}>
                      <Package size={40} color="#161920" style={{ margin: '0 auto 14px' }} />
                      <p style={{ color: '#374151', fontSize: 14, marginBottom: 6 }}>No plugins found</p>
                      <p style={{ color: '#1f2128', fontSize: 12 }}>Check your Plugins Directory path in Settings, then click Refresh.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'servers' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 24px', borderBottom: '1px solid #161920', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <Activity size={16} color="#7c3aed" />
              <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>Server Status</span>
              <button onClick={pingAllNow}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#0e1116', border: '1px solid #161920', borderRadius: 8, color: '#6b7280', fontSize: 12 }}>
                <RefreshCw size={13} /> Refresh All
              </button>
              <button onClick={() => { setEditingServer({ name: '', host: '', port: '25565', rconPort: '25575', rconPassword: '' }); setAddServerModal(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: 'rgba(124,58,237,0.14)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, color: '#a78bfa', fontSize: 12, fontWeight: 600 }}>
                <Plus size={13} /> Add Server
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }} className="hide-scroll">
              {servers.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: 100 }}>
                  <Globe size={42} color="#161920" style={{ margin: '0 auto 16px' }} />
                  <p style={{ color: '#374151', fontSize: 14, marginBottom: 6 }}>No servers added</p>
                  <p style={{ color: '#1f2128', fontSize: 12 }}>Click “Add Server” to monitor a Minecraft server</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {servers.map(s => {
                    const st = serverStatuses[s.id];
                    const isOnline = st?.online;
                    const hasStatus = !!st;
                    const pingColor = !st?.latency ? '#4b5563' : st.latency < 80 ? '#34d399' : st.latency < 200 ? '#fbbf24' : '#f87171';
                    return (
                      <div key={s.id} style={{ background: '#0a0c10', border: `1px solid ${isOnline ? 'rgba(16,185,129,0.2)' : hasStatus ? 'rgba(239,68,68,0.12)' : '#161920'}`, borderRadius: 14, padding: 20, position: 'relative', transition: 'border-color 0.3s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                          <div style={{ width: 11, height: 11, borderRadius: '50%', flexShrink: 0,
                            background: !hasStatus ? '#4b5563' : isOnline ? '#34d399' : '#ef4444',
                            boxShadow: isOnline ? '0 0 10px rgba(52,211,153,0.7)' : hasStatus ? '0 0 8px rgba(239,68,68,0.5)' : 'none' }} />
                          <span style={{ fontWeight: 700, fontSize: 14, color: 'white', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name || s.host}</span>
                          <button onClick={() => { setEditingServer(s); setAddServerModal(true); }}
                            style={{ padding: 5, color: '#4b5563', borderRadius: 5, border: '1px solid transparent' }}>
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => removeServer(s.id)}
                            style={{ padding: 5, color: '#4b5563', borderRadius: 5, border: '1px solid transparent' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>

                        <div style={{ fontSize: 11, color: '#374151', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Globe size={10} /> {s.host}:{s.port || 25565}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                          <div style={{ background: '#060708', borderRadius: 9, padding: '10px 8px', textAlign: 'center' }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: !hasStatus ? '#374151' : isOnline ? '#34d399' : '#ef4444', marginBottom: 3 }}>
                              {!hasStatus ? '—' : isOnline ? 'Online' : 'Offline'}
                            </div>
                            <div style={{ fontSize: 10, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</div>
                          </div>
                          <div style={{ background: '#060708', borderRadius: 9, padding: '10px 8px', textAlign: 'center' }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: pingColor, marginBottom: 3 }}>
                              {st?.latency != null ? `${st.latency}ms` : '—'}
                            </div>
                            <div style={{ fontSize: 10, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ping</div>
                          </div>
                          <div style={{ background: '#060708', borderRadius: 9, padding: '10px 8px', textAlign: 'center' }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 3 }}>
                              {st?.players != null ? `${st.players}/${st.maxPlayers}` : '—'}
                            </div>
                            <div style={{ fontSize: 10, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Players</div>
                          </div>
                        </div>

                        {st?.version && (
                          <div style={{ padding: '7px 10px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)', borderRadius: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.motd || 'A Minecraft Server'}</span>
                            <span style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, flexShrink: 0 }}>{st.version}</span>
                          </div>
                        )}
                        {st?.lastChecked && (
                          <div style={{ marginTop: 8, fontSize: 10, color: '#1f2128', textAlign: 'right' }}>
                            {Math.round((Date.now() - st.lastChecked) / 1000)}s ago
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ LOCAL SERVER TAB ══════════════════════════════════════════════ */}
        {activeTab === 'localserver' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid #161920', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <Monitor size={16} color="#7c3aed" />
              <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>Local Server Setup</span>
              {/* Status badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20,
                background: localStatus === 'running' ? 'rgba(16,185,129,0.1)' : localStatus === 'starting' || localStatus === 'stopping' ? 'rgba(251,191,36,0.08)' : 'rgba(55,65,81,0.15)',
                border: `1px solid ${localStatus === 'running' ? 'rgba(16,185,129,0.3)' : localStatus === 'starting' || localStatus === 'stopping' ? 'rgba(251,191,36,0.25)' : 'rgba(55,65,81,0.2)'}` }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%',
                  background: localStatus === 'running' ? '#34d399' : localStatus === 'starting' || localStatus === 'stopping' ? '#fbbf24' : '#374151',
                  boxShadow: localStatus === 'running' ? '0 0 8px #34d399' : 'none',
                  animation: (localStatus === 'starting' || localStatus === 'stopping') ? 'pulse 1s infinite' : 'none' }} />
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
                  color: localStatus === 'running' ? '#34d399' : localStatus === 'starting' || localStatus === 'stopping' ? '#fbbf24' : '#4b5563' }}>
                  {localStatus}
                </span>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Left config panel */}
              <div style={{ width: 310, flexShrink: 0, borderRight: '1px solid #161920', overflowY: 'auto', padding: 20, background: '#060709', display: 'flex', flexDirection: 'column', gap: 18 }} className="hide-scroll">

                {/* Software selector */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>Server Software</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[
                      { id: 'paper',   label: 'Paper',   sub: 'Auto-download • Recommended', color: '#34d399', auto: true },
                      { id: 'purpur',  label: 'Purpur',  sub: 'Auto-download • Paper fork',  color: '#c084fc', auto: true },
                      { id: 'fabric',  label: 'Fabric',  sub: 'Auto-download • Mod support',  color: '#60a5fa', auto: true },
                      { id: 'vanilla', label: 'Vanilla', sub: 'Auto-download • Official Mojang', color: '#6b7280', auto: true },
                      { id: 'spigot',  label: 'Spigot',  sub: 'Manual • BuildTools required', color: '#fb923c', auto: false },
                      { id: 'bukkit',  label: 'Bukkit',  sub: 'Manual • BuildTools required', color: '#f59e0b', auto: false },
                      { id: 'forge',   label: 'Forge',   sub: 'Manual • Installer required',  color: '#818cf8', auto: false },
                    ].map(s => (
                      <button key={s.id} onClick={() => setLocalSoftware(s.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                          background: localSoftware === s.id ? 'rgba(124,58,237,0.1)' : '#0a0c10',
                          border: localSoftware === s.id ? '1px solid rgba(124,58,237,0.3)' : '1px solid #161920',
                          textAlign: 'left', transition: 'all 0.15s' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: localSoftware === s.id ? 'white' : '#9ca3af' }}>{s.label}</div>
                          <div style={{ fontSize: 10, color: s.auto ? '#374151' : '#92400e', marginTop: 1 }}>{s.sub}</div>
                        </div>
                        {localSoftware === s.id && <CheckCircle size={13} color="#a78bfa" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Version selector */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    Minecraft Version
                    {loadingLocalVersions && <RefreshCw size={10} color="#7c3aed" className="spin" />}
                  </div>
                  <select value={localVersion} onChange={e => setLocalVersion(e.target.value)}
                    style={{ width: '100%', background: '#0a0c10', border: '1px solid #1f2128', color: localVersions.length ? 'white' : '#374151',
                      padding: '10px 12px', borderRadius: 8, fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                    {loadingLocalVersions
                      ? <option>Loading versions...</option>
                      : localVersions.length === 0
                        ? <option>No versions available</option>
                        : localVersions.map(v => <option key={v} value={v}>{v}</option>)
                    }
                  </select>
                  <div style={{ marginTop: 5, fontSize: 10, color: '#1f2128' }}>
                    {localVersions.length > 0 && `${localVersions.length} versions available`}
                  </div>
                </div>

                {/* RAM allocation */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>RAM Allocation</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {[['0.5','512 MB'],['1','1 GB'],['2','2 GB'],['3','3 GB'],['4','4 GB'],['6','6 GB'],['8','8 GB'],['12','12 GB'],['16','16 GB']].map(([val, label]) => (
                      <button key={val} onClick={() => setLocalRam(val)}
                        style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                          background: localRam === val ? 'rgba(124,58,237,0.15)' : 'transparent',
                          color: localRam === val ? '#a78bfa' : '#374151',
                          border: localRam === val ? '1px solid rgba(124,58,237,0.35)' : '1px solid #161920' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 7, fontSize: 10, color: '#374151' }}>
                    JVM: -Xms{Math.max(512, Math.round(parseFloat(localRam) * 512))}M → -Xmx{Math.round(parseFloat(localRam) * 1024)}M
                  </div>
                </div>

                {/* Server directory */}
                <div style={{ padding: '10px 12px', background: '#0a0c10', border: '1px solid #161920', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 5 }}>Server Directory</div>
                  <div style={{ fontSize: 10, color: '#4b5563', fontFamily: "'Cascadia Code','Consolas',monospace", wordBreak: 'break-all', lineHeight: 1.6 }}>
                    ~/WolfStudiosInc-Servers/{localSoftware}-{localVersion || '...'}
                  </div>
                </div>

                {/* Manual-only notice OR start/stop button */}
                {['spigot', 'bukkit', 'forge'].includes(localSoftware) ? (
                  <div style={{ padding: '14px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, fontSize: 12, color: '#92400e', lineHeight: 1.7 }}>
                    <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 6 }}>
                      {localSoftware.charAt(0).toUpperCase() + localSoftware.slice(1)} — Manual Installation Required
                    </div>
                    {localSoftware === 'forge' ? (
                      <>
                        Download the Forge Installer from{' '}
                        <a href="https://files.minecraftforge.net" target="_blank" rel="noreferrer" style={{ color: '#fbbf24' }}>files.minecraftforge.net</a>,
                        run the installer JAR with Java, then place the resulting server JAR in your server folder.
                      </>
                    ) : (
                      <>
                        Spigot and Bukkit require{' '}
                        <a href="https://www.spigotmc.org/wiki/buildtools/" target="_blank" rel="noreferrer" style={{ color: '#fbbf24' }}>BuildTools</a>{' '}
                        to compile the server JAR. Run <code style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '1px 5px', borderRadius: 3 }}>java -jar BuildTools.jar --rev {localVersion || 'latest'}</code>.
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {localStatus === 'stopped' && (
                      <button onClick={startLocalServer} disabled={!localVersion || loadingLocalVersions}
                        style={{ width: '100%', padding: '13px', borderRadius: 10, fontWeight: 700, fontSize: 14, border: 'none', cursor: localVersion ? 'pointer' : 'not-allowed',
                          background: localVersion ? 'linear-gradient(135deg,#7c3aed,#5b21b6)' : '#111',
                          color: localVersion ? 'white' : '#374151',
                          boxShadow: localVersion ? '0 4px 20px rgba(124,58,237,0.35)' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}>
                        <Zap size={16} /> Start Server
                      </button>
                    )}
                    {(localStatus === 'starting') && (
                      <button disabled style={{ width: '100%', padding: '13px', borderRadius: 10, fontWeight: 700, fontSize: 14, border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.08)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <RefreshCw size={15} className="spin" /> Starting...
                      </button>
                    )}
                    {localStatus === 'running' && (
                      <button onClick={stopLocalServer}
                        style={{ width: '100%', padding: '13px', borderRadius: 10, fontWeight: 700, fontSize: 14, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                        <X size={16} /> Stop Server
                      </button>
                    )}
                    {localStatus === 'stopping' && (
                      <button disabled style={{ width: '100%', padding: '13px', borderRadius: 10, fontWeight: 700, fontSize: 14, border: '1px solid #161920', background: '#0a0c10', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <RefreshCw size={15} className="spin" /> Stopping...
                      </button>
                    )}
                  </div>
                )}

                {/* Java requirement note */}
                <div style={{ fontSize: 11, color: '#374151', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1, color: '#374151' }} />
                  <span>Requires <strong style={{ color: '#6b7280' }}>Java 17+</strong> installed and available on your system PATH.</span>
                </div>

                {/* Port forwarding red warning */}
                <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: '#f87171', fontWeight: 700, marginBottom: 5 }}>⚠ Port Forwarding Required for Internet Play</div>
                  <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.7 }}>
                    If you want <strong style={{ color: '#f87171' }}>other people to join over the internet</strong>, you must port forward <strong style={{ color: '#f87171' }}>port 25565</strong> on your router. For <strong style={{ color: '#9ca3af' }}>local LAN play only</strong>, no port forwarding is needed.
                  </div>
                </div>
              </div>

              {/* Right: server console */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#040507' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #161920', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, background: '#080a0d' }}>
                  <Terminal size={13} color="#7c3aed" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', flex: 1 }}>Server Console</span>
                  <div style={{ position: 'relative' }}>
                    <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#374151', pointerEvents: 'none' }} />
                    <input type="text" placeholder="Filter output..." value={localLogSearch} onChange={e => setLocalLogSearch(e.target.value)}
                      style={{ background: '#0e1116', border: '1px solid #161920', color: 'white', padding: '5px 10px 5px 26px', borderRadius: 6, fontSize: 11, outline: 'none', width: 160 }} />
                  </div>
                  <button onClick={() => setLocalLog('')}
                    style={{ padding: '5px 10px', background: '#0e1116', border: '1px solid #161920', borderRadius: 6, color: '#374151', fontSize: 11, cursor: 'pointer' }}>
                    Clear
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', fontFamily: "'Cascadia Code','Fira Code','Consolas',monospace", fontSize: 12, lineHeight: 1.7 }} className="hide-scroll">
                  {localLog
                    ? localLog.split('\n')
                        .filter(line => !localLogSearch || line.toLowerCase().includes(localLogSearch.toLowerCase()))
                        .map((line, i) => (
                          <div key={i} style={{ color: logColor(line), wordBreak: 'break-all' }}>{line || '\u00A0'}</div>
                        ))
                    : (
                      <div style={{ textAlign: 'center', marginTop: 80 }}>
                        <Monitor size={40} color="#161920" style={{ margin: '0 auto 14px' }} />
                        <div style={{ color: '#1f2128', fontSize: 13 }}>Configure and start a server to see console output here.</div>
                      </div>
                    )
                  }
                </div>

                {/* Command input */}
                <div style={{ padding: '8px 12px 10px', borderTop: '1px solid #161920', display: 'flex', gap: 8, alignItems: 'center', background: '#02030a', flexShrink: 0 }}>
                  <span style={{ color: localStatus === 'running' ? '#34d399' : '#374151', fontFamily: "'Cascadia Code','Consolas',monospace", fontSize: 13, flexShrink: 0 }}>{'>'}</span>
                  <input type="text" placeholder={localStatus === 'running' ? 'Type a server command...' : 'Start the server to run commands'}
                    value={localCmd}
                    onChange={e => setLocalCmd(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendLocalCmd()}
                    disabled={localStatus !== 'running'}
                    style={{ flex: 1, background: 'transparent', border: 'none',
                      color: localStatus === 'running' ? '#34d399' : '#374151',
                      fontFamily: "'Cascadia Code','Fira Code','Consolas',monospace", fontSize: 12, outline: 'none',
                      cursor: localStatus === 'running' ? 'text' : 'not-allowed' }} />
                  <button onClick={sendLocalCmd} disabled={localStatus !== 'running' || !localCmd.trim()}
                    style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, transition: 'all 0.15s', cursor: localStatus === 'running' && localCmd.trim() ? 'pointer' : 'not-allowed',
                      background: localStatus === 'running' && localCmd.trim() ? 'rgba(124,58,237,0.12)' : 'transparent',
                      color: localStatus === 'running' && localCmd.trim() ? '#a78bfa' : '#1f2128',
                      border: localStatus === 'running' && localCmd.trim() ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent' }}>
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Logs header */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #161920', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              <Terminal size={16} color="#7c3aed" />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Console Logs</span>

              {/* Live toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8, padding: '5px 12px', borderRadius: 20,
                background: liveMode ? 'rgba(16,185,129,0.1)' : '#0e1116',
                border: liveMode ? '1px solid rgba(16,185,129,0.3)' : '1px solid #161920',
                cursor: 'pointer' }} onClick={() => { setLiveMode(l => !l); if (!liveMode && ftpConfig.host) fetchLogs(true); }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: liveMode ? '#34d399' : '#374151',
                  boxShadow: liveMode ? '0 0 8px #34d399' : 'none', animation: liveMode ? 'pulse 1.5s infinite' : 'none' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: liveMode ? '#34d399' : '#4b5563' }}>{liveMode ? 'Live' : 'Live Off'}</span>
              </div>

              <div style={{ flex: 1 }} />

              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#374151', pointerEvents: 'none' }} />
                <input type="text" placeholder="Filter log lines..." value={logSearch} onChange={e => setLogSearch(e.target.value)}
                  style={{ background: '#0e1116', border: '1px solid #161920', color: 'white', padding: '7px 12px 7px 30px', borderRadius: 7, fontSize: 12, outline: 'none', width: 200 }} />
              </div>
              {logs && (
                <button onClick={() => navigator.clipboard?.writeText(logs).then(() => addToast('Copied!', 'success'))}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#0e1116', border: '1px solid #161920', color: '#6b7280', padding: '7px 12px', borderRadius: 7, fontSize: 12 }}>
                  <Copy size={13} /> Copy
                </button>
              )}
              <button onClick={() => fetchLogs(false)} disabled={loadingLogs}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#7c3aed', color: 'white', padding: '7px 16px', borderRadius: 7, fontWeight: 600, fontSize: 12, opacity: loadingLogs ? 0.7 : 1 }}>
                <RefreshCw size={13} className={loadingLogs ? 'spin' : ''} /> Fetch Latest
              </button>
            </div>

            {/* Live status bar */}
            {liveMode && (
              <div style={{ padding: '6px 20px', background: 'rgba(16,185,129,0.05)', borderBottom: '1px solid rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>Live — streaming continuously</span>
                {!ftpConfig.host && <span style={{ fontSize: 11, color: '#f87171' }}>⚠ No FTP configured</span>}
              </div>
            )}

            <div style={{ flex: 1, background: '#040507', overflowY: 'auto', padding: '14px 18px', fontFamily: "'Cascadia Code','Fira Code','Consolas',monospace", fontSize: 12, lineHeight: 1.75 }} className="hide-scroll">
              {loadingLogs ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#7c3aed' }}>
                  <RefreshCw size={14} className="spin" /> Reading log file from server...
                </div>
              ) : logs ? (
                logs.split('\n')
                  .filter(line => !logSearch || line.toLowerCase().includes(logSearch.toLowerCase()))
                  .map((line, i) => (
                    <div key={i} style={{ color: logColor(line), wordBreak: 'break-all' }}>{line || '\u00A0'}</div>
                  ))
              ) : (
                <div style={{ color: '#1f2128', textAlign: 'center', marginTop: 120 }}>
                  <Terminal size={36} color="#161920" style={{ margin: '0 auto 14px' }} />
                  <div style={{ fontSize: 13 }}>Click "Fetch Latest" or enable Live to stream logs from your FTP server.</div>
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
            {/* Console command input */}
            <div style={{ padding: '8px 14px 10px', borderTop: '1px solid #161920', display: 'flex', gap: 8, alignItems: 'center', background: '#02030a', flexShrink: 0 }}>
              <span style={{ color: '#34d399', fontFamily: "'Cascadia Code','Consolas',monospace", fontSize: 13, flexShrink: 0 }}>{'>'}</span>
              <input
                type="text"
                placeholder="Type a command... (requires RCON configured in Settings)"
                value={consoleInput}
                onChange={e => setConsoleInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendConsoleCmd()}
                style={{ flex: 1, background: 'transparent', border: 'none', color: '#34d399', fontFamily: "'Cascadia Code','Fira Code','Consolas',monospace", fontSize: 13, outline: 'none' }}
              />
              <button onClick={sendConsoleCmd} disabled={!consoleInput.trim()}
                style={{ padding: '5px 12px', background: consoleInput.trim() ? 'rgba(124,58,237,0.12)' : 'transparent', border: `1px solid ${consoleInput.trim() ? 'rgba(124,58,237,0.3)' : 'transparent'}`, borderRadius: 6, color: consoleInput.trim() ? '#a78bfa' : '#1f2128', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' }}>
                Send
              </button>
            </div>
          </div>
        )}

        {/* ══ FIVEM SERVER TAB ══════════════════════════════════════════════ */}
        {activeTab === 'fivem' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '13px 22px', borderBottom: '1px solid #12151c', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: '#080a0e' }}>
              <Car size={16} color="#7c3aed" />
              <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>FiveM Server</span>
              {/* Sub-tabs */}
              <div style={{ display: 'flex', background: '#0a0c10', border: '1px solid #12151c', borderRadius: 8, padding: 3, gap: 2 }}>
                {[['setup','Setup'],['console','Console'],['config','Config']].map(([id, label]) => (
                  <button key={id} onClick={() => setFivemSubTab(id)}
                    style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
                      background: fivemSubTab === id ? 'rgba(124,58,237,0.2)' : 'transparent',
                      color: fivemSubTab === id ? '#a78bfa' : '#374151',
                      border: fivemSubTab === id ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent' }}>
                    {label}
                  </button>
                ))}
              </div>
              {/* Status badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20,
                background: fivemStatus === 'running' ? 'rgba(16,185,129,0.1)' : ['starting','downloading','extracting','stopping'].includes(fivemStatus) ? 'rgba(251,191,36,0.08)' : 'rgba(55,65,81,0.1)',
                border: `1px solid ${fivemStatus === 'running' ? 'rgba(16,185,129,0.3)' : ['starting','downloading','extracting','stopping'].includes(fivemStatus) ? 'rgba(251,191,36,0.25)' : 'rgba(55,65,81,0.2)'}` }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%',
                  background: fivemStatus === 'running' ? '#34d399' : ['starting','downloading','extracting','stopping'].includes(fivemStatus) ? '#fbbf24' : '#374151',
                  boxShadow: fivemStatus === 'running' ? '0 0 8px #34d399' : 'none',
                  animation: ['starting','downloading','extracting','stopping'].includes(fivemStatus) ? 'pulse 1s infinite' : 'none' }} />
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
                  color: fivemStatus === 'running' ? '#34d399' : ['starting','downloading','extracting','stopping'].includes(fivemStatus) ? '#fbbf24' : '#4b5563' }}>
                  {fivemStatus}
                </span>
              </div>
            </div>

            {/* ── SETUP sub-tab ─────────────────────────────────────────────────── */}
            {fivemSubTab === 'setup' && (
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Left config */}
                <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid #12151c', overflowY: 'auto', padding: 22, background: '#05060a', display: 'flex', flexDirection: 'column', gap: 18 }} className="hide-scroll">

                  {/* Installation */}
                  <div style={{ background: '#0a0c10', border: '1px solid #161920', borderRadius: 12, padding: 18 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 14 }}>Server Installation</div>
                    {fivemHasServer ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 9 }}>
                        <CheckCircle size={16} color="#34d399" />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>FiveM Server Installed</div>
                          <div style={{ fontSize: 10, color: '#374151', marginTop: 2, wordBreak: 'break-all' }}>{fivemServerDir}</div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.7, marginBottom: 12 }}>
                          Downloads and installs the latest FiveM server artifacts (FXServer) from <span style={{ color: '#7c3aed' }}>runtime.fxserver.net</span>. The files are ~160MB.
                        </div>
                        <button onClick={setupFivem} disabled={fivemSettingUp || ['downloading','extracting'].includes(fivemStatus)}
                          style={{ width: '100%', padding: '12px', borderRadius: 9, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer',
                            background: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
                            color: 'white', boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          {fivemSettingUp || ['downloading','extracting'].includes(fivemStatus)
                            ? <><RefreshCw size={14} className="spin" /> {fivemStatus === 'extracting' ? 'Extracting...' : 'Downloading...'}</>
                            : <><Download size={14} /> Download & Install FiveM</>}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Server settings */}
                  <div style={{ background: '#0a0c10', border: '1px solid #161920', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Server Settings</div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 5 }}>
                        <Key size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                        CFX License Key
                      </label>
                      <input type="password" placeholder="cfxk_xxxxxxxxxxxx" value={fivemSettings.licenseKey}
                        onChange={e => setFivemSettings(p => ({ ...p, licenseKey: e.target.value }))}
                        style={{ width: '100%', background: '#060709', border: '1px solid #1f2128', color: 'white', padding: '9px 12px', borderRadius: 8, fontSize: 12, outline: 'none', fontFamily: 'monospace' }}
                        onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = '#1f2128'} />
                      <div style={{ marginTop: 4, fontSize: 10, color: '#374151' }}>
                        Get your key at <a href="https://keymaster.fivem.net" target="_blank" rel="noreferrer" style={{ color: '#7c3aed' }}>keymaster.fivem.net</a> (free Patreon account required for online play)
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 5 }}>Server Hostname</label>
                      <input type="text" placeholder="WolfStudiosInc FiveM Server" value={fivemSettings.hostname}
                        onChange={e => setFivemSettings(p => ({ ...p, hostname: e.target.value }))}
                        style={{ width: '100%', background: '#060709', border: '1px solid #1f2128', color: 'white', padding: '9px 12px', borderRadius: 8, fontSize: 12, outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = '#1f2128'} />
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 5 }}>Max Clients</label>
                        <select value={fivemSettings.maxClients} onChange={e => setFivemSettings(p => ({ ...p, maxClients: e.target.value }))}
                          style={{ width: '100%', background: '#060709', border: '1px solid #1f2128', color: 'white', padding: '9px 12px', borderRadius: 8, fontSize: 12, outline: 'none' }}>
                          {['8','16','24','32','48','64','128','256','1024'].map(n => <option key={n} value={n}>{n} players</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 5 }}>Port</label>
                        <input type="number" value={fivemSettings.port} onChange={e => setFivemSettings(p => ({ ...p, port: e.target.value }))}
                          style={{ width: '100%', background: '#060709', border: '1px solid #1f2128', color: 'white', padding: '9px 12px', borderRadius: 8, fontSize: 12, outline: 'none' }}
                          onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = '#1f2128'} />
                      </div>
                    </div>
                  </div>

                  {/* Start / Stop */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {fivemStatus === 'stopped' && (
                      <button onClick={startFivemServer} disabled={!fivemHasServer}
                        style={{ width: '100%', padding: '13px', borderRadius: 10, fontWeight: 700, fontSize: 14, border: 'none', cursor: fivemHasServer ? 'pointer' : 'not-allowed',
                          background: fivemHasServer ? 'linear-gradient(135deg,#7c3aed,#5b21b6)' : '#111',
                          color: fivemHasServer ? 'white' : '#374151',
                          boxShadow: fivemHasServer ? '0 4px 20px rgba(124,58,237,0.35)' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <Zap size={16} /> {fivemHasServer ? 'Start FiveM Server' : 'Install server first'}
                      </button>
                    )}
                    {['starting'].includes(fivemStatus) && (
                      <button disabled style={{ width: '100%', padding: '13px', borderRadius: 10, fontWeight: 700, fontSize: 14, border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.07)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <RefreshCw size={15} className="spin" /> Starting FiveM...
                      </button>
                    )}
                    {fivemStatus === 'running' && (
                      <button onClick={stopFivemServer}
                        style={{ width: '100%', padding: '13px', borderRadius: 10, fontWeight: 700, fontSize: 14, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                        <X size={16} /> Stop Server
                      </button>
                    )}
                    {fivemStatus === 'stopping' && (
                      <button disabled style={{ width: '100%', padding: '13px', borderRadius: 10, fontWeight: 700, fontSize: 14, border: '1px solid #161920', background: '#0a0c10', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <RefreshCw size={15} className="spin" /> Stopping...
                      </button>
                    )}
                  </div>

                  {/* Port forwarding red warning */}
                  <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
                    <div style={{ fontSize: 12, color: '#f87171', fontWeight: 700, marginBottom: 5 }}>⚠ Port Forwarding for Online Play</div>
                    <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.7 }}>
                      For <strong style={{ color: '#f87171' }}>other players to connect over the internet</strong>, you must port forward <strong style={{ color: '#f87171' }}>TCP/UDP port {fivemSettings.port || '30120'}</strong> on your router. For local LAN testing, this is not required.
                    </div>
                  </div>

                  {/* txAdmin note */}
                  <div style={{ padding: '10px 12px', background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 9, fontSize: 11, color: '#6b7280', lineHeight: 1.6 }}>
                    <span style={{ color: '#a78bfa', fontWeight: 700 }}>txAdmin</span> is included with FiveM. Once running, visit{' '}
                    <span style={{ color: '#7c3aed', fontFamily: 'monospace' }}>http://localhost:40120</span> to access the web dashboard.
                  </div>
                </div>

                {/* Right: server console */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#030408' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #12151c', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, background: '#060810' }}>
                    <Terminal size={13} color="#7c3aed" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#4b5563', flex: 1 }}>FiveM Console</span>
                    <div style={{ position: 'relative' }}>
                      <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#374151', pointerEvents: 'none' }} />
                      <input type="text" placeholder="Filter output..." value={fivemLogSearch} onChange={e => setFivemLogSearch(e.target.value)}
                        style={{ background: '#0a0c10', border: '1px solid #12151c', color: 'white', padding: '5px 10px 5px 26px', borderRadius: 6, fontSize: 11, outline: 'none', width: 150 }} />
                    </div>
                    <button onClick={() => setFivemLog('')}
                      style={{ padding: '5px 10px', background: '#0a0c10', border: '1px solid #12151c', borderRadius: 6, color: '#374151', fontSize: 11, cursor: 'pointer' }}>
                      Clear
                    </button>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', fontFamily: "'Cascadia Code','Fira Code','Consolas',monospace", fontSize: 12, lineHeight: 1.7 }} className="hide-scroll">
                    {fivemLog
                      ? fivemLog.split('\n')
                          .filter(line => !fivemLogSearch || line.toLowerCase().includes(fivemLogSearch.toLowerCase()))
                          .map((line, i) => (
                            <div key={i} style={{ color: logColor(line), wordBreak: 'break-all' }}>{line || '\u00A0'}</div>
                          ))
                      : (
                        <div style={{ textAlign: 'center', marginTop: 80 }}>
                          <Car size={42} color="#12151c" style={{ margin: '0 auto 14px' }} />
                          <div style={{ color: '#1a1d24', fontSize: 13 }}>
                            {fivemHasServer ? 'Start the server to see console output.' : 'Install the server first, then start it.'}
                          </div>
                        </div>
                      )
                    }
                  </div>

                  <div style={{ padding: '8px 12px 10px', borderTop: '1px solid #12151c', display: 'flex', gap: 8, alignItems: 'center', background: '#020307', flexShrink: 0 }}>
                    <span style={{ color: fivemStatus === 'running' ? '#a78bfa' : '#374151', fontFamily: "'Cascadia Code','Consolas',monospace", fontSize: 13 }}>{'>'}</span>
                    <input type="text" placeholder={fivemStatus === 'running' ? 'Type a server command...' : 'Start the server to run commands'}
                      value={fivemCmd} onChange={e => setFivemCmd(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendFivemCmd()}
                      disabled={fivemStatus !== 'running'}
                      style={{ flex: 1, background: 'transparent', border: 'none',
                        color: fivemStatus === 'running' ? '#a78bfa' : '#374151',
                        fontFamily: "'Cascadia Code','Consolas',monospace", fontSize: 12, outline: 'none',
                        cursor: fivemStatus === 'running' ? 'text' : 'not-allowed' }} />
                    <button onClick={sendFivemCmd} disabled={fivemStatus !== 'running' || !fivemCmd.trim()}
                      style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                        background: fivemStatus === 'running' && fivemCmd.trim() ? 'rgba(124,58,237,0.12)' : 'transparent',
                        color: fivemStatus === 'running' && fivemCmd.trim() ? '#a78bfa' : '#1f2128',
                        border: fivemStatus === 'running' && fivemCmd.trim() ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent' }}>
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── CONSOLE sub-tab ────────────────────────────────────────────────── */}
            {fivemSubTab === 'console' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#030408' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #12151c', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, background: '#060810' }}>
                  <Terminal size={13} color="#7c3aed" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#4b5563', flex: 1 }}>Full Console</span>
                  <input type="text" placeholder="Filter..." value={fivemLogSearch} onChange={e => setFivemLogSearch(e.target.value)}
                    style={{ background: '#0a0c10', border: '1px solid #12151c', color: 'white', padding: '5px 10px', borderRadius: 6, fontSize: 11, outline: 'none', width: 150 }} />
                  <button onClick={() => setFivemLog('')}
                    style={{ padding: '5px 10px', background: '#0a0c10', border: '1px solid #12151c', borderRadius: 6, color: '#374151', fontSize: 11, cursor: 'pointer' }}>
                    Clear
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', fontFamily: "'Cascadia Code','Fira Code','Consolas',monospace", fontSize: 12, lineHeight: 1.7 }} className="hide-scroll">
                  {(fivemLog || '').split('\n').filter(l => !fivemLogSearch || l.toLowerCase().includes(fivemLogSearch.toLowerCase())).map((line, i) => (
                    <div key={i} style={{ color: logColor(line), wordBreak: 'break-all' }}>{line || '\u00A0'}</div>
                  ))}
                </div>
                <div style={{ padding: '8px 12px 10px', borderTop: '1px solid #12151c', display: 'flex', gap: 8, alignItems: 'center', background: '#020307', flexShrink: 0 }}>
                  <span style={{ color: '#a78bfa', fontFamily: "monospace", fontSize: 13 }}>{'>'}</span>
                  <input type="text" placeholder="Server command..." value={fivemCmd} onChange={e => setFivemCmd(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendFivemCmd()} disabled={fivemStatus !== 'running'}
                    style={{ flex: 1, background: 'transparent', border: 'none', color: '#a78bfa', fontFamily: "monospace", fontSize: 12, outline: 'none' }} />
                  <button onClick={sendFivemCmd} disabled={fivemStatus !== 'running' || !fivemCmd.trim()}
                    style={{ padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(124,58,237,0.12)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.25)' }}>
                    Send
                  </button>
                </div>
              </div>
            )}

            {/* ── CONFIG sub-tab ─────────────────────────────────────────────────── */}
            {fivemSubTab === 'config' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #12151c', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, background: '#060810' }}>
                  <FileText size={13} color="#7c3aed" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#4b5563', flex: 1 }}>server.cfg — Direct Editor</span>
                  <button onClick={saveFivemConfig}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', border: 'none', borderRadius: 7, color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    <CheckCircle size={12} /> Save Config
                  </button>
                </div>
                <textarea
                  value={fivemConfig}
                  onChange={e => setFivemConfig(e.target.value)}
                  spellCheck={false}
                  style={{ flex: 1, background: '#030408', color: '#9ca3af', fontFamily: "'Cascadia Code','Fira Code','Consolas',monospace", fontSize: 12, lineHeight: 1.7,
                    padding: '16px 20px', border: 'none', outline: 'none', resize: 'none', tabSize: 2 }}
                  placeholder="server.cfg content — install the server first"
                />
              </div>
            )}
          </div>
        )}

        {/* ══ FIVEM RESOURCES TAB ═══════════════════════════════════════════ */}
        {activeTab === 'fivemresources' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '13px 22px', borderBottom: '1px solid #12151c', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: '#080a0e' }}>
              <Package size={16} color="#7c3aed" />
              <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>Resources</span>
              <span style={{ fontSize: 12, color: '#374151' }}>{fivemResources.length} resources in server folder</span>
              <button onClick={pollFivemStatus}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#0a0c10', border: '1px solid #161920', borderRadius: 7, color: '#6b7280', fontSize: 11, cursor: 'pointer' }}>
                <RefreshCw size={11} /> Refresh
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }} className="hide-scroll">
              {!fivemHasServer ? (
                <div style={{ textAlign: 'center', paddingTop: 80 }}>
                  <Package size={44} color="#12151c" style={{ margin: '0 auto 16px' }} />
                  <div style={{ color: '#374151', fontSize: 14, marginBottom: 6 }}>No server installed</div>
                  <div style={{ color: '#1a1d24', fontSize: 12 }}>Go to the FiveM Server tab and install the server first.</div>
                </div>
              ) : fivemResources.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: 80 }}>
                  <Package size={44} color="#12151c" style={{ margin: '0 auto 16px' }} />
                  <div style={{ color: '#374151', fontSize: 14, marginBottom: 6 }}>No resources found</div>
                  <div style={{ color: '#1a1d24', fontSize: 12 }}>Place resource folders in the <code style={{ color: '#374151' }}>resources/</code> directory inside your server folder.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {fivemResources.map(r => (
                    <div key={r.name} className="card-hover" style={{ background: '#0a0c10', border: '1px solid #161920', borderRadius: 10, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {r.type === 'directory' ? <FolderOpen size={15} color="#7c3aed" /> : <FileText size={15} color="#7c3aed" />}
                      </div>
                      <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                        <div style={{ fontSize: 10, color: '#374151', marginTop: 2, textTransform: 'capitalize' }}>{r.type}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ FIVEM CONFIG TAB ══════════════════════════════════════════════ */}
        {activeTab === 'fivemconfig' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '13px 22px', borderBottom: '1px solid #12151c', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: '#080a0e' }}>
              <FileText size={16} color="#7c3aed" />
              <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>server.cfg</span>
              <button onClick={saveFivemConfig}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', border: 'none', borderRadius: 8, color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 12px rgba(124,58,237,0.3)' }}>
                <CheckCircle size={13} /> Save
              </button>
            </div>
            <textarea
              value={fivemConfig}
              onChange={e => setFivemConfig(e.target.value)}
              spellCheck={false}
              style={{ flex: 1, background: '#030408', color: '#9ca3af', fontFamily: "'Cascadia Code','Fira Code','Consolas',monospace", fontSize: 12.5, lineHeight: 1.8,
                padding: '16px 22px', border: 'none', outline: 'none', resize: 'none', tabSize: 2 }}
              placeholder={fivemHasServer ? '' : 'Install the server first to edit configuration.'}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 32px' }} className="hide-scroll">
            {/* Settings sub-tabs */}
            <div style={{ display: 'flex', gap: 0, padding: '0 32px', borderBottom: '1px solid #161920', background: '#080a0d', flexShrink: 0 }}>
              {[{ id: 'ftp', label: 'FTP Connection' }, { id: 'saved', label: 'Saved Profiles' }].map(t => (
                <button key={t.id} onClick={() => setSettingsSubTab(t.id)} style={{
                  padding: '14px 18px', fontSize: 13, fontWeight: 600,
                  borderBottom: settingsSubTab === t.id ? '2px solid #7c3aed' : '2px solid transparent',
                  color: settingsSubTab === t.id ? 'white' : '#4b5563', transition: 'all 0.15s',
                }}>{t.label}</button>
              ))}
            </div>

            <div style={{ maxWidth: 640, margin: '28px auto 0', padding: '0 24px' }}>
              {settingsSubTab === 'ftp' && (
                <>
                  <div style={{ background: '#0a0c10', border: '1px solid #161920', borderRadius: 12, padding: 22, marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 16 }}>FTP Connection</div>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                      <Field label="Host / IP Address">
                        <input type="text" placeholder="51.161.219.145" value={ftpConfig.host}
                          onChange={e => setFtpConfig(c => ({ ...c, host: e.target.value }))}
                          style={{ ...inputStyle }} onFocus={onFocus} onBlur={onBlur} />
                      </Field>
                      <div style={{ width: 110, flexShrink: 0 }}>
                        <Field label="Port">
                          <input type="number" placeholder="21" value={ftpConfig.port}
                            onChange={e => setFtpConfig(c => ({ ...c, port: e.target.value }))}
                            style={{ ...inputStyle }} onFocus={onFocus} onBlur={onBlur} />
                        </Field>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                      <Field label="Username">
                        <input type="text" placeholder="wolfwarrior141" value={ftpConfig.user}
                          onChange={e => setFtpConfig(c => ({ ...c, user: e.target.value }))}
                          style={{ ...inputStyle }} onFocus={onFocus} onBlur={onBlur} />
                      </Field>
                      <Field label="Password">
                        <input type="password" placeholder="••••••••" value={ftpConfig.password}
                          onChange={e => setFtpConfig(c => ({ ...c, password: e.target.value }))}
                          style={{ ...inputStyle }} onFocus={onFocus} onBlur={onBlur} />
                      </Field>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button onClick={testConnection} disabled={ftpStatus === 'testing'}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          background: ftpStatus === 'connected' ? 'rgba(16,185,129,0.1)' : ftpStatus === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(124,58,237,0.1)',
                          border: `1px solid ${ftpStatus === 'connected' ? 'rgba(16,185,129,0.3)' : ftpStatus === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(124,58,237,0.3)'}`,
                          color: ftpStatus === 'connected' ? '#34d399' : ftpStatus === 'error' ? '#f87171' : '#a78bfa' }}>
                        {ftpStatus === 'testing' ? <RefreshCw size={13} className="spin" /> : ftpStatus === 'connected' ? <CheckCircle size={13} /> : ftpStatus === 'error' ? <AlertCircle size={13} /> : <Wifi size={13} />}
                        {{ idle: 'Test Connection', testing: 'Connecting...', connected: 'Connected', error: 'Retry Connection' }[ftpStatus]}
                      </button>
                      <button onClick={saveConnection}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#0e1116', border: '1px solid #1f2128', color: '#9ca3af' }}>
                        <Plus size={13} /> Save to Profiles
                      </button>
                    </div>
                  </div>

                  <div style={{ background: '#0a0c10', border: '1px solid #161920', borderRadius: 12, padding: 22, marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 16 }}>Server Paths</div>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                      <Field label="Plugins Directory">
                        <input type="text" placeholder="/g437452/paperspigot/plugins" value={ftpConfig.path}
                          onChange={e => setFtpConfig(c => ({ ...c, path: e.target.value }))}
                          style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 13 }} onFocus={onFocus} onBlur={onBlur} />
                      </Field>
                      <Field label="Log File Path">
                        <input type="text" placeholder="/g437452/paperspigot/logs/latest.log" value={ftpConfig.logsPath || ''}
                          onChange={e => setFtpConfig(c => ({ ...c, logsPath: e.target.value }))}
                          style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 13 }} onFocus={onFocus} onBlur={onBlur} />
                      </Field>
                    </div>
                    <Field label="Server Version" note="(used to filter Modrinth results)">
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input type="text" placeholder="e.g. 1.21.4" value={ftpConfig.serverVersion || ''}
                          onChange={e => setFtpConfig(c => ({ ...c, serverVersion: e.target.value }))}
                          style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 13 }} onFocus={onFocus} onBlur={onBlur} />
                        <button onClick={autoDetectVersion} disabled={detectingVersion}
                          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', background: '#0e1116', border: '1px solid #1f2128', borderRadius: 8, color: '#9ca3af', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {detectingVersion ? <RefreshCw size={13} className="spin" /> : <Search size={13} />} Auto-Detect
                        </button>
                      </div>
                    </Field>
                  </div>

                  <div style={{ background: '#0a0c10', border: '1px solid #161920', borderRadius: 12, padding: 22, marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 16 }}>RCON (Console Commands)</div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ width: 130, flexShrink: 0 }}>
                        <Field label="RCON Port">
                          <input type="number" placeholder="25575" value={ftpConfig.rconPort || ''}
                            onChange={e => setFtpConfig(c => ({ ...c, rconPort: e.target.value }))}
                            style={{ ...inputStyle }} onFocus={onFocus} onBlur={onBlur} />
                        </Field>
                      </div>
                      <Field label="RCON Password">
                        <input type="password" placeholder="••••••" value={ftpConfig.rconPassword || ''}
                          onChange={e => setFtpConfig(c => ({ ...c, rconPassword: e.target.value }))}
                          style={{ ...inputStyle }} onFocus={onFocus} onBlur={onBlur} />
                      </Field>
                    </div>
                    <p style={{ marginTop: 10, fontSize: 11, color: '#374151', lineHeight: 1.6 }}>Enable RCON on your server in <code style={{ background: '#111', padding: '1px 5px', borderRadius: 4, color: '#a78bfa' }}>server.properties</code>. Required for the console command input in Console Logs.</p>
                  </div>

                  <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={13} color="#34d399" />
                    <span style={{ fontSize: 12, color: '#4b5563' }}>Settings auto-save as you type. No need to click save.</span>
                  </div>
                </>
              )}

              {settingsSubTab === 'saved' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>{savedConnections.length} saved profile{savedConnections.length !== 1 ? 's' : ''}</span>
                  </div>
                  {savedConnections.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                      <Settings size={36} color="#161920" style={{ margin: '0 auto 14px' }} />
                      <p style={{ color: '#374151', fontSize: 13 }}>No saved profiles yet.</p>
                      <p style={{ color: '#1f2128', fontSize: 12, marginTop: 6 }}>Configure an FTP connection and click “Save to Profiles”.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {savedConnections.map((conn, i) => (
                        <div key={i} style={{ background: '#0a0c10', border: '1px solid #161920', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Server size={15} color="#a78bfa" />
                          </div>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conn.host}</div>
                            <div style={{ fontSize: 11, color: '#374151' }}>{conn.user} · port {conn.port}</div>
                          </div>
                          <button onClick={() => { loadConnection(conn); setSettingsSubTab('ftp'); }}
                            style={{ padding: '7px 14px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 7, color: '#a78bfa', fontSize: 12, fontWeight: 600 }}>
                            Connect
                          </button>
                          <button onClick={() => removeConnection(conn.host)}
                            style={{ padding: 7, color: '#374151', background: 'transparent', borderRadius: 6, border: '1px solid transparent' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Server Modal */}
      {addServerModal && editingServer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#111217', border: '1px solid #2b303b', borderRadius: 16, padding: 28, width: 440, boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
              <div style={{ background: 'rgba(124,58,237,0.12)', padding: 8, borderRadius: 8, border: '1px solid rgba(124,58,237,0.22)' }}>
                <Activity size={16} color="#a78bfa" />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'white', flex: 1 }}>{editingServer.id ? 'Edit Server' : 'Add Server'}</h3>
              <button onClick={() => { setAddServerModal(false); setEditingServer(null); }} style={{ color: '#4b5563', padding: 4 }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Server Name">
                <input type="text" placeholder="My Minecraft Server" value={editingServer.name || ''}
                  onChange={e => setEditingServer(s => ({ ...s, name: e.target.value }))}
                  style={{ ...inputStyle }} onFocus={onFocus} onBlur={onBlur} />
              </Field>
              <div style={{ display: 'flex', gap: 10 }}>
                <Field label="Host / IP">
                  <input type="text" placeholder="play.example.com" value={editingServer.host || ''}
                    onChange={e => setEditingServer(s => ({ ...s, host: e.target.value }))}
                    style={{ ...inputStyle }} onFocus={onFocus} onBlur={onBlur} />
                </Field>
                <div style={{ width: 100, flexShrink: 0 }}>
                  <Field label="Port">
                    <input type="number" placeholder="25565" value={editingServer.port || '25565'}
                      onChange={e => setEditingServer(s => ({ ...s, port: e.target.value }))}
                      style={{ ...inputStyle }} onFocus={onFocus} onBlur={onBlur} />
                  </Field>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 120, flexShrink: 0 }}>
                  <Field label="RCON Port" note="(optional)">
                    <input type="number" placeholder="25575" value={editingServer.rconPort || ''}
                      onChange={e => setEditingServer(s => ({ ...s, rconPort: e.target.value }))}
                      style={{ ...inputStyle }} onFocus={onFocus} onBlur={onBlur} />
                  </Field>
                </div>
                <Field label="RCON Password" note="(optional)">
                  <input type="password" placeholder="••••••" value={editingServer.rconPassword || ''}
                    onChange={e => setEditingServer(s => ({ ...s, rconPassword: e.target.value }))}
                    style={{ ...inputStyle }} onFocus={onFocus} onBlur={onBlur} />
                </Field>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button onClick={() => { setAddServerModal(false); setEditingServer(null); }}
                style={{ padding: '9px 20px', background: '#1a1d24', border: '1px solid #2b303b', borderRadius: 8, color: '#9ca3af', fontSize: 13, fontWeight: 500 }}>Cancel</button>
              <button onClick={() => saveServer(editingServer)}
                style={{ padding: '9px 22px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 8, color: '#a78bfa', fontSize: 13, fontWeight: 700 }}>
                {editingServer.id ? 'Save Changes' : 'Add Server'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toasts items={toasts} onRemove={removeToast} />
      <ConfirmModal modal={confirmModal} onOk={handleConfirmOk} onCancel={handleConfirmCancel} />

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow: hidden; }
        .spin { animation: spin 0.75s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
        .list-row:hover { background: #0a0c10 !important; }
        .plugin-card:hover { border-color: #2b303b !important; }
        .plugin-card:hover .del-btn { color: #f87171 !important; border-color: rgba(239,68,68,0.25) !important; background: rgba(239,68,68,0.07) !important; }
        .hide-scroll::-webkit-scrollbar { width: 4px; }
        .hide-scroll::-webkit-scrollbar-track { background: transparent; }
        .hide-scroll::-webkit-scrollbar-thumb { background: #1a1d24; border-radius: 4px; }
      `}</style>
    </div>
    </div>
  );
}
