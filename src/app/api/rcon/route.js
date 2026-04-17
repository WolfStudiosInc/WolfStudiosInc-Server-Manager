import { NextResponse } from 'next/server';
import net from 'net';

/**
 * Minimal RCON client using the Valve RCON protocol (also used by Minecraft).
 * Packet format: length (i32 LE) | requestId (i32 LE) | type (i32 LE) | payload (null-terminated string) | null byte
 */
function rconConnect(host, port, password, command, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let resolved = false;
    let buf = Buffer.alloc(0);
    let loggedIn = false;

    const done = (result) => {
      if (!resolved) {
        resolved = true;
        try { socket.destroy(); } catch (_) {}
        resolve(result);
      }
    };
    const fail = (err) => {
      if (!resolved) {
        resolved = true;
        try { socket.destroy(); } catch (_) {}
        reject(new Error(err));
      }
    };

    const buildPacket = (id, type, body) => {
      const bodyBuf = Buffer.from(body + '\x00\x00', 'utf8');
      const pkt = Buffer.alloc(4 + 4 + 4 + bodyBuf.length);
      pkt.writeInt32LE(4 + 4 + bodyBuf.length, 0); // length (excludes itself)
      pkt.writeInt32LE(id, 4);
      pkt.writeInt32LE(type, 8);
      bodyBuf.copy(pkt, 12);
      return pkt;
    };

    socket.setTimeout(timeout);
    socket.on('timeout', () => fail('RCON connection timed out'));
    socket.on('error', (err) => fail(err.message));

    socket.connect(port, host, () => {
      // Send auth packet (type 3)
      socket.write(buildPacket(1, 3, password));
    });

    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      // Try to read complete packets
      while (buf.length >= 4) {
        const pktLen = buf.readInt32LE(0);
        if (buf.length < 4 + pktLen) break;
        const requestId = buf.readInt32LE(4);
        const type = buf.readInt32LE(8);
        const payload = buf.slice(12, 4 + pktLen - 2).toString('utf8');
        buf = buf.slice(4 + pktLen);

        if (!loggedIn) {
          if (requestId === -1 || requestId === 0xffffffff) {
            fail('RCON authentication failed — wrong password?');
            return;
          }
          loggedIn = true;
          // Send command packet (type 2)
          socket.write(buildPacket(2, 2, command));
        } else {
          // Response to command (type 0)
          done({ response: payload || '(no output)' });
        }
      }
    });
  });
}

export async function POST(request) {
  try {
    const { host, port, password, command } = await request.json();
    if (!host) return NextResponse.json({ error: 'Host required' }, { status: 400 });
    if (!command) return NextResponse.json({ error: 'Command required' }, { status: 400 });
    if (!password) return NextResponse.json({ error: 'RCON password not configured. Set it in FTP Settings → RCON.' }, { status: 400 });

    const result = await rconConnect(host, parseInt(port) || 25575, password, command);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 200 });
  }
}
