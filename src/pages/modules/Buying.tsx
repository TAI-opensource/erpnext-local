import { useState } from "react"
import { useNavigate, useLocation } from "react-router"
import { useFrappeGetDocList } from "frappe-react-sdk"
import { ModuleLayout } from "@/components/ui/module-layout"
import { ListView } from "@/components/ui/list-view"
import type { ColumnDef } from "@tanstack/react-table"
import { useAtom } from "jotai"
import { selectedCompanyAtom } from "@/hooks/useCurrentCompany"
import {
  Truck,
  FileText,
  ShoppingCart,
  PackageCheck,
  ClipboardList,
} from "lucide-react"

type Supplier = {
  name: string
  supplier_name: string
  supplier_group: string
}

type PurchaseInvoice = {
  name: string
  supplier: string
  grand_total: number
  status: string
  posting_date: string
}

type PurchaseOrder = {
  name: string
  supplier: string
  grand_total: number
  status: string
  transaction_date: string
}

type PurchaseReceipt = {
  name: string
  supplier: string
  status: string
  posting_date: string
}

type MaterialRequest = {
  name: string
  material_request_type: string
  status: string
  transaction_date: string
}

const supplierColumns: ColumnDef<Supplier, unknown>[] = [
  { accessorKey: "name", header: "ID", size: 200 },
  { accessorKey: "supplier_name", header: "Supplier Name", size: 250 },
  { accessorKey: "supplier_group", header: "Group", size: 180 },
]

const purchaseInvoiceColumns: ColumnDef<PurchaseInvoice, unknown>[] = [
  { accessorKey: "name", header: "ID", size: 200 },
  { accessorKey: "supplier", header: "Supplier", size: 250 },
  {
    accessorKey: "grand_total",
    header: "Amount",
    size: 150,
    meta: { align: "right", tabularNums: true },
  },
  { accessorKey: "status", header: "Status", size: 130 },
  { accessorKey: "posting_date", header: "Date", size: 130 },
]

const purchaseOrderColumns: ColumnDef<PurchaseOrder, unknown>[] = [
  { accessorKey: "name", header: "ID", size: 200 },
  { accessorKey: "supplier", header: "Supplier", size: 250 },
  {
    accessorKey: "grand_total",
    header: "Amount",
    size: 150,
    meta: { align: "right", tabularNums: true },
  },
  { accessorKey: "status", header: "Status", size: 130 },
  { accessorKey: "transaction_date", header: "Date", size: 130 },
]

const purchaseReceiptColumns: ColumnDef<PurchaseReceipt, unknown>[] = [
  { accessorKey: "name", header: "ID", size: 200 },
  { accessorKey: "supplier", header: "Supplier", size: 250 },
  { accessorKey: "status", header: "Status", size: 130 },
  { accessorKey: "posting_date", header: "Date", size: 130 },
]

const materialRequestColumns: ColumnDef<MaterialRequest, unknown>[] = [
  { accessorKey: "name", header: "ID", size: 200 },
  { accessorKey: "material_request_type", header: "Type", size: 200 },
  { accessorKey: "status", header: "Status", size: 130 },
  { accessorKey: "transaction_date", header: "Date", size: 130 },
]

const sidebarItems = [
  { label: "Supplier", route: "/app/buying/supplier", icon: <Truck className="h-4 w-4" /> },
  { label: "Purchase Invoice", route: "/app/buying/purchase-invoice", icon: <FileText className="h-4 w-4" /> },
  { label: "Purchase Order", route: "/app/buying/purchase-order", icon: <ShoppingCart className="h-4 w-4" /> },
  { label: "Purchase Receipt", route: "/app/buying/purchase-receipt", icon: <PackageCheck className="h-4 w-4" /> },
  { label: "Material Request", route: "/app/buying/material-request", icon: <ClipboardList className="h-4 w-4" /> },
]

type DocType = "supplier" | "purchase-invoice" | "purchase-order" | "purchase-receipt" | "material-request"

function getDocType(pathname: string): DocType {
  if (pathname.includes("purchase-invoice")) return "purchase-invoice"
  if (pathname.includes("purchase-order")) return "purchase-order"
  if (pathname.includes("purchase-receipt")) return "purchase-receipt"
  if (pathname.includes("material-request")) return "material-request"
  return "supplier"
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
          <PackageCheck className="h-8 w-8 text-ink-gray-4" />
          <span className="text-sm">{emptyMessage}</span>
        </div>
      }
    />
  )
}

export default function Buying() {
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedCompany] = useAtom(selectedCompanyAtom)

  const docType = getDocType(location.pathname)

  const { data: suppliers, isLoading: loadingSuppliers } =
    useFrappeGetDocList<Supplier>("Supplier", {
      fields: ["name", "supplier_name", "supplier_group"],
      limit_page_length: 50,
      order_by: "creation desc",
    })

  const { data: purchaseInvoices, isLoading: loadingPI } =
    useFrappeGetDocList<PurchaseInvoice>("Purchase Invoice", {
      fields: ["name", "supplier", "grand_total", "status", "posting_date"],
      filters: [["company", "=", selectedCompany]],
      limit_page_length: 50,
      order_by: "creation desc",
    })

  const { data: purchaseOrders, isLoading: loadingPO } =
    useFrappeGetDocList<PurchaseOrder>("Purchase Order", {
      fields: ["name", "supplier", "grand_total", "status", "transaction_date"],
      filters: [["company", "=", selectedCompany]],
      limit_page_length: 50,
      order_by: "creation desc",
    })

  const { data: purchaseReceipts, isLoading: loadingPR } =
    useFrappeGetDocList<PurchaseReceipt>("Purchase Receipt", {
      fields: ["name", "supplier", "status", "posting_date"],
      filters: [["company", "=", selectedCompany]],
      limit_page_length: 50,
      order_by: "creation desc",
    })

  const { data: materialRequests, isLoading: loadingMR } =
    useFrappeGetDocList<MaterialRequest>("Material Request", {
      fields: ["name", "material_request_type", "status", "transaction_date"],
      limit_page_length: 50,
      order_by: "creation desc",
    })

  return (
    <ModuleLayout
      title="Buying"
      subtitle="Purchase management"
      icon={<PackageCheck className="h-5 w-5" />}
      sidebarItems={sidebarItems}
      activeRoute={location.pathname}
    >
      {docType === "supplier" && (
        <ListViewSection
          data={suppliers}
          isLoading={loadingSuppliers}
          columns={supplierColumns}
          emptyMessage="No suppliers found"
        />
      )}

      {docType === "purchase-invoice" && (
        <ListViewSection
          data={purchaseInvoices}
          isLoading={loadingPI}
          columns={purchaseInvoiceColumns}
          emptyMessage="No purchase invoices found"
        />
      )}

      {docType === "purchase-order" && (
        <ListViewSection
          data={purchaseOrders}
          isLoading={loadingPO}
          columns={purchaseOrderColumns}
          emptyMessage="No purchase orders found"
        />
      )}

      {docType === "purchase-receipt" && (
        <ListViewSection
          data={purchaseReceipts}
          isLoading={loadingPR}
          columns={purchaseReceiptColumns}
          emptyMessage="No purchase receipts found"
        />
      )}

      {docType === "material-request" && (
        <ListViewSection
          data={materialRequests}
          isLoading={loadingMR}
          columns={materialRequestColumns}
          emptyMessage="No material requests found"
        />
      )}
    </ModuleLayout>
  )
}
