import { NextResponse } from 'next/server';
import { spawn, execSync } from 'child_process';
import { createWriteStream, existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import https from 'https';
import http from 'http';

// ─── Module-level server state ─────────────────────────────────────────────────
let serverProcess = null;
let serverLog     = [];
let serverStatus  = 'stopped'; // stopped | downloading | extracting | starting | running | stopping

const BASE_DIR = join(homedir(), 'WolfStudiosInc-FiveM');

function ensureDir(d) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────────
function httpGet(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 8) return reject(new Error('Too many redirects'));
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'WolfStudiosInc-ServerManager/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        httpGet(res.headers.location, redirects + 1).then(resolve).catch(reject);
        return;
      }
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(body));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

function downloadFile(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 8) return reject(new Error('Too many redirects'));
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'WolfStudiosInc-ServerManager/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        downloadFile(res.headers.location, dest, redirects + 1).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} downloading artifacts`));
      }
      const ws = createWriteStream(dest);
      let downloaded = 0;
      res.on('data', (chunk) => {
        downloaded += chunk.length;
        if (serverLog.length > 0) {
          // Update last line with progress
          const mb = (downloaded / 1048576).toFixed(1);
          serverLog[serverLog.length - 1] = `[SYSTEM] Downloading FiveM artifacts... ${mb} MB received\n`;
        }
      });
      res.pipe(ws);
      ws.on('finish', () => { ws.close(); resolve(); });
      ws.on('error', (e) => { ws.close(); reject(e); });
    });
    req.on('error', reject);
    req.setTimeout(300000, () => { req.destroy(); reject(new Error('Download timed out after 5 minutes')); });
  });
}

// ─── Generate server.cfg ───────────────────────────────────────────────────────
function generateServerCfg(opts) {
  const { licenseKey = '', hostname = 'WolfStudiosInc FiveM Server', maxClients = 32, port = 30120 } = opts;
  return `# WolfStudiosInc Server Manager — Auto-Generated server.cfg
endpoint_add_tcp "0.0.0.0:${port}"
endpoint_add_udp "0.0.0.0:${port}"

sv_maxclients ${maxClients}
sv_hostname "${hostname}"
${licenseKey ? `set sv_licenseKey "${licenseKey}"` : '# set sv_licenseKey "your-license-key-here"'}

# Basic resources
ensure mapmanager
ensure chat
ensure spawnmanager
ensure sessionmanager
ensure basic-gamemode
ensure hardcap
ensure rconlog

# Sets
sets tags "default"
sets banner_detail "https://wolfstudisosinc.com"
sets banner_connecting "https://wolfstudiosinc.com"

sv_scriptHookAllowed 0
`;
}

