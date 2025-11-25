export async function uploadFileToServer(file: File) {
  const fd = new FormData();
  fd.append('file', file);
  const resp = await fetch('/api/upload', { method: 'POST', body: fd });
  if (!resp.ok) {
    const text = await resp.text().catch(() => 'Upload failed');
    throw new Error(text || 'Upload failed');
  }
  const data = await resp.json();
  // Cloudinary returns 'secure_url' field on success
  return data;
}

export default uploadFileToServer;
