import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { createWriteStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import https from 'https';
import http from 'http';

// ─── Module-level server state ────────────────────────────────────────────────
let serverProcess = null;
let serverLog     = [];
let serverStatus  = 'stopped'; // stopped | starting | running | stopping

const BASE_DIR = join(homedir(), 'WolfStudiosInc-Servers');

function ensureDir(d) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

// ─── HTTP helpers (with redirect following) ────────────────────────────────────
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

async function fetchJson(url) {
  const text = await httpGet(url);
  return JSON.parse(text);
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
        return reject(new Error(`HTTP ${res.statusCode} from server`));
      }
      const ws = createWriteStream(dest);
      res.pipe(ws);
      ws.on('finish', () => { ws.close(); resolve(); });
      ws.on('error', (e) => { ws.close(); reject(e); });
    });
    req.on('error', reject);
    req.setTimeout(180000, () => { req.destroy(); reject(new Error('Download timed out after 3 minutes')); });
  });
}

// ─── Version lists per software ───────────────────────────────────────────────

// Spigot/Bukkit hardcoded — they require BuildTools, no download API
const SPIGOT_BUKKIT_VERSIONS = [
  '1.21.4','1.21.3','1.21.1','1.21','1.20.6','1.20.4','1.20.2','1.20.1','1.20',
  '1.19.4','1.19.3','1.19.2','1.19.1','1.19',
  '1.18.2','1.18.1','1.18',
  '1.17.1','1.17',
  '1.16.5','1.16.4','1.16.3','1.16.2','1.16.1','1.16',
  '1.15.2','1.15.1','1.15',
  '1.14.4','1.14.3','1.14.2','1.14.1','1.14',
  '1.13.2','1.13.1','1.13',
  '1.12.2','1.12.1','1.12',
  '1.11.2','1.11',
  '1.10.2',
  '1.9.4','1.9',
  '1.8.8','1.8',
];

async function getVersions(software) {
  switch (software) {
    case 'paper': {
      const d = await fetchJson('https://api.papermc.io/v2/projects/paper');
      return [...d.versions].reverse();
    }
    case 'purpur': {
      const d = await fetchJson('https://api.purpurmc.org/v2/purpur');
      return [...d.versions].reverse();
    }
    case 'fabric': {
      const d = await fetchJson('https://meta.fabricmc.net/v2/versions/game');
      return d.filter(v => v.stable).map(v => v.version);
    }
    case 'vanilla': {
      const d = await fetchJson('https://launchermeta.mojang.com/mc/game/version_manifest.json');
      return d.versions.filter(v => v.type === 'release').map(v => v.id);
    }
    case 'spigot':
    case 'bukkit':
      return SPIGOT_BUKKIT_VERSIONS;
    case 'forge': {
      const d = await fetchJson('https://files.minecraftforge.net/net/minecraftforge/forge/maven-metadata.json');
      // Keys are MC versions like "1.20.1", sort newest first
      return Object.keys(d).sort((a, b) => {
        const pa = a.split('.').map(Number);
        const pb = b.split('.').map(Number);
        for (let i = 0; i < 3; i++) {
          const diff = (pb[i] || 0) - (pa[i] || 0);
          if (diff !== 0) return diff;
        }
        return 0;
      });
    }
    default:
      return [];
  }
}

