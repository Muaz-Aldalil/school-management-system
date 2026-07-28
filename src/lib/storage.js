import { supabase } from './supabase';

const BUCKET = 'student-photos';
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const TARGET_DIM = 400;
const JPEG_QUALITY = 0.8;

export async function uploadStudentPhoto(file, studentId, schoolId) {
  if (!supabase) throw new Error('Supabase not configured');
  if (!file || !studentId || !schoolId) throw new Error('Missing required params');

  if (file.size > MAX_SIZE) {
    file = await resizeImage(file, TARGET_DIM, JPEG_QUALITY);
  }

  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const path = `${schoolId}/${studentId}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return urlData.publicUrl;
}

export async function deleteStudentPhoto(schoolId, studentId) {
  if (!supabase || !schoolId || !studentId) return;
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];
  const paths = extensions.map(ext => `${schoolId}/${studentId}.${ext}`);
  await supabase.storage.from(BUCKET).remove(paths);
}

export function isBase64Photo(value) {
  return typeof value === 'string' && value.startsWith('data:image');
}

export function isStorageUrl(value) {
  return typeof value === 'string' && value.includes('/storage/v1/object/');
}

export async function uploadSchoolLogo(file, schoolId) {
  if (!supabase) throw new Error('Supabase not configured');
  if (!file || !schoolId) throw new Error('Missing required params');

  const resized = await resizeImage(file, 300, 0.85);
  const ext = resized.type === 'image/png' ? 'png' : 'jpg';
  const path = `${schoolId}/school-logo.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, resized, { upsert: true, contentType: resized.type });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return urlData.publicUrl;
}

export async function deleteSchoolLogo(schoolId) {
  if (!supabase || !schoolId) return;
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];
  const paths = extensions.map(ext => `${schoolId}/school-logo.${ext}`);
  await supabase.storage.from(BUCKET).remove(paths);
}

export async function resizeImage(file, targetDim, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > height) {
        height = Math.round((height / width) * targetDim);
        width = targetDim;
      } else {
        width = Math.round((width / height) * targetDim);
        height = targetDim;
      }

      canvas.width = targetDim;
      canvas.height = targetDim;

      const ctx = canvas.getContext('2d');
      const offsetX = (targetDim - width) / 2;
      const offsetY = (targetDim - height) / 2;
      ctx.drawImage(img, offsetX, offsetY, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          else reject(new Error('Canvas resize failed'));
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}
