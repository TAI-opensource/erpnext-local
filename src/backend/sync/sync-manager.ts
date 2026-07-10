// =============================================================================
// SyncManager - ERPNext Banking Offline/Online Synchronization Manager
// =============================================================================

// =============================================================================
// Types & Interfaces
// =============================================================================

export type SyncOperationType = "CREATE" | "UPDATE" | "DELETE";
export type SyncOperationStatus = "pending" | "in_progress" | "completed" | "failed" | "cancelled";
export type ConflictResolution = "local_wins" | "remote_wins" | "merge" | "skip";

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  doctype: string;
  name: string;
  data: Record<string, unknown>;
  timestamp: number;
  status: SyncOperationStatus;
  retries: number;
  maxRetries: number;
  error?: string;
}

export interface SyncConflict {
  id: string;
  local: SyncOperation;
  remote: Record<string, unknown>;
  resolution?: ConflictResolution;
  timestamp: number;
  resolvedAt?: number;
  mergedData?: Record<string, unknown>;
}

export interface SyncStatus {
  last_sync: number | null;
  pending_push: number;
  pending_pull: number;
  conflicts: number;
  is_syncing: boolean;
  is_online: boolean;
  total_operations: number;
  failed_operations: number;
}

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  phase: "push" | "pull" | "conflict_resolution";
}

export interface SyncConfig {
  serverUrl: string;
  apiKey?: string;
  appName: string;
  autoSyncIntervalMs?: number;
  maxRetries: number;
  retryBackoffMs: number;
  conflictStrategy: ConflictResolution;
  batchSize: number;
  enableAutoSync: boolean;
}

export interface SyncEvents {
  onSyncStart: () => void;
  onSyncProgress: (progress: SyncProgress) => void;
  onSyncComplete: (status: SyncStatus) => void;
  onSyncError: (error: Error) => void;
  onConflictDetected: (conflict: SyncConflict) => void;
  onOfflineOperation: (operation: SyncOperation) => void;
  onOnlineStatusChanged: (isOnline: boolean) => void;
}

export interface ExportData {
  version: string;
  timestamp: number;
  doctypes: Record<string, Record<string, unknown>[]>;
  operations: SyncOperation[];
  conflicts: SyncConflict[];
}

// =============================================================================
// IndexedDB Storage Adapter
// =============================================================================

class SyncStorage {
  private dbName = "erpnext_banking_sync";
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains("operations")) {
          const operationStore = db.createObjectStore("operations", { keyPath: "id" });
          operationStore.createIndex("doctype", "doctype", { unique: false });
          operationStore.createIndex("status", "status", { unique: false });
          operationStore.createIndex("timestamp", "timestamp", { unique: false });
        }

        if (!db.objectStoreNames.contains("conflicts")) {
          const conflictStore = db.createObjectStore("conflicts", { keyPath: "id" });
          conflictStore.createIndex("resolution", "resolution", { unique: false });
        }

        if (!db.objectStoreNames.contains("sync_state")) {
          db.createObjectStore("sync_state", { keyPath: "key" });
        }

        if (!db.objectStoreNames.contains("backups")) {
          db.createObjectStore("backups", { keyPath: "id" });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => {
        reject(new Error(`Failed to open IndexedDB: ${(event.target as IDBOpenDBRequest).error}`));
      };
    });
  }

  private getStore(storeName: string, mode: IDBTransactionMode = "readonly"): IDBObjectStore {
    if (!this.db) throw new Error("Database not initialized");
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  async saveOperation(operation: SyncOperation): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore("operations", "readwrite");
      const request = store.put(operation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to save operation"));
    });
  }

  async getOperation(id: string): Promise<SyncOperation | null> {
    return new Promise((resolve, reject) => {
      const store = this.getStore("operations");
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error("Failed to get operation"));
    });
  }

  async getAllOperations(): Promise<SyncOperation[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore("operations");
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error("Failed to get operations"));
    });
  }

  async getPendingOperations(): Promise<SyncOperation[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore("operations");
      const index = store.index("status");
      const request = index.getAll("pending");
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error("Failed to get pending operations"));
    });
  }

  async deleteOperation(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore("operations", "readwrite");
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to delete operation"));
    });
  }

  async clearCompletedOperations(): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore("operations", "readwrite");
      const index = store.index("status");
      const request = index.openCursor("completed");
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(new Error("Failed to clear completed operations"));
    });
  }

  async saveConflict(conflict: SyncConflict): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore("conflicts", "readwrite");
      const request = store.put(conflict);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to save conflict"));
    });
  }

  async getConflict(id: string): Promise<SyncConflict | null> {
    return new Promise((resolve, reject) => {
      const store = this.getStore("conflicts");
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error("Failed to get conflict"));
    });
  }

  async getAllConflicts(): Promise<SyncConflict[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore("conflicts");
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error("Failed to get conflicts"));
    });
  }

  async updateConflict(conflict: SyncConflict): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore("conflicts", "readwrite");
      const request = store.put(conflict);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to update conflict"));
    });
  }

  async getSyncState(key: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const store = this.getStore("sync_state");
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value ?? null);
      request.onerror = () => reject(new Error("Failed to get sync state"));
    });
  }

  async setSyncState(key: string, value: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore("sync_state", "readwrite");
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to set sync state"));
    });
  }

  async saveBackup(backup: ExportData): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore("backups", "readwrite");
      const request = store.put({ id: `backup_${backup.timestamp}`, ...backup });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to save backup"));
    });
  }

  async getBackups(): Promise<ExportData[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore("backups");
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error("Failed to get backups"));
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// =============================================================================
// SyncManager Class
// =============================================================================

