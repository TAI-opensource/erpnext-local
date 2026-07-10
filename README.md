# ERPNext Local

ERPNext funcionando 100% local no navegador usando **SQLite WASM** + **IndexedDB**.

## Stack

- **SQLite WASM** (sql.js) - Engine SQL completa no browser
- **IndexedDB** (Dexie.js) - Persistência offline
- **React 19** + TypeScript
- **Tailwind CSS 4**
- **Vite 8**

## Funcionalidades

- ✅ 156 tabelas (todos os 21 módulos do ERPNext)
- ✅ 30+ handlers de API reais
- ✅ Autenticação local (JWT + PBKDF2)
- ✅ Sistema de permissões por role
- ✅ Seed data com 100+ registros iniciais
- ✅ WAL mode para performance
- ✅ FTS5 para busca full-text
- ✅ Batch operations
- ✅ Query cache LRU
- ✅ Sync offline/online

## Como Rodar

```bash
# Instalar dependências
yarn install

# Modo desenvolvimento local
yarn dev:local

# Build para produção
yarn build:local
```

## Login

- **Email:** admin@erpnext.local
- **Senha:** admin

## Deploy na Vercel

1. Importe o repositório na Vercel
2. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `yarn build:local`
   - **Output Directory:** `dist-local`
   - **Install Command:** `yarn install`
3. Deploy!

## Arquitetura

```
banking/src/
├── backend/
│   ├── sqlite-engine.ts      # SQLite WASM
│   ├── indexeddb-store.ts     # IndexedDB
│   ├── database-manager.ts    # Orchestration
│   ├── auth.ts                # Auth local
│   ├── api-handler.ts         # API Handler
│   ├── api-handlers-real.ts   # 30+ handlers reais
│   └── schemas/               # 156 tabelas
├── frappe-react-sdk-local.ts  # Shim frappe-react-sdk
├── hooks-local.ts             # Hooks React
├── App-local.tsx              # App principal
└── main-local.ts              # Entry point
```

## Licença

GPLv3
