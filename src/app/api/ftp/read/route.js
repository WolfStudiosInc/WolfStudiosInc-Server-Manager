import { NextResponse } from 'next/server';
import * as ftp from 'basic-ftp';
import { Writable } from 'stream';

export async function POST(request) {
  try {
    const body = await request.json();
    const { host, port, user, password, secure, path } = body;

    if (!host || !user || !password) {
      return NextResponse.json({ error: 'Missing FTP credentials' }, { status: 400 });
    }

    const client = new ftp.Client();
    await client.access({
      host,
      port: parseInt(port) || 21,
      user,
      password,
      secure: secure || false,
    });

    let content = '';
    const stream = new Writable({
      write(chunk, encoding, callback) {
        content += chunk.toString();
        callback();
      }
    });

    try {
      await client.downloadTo(stream, path);
    } catch (err) {
      client.close();
      return NextResponse.json({ error: 'File not found or cannot be read.' }, { status: 404 });
    }

    client.close();
    
    // Send last 5000 characters to avoid huge payloads
    const truncated = content.length > 50000 ? content.slice(-50000) : content;
    return NextResponse.json({ content: truncated });

  } catch (error) {
    console.error('FTP Read Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