// ─── Route handler ─────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    // ── Status ─────────────────────────────────────────────────────────────
    if (action === 'status') {
      const serverDir  = join(BASE_DIR, 'server');
      const hasServer  = existsSync(join(serverDir, 'FXServer.exe'));
      const configPath = join(serverDir, 'server.cfg');
      let config = '';
      try { if (existsSync(configPath)) config = readFileSync(configPath, 'utf8'); } catch (_) {}

      let resources = [];
      const resDir = join(serverDir, 'resources');
      try {
        if (existsSync(resDir)) {
          resources = readdirSync(resDir).map(name => {
            const full = join(resDir, name);
            try {
              const stat = require('fs').statSync(full);
              return { name, type: stat.isDirectory() ? 'directory' : 'file' };
            } catch (_) { return { name, type: 'unknown' }; }
          });
        }
      } catch (_) {}

      return NextResponse.json({
        status:    serverStatus,
        log:       serverLog.join(''),
        pid:       serverProcess?.pid ?? null,
        hasServer,
        config,
        resources,
        serverDir,
      });
    }

    // ── Read config ────────────────────────────────────────────────────────
    if (action === 'readConfig') {
      const serverDir  = join(BASE_DIR, 'server');
      const configPath = join(serverDir, 'server.cfg');
      try {
        const config = readFileSync(configPath, 'utf8');
        return NextResponse.json({ config });
      } catch (_) {
        return NextResponse.json({ config: generateServerCfg({}) });
      }
    }

    // ── Write config ───────────────────────────────────────────────────────
    if (action === 'writeConfig') {
      const serverDir  = join(BASE_DIR, 'server');
      ensureDir(serverDir);
      const configPath = join(serverDir, 'server.cfg');
      writeFileSync(configPath, body.config || generateServerCfg({}));
      return NextResponse.json({ success: true });
    }

    // ── Generate default config ────────────────────────────────────────────
    if (action === 'generateConfig') {
      const cfg = generateServerCfg({
        licenseKey:  body.licenseKey,
        hostname:    body.hostname,
        maxClients:  body.maxClients,
        port:        body.port,
      });
      return NextResponse.json({ config: cfg });
    }

    // ── Setup (download + extract) ─────────────────────────────────────────
    if (action === 'setup') {
      if (serverProcess) {
        return NextResponse.json({ error: 'Stop the running server before setting up.' }, { status: 400 });
      }

      const serverDir = join(BASE_DIR, 'server');
      ensureDir(serverDir);
      const exePath = join(serverDir, 'FXServer.exe');

      // Already installed?
      if (existsSync(exePath)) {
        return NextResponse.json({ success: true, alreadyInstalled: true, serverDir });
      }

      serverLog    = ['[SYSTEM] Starting FiveM server setup...\n'];
      serverStatus = 'downloading';

      const zipPath = join(BASE_DIR, 'FXServer-latest.zip');
      const url     = 'https://runtime.fxserver.net/FXServer-latest-win32.zip';

      serverLog.push('[SYSTEM] Downloading FiveM artifacts... 0.0 MB received\n');

      try {
        await downloadFile(url, zipPath);
        serverLog.push('[SYSTEM] Download complete. Extracting...\n');
        serverStatus = 'extracting';

        // Extract using PowerShell
        execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${serverDir}' -Force"`, {
          timeout: 120000,
          windowsHide: true,
        });

        serverLog.push(`[SYSTEM] Extraction complete.\n`);
        serverLog.push(`[SYSTEM] FiveM server installed to: ${serverDir}\n`);
        serverLog.push(`[SYSTEM] Ready to start. Configure server.cfg and click Start.\n`);
        serverStatus = 'stopped';
      } catch (err) {
        serverLog.push(`[ERROR] Setup failed: ${err.message}\n`);
        serverStatus = 'stopped';
        return NextResponse.json({ error: err.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, serverDir });
    }

    // ── Start ──────────────────────────────────────────────────────────────
    if (action === 'start') {
      if (serverProcess) {
        return NextResponse.json({ error: 'Server is already running.' }, { status: 400 });
      }

      const serverDir = join(BASE_DIR, 'server');
      const exePath   = join(serverDir, 'FXServer.exe');

      if (!existsSync(exePath)) {
        return NextResponse.json({ error: 'FiveM server not installed. Click "Download & Install" first.' }, { status: 400 });
      }

      // Write/update server.cfg if settings provided
      const configPath = join(serverDir, 'server.cfg');
      if (body.licenseKey || body.hostname || !existsSync(configPath)) {
        const cfg = generateServerCfg({
          licenseKey:  body.licenseKey,
          hostname:    body.hostname || 'WolfStudiosInc FiveM Server',
          maxClients:  body.maxClients || 32,
          port:        body.port || 30120,
        });
        writeFileSync(configPath, cfg);
      }

      serverLog    = [`[SYSTEM] Starting FiveM server...\n`];
      serverStatus = 'starting';

      const args = [
        '+set', 'citizen_dir', join(serverDir, 'citizen'),
        '+exec', 'server.cfg',
      ];

      if (body.licenseKey) {
        args.push('+set', 'sv_licenseKey', body.licenseKey);
      }

      serverProcess = spawn(exePath, args, {
        cwd: serverDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: false,
      });

      const onData = (chunk) => {
        const line = chunk.toString();
        serverLog.push(line);
        if (serverLog.length > 2000) serverLog.splice(0, serverLog.length - 1500);
        if (/server started/i.test(line) || /citizen-server-impl/i.test(line)) {
          serverStatus = 'running';
        }
      };

      serverProcess.stdout?.on('data', onData);
      serverProcess.stderr?.on('data', onData);

      serverProcess.on('close', (code) => {
        serverLog.push(`\n[SYSTEM] FiveM server stopped (exit code ${code ?? '?'})\n`);
        serverProcess = null;
        serverStatus  = 'stopped';
      });

      serverProcess.on('error', (err) => {
        serverLog.push(`\n[ERROR] ${err.message}\n`);
        serverProcess = null;
        serverStatus  = 'stopped';
      });

      // Give it 3s then consider it "starting"
      setTimeout(() => {
        if (serverStatus === 'starting' && serverProcess) serverStatus = 'running';
      }, 3000);

      return NextResponse.json({ success: true, pid: serverProcess?.pid ?? null });
    }

    // ── Stop ───────────────────────────────────────────────────────────────
    if (action === 'stop') {
      if (!serverProcess) {
        return NextResponse.json({ error: 'No server is running.' }, { status: 400 });
      }
      serverStatus = 'stopping';
      serverLog.push('[SYSTEM] Stopping server...\n');
      try {
        serverProcess.stdin?.write('quit\n');
        setTimeout(() => { if (serverProcess) { serverProcess.kill('SIGTERM'); } }, 3000);
      } catch (_) {
        serverProcess?.kill('SIGTERM');
      }
      return NextResponse.json({ success: true });
    }

    // ── Console command ────────────────────────────────────────────────────
    if (action === 'command') {
      if (!serverProcess) {
        return NextResponse.json({ error: 'Server is not running.' }, { status: 400 });
      }
      const cmd = (body.command || '').trim();
      if (cmd) {
        serverProcess.stdin?.write(cmd + '\n');
        serverLog.push(`> ${cmd}\n`);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (err) {
    console.error('[fivem-server API]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
