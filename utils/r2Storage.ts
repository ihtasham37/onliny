import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const R2_SETTINGS_PATH = path.resolve(process.cwd(), 'data', 'r2Settings.json');

export interface R2Config {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketName?: string;
  publicUrl?: string; // e.g. https://pub-xxxxxx.r2.dev or https://media.yourdomain.com
}

// Read saved R2 credentials from disk or environment variables
export function getR2Settings(): R2Config {
  try {
    if (fs.existsSync(R2_SETTINGS_PATH)) {
      const raw = fs.readFileSync(R2_SETTINGS_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        accountId: parsed.accountId || process.env.R2_ACCOUNT_ID || '',
        accessKeyId: parsed.accessKeyId || process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: parsed.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || '',
        bucketName: parsed.bucketName || process.env.R2_BUCKET_NAME || '',
        publicUrl: parsed.publicUrl || process.env.R2_PUBLIC_URL || '',
      };
    }
  } catch (err) {
    console.warn('Could not read r2Settings.json:', err);
  }

  return {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || '',
    publicUrl: process.env.R2_PUBLIC_URL || '',
  };
}

// Persist R2 credentials server-side in data/r2Settings.json
export function saveR2Settings(config: Partial<R2Config>): R2Config {
  const current = getR2Settings();
  const updated: R2Config = {
    ...current,
    ...config,
  };

  try {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(R2_SETTINGS_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write r2Settings.json:', err);
  }

  return updated;
}

// Instantiate AWS S3 client configured for Cloudflare R2
export function getR2Client(customConfig?: R2Config): { client: S3Client | null; config: R2Config } {
  const config = customConfig || getR2Settings();
  const { accountId, accessKeyId, secretAccessKey } = config;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return { client: null, config };
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return { client, config };
}

// Helper to determine file extension from mime type
function getExtensionFromMime(mime: string): string {
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('png')) return 'png';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('svg')) return 'svg';
  if (mime.includes('mp4')) return 'mp4';
  return 'jpg';
}

// Upload buffer directly to Cloudflare R2
export async function uploadBufferToR2(
  buffer: Buffer,
  filename: string,
  contentType: string,
  folder = 'products'
): Promise<{ success: boolean; url: string; key: string; error?: string }> {
  const { client, config } = getR2Client();
  const ext = getExtensionFromMime(contentType);
  const cleanName = filename ? path.basename(filename, path.extname(filename)).replace(/[^a-zA-Z0-9-_]/g, '_') : 'image';
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${cleanName}.${ext}`;

  if (client && config.bucketName) {
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      );

      // Formulate public URL
      let publicUrlBase = (config.publicUrl || '').trim().replace(/\/+$/, '');
      if (!publicUrlBase) {
        publicUrlBase = `https://${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com`;
      }
      const finalUrl = `${publicUrlBase}/${key}`;

      return {
        success: true,
        url: finalUrl,
        key,
      };
    } catch (err: any) {
      console.error('R2 S3 Client upload error:', err);
      // Fall through to resilient local/data URI fallback
    }
  }

  // Fallback if R2 credentials are not yet entered by user:
  // Save to public/uploads/ or convert to data URI so user never encounters broken image
  try {
    const publicUploads = path.resolve('public', 'uploads');
    if (!fs.existsSync(publicUploads)) {
      fs.mkdirSync(publicUploads, { recursive: true });
    }
    const localFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${cleanName}.${ext}`;
    const localFilePath = path.join(publicUploads, localFileName);
    fs.writeFileSync(localFilePath, buffer);
    return {
      success: true,
      url: `/uploads/${localFileName}`,
      key: `uploads/${localFileName}`,
    };
  } catch (fallbackErr) {
    const base64 = buffer.toString('base64');
    return {
      success: true,
      url: `data:${contentType};base64,${base64}`,
      key,
    };
  }
}

// Download an external image from URL (Markaz, Daraz, AliExpress, etc.) and save directly to Cloudflare R2
export async function downloadAndUploadImageToR2(
  externalUrl: string,
  options?: { folder?: string; filenameHint?: string }
): Promise<string> {
  if (!externalUrl || typeof externalUrl !== 'string') return '';

  // If already an R2 URL or local/data URI, return as-is
  const { config } = getR2Client();
  if (config.publicUrl && externalUrl.startsWith(config.publicUrl)) {
    return externalUrl;
  }
  if (externalUrl.includes('.r2.dev') || externalUrl.includes('.r2.cloudflarestorage.com')) {
    return externalUrl;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(externalUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Failed to fetch external image (${res.status}): ${externalUrl}`);
      return externalUrl; // Return original URL as fallback
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Skip if buffer is too small to be a real image (< 500 bytes)
    if (buffer.length < 500) {
      return externalUrl;
    }

    const uploadResult = await uploadBufferToR2(
      buffer,
      options?.filenameHint || 'product_img',
      contentType,
      options?.folder || 'products'
    );

    if (uploadResult.success && uploadResult.url) {
      return uploadResult.url;
    }
  } catch (err: any) {
    console.warn(`Error downloading/uploading image ${externalUrl} to R2:`, err?.message || err);
  }

  return externalUrl;
}
