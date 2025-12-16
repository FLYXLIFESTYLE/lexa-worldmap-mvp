/**
 * Photo Uploader
 * Handle photo uploads to Supabase Storage
 */

import { createClient } from '@/lib/supabase/server';

export interface PhotoUploadResult {
  url: string;
  path: string;
  thumbnailUrl?: string;
}

/**
 * Upload a photo to Supabase Storage
 */
export async function uploadPhoto(
  file: File,
  folder: string = 'knowledge-photos'
): Promise<PhotoUploadResult | null> {
  const supabase = await createClient();
  
  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('public')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });
  
  if (error) {
    console.error('Error uploading photo:', error);
    return null;
  }
  
  // Get public URL
  const { data: publicData } = supabase.storage
    .from('public')
    .getPublicUrl(filePath);
  
  return {
    url: publicData.publicUrl,
    path: filePath,
  };
}

/**
 * Upload multiple photos
 */
export async function uploadPhotos(
  files: File[],
  folder: string = 'knowledge-photos'
): Promise<PhotoUploadResult[]> {
  const results: PhotoUploadResult[] = [];
  
  for (const file of files) {
    const result = await uploadPhoto(file, folder);
    if (result) {
      results.push(result);
    }
  }
  
  return results;
}

/**
 * Delete a photo from Supabase Storage
 */
export async function deletePhoto(path: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { error } = await supabase.storage
    .from('public')
    .remove([path]);
  
  if (error) {
    console.error('Error deleting photo:', error);
    return false;
  }
  
  return true;
}

/**
 * Process photo from base64 or File
 */
export async function processPhotoUpload(
  photo: File | string,
  folder: string = 'knowledge-photos'
): Promise<PhotoUploadResult | null> {
  if (typeof photo === 'string') {
    // It's already a URL
    return {
      url: photo,
      path: photo,
    };
  }
  
  // It's a File object, upload it
  return await uploadPhoto(photo, folder);
}

