import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Storage abstraction so local disk can be swapped for S3-compatible storage
 * later: implement this interface with an S3 client and change the export.
 */
export interface StorageAdapter {
  save(key: string, data: Buffer): Promise<string>; // returns public URL path
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

class LocalDiskStorage implements StorageAdapter {
  async save(key: string, data: Buffer): Promise<string> {
    const filePath = path.join(UPLOADS_DIR, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
    return `/uploads/${key}`;
  }

  async read(key: string): Promise<Buffer> {
    return fs.readFile(path.join(UPLOADS_DIR, key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(path.join(UPLOADS_DIR, key), { force: true });
  }
}

export const storage: StorageAdapter = new LocalDiskStorage();
