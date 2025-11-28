'use server';

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';

export interface FileUploadData {
  fileName: string;
  fileData: string; // base64
  fileType: string;
}

export async function uploadFilesToStorage(files: FileUploadData[], invoiceId: string) {
  const uploadPromises = files.map(async (file) => {
    try {
      // Convert base64 to buffer
      const buffer = Buffer.from(file.fileData, 'base64');
      
      // Create storage reference
      const storageRef = ref(storage, `invoices/${invoiceId}/${file.fileName}`);
      
      // Upload file
      const snapshot = await uploadBytes(storageRef, buffer, {
        contentType: file.fileType
      });
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        fileName: file.fileName,
        fileUrl: downloadURL,
        uploadedAt: Timestamp.now()
      };
    } catch (error) {
      console.error(`Failed to upload file ${file.fileName}:`, error);
      return null;
    }
  });
  
  const results = await Promise.all(uploadPromises);
  return results.filter(Boolean);
}