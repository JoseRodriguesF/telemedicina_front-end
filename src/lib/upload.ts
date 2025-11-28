async function compressImageIfNeeded(file: File, maxDim = 1600, quality = 0.8): Promise<File> {
  try {
    if (typeof window === 'undefined') return file;
    if (!file.type.startsWith('image/')) return file;
    // Skip very small images (< 400KB)
    if (file.size < 400 * 1024) return file;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      image.src = url;
    });

    const { width, height } = img;
    if (!width || !height) return file;
    let targetW = width;
    let targetH = height;
    const maxSide = Math.max(width, height);
    if (maxSide > maxDim) {
      const scale = maxDim / maxSide;
      targetW = Math.round(width * scale);
      targetH = Math.round(height * scale);
    }
    // If not resizing and already jpeg smaller than ~1.2MB, keep
    if (targetW === width && targetH === height && file.type === 'image/jpeg' && file.size < 1.2 * 1024 * 1024) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
    if (!blob) return file;
    const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
    return compressed.size < file.size ? compressed : file;
  } catch {
    return file;
  }
}

export async function uploadFileToServer(file: File) {
  // Prefer upload direto ao Cloudinary para evitar limite de payload do Vercel
  const signResp = await fetch('/api/upload/sign');
  if (!signResp.ok) {
    // Fallback para rota antiga (pode falhar com arquivos grandes no Vercel)
    const fd = new FormData();
    fd.append('file', file);
    const resp = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!resp.ok) {
      const text = await resp.text().catch(() => 'Upload failed');
      throw new Error(text || 'Upload failed');
    }
    return await resp.json();
  }

  const { cloudName, apiKey, timestamp, signature } = await signResp.json();

  // Compress lightly when needed (somente imagens)
  const toSend = await compressImageIfNeeded(file);

  const form = new FormData();
  form.append('file', toSend);
  form.append('api_key', apiKey);
  form.append('timestamp', timestamp);
  form.append('signature', signature);

  const cloudUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
  const uploadResp = await fetch(cloudUrl, { method: 'POST', body: form });
  if (!uploadResp.ok) {
    const text = await uploadResp.text().catch(() => 'Upload failed');
    throw new Error(text || 'Upload failed');
  }
  const data = await uploadResp.json();
  return data;
}

export default uploadFileToServer;
