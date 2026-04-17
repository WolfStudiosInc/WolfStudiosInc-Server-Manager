import { NextResponse } from 'next/server';
import * as ftp from 'basic-ftp';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, host, port, user, password, secure, path } = body;

    if (!host || !user || !password) {
      return NextResponse.json({ error: 'Missing FTP credentials' }, { status: 400 });
    }

    const client = new ftp.Client();
    // client.ftp.verbose = true;
    
    await client.access({
      host,
      port: parseInt(port) || 21,
      user,
      password,
      secure: secure || false,
    });

    let result = null;

    if (action === 'list') {
      const targetPath = path || '/plugins';
      result = await client.list(targetPath);
      result = result.map(file => ({
        name: file.name,
        type: file.isDirectory ? 'directory' : 'file',
        size: file.size,
        date: file.date
      }));
    } else if (action === 'delete') {
      const { type: itemType } = body;
      const targetPath = path;
      if (!targetPath) throw new Error('Path is required for delete');

      if (itemType === 'directory') {
        // Manual recursive delete: list, delete files, recurse into subdirs, then remove empty dir
        const deleteRecursive = async (dirPath) => {
          const entries = await client.list(dirPath);
          for (const entry of entries) {
            if (entry.name === '.' || entry.name === '..') continue;
            const entryPath = dirPath.endsWith('/') ? `${dirPath}${entry.name}` : `${dirPath}/${entry.name}`;
            if (entry.isDirectory) {
              await deleteRecursive(entryPath);
            } else {
              await client.remove(entryPath);
            }
          }
          await client.removeDir(dirPath);
        };
        await deleteRecursive(targetPath);
      } else {
        // It's a file — delete directly
        await client.remove(targetPath);
      }
      result = { success: true };
    }

    client.close();
    return NextResponse.json({ data: result });

  } catch (error) {
    console.error('FTP Error:', error);
    return NextResponse.json({ error: error.message || 'An error occurred during FTP operation' }, { status: 500 });
  }
}