export class SyncManager {
  private storage: SyncStorage;
  private config: SyncConfig;
  private events: Partial<SyncEvents>;
  private isOnlineState: boolean = typeof navigator !== "undefined" ? navigator.onLine : true;
  private isSyncingState: boolean = false;
  private autoSyncTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private abortController: AbortController | null = null;

  constructor(
    config: Partial<SyncConfig> = {},
    events: Partial<SyncEvents> = {}
  ) {
    this.config = {
      serverUrl: config.serverUrl || "",
      apiKey: config.apiKey || "",
      appName: config.appName || "erpnext_banking",
      autoSyncIntervalMs: config.autoSyncIntervalMs || 30000,
      maxRetries: config.maxRetries || 3,
      retryBackoffMs: config.retryBackoffMs || 1000,
      conflictStrategy: config.conflictStrategy || "local_wins",
      batchSize: config.batchSize || 50,
      enableAutoSync: config.enableAutoSync ?? true,
      ...config,
    };
    this.events = events;
    this.storage = new SyncStorage();
  }

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------

  async init(): Promise<void> {
    await this.storage.init();
    this.setupNetworkDetection();

    const lastSync = await this.storage.getSyncState("lastSyncTime");
    if (lastSync) {
      console.log(`[SyncManager] Last sync: ${new Date(lastSync as number).toISOString()}`);
    }

    if (this.config.enableAutoSync && this.isOnlineState) {
      this.startAutoSync(this.config.autoSyncIntervalMs);
    }

    console.log("[SyncManager] Initialized successfully");
  }

  private setupNetworkDetection(): void {
    if (typeof window === "undefined") return;

    window.addEventListener("online", () => {
      this.isOnlineState = true;
      this.events.onOnlineStatusChanged?.(true);
      console.log("[SyncManager] Network status: online");
      this.processQueue();
    });

    window.addEventListener("offline", () => {
      this.isOnlineState = false;
      this.events.onOnlineStatusChanged?.(false);
      console.log("[SyncManager] Network status: offline");
    });

    this.isOnlineState = navigator.onLine;
  }

  // -------------------------------------------------------------------------
  // Core Sync Operations
  // -------------------------------------------------------------------------

