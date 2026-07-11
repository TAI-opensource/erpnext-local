import { useLocation } from "react-router"
import { useFrappeGetDocList } from "frappe-react-sdk"
import { ModuleLayout } from "@/components/ui/module-layout"
import { ListView } from "@/components/ui/list-view"
import type { ColumnDef } from "@tanstack/react-table"
import { useAtom } from "jotai"
import { selectedCompanyAtom } from "@/hooks/useCurrentCompany"
import {
  Users,
  FileText,
  ShoppingCart,
  FileEdit,
  BarChart3,
} from "lucide-react"

const sidebarItems = [
  { label: "Customer", route: "/modules/selling/customer", icon: <Users className="h-4 w-4" /> },
  { label: "Sales Invoice", route: "/modules/selling/sales-invoice", icon: <FileText className="h-4 w-4" /> },
  { label: "Sales Order", route: "/modules/selling/sales-order", icon: <ShoppingCart className="h-4 w-4" /> },
  { label: "Quotation", route: "/modules/selling/quotation", icon: <FileEdit className="h-4 w-4" /> },
  { label: "Sales Analytics", route: "/modules/selling/sales-analytics", icon: <BarChart3 className="h-4 w-4" /> },
]

const customerColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "customer_name", header: "Customer Name" },
  { accessorKey: "customer_group", header: "Customer Group" },
  { accessorKey: "territory", header: "Territory" },
]

const salesInvoiceColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "customer", header: "Customer" },
  { accessorKey: "posting_date", header: "Posting Date" },
  { accessorKey: "grand_total", header: "Grand Total" },
  { accessorKey: "status", header: "Status" },
]

const salesOrderColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "customer", header: "Customer" },
  { accessorKey: "transaction_date", header: "Date" },
  { accessorKey: "grand_total", header: "Grand Total" },
  { accessorKey: "status", header: "Status" },
]

const quotationColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "customer", header: "Customer" },
  { accessorKey: "transaction_date", header: "Date" },
  { accessorKey: "grand_total", header: "Grand Total" },
  { accessorKey: "status", header: "Status" },
]

const docTypeConfig: Record<
  string,
  { doctype: string; fields: string[]; columns: ColumnDef<any, any>[]; label: string }
> = {
  customer: {
    doctype: "Customer",
    fields: ["name", "customer_name", "customer_group", "territory"],
    columns: customerColumns,
    label: "Customer",
  },
  "sales-invoice": {
    doctype: "Sales Invoice",
    fields: ["name", "customer", "posting_date", "grand_total", "status"],
    columns: salesInvoiceColumns,
    label: "Sales Invoice",
  },
  "sales-order": {
    doctype: "Sales Order",
    fields: ["name", "customer", "transaction_date", "grand_total", "status"],
    columns: salesOrderColumns,
    label: "Sales Order",
  },
  quotation: {
    doctype: "Quotation",
    fields: ["name", "customer", "transaction_date", "grand_total", "status"],
    columns: quotationColumns,
    label: "Quotation",
  },
}

export default function Selling() {
  const location = useLocation()
  const [selectedCompany] = useAtom(selectedCompanyAtom)
  const pathParts = location.pathname.split("/")
  const activeKey = pathParts[pathParts.length - 1] || "customer"
  const activeRoute = `/modules/selling/${activeKey}`

  if (activeKey === "sales-analytics") {
    return (
      <ModuleLayout
        title="Selling"
        icon={<ShoppingCart className="h-4 w-4" />}
        sidebarItems={sidebarItems}
        activeRoute={activeRoute}
      >
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <BarChart3 className="mb-3 h-10 w-10 text-ink-gray-4" />
          <p className="text-p-base font-medium text-ink-gray-7">Sales Analytics</p>
          <p className="mt-1 text-p-sm text-ink-gray-5">Analytics dashboard coming soon</p>
        </div>
      </ModuleLayout>
    )
  }

  const config = docTypeConfig[activeKey] ?? docTypeConfig.customer

  const filters: any[] = []
  if (selectedCompany) {
    filters.push(["company", "=", selectedCompany])
  }

  const { data, isLoading } = useFrappeGetDocList(config.doctype, {
    fields: config.fields,
    filters,
    limit_page_length: 50,
    order_by: "creation desc",
  })

  return (
    <ModuleLayout
      title="Selling"
      icon={<ShoppingCart className="h-4 w-4" />}
      sidebarItems={sidebarItems}
      activeRoute={activeRoute}
    >
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-sm text-ink-gray-5">Loading...</div>
        </div>
      ) : !data?.length ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <FileText className="mb-3 h-10 w-10 text-ink-gray-4" />
          <p className="text-p-base font-medium text-ink-gray-7">No {config.label}s found</p>
          <p className="mt-1 text-p-sm text-ink-gray-5">Create a new {config.label} to get started</p>
        </div>
      ) : (
        <ListView columns={config.columns} data={data} />
      )}
    </ModuleLayout>
  )
}
