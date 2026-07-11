import { useState } from "react"
import { useNavigate, useLocation } from "react-router"
import { useFrappeGetDocList } from "frappe-react-sdk"
import { ModuleLayout } from "@/components/ui/module-layout"
import { ListView } from "@/components/ui/list-view"
import type { ColumnDef } from "@tanstack/react-table"
import { useAtom } from "jotai"
import { selectedCompanyAtom } from "@/hooks/useCurrentCompany"
import {
  Warehouse,
  Package,
  ArrowLeftRight,
  BookOpen,
  RotateCcw,
  FlaskConical,
} from "lucide-react"

type WarehouseType = {
  name: string
  warehouse_name: string
  warehouse_type: string
  company: string
}

type Item = {
  name: string
  item_name: string
  item_group: string
  stock_uom: string
}

type StockEntry = {
  name: string
  stock_entry_type: string
  posting_date: string
  total_amount: number
  status: string
}

type StockLedgerEntry = {
  name: string
  item_code: string
  warehouse: string
  actual_qty: number
  posting_date: string
}

type StockReconciliation = {
  name: string
  purpose: string
  posting_date: string
  status: string
}

type Batch = {
  name: string
  batch_id: string
  item: string
  expiry_date: string
}

const warehouseColumns: ColumnDef<WarehouseType, unknown>[] = [
  { accessorKey: "name", header: "ID", size: 200 },
  { accessorKey: "warehouse_name", header: "Warehouse Name", size: 250 },
  { accessorKey: "warehouse_type", header: "Type", size: 150 },
  { accessorKey: "company", header: "Company", size: 200 },
]

const itemColumns: ColumnDef<Item, unknown>[] = [
  { accessorKey: "name", header: "ID", size: 200 },
  { accessorKey: "item_name", header: "Item Name", size: 250 },
  { accessorKey: "item_group", header: "Group", size: 180 },
  { accessorKey: "stock_uom", header: "UOM", size: 120 },
]

const stockEntryColumns: ColumnDef<StockEntry, unknown>[] = [
  { accessorKey: "name", header: "ID", size: 200 },
  { accessorKey: "stock_entry_type", header: "Type", size: 180 },
  { accessorKey: "posting_date", header: "Date", size: 130 },
  {
    accessorKey: "total_amount",
    header: "Amount",
    size: 150,
    meta: { align: "right", tabularNums: true },
  },
  { accessorKey: "status", header: "Status", size: 130 },
]

const stockLedgerColumns: ColumnDef<StockLedgerEntry, unknown>[] = [
  { accessorKey: "name", header: "ID", size: 200 },
  { accessorKey: "item_code", header: "Item", size: 200 },
  { accessorKey: "warehouse", header: "Warehouse", size: 200 },
  {
    accessorKey: "actual_qty",
    header: "Qty",
    size: 120,
    meta: { align: "right", tabularNums: true },
  },
  { accessorKey: "posting_date", header: "Date", size: 130 },
]

const stockReconciliationColumns: ColumnDef<StockReconciliation, unknown>[] = [
  { accessorKey: "name", header: "ID", size: 200 },
  { accessorKey: "purpose", header: "Purpose", size: 200 },
  { accessorKey: "posting_date", header: "Date", size: 130 },
  { accessorKey: "status", header: "Status", size: 130 },
]

const batchColumns: ColumnDef<Batch, unknown>[] = [
  { accessorKey: "name", header: "ID", size: 200 },
  { accessorKey: "batch_id", header: "Batch ID", size: 200 },
  { accessorKey: "item", header: "Item", size: 200 },
  { accessorKey: "expiry_date", header: "Expiry", size: 130 },
]

const sidebarItems = [
  { label: "Warehouse", route: "/app/stock/warehouse", icon: <Warehouse className="h-4 w-4" /> },
  { label: "Item", route: "/app/stock/item", icon: <Package className="h-4 w-4" /> },
  { label: "Stock Entry", route: "/app/stock/stock-entry", icon: <ArrowLeftRight className="h-4 w-4" /> },
  { label: "Stock Ledger", route: "/app/stock/stock-ledger", icon: <BookOpen className="h-4 w-4" /> },
  { label: "Stock Reconciliation", route: "/app/stock/stock-reconciliation", icon: <RotateCcw className="h-4 w-4" /> },
  { label: "Batch", route: "/app/stock/batch", icon: <FlaskConical className="h-4 w-4" /> },
]

type DocType = "warehouse" | "item" | "stock-entry" | "stock-ledger" | "stock-reconciliation" | "batch"