  async sync(): Promise<SyncStatus> {
    if (this.isSyncingState) {
      console.log("[SyncManager] Sync already in progress");
      return this.getSyncStatus();
    }

    this.isSyncingState = true;
    this.abortController = new AbortController();
    this.events.onSyncStart?.();

    try {
      const pendingOps = await this.storage.getPendingOperations();
      const total = pendingOps.length;
      this.events.onSyncProgress?.({ total, completed: 0, failed: 0, phase: "push" });

      await this.pushChanges(pendingOps);

      await this.pullChanges();

      await this.storage.setSyncState("lastSyncTime", Date.now());

      const status = await this.getSyncStatus();
      this.events.onSyncComplete?.(status);

      return status;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.events.onSyncError?.(err);
      throw err;
    } finally {
      this.isSyncingState = false;
      this.abortController = null;
    }
  }

  async pushChanges(operations?: SyncOperation[]): Promise<void> {
    const ops = operations || (await this.storage.getPendingOperations());
    if (ops.length === 0) return;

    const batches = this.chunkArray(ops, this.config.batchSize);
    let completed = 0;
    let failed = 0;

    for (const batch of batches) {
      if (this.abortController?.signal.aborted) break;

      const batchPromises = batch.map(async (operation) => {
        try {
          await this.sendOperationToServer(operation);
          await this.storage.deleteOperation(operation.id);
          completed++;
        } catch (error) {
          failed++;
          await this.handleOperationError(operation, error);
        }

        this.events.onSyncProgress?.({
          total: ops.length,
          completed,
          failed,
          phase: "push",
        });
      });

      await Promise.allSettled(batchPromises);
    }
  }

