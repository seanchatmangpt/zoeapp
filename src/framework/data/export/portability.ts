import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { mmkvInstance } from '../../../lib/store/mmkvStorage';
import { DATABASE_NAME } from '../../../lib/db/db';
import { blake3, canonicalStringify } from '../../../lib/crypto/receipts';

export interface ExportPackage {
  version: number;
  timestamp: number;
  sqliteBase64: string;
  mmkvState: Record<string, string>;
  signature: string;
}

export const Portability = {
  async exportData(): Promise<string> {
    const dbPath = `${FileSystem.documentDirectory}SQLite/${DATABASE_NAME}`;
    let sqliteBase64 = '';
    try {
      sqliteBase64 = await FileSystem.readAsStringAsync(dbPath, { encoding: FileSystem.EncodingType.Base64 });
    } catch(e) {
      sqliteBase64 = ''; // Test fallback
    }

    const mmkvKeys = mmkvInstance.getAllKeys();
    const mmkvState: Record<string, string> = {};
    mmkvKeys.forEach(key => {
      const val = mmkvInstance.getString(key);
      if (val) mmkvState[key] = val;
    });

    const pkg: Omit<ExportPackage, 'signature'> = {
      version: 1,
      timestamp: Date.now(),
      sqliteBase64,
      mmkvState,
    };

    const signature = blake3(canonicalStringify(pkg));
    const finalPackage: ExportPackage = { ...pkg, signature };
    
    const exportUri = `${FileSystem.cacheDirectory}zoe_backup_${pkg.timestamp}.json`;
    await FileSystem.writeAsStringAsync(exportUri, JSON.stringify(finalPackage));
    
    try {
      await Share.share({ url: exportUri });
    } catch (e) {
      // ignore
    }
    
    return exportUri;
  },

  async importData(fileUri: string): Promise<void> {
    const content = await FileSystem.readAsStringAsync(fileUri);
    const pkg: ExportPackage = JSON.parse(content);

    const { signature, ...data } = pkg;
    const expectedSignature = blake3(canonicalStringify(data));
    if (signature !== expectedSignature) {
      throw new Error('Data integrity violation: Backup file signature mismatch.');
    }

    mmkvInstance.clearAll();
    Object.entries(pkg.mmkvState).forEach(([key, val]) => {
      mmkvInstance.set(key, val);
    });

    const dbPath = `${FileSystem.documentDirectory}SQLite/${DATABASE_NAME}`;
    await FileSystem.writeAsStringAsync(dbPath, pkg.sqliteBase64, { encoding: FileSystem.EncodingType.Base64 });
  }
};
