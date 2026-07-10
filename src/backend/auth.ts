import Dexie, { type Table } from "dexie";

// ============================================================
// Models
// ============================================================

export interface User {
  name: string;
  email: string;
  full_name: string;
  roles: string[];
  is_active: boolean;
  company: string | null;
  password_hash: string;
  creation: string;
  modified: string;
}

export interface Role {
  name: string;
  permissions: Permission[];
}

export interface Permission {
  doctype: string;
  read: boolean;
  write: boolean;
  create: boolean;
  delete: boolean;
  submit: boolean;
  cancel: boolean;
  report: boolean;
}

export interface Session {
  user_id: string;
  token: string;
  expires_at: number;
  created_at: number;
}

// ============================================================
// IndexedDB via Dexie
// ============================================================

class AuthDatabase extends Dexie {
  users!: Table<User>;
  roles!: Table<Role>;
  sessions!: Table<Session>;

  constructor() {
    super("ERPNextBankingAuth");
    this.version(1).stores({
      users: "email, name",
      roles: "name",
      sessions: "token, user_id",
    });
  }
}

const db = new AuthDatabase();

// ============================================================
// Password hashing (Web Crypto API — zero dependencies)
// ============================================================

const SALT_LENGTH = 16;
const HASH_LENGTH = 64;
const ITERATIONS = 100_000;
const ALGO = "PBKDF2";
const DIGEST = "SHA-256";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    ALGO,
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: ALGO, salt, iterations: ITERATIONS, hash: DIGEST },
    keyMaterial,
    HASH_LENGTH * 8
  );
  return `${toHex(salt)}:${toHex(derivedBits)}`;
}

async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  const salt = fromHex(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    ALGO,
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: ALGO, salt, iterations: ITERATIONS, hash: DIGEST },
    keyMaterial,
    HASH_LENGTH * 8
  );
  return toHex(derivedBits) === hashHex;
}

// ============================================================
// Simple local JWT-like token (base64url — no external lib)
// ============================================================

function base64UrlEncode(data: string): string {
  return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(data: string): string {
  let base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return atob(base64);
}

function generateToken(payload: Record<string, unknown>): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  // Simple signing — not cryptographic-grade, sufficient for local-only tokens
  const signature = base64UrlEncode(`${header}.${body}.erpnext-local-secret`);
  return `${header}.${body}.${signature}`;
}

function decodeToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    const expectedSig = base64UrlEncode(
      `${parts[0]}.${parts[1]}.erpnext-local-secret`
    );
    if (parts[2] !== expectedSig) return null;
    if (typeof payload.exp === "number" && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ============================================================
// Default Roles & Permissions
// ============================================================

const DEFAULT_ROLES: Role[] = [
  {
    name: "Administrator",
    permissions: [
      {
        doctype: "*",
        read: true,
        write: true,
        create: true,
        delete: true,
        submit: true,
        cancel: true,
        report: true,
      },
    ],
  },
  {
    name: "System Manager",
    permissions: [
      {
        doctype: "*",
        read: true,
        write: true,
        create: true,
        delete: true,
        submit: true,
        cancel: true,
        report: true,
      },
    ],
  },
  {
    name: "Sales User",
    permissions: [
      {
        doctype: "Customer",
        read: true,
        write: true,
        create: true,
        delete: false,
        submit: false,
        cancel: false,
        report: true,
      },
      {
        doctype: "Quotation",
        read: true,
        write: true,
        create: true,
        delete: false,
        submit: true,
        cancel: true,
        report: true,
      },
      {
        doctype: "Sales Order",
        read: true,
        write: true,
        create: true,
        delete: false,
        submit: true,
        cancel: true,
        report: true,
      },
      {
        doctype: "Sales Invoice",
        read: true,
        write: true,
        create: true,
        delete: false,
        submit: true,
        cancel: true,
        report: true,
      },
      {
        doctype: "Item",
        read: true,
        write: false,
        create: false,
        delete: false,
        submit: false,
        cancel: false,
        report: true,
      },
    ],
  },
  {
    name: "Purchase User",
    permissions: [
      {
        doctype: "Supplier",
        read: true,
        write: true,
        create: true,
        delete: false,
        submit: false,
        cancel: false,
        report: true,
      },
      {
        doctype: "Purchase Order",
        read: true,
        write: true,
        create: true,
        delete: false,
        submit: true,
        cancel: true,
        report: true,
      },
      {
        doctype: "Purchase Invoice",
        read: true,
        write: true,
        create: true,
        delete: false,
        submit: true,
        cancel: true,
        report: true,
      },
      {
        doctype: "Item",
        read: true,
        write: false,
        create: false,
        delete: false,
        submit: false,
        cancel: false,
        report: true,
      },
    ],
  },
  {
    name: "Stock User",
    permissions: [
      {
        doctype: "Item",
        read: true,
        write: true,
        create: true,
        delete: false,
        submit: false,
        cancel: false,
        report: true,
      },
      {
        doctype: "Warehouse",
        read: true,
        write: true,
        create: true,
        delete: false,
        submit: false,
        cancel: false,
        report: true,
      },
      {
        doctype: "Stock Entry",
        read: true,
        write: true,
        create: true,
        delete: false,
        submit: true,
        cancel: true,
        report: true,
      },
      {
        doctype: "Stock Ledger Entry",
        read: true,
        write: false,
        create: false,
        delete: false,
        submit: false,
        cancel: false,
        report: true,
      },
    ],
  },
  {
    name: "Accounts User",
    permissions: [
      {
        doctype: "Sales Invoice",
        read: true,
        write: true,
        create: true,
        delete: false,
        submit: true,
        cancel: true,
        report: true,
      },
      {
        doctype: "Purchase Invoice",
        read: true,
        write: true,
        create: true,
        delete: false,
        submit: true,
        cancel: true,
        report: true,
      },
      {
        doctype: "Payment Entry",
        read: true,
        write: true,
        create: true,
        delete: false,
        submit: true,
        cancel: true,
        report: true,
      },
      {
        doctype: "Journal Entry",
        read: true,
        write: true,
        create: true,
        delete: false,
        submit: true,
        cancel: true,
        report: true,
      },
      {
        doctype: "Account",
        read: true,
        write: true,
        create: true,
        delete: false,
        submit: false,
        cancel: false,
        report: true,
      },
    ],
  },
];

const DEFAULT_ADMIN: Omit<User, "password_hash"> = {
  name: "Administrator",
  email: "admin@erpnext.local",
  full_name: "Administrator",
  roles: ["Administrator", "System Manager"],
  is_active: true,
  company: null,
  creation: new Date().toISOString(),
  modified: new Date().toISOString(),
};

// ============================================================
// LocalAuth
// ============================================================

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const REFRESH_THRESHOLD_MS = 4 * 60 * 60 * 1000; // refresh if < 4h left

export class LocalAuth {
  private _currentUser: User | null = null;
  private _currentToken: string | null = null;
  private _initialized = false;

  // ----------------------------------------------------------
  // init
  // ----------------------------------------------------------
  async init(): Promise<void> {
    if (this._initialized) return;

    // Seed default roles
    const roleCount = await db.roles.count();
    if (roleCount === 0) {
      await db.roles.bulkAdd(DEFAULT_ROLES);
    }

    // Seed admin user
    const adminExists = await db.users.get(DEFAULT_ADMIN.email);
    if (!adminExists) {
      const hash = await hashPassword("admin");
      const adminUser: User = { ...DEFAULT_ADMIN, password_hash: hash };
      await db.users.add(adminUser);
    }

    // Restore session from storage
    await this._restoreSession();
    this._initialized = true;
  }

  // ----------------------------------------------------------
  // createUser
  // ----------------------------------------------------------
  async createUser(
    userData: Omit<User, "password_hash" | "creation" | "modified"> & {
      password: string;
    }
  ): Promise<User> {
    const existing = await db.users.get(userData.email);
    if (existing) {
      throw new Error(`User with email ${userData.email} already exists`);
    }

    const password_hash = await hashPassword(userData.password);
    const now = new Date().toISOString();
    const user: User = {
      name: userData.name,
      email: userData.email,
      full_name: userData.full_name,
      roles: userData.roles,
      is_active: userData.is_active ?? true,
      company: userData.company ?? null,
      password_hash,
      creation: now,
      modified: now,
    };

    await db.users.add(user);
    return this._sanitize(user);
  }

  // ----------------------------------------------------------
  // login
  // ----------------------------------------------------------
  async login(
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> {
    const user = await db.users.get(email);
    if (!user) throw new Error("Invalid email or password");
    if (!user.is_active) throw new Error("Account is deactivated");

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) throw new Error("Invalid email or password");

    const now = Date.now();
    const token = generateToken({
      sub: user.email,
      name: user.name,
      roles: user.roles,
      iat: now,
      exp: now + TOKEN_EXPIRY_MS,
    });

    const session: Session = {
      user_id: user.email,
      token,
      expires_at: now + TOKEN_EXPIRY_MS,
      created_at: now,
    };

    await db.sessions.put(session);
    this._currentUser = user;
    this._currentToken = token;
    this._persistSession();

    return { user: this._sanitize(user), token };
  }

  // ----------------------------------------------------------
  // logout
  // ----------------------------------------------------------
  async logout(): Promise<void> {
    if (this._currentToken) {
      await db.sessions.delete(this._currentToken);
    }
    this._currentUser = null;
    this._currentToken = null;
    this._clearPersistedSession();
  }

  // ----------------------------------------------------------
  // getCurrentUser
  // ----------------------------------------------------------
  getCurrentUser(): User | null {
    return this._currentUser ? this._sanitize(this._currentUser) : null;
  }

  // ----------------------------------------------------------
  // isAuthenticated
  // ----------------------------------------------------------
  isAuthenticated(): boolean {
    if (!this._currentUser || !this._currentToken) return false;
    const payload = decodeToken(this._currentToken);
    return payload !== null;
  }

  // ----------------------------------------------------------
  // hasPermission
  // ----------------------------------------------------------
  async hasPermission(
    doctype: string,
    action: keyof Omit<Permission, "doctype">
  ): Promise<boolean> {
    if (!this._currentUser) return false;
    const roles = await this._getRoleObjects(this._currentUser.roles);

    for (const role of roles) {
      for (const perm of role.permissions) {
        if (perm.doctype === "*" || perm.doctype === doctype) {
          if (perm[action]) return true;
        }
      }
    }
    return false;
  }

  // ----------------------------------------------------------
  // getUserRoles
  // ----------------------------------------------------------
  getUserRoles(): string[] {
    return this._currentUser?.roles ?? [];
  }

  // ----------------------------------------------------------
  // setDefaultCompany
  // ----------------------------------------------------------
  async setDefaultCompany(company: string): Promise<void> {
    if (!this._currentUser) throw new Error("Not authenticated");
    this._currentUser.company = company;
    this._currentUser.modified = new Date().toISOString();
    await db.users.put(this._currentUser);
  }

  // ----------------------------------------------------------
  // getDefaultCompany
  // ----------------------------------------------------------
  getDefaultCompany(): string | null {
    return this._currentUser?.company ?? null;
  }

  // ----------------------------------------------------------
  // updateProfile
  // ----------------------------------------------------------
  async updateProfile(
    userData: Partial<Pick<User, "full_name" | "roles" | "company">> & {
      email?: string;
    }
  ): Promise<User> {
    if (!this._currentUser) throw new Error("Not authenticated");

    if (userData.email && userData.email !== this._currentUser.email) {
      const exists = await db.users.get(userData.email);
      if (exists) throw new Error("Email already in use");

      await db.sessions.delete(this._currentToken!);
      await db.users.delete(this._currentUser.email);
      this._currentUser.email = userData.email;
      this._currentUser.name = userData.name ?? this._currentUser.name;
    }

    if (userData.full_name !== undefined)
      this._currentUser.full_name = userData.full_name;
    if (userData.roles !== undefined) this._currentUser.roles = userData.roles;
    if (userData.company !== undefined)
      this._currentUser.company = userData.company;
    this._currentUser.modified = new Date().toISOString();

    await db.users.put(this._currentUser);

    if (userData.email) {
      const token = generateToken({
        sub: this._currentUser.email,
        name: this._currentUser.name,
        roles: this._currentUser.roles,
        iat: Date.now(),
        exp: Date.now() + TOKEN_EXPIRY_MS,
      });
      const session: Session = {
        user_id: this._currentUser.email,
        token,
        expires_at: Date.now() + TOKEN_EXPIRY_MS,
        created_at: Date.now(),
      };
      await db.sessions.put(session);
      this._currentToken = token;
      this._persistSession();
    }

    return this._sanitize(this._currentUser);
  }

  // ----------------------------------------------------------
  // changePassword
  // ----------------------------------------------------------
  async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    if (!this._currentUser) throw new Error("Not authenticated");

    const valid = await verifyPassword(oldPassword, this._currentUser.password_hash);
    if (!valid) throw new Error("Current password is incorrect");

    this._currentUser.password_hash = await hashPassword(newPassword);
    this._currentUser.modified = new Date().toISOString();
    await db.users.put(this._currentUser);
  }

  // ----------------------------------------------------------
  // Internal helpers
  // ----------------------------------------------------------

  private _sanitize(user: User): User {
    const { password_hash, ...safe } = user;
    return safe;
  }

  private async _getRoleObjects(roleNames: string[]): Promise<Role[]> {
    const roles: Role[] = [];
    for (const name of roleNames) {
      const role = await db.roles.get(name);
      if (role) roles.push(role);
    }
    return roles;
  }

  private async _restoreSession(): Promise<void> {
    try {
      const raw = localStorage.getItem("erpnext_auth_session");
      if (!raw) return;

      const { token, user_id } = JSON.parse(raw) as {
        token: string;
        user_id: string;
      };

      const payload = decodeToken(token);
      if (!payload) {
        this._clearPersistedSession();
        return;
      }

      // Auto-refresh if close to expiry
      const remaining = (payload.exp as number) - Date.now();
      if (remaining < REFRESH_THRESHOLD_MS && remaining > 0) {
        const user = await db.users.get(user_id);
        if (user && user.is_active) {
          const newToken = generateToken({
            sub: user.email,
            name: user.name,
            roles: user.roles,
            iat: Date.now(),
            exp: Date.now() + TOKEN_EXPIRY_MS,
          });
          const session: Session = {
            user_id: user.email,
            token: newToken,
            expires_at: Date.now() + TOKEN_EXPIRY_MS,
            created_at: Date.now(),
          };
          await db.sessions.put(session);
          this._currentToken = newToken;
          this._currentUser = user;
          this._persistSession();
          return;
        }
      }

      const user = await db.users.get(user_id);
      if (user && user.is_active) {
        this._currentUser = user;
        this._currentToken = token;
      } else {
        this._clearPersistedSession();
      }
    } catch {
      this._clearPersistedSession();
    }
  }

  private _persistSession(): void {
    if (this._currentToken && this._currentUser) {
      localStorage.setItem(
        "erpnext_auth_session",
        JSON.stringify({
          token: this._currentToken,
          user_id: this._currentUser.email,
        })
      );
    }
  }

  private _clearPersistedSession(): void {
    localStorage.removeItem("erpnext_auth_session");
  }
}

// ============================================================
// Singleton export
// ============================================================

export const auth = new LocalAuth();
