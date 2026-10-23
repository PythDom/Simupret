import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface ExportFile {
  filename: string;
  mimeType: string;
  /** Texte (CSV) ou binaire (PDF). */
  content: string | ArrayBuffer;
}

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

function toBlob(file: ExportFile): Blob {
  return new Blob([file.content], { type: file.mimeType });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Téléchargement direct (navigateur). */
export function download(file: ExportFile): void {
  const url = URL.createObjectURL(toBlob(file));
  const a = document.createElement('a');
  a.href = url;
  a.download = file.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Le navigateur peut-il partager ce fichier (Web Share API niveau 2) ? */
export function canWebShare(file: ExportFile): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({ files: [new File([toBlob(file)], file.filename, { type: file.mimeType })] });
  } catch {
    return false;
  }
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

/**
 * Partage un fichier : feuille de partage Android (fichier écrit dans le
 * cache de l'application), Web Share sur mobile, sinon téléchargement.
 */
export async function shareFile(file: ExportFile, title: string): Promise<ShareOutcome> {
  if (isNative()) {
    const isText = typeof file.content === 'string';
    const written = await Filesystem.writeFile({
      path: file.filename,
      directory: Directory.Cache,
      data: isText ? (file.content as string) : arrayBufferToBase64(file.content as ArrayBuffer),
      ...(isText ? { encoding: Encoding.UTF8 } : {}),
    });
    try {
      await Share.share({ title, dialogTitle: title, files: [written.uri] });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  if (canWebShare(file)) {
    try {
      await navigator.share({ title, files: [new File([toBlob(file)], file.filename, { type: file.mimeType })] });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  download(file);
  return 'downloaded';
}