function getDocType(pathname: string): DocType {
  if (pathname.includes("item") && !pathname.includes("stock")) return "item"
  if (pathname.includes("stock-entry")) return "stock-entry"
  if (pathname.includes("stock-ledger")) return "stock-ledger"
  if (pathname.includes("stock-reconciliation")) return "stock-reconciliation"
  if (pathname.includes("batch")) return "batch"
  return "warehouse"
}

function ListViewSection<T extends Record<string, unknown>>({
  data,
  isLoading,
  columns,
  emptyMessage,
}: {
  data: T[] | undefined
  isLoading: boolean
  columns: ColumnDef<T, unknown>[]
  emptyMessage: string
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-ink-gray-5">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-outline-gray-2 border-t-ink-gray-8" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <ListView
      data={data ?? []}
      columns={columns}
      emptyState={
        <div className="flex flex-col items-center gap-2 py-8 text-ink-gray-5">
          <Warehouse className="h-8 w-8 text-ink-gray-4" />
          <span className="text-sm">{emptyMessage}</span>
        </div>
      }
    />
  )
}

export default function Stock() {
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedCompany] = useAtom(selectedCompanyAtom)

  const docType = getDocType(location.pathname)

  const { data: warehouses, isLoading: loadingWarehouses } =
    useFrappeGetDocList<WarehouseType>("Warehouse", {
      fields: ["name", "warehouse_name", "warehouse_type", "company"],
      filters: [["company", "=", selectedCompany]],
      limit_page_length: 50,
      order_by: "creation desc",
    })

  const { data: items, isLoading: loadingItems } =
    useFrappeGetDocList<Item>("Item", {
      fields: ["name", "item_name", "item_group", "stock_uom"],
      limit_page_length: 50,
      order_by: "creation desc",
    })

  const { data: stockEntries, isLoading: loadingSE } =
    useFrappeGetDocList<StockEntry>("Stock Entry", {
      fields: ["name", "stock_entry_type", "posting_date", "total_amount", "status"],
      filters: [["company", "=", selectedCompany]],
      limit_page_length: 50,
      order_by: "creation desc",
    })

  const { data: stockLedgerEntries, isLoading: loadingSLE } =
    useFrappeGetDocList<StockLedgerEntry>("Stock Ledger Entry", {
      fields: ["name", "item_code", "warehouse", "actual_qty", "posting_date"],
      limit_page_length: 50,
      order_by: "posting_date desc",
    })

  const { data: stockReconciliations, isLoading: loadingSR } =
    useFrappeGetDocList<StockReconciliation>("Stock Reconciliation", {
      fields: ["name", "purpose", "posting_date", "status"],
      filters: [["company", "=", selectedCompany]],
      limit_page_length: 50,
      order_by: "creation desc",
    })

  const { data: batches, isLoading: loadingBatches } =
    useFrappeGetDocList<Batch>("Batch", {
      fields: ["name", "batch_id", "item", "expiry_date"],
      limit_page_length: 50,
      order_by: "creation desc",
    })

  return (
    <ModuleLayout
      title="Stock"
      subtitle="Inventory management"
      icon={<Warehouse className="h-5 w-5" />}
      sidebarItems={sidebarItems}
      activeRoute={location.pathname}
    >
      {docType === "warehouse" && (
        <ListViewSection
          data={warehouses}
          isLoading={loadingWarehouses}
          columns={warehouseColumns}
          emptyMessage="No warehouses found"
        />
      )}

      {docType === "item" && (
        <ListViewSection
          data={items}
          isLoading={loadingItems}
          columns={itemColumns}
          emptyMessage="No items found"
        />
      )}

      {docType === "stock-entry" && (
        <ListViewSection
          data={stockEntries}
          isLoading={loadingSE}
          columns={stockEntryColumns}
          emptyMessage="No stock entries found"
        />
      )}

      {docType === "stock-ledger" && (
        <ListViewSection
          data={stockLedgerEntries}
          isLoading={loadingSLE}
          columns={stockLedgerColumns}
          emptyMessage="No stock ledger entries found"
        />
      )}

      {docType === "stock-reconciliation" && (
        <ListViewSection
          data={stockReconciliations}
          isLoading={loadingSR}
          columns={stockReconciliationColumns}
          emptyMessage="No stock reconciliations found"
        />
      )}

      {docType === "batch" && (
        <ListViewSection
          data={batches}
          isLoading={loadingBatches}
          columns={batchColumns}
          emptyMessage="No batches found"
        />
      )}
    </ModuleLayout>
  )
}
