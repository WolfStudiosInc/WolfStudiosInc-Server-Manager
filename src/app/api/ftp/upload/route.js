import { NextResponse } from 'next/server';
import * as ftp from 'basic-ftp';
import { Readable } from 'stream';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const host = formData.get('host');
    const port = formData.get('port');
    const user = formData.get('user');
    const password = formData.get('password');
    const secure = formData.get('secure') === 'true';
    const path = formData.get('path') || '/plugins';
    
    // Check if we are uploading a file or downloading from a URL
    const file = formData.get('file');
    const downloadUrl = formData.get('downloadUrl');
    const fileName = formData.get('fileName');

    if (!host || !user || !password) {
      return NextResponse.json({ error: 'Missing FTP credentials' }, { status: 400 });
    }

    const client = new ftp.Client();
    await client.access({
      host,
      port: parseInt(port) || 21,
      user,
      password,
      secure,
    });

    try {
      // Ensure directory exists
      await client.ensureDir(path);
      
      let uploadStream;
      let targetFileName = fileName;

      if (file && typeof file === 'object') {
        // Direct file upload
        const buffer = await file.arrayBuffer();
        uploadStream = Readable.from(Buffer.from(buffer));
        if (!targetFileName) targetFileName = file.name;
      } else if (downloadUrl) {
        // Download from URL first
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error(`Failed to download from URL: ${response.statusText}`);
        
        const buffer = await response.arrayBuffer();
        uploadStream = Readable.from(Buffer.from(buffer));
        
        if (!targetFileName) {
          // Try to extract filename from URL or headers
          const cd = response.headers.get('content-disposition');
          if (cd && cd.includes('filename=')) {
            targetFileName = cd.split('filename=')[1].replace(/"/g, '');
          } else {
            targetFileName = downloadUrl.split('/').pop().split('?')[0] || 'plugin.jar';
          }
        }
      } else {
        throw new Error('No file or downloadUrl provided');
      }

      const uploadPath = `${path}/${targetFileName}`;
      await client.uploadFrom(uploadStream, uploadPath);

      client.close();
      return NextResponse.json({ success: true, message: `Uploaded ${targetFileName} successfully.` });

    } catch (err) {
      client.close();
      throw err;
    }

  } catch (error) {
    console.error('FTP Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