async function getDownloadUrl(software, version) {
  switch (software) {
    case 'paper': {
      const builds = await fetchJson(`https://api.papermc.io/v2/projects/paper/versions/${version}/builds`);
      if (!builds.builds?.length) throw new Error('No builds found for this version');
      const latest = builds.builds[builds.builds.length - 1];
      const jarName = latest.downloads.application.name;
      return `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${latest.build}/downloads/${jarName}`;
    }
    case 'purpur':
      return `https://api.purpurmc.org/v2/purpur/${version}/latest/download`;
    case 'fabric': {
      const [loaders, installers] = await Promise.all([
        fetchJson('https://meta.fabricmc.net/v2/versions/loader'),
        fetchJson('https://meta.fabricmc.net/v2/versions/installer'),
      ]);
      const loader    = loaders.find(l => l.stable)?.version    || loaders[0].version;
      const installer = installers.find(i => i.stable)?.version || installers[0].version;
      return `https://meta.fabricmc.net/v2/versions/loader/${version}/${loader}/${installer}/server/jar`;
    }
    case 'vanilla': {
      const manifest  = await fetchJson('https://launchermeta.mojang.com/mc/game/version_manifest.json');
      const vinfo     = manifest.versions.find(v => v.id === version);
      if (!vinfo) throw new Error(`Version ${version} not found in Mojang manifest`);
      const vdata     = await fetchJson(vinfo.url);
      const serverUrl = vdata.downloads?.server?.url;
      if (!serverUrl) throw new Error(`Vanilla ${version} has no dedicated server download`);
      return serverUrl;
    }
    case 'spigot':
    case 'bukkit':
      throw new Error(`${software} requires BuildTools to compile. Download BuildTools from https://www.spigotmc.org/wiki/buildtools/ and follow the guide.`);
    case 'forge':
      throw new Error(`Forge requires the Forge Installer. Download it from https://files.minecraftforge.net/ then run the installer.`);
    default:
      throw new Error(`Unknown software: ${software}`);
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    // ── Fetch versions list ─────────────────────────────────────────────────
    if (action === 'versions') {
      const versions = await getVersions(body.software || 'paper');
      return NextResponse.json({ versions });
    }

    // ── Server status + log ─────────────────────────────────────────────────
    if (action === 'status') {
      return NextResponse.json({
        status: serverStatus,
        log:    serverLog.join(''),
        pid:    serverProcess?.pid ?? null,
      });
    }

    // ── Start server ────────────────────────────────────────────────────────
    if (action === 'start') {
      if (serverProcess) {
        return NextResponse.json({ error: 'A server is already running. Stop it first.' }, { status: 400 });
      }

      const { software, version, ram } = body;
      if (!software || !version) {
        return NextResponse.json({ error: 'software and version are required.' }, { status: 400 });
      }

      // Reject manual-only software early
      if (['spigot', 'bukkit', 'forge'].includes(software)) {
        const msg = software === 'forge'
          ? 'Forge requires the Forge Installer. Download from files.minecraftforge.net and run it manually.'
          : `${software} requires BuildTools. Visit spigotmc.org/wiki/buildtools/ for instructions.`;
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      const serverDir = join(BASE_DIR, `${software}-${version}`);
      const jarPath   = join(serverDir, 'server.jar');
      ensureDir(serverDir);

      serverLog    = [`[SYSTEM] Preparing ${software} ${version}...\n`];
      serverStatus = 'starting';

      // Download jar if missing
      if (!existsSync(jarPath)) {
        serverLog.push('[SYSTEM] Downloading server JAR... (this may take a while)\n');
        try {
          const url = await getDownloadUrl(software, version);
          serverLog.push(`[SYSTEM] URL: ${url}\n`);
          await downloadFile(url, jarPath);
          serverLog.push('[SYSTEM] Download complete.\n');
        } catch (e) {
          serverLog.push(`[ERROR] Download failed: ${e.message}\n`);
          serverStatus = 'stopped';
          return NextResponse.json({ error: e.message }, { status: 500 });
        }
      } else {
        serverLog.push('[SYSTEM] Found existing server JAR, skipping download.\n');
      }

      // Accept EULA automatically
      writeFileSync(join(serverDir, 'eula.txt'), 'eula=true\n');

      const ramGB   = parseFloat(ram) || 2;
      const maxMB   = Math.round(ramGB * 1024);
      const minMB   = Math.max(512, Math.round(maxMB / 2));

      serverLog.push(`[SYSTEM] Starting with -Xms${minMB}M -Xmx${maxMB}M...\n`);

      serverProcess = spawn('java', [
        `-Xms${minMB}M`,
        `-Xmx${maxMB}M`,
        '-jar', jarPath,
        'nogui',
      ], { cwd: serverDir, stdio: ['pipe', 'pipe', 'pipe'] });

      const onData = (chunk) => {
        const line = chunk.toString();
        serverLog.push(line);
        // Trim buffer
        if (serverLog.length > 2000) serverLog.splice(0, serverLog.length - 1500);
        if (/Done \(.*?\)! For help, type "help"/.test(line)) serverStatus = 'running';
      };

      serverProcess.stdout?.on('data', onData);
      serverProcess.stderr?.on('data', onData);

      serverProcess.on('close', (code) => {
        serverLog.push(`\n[SYSTEM] Server stopped (exit code ${code ?? '?'})\n`);
        serverProcess = null;
        serverStatus  = 'stopped';
      });

      serverProcess.on('error', (err) => {
        const msg = (err.code === 'ENOENT' || err.message.includes('spawn'))
          ? 'Java not found. Please install Java 17+ and make sure it is on your system PATH.'
          : err.message;
        serverLog.push(`\n[ERROR] ${msg}\n`);
        serverProcess = null;
        serverStatus  = 'stopped';
      });

      return NextResponse.json({ success: true, serverDir, pid: serverProcess?.pid ?? null });
    }

    // ── Stop server ─────────────────────────────────────────────────────────
    if (action === 'stop') {
      if (!serverProcess) {
        return NextResponse.json({ error: 'No server is currently running.' }, { status: 400 });
      }
      serverStatus = 'stopping';
      serverLog.push('[SYSTEM] Sending stop command...\n');
      try {
        serverProcess.stdin?.write('stop\n');
      } catch (_) {
        serverProcess.kill('SIGTERM');
      }
      return NextResponse.json({ success: true });
    }

    // ── Send console command ─────────────────────────────────────────────────
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
    console.error('[local-server API]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
