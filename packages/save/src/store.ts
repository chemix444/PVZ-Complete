import { migrateProfile } from './migrations';
import type { PlayerProfile } from './profile';

export interface ProfileStore {
  list(): Promise<PlayerProfile[]>;
  load(id: string): Promise<PlayerProfile | null>;
  save(profile: PlayerProfile): Promise<void>;
  remove(id: string): Promise<void>;
  getActiveId(): Promise<string | null>;
  setActiveId(id: string | null): Promise<void>;
}

export const DATABASE_NAME = 'pvz-complete';
/** IndexedDB schema version (object stores), separate from the profile format version. */
export const DATABASE_VERSION = 1;
const PROFILES = 'profiles';
const META = 'meta';
const ACTIVE_KEY = 'activeProfile';

export class IndexedDbProfileStore implements ProfileStore {
  private db: Promise<IDBDatabase> | null = null;

  constructor(
    private readonly name: string = DATABASE_NAME,
    private readonly factory: IDBFactory = globalThis.indexedDB,
  ) {}

  async list(): Promise<PlayerProfile[]> {
    const rows = await this.request<unknown[]>(PROFILES, 'readonly', (store) => store.getAll());
    const profiles: PlayerProfile[] = [];
    for (const row of rows) profiles.push(migrateProfile(row));
    return profiles.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async load(id: string): Promise<PlayerProfile | null> {
    const row = await this.request<unknown>(PROFILES, 'readonly', (store) => store.get(id));
    return row === undefined ? null : migrateProfile(row);
  }

  async save(profile: PlayerProfile): Promise<void> {
    await this.request(PROFILES, 'readwrite', (store) => store.put(structuredClone(profile)));
  }

  async remove(id: string): Promise<void> {
    await this.request(PROFILES, 'readwrite', (store) => store.delete(id));
    if ((await this.getActiveId()) === id) await this.setActiveId(null);
  }

  async getActiveId(): Promise<string | null> {
    const value = await this.request<unknown>(META, 'readonly', (store) => store.get(ACTIVE_KEY));
    return typeof value === 'string' ? value : null;
  }

  async setActiveId(id: string | null): Promise<void> {
    await this.request(META, 'readwrite', (store) => (id === null ? store.delete(ACTIVE_KEY) : store.put(id, ACTIVE_KEY)));
  }

  close(): void {
    void this.db?.then((db) => db.close());
    this.db = null;
  }

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise((resolve, reject) => {
      const request = this.factory.open(this.name, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PROFILES)) db.createObjectStore(PROFILES, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.db;
  }

  private async request<T>(
    storeName: string,
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest,
  ): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const request = run(tx.objectStore(storeName));
      tx.oncomplete = () => resolve(request.result as T);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
}

/** Non-persistent store for tests and for browsers without IndexedDB. */
export class MemoryProfileStore implements ProfileStore {
  private readonly rows = new Map<string, unknown>();
  private active: string | null = null;

  async list(): Promise<PlayerProfile[]> {
    return [...this.rows.values()].map((row) => migrateProfile(row)).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async load(id: string): Promise<PlayerProfile | null> {
    const row = this.rows.get(id);
    return row === undefined ? null : migrateProfile(row);
  }

  async save(profile: PlayerProfile): Promise<void> {
    this.rows.set(profile.id, structuredClone(profile));
  }

  async remove(id: string): Promise<void> {
    this.rows.delete(id);
    if (this.active === id) this.active = null;
  }

  async getActiveId(): Promise<string | null> {
    return this.active;
  }

  async setActiveId(id: string | null): Promise<void> {
    this.active = id;
  }

  /** Inserts a raw (possibly old-format) record, as an old build would have written it. */
  putRaw(id: string, raw: unknown): void {
    this.rows.set(id, raw);
  }
}
