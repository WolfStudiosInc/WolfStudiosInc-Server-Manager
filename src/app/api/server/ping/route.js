import { NextResponse } from 'next/server';
import net from 'net';

/**
 * Minecraft modern server list ping (SLP).
 * Returns: { online, latency, players, maxPlayers, version, motd }
 */
function mcPing(host, port, timeout = 6000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let resolved = false;
    let buf = Buffer.alloc(0);

    const done = (result) => {
      if (!resolved) {
        resolved = true;
        try { socket.destroy(); } catch (_) {}
        resolve(result);
      }
    };

    socket.setTimeout(timeout);
    socket.on('timeout', () => done({ online: false, latency: null, error: 'Timeout' }));
    socket.on('error', (err) => done({ online: false, latency: null, error: err.message }));

    socket.connect(port, host, () => {
      const latency = Date.now() - start;

      // Build handshake packet
      const hostBuf = Buffer.from(host, 'utf8');
      // varint encode host length
      const hostLenBuf = encodeVarint(hostBuf.length);
      // handshake body: packet_id=0x00, protocol=-1 (0xFF 0xFF 0xFF 0xFF 0x0F), host_len, host, port (u16), next_state=1
      const body = Buffer.concat([
        Buffer.from([0x00]),                        // packet ID
        Buffer.from([0xff, 0xff, 0xff, 0xff, 0x0f]),// protocol version -1 (varlong)
        hostLenBuf,
        hostBuf,
        Buffer.from([(port >> 8) & 0xff, port & 0xff]), // port big-endian u16
        Buffer.from([0x01]),                        // next state: status
      ]);
      const handshake = Buffer.concat([encodeVarint(body.length), body]);
      // Status request: length=1, packet_id=0x00
      const statusReq = Buffer.from([0x01, 0x00]);

      socket.write(Buffer.concat([handshake, statusReq]));

      socket.on('data', (chunk) => {
        buf = Buffer.concat([buf, chunk]);
        try {
          let i = 0;
          // Read packet length (varint)
          const [pktLen, pktLenBytes] = readVarint(buf, i);
          i += pktLenBytes;
          if (buf.length < i + pktLen) return; // wait for more
          // Read packet ID (varint) - should be 0x00
          const [, pkIdBytes] = readVarint(buf, i);
          i += pkIdBytes;
          // Read JSON string length (varint)
          const [strLen, strLenBytes] = readVarint(buf, i);
          i += strLenBytes;
          if (buf.length < i + strLen) return;
          const json = buf.slice(i, i + strLen).toString('utf8');
          const status = JSON.parse(json);
          const motdRaw = status.description;
          const motd = typeof motdRaw === 'string' ? motdRaw
            : motdRaw?.text ?? (motdRaw?.extra?.map(e => e.text || '').join('') ?? '');
          done({
            online: true,
            latency,
            players: status.players?.online ?? 0,
            maxPlayers: status.players?.max ?? 0,
            version: status.version?.name ?? null,
            motd: motd.replace(/\u00a7./g, ''), // strip MC color codes
          });
        } catch (_) {
          // Couldn't parse status yet, server is reachable though
          done({ online: true, latency, players: null, maxPlayers: null, version: null, motd: null });
        }
      });
    });
  });
}

function encodeVarint(val) {
  const bytes = [];
  do {
    let b = val & 0x7f;
    val >>>= 7;
    if (val !== 0) b |= 0x80;
    bytes.push(b);
  } while (val !== 0);
  return Buffer.from(bytes);
}

function readVarint(buf, offset) {
  let val = 0, shift = 0, i = offset;
  while (i < buf.length) {
    const b = buf[i++];
    val |= (b & 0x7f) << shift;
    shift += 7;
    if (!(b & 0x80)) break;
  }
  return [val, i - offset];
}

export async function POST(request) {
  try {
    const { host, port } = await request.json();
    if (!host) return NextResponse.json({ error: 'Host required' }, { status: 400 });
    const result = await mcPing(host, parseInt(port) || 25565);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ online: false, error: err.message });
  }
}