  async pullChanges(): Promise<Record<string, unknown>[]> {
    const lastSyncTime = (await this.storage.getSyncState("lastSyncTime")) as number | null;
    const pullUrl = this.buildServerUrl("/api/method/sync.get_changes");

    const body: Record<string, unknown> = {
      last_sync: lastSyncTime || 0,
      app_name: this.config.appName,
    };

    const response = await this.fetchFromServer(pullUrl, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const result = (await response.json()) as {
      message?: { changes?: Record<string, unknown>[]; conflicts?: SyncConflict[] };
    };
    const changes = result?.message?.changes || [];

    if (changes.length > 0) {
      for (const change of changes) {
        await this.processRemoteChange(change);
      }
    }

    return changes;
  }

  private async processRemoteChange(change: Record<string, unknown>): Promise<void> {
    const pendingOps = await this.storage.getPendingOperations();
    const localConflict = pendingOps.find(
      (op) => op.doctype === change.doctype && op.name === change.name
    );

    if (localConflict) {
      const conflict: SyncConflict = {
        id: `conflict_${localConflict.id}_${Date.now()}`,
        local: localConflict,
        remote: change,
        timestamp: Date.now(),
      };

      await this.storage.saveConflict(conflict);
      this.events.onConflictDetected?.(conflict);
    }
  }

  // -------------------------------------------------------------------------
  // Queue Management
  // -------------------------------------------------------------------------

  async addToQueue(operation: Omit<SyncOperation, "id" | "timestamp" | "status" | "retries" | "maxRetries">): Promise<SyncOperation> {
    const fullOperation: SyncOperation = {
      id: this.generateId(),
      type: operation.type,
      doctype: operation.doctype,
      name: operation.name,
      data: operation.data,
      timestamp: Date.now(),
      status: "pending",
      retries: 0,
      maxRetries: this.config.maxRetries,
    };

    await this.storage.saveOperation(fullOperation);
    this.events.onOfflineOperation?.(fullOperation);

    if (this.isOnlineState && !this.isSyncingState) {
      this.processQueue();
    }

    return fullOperation;
  }

  async processQueue(): Promise<void> {
    if (this.isSyncingState || !this.isOnlineState) return;

    const pendingOps = await this.storage.getPendingOperations();
    const sortedOps = pendingOps.sort((a, b) => a.timestamp - b.timestamp);

    for (const operation of sortedOps) {
      if (!this.isOnlineState || this.isSyncingState) break;

      try {
        operation.status = "in_progress";
        await this.storage.saveOperation(operation);

        await this.sendOperationToServer(operation);
        await this.storage.deleteOperation(operation.id);
      } catch (error) {
        await this.handleOperationError(operation, error);
      }
    }
  }

  private async handleOperationError(operation: SyncOperation, error: unknown): Promise<void> {
    operation.retries++;
    operation.error = error instanceof Error ? error.message : String(error);

    if (operation.retries >= operation.maxRetries) {
      operation.status = "failed";
    } else {
      operation.status = "pending";
      const backoffMs = this.config.retryBackoffMs * Math.pow(2, operation.retries - 1);
      this.scheduleRetry(operation.id, backoffMs);
    }

    await this.storage.saveOperation(operation);
  }

  private scheduleRetry(operationId: string, delayMs: number): void {
    const existingTimer = this.retryTimers.get(operationId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(async () => {
      this.retryTimers.delete(operationId);
      if (this.isOnlineState) {
        const operation = await this.storage.getOperation(operationId);
        if (operation && operation.status === "pending") {
          await this.processQueue();
        }
      }
    }, delayMs);

    this.retryTimers.set(operationId, timer);
  }

  // -------------------------------------------------------------------------
  // Conflict Resolution
  // -------------------------------------------------------------------------

  async getPendingChanges(): Promise<SyncOperation[]> {
    return this.storage.getPendingOperations();
  }

  async getConflictCount(): Promise<number> {
    const conflicts = await this.storage.getAllConflicts();
    return conflicts.filter((c) => !c.resolution).length;
  }

  async resolveConflict(
    local: SyncOperation,
    remote: Record<string, unknown>,
    resolution: ConflictResolution
  ): Promise<SyncConflict | null> {
    const conflicts = await this.storage.getAllConflicts();
    const conflict = conflicts.find(
      (c) => c.local.id === local.id && !c.resolution
    );

    if (!conflict) return null;

    conflict.resolution = resolution;
    conflict.resolvedAt = Date.now();

    switch (resolution) {
      case "local_wins":
        await this.sendOperationToServer(local);
        break;

      case "remote_wins":
        await this.applyRemoteData(local.doctype, local.name, remote);
        break;

      case "merge":
        conflict.mergedData = this.mergeData(local.data, remote);
        await this.sendOperationToServer({
          ...local,
          data: conflict.mergedData,
        });
        break;

      case "skip":
        break;
    }

    await this.storage.updateConflict(conflict);
    return conflict;
  }

  async resolveAllConflicts(strategy: ConflictResolution): Promise<number> {
    const conflicts = await this.storage.getAllConflicts();
    const unresolved = conflicts.filter((c) => !c.resolution);
    let resolved = 0;

    for (const conflict of unresolved) {
      const result = await this.resolveConflict(
        conflict.local,
        conflict.remote,
        strategy
      );
      if (result) resolved++;
    }

    return resolved;
  }

  private mergeData(
    local: Record<string, unknown>,
    remote: Record<string, unknown>
  ): Record<string, unknown> {
    const merged = { ...remote };

    for (const [key, value] of Object.entries(local)) {
      if (!(key in remote) || value !== undefined) {
        merged[key] = value;
      }
    }

    return merged;
  }

  private async applyRemoteData(
    doctype: string,
    name: string,
    data: Record<string, unknown>
  ): Promise<void> {
    console.log(`[SyncManager] Applying remote data for ${doctype}:${name}`);
  }

  // -------------------------------------------------------------------------
  // Server Communication
  // -------------------------------------------------------------------------

  private async sendOperationToServer(operation: SyncOperation): Promise<unknown> {
    const url = this.buildServerUrl(
      `/api/method/${operation.type === "DELETE" ? "delete" : "set"}.${operation.doctype.toLowerCase()}`
    );

    const body: Record<string, unknown> = {
      doctype: operation.doctype,
      name: operation.name,
      data: operation.type !== "DELETE" ? operation.data : undefined,
    };

    const response = await this.fetchFromServer(url, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return response.json();
  }

  private async fetchFromServer(url: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  private buildServerUrl(path: string): string {
    const base = this.config.serverUrl.replace(/\/$/, "");
    return `${base}${path}`;
  }

  // -------------------------------------------------------------------------
  // Network & Status
  // -------------------------------------------------------------------------

  isOnline(): boolean {
    return this.isOnlineState;
  }

  async getLastSyncTime(): Promise<number | null> {
    return (await this.storage.getSyncState("lastSyncTime")) as number | null;
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const operations = await this.storage.getAllOperations();
    const conflicts = await this.storage.getAllConflicts();
    const lastSyncTime = await this.getLastSyncTime();

    return {
      last_sync: lastSyncTime,
      pending_push: operations.filter((op) => op.status === "pending").length,
      pending_pull: 0,
      conflicts: conflicts.filter((c) => !c.resolution).length,
      is_syncing: this.isSyncingState,
      is_online: this.isOnlineState,
      total_operations: operations.length,
      failed_operations: operations.filter((op) => op.status === "failed").length,
    };
  }

  // -------------------------------------------------------------------------
  // Auto Sync
  // -------------------------------------------------------------------------

  startAutoSync(intervalMs?: number): void {
    this.stopAutoSync();

    const interval = intervalMs || this.config.autoSyncIntervalMs;
    this.autoSyncTimer = setInterval(async () => {
      if (this.isOnlineState && !this.isSyncingState) {
        try {
          await this.sync();
        } catch (error) {
          console.error("[SyncManager] Auto sync failed:", error);
        }
      }
    }, interval);

    console.log(`[SyncManager] Auto sync started with ${interval}ms interval`);
  }

  stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
      console.log("[SyncManager] Auto sync stopped");
    }
  }

  // -------------------------------------------------------------------------
  // Data Export / Import
  // -------------------------------------------------------------------------

  async exportData(doctypes?: string[]): Promise<ExportData> {
    const operations = await this.storage.getAllOperations();
    const conflicts = await this.storage.getAllConflicts();

    const exportData: ExportData = {
      version: "1.0.0",
      timestamp: Date.now(),
      doctypes: {},
      operations,
      conflicts,
    };

    for (const doctype of doctypes || []) {
      exportData.doctypes[doctype] = [];
    }

    return exportData;
  }

  async importData(data: ExportData): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    for (const operation of data.operations) {
      const existing = await this.storage.getOperation(operation.id);
      if (!existing) {
        await this.storage.saveOperation(operation);
        imported++;
      } else {
        skipped++;
      }
    }

    for (const conflict of data.conflicts) {
      await this.storage.saveConflict(conflict);
    }

    console.log(`[SyncManager] Import complete: ${imported} imported, ${skipped} skipped`);
    return { imported, skipped };
  }

  async createBackup(): Promise<ExportData> {
    const backup = await this.exportData();
    await this.storage.saveBackup(backup);
    console.log(`[SyncManager] Backup created at ${new Date(backup.timestamp).toISOString()}`);
    return backup;
  }

  async restoreBackup(backupId?: string): Promise<boolean> {
    const backups = await this.storage.getBackups();
    const backup = backupId
      ? backups.find((b) => `backup_${b.timestamp}` === backupId)
      : backups[backups.length - 1];

    if (!backup) {
      console.warn("[SyncManager] No backup found to restore");
      return false;
    }

    await this.importData(backup);
    console.log(`[SyncManager] Backup restored from ${new Date(backup.timestamp).toISOString()}`);
    return true;
  }

  async getBackups(): Promise<ExportData[]> {
    return this.storage.getBackups();
  }

  // -------------------------------------------------------------------------
  // Cleanup & Destroy
  // -------------------------------------------------------------------------

  async clearAllData(): Promise<void> {
    await this.storage.close();
    this.stopAutoSync();
    this.retryTimers.forEach((timer) => clearTimeout(timer));
    this.retryTimers.clear();
  }

  async destroy(): Promise<void> {
    this.stopAutoSync();
    this.abortController?.abort();
    this.retryTimers.forEach((timer) => clearTimeout(timer));
    this.retryTimers.clear();
    await this.storage.close();
    console.log("[SyncManager] Destroyed");
  }

  // -------------------------------------------------------------------------
  // Utility Methods
  // -------------------------------------------------------------------------

  private generateId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

export default SyncManager;
