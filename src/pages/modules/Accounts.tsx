import { useMemo, useState } from "react"
import { useAtom } from "jotai"
import { selectedCompanyAtom } from "@/hooks/useCurrentCompany"
import { ModuleLayout } from "@/components/ui/module-layout"
import { ListView, type ListViewColumnMeta } from "@/components/ui/list-view"
import type { ColumnDef } from "@tanstack/react-table"
import { useFrappeGetDocList } from "frappe-react-sdk"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Landmark,
  BookOpen,
  CircleDollarSign,
  ScrollText,
  Receipt,
  ShoppingCart,
  Building2,
  FileText,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Account {
  name: string
  account_name: string
  account_type: string
  root_type: string
  company: string
  is_group: number
  disabled: number
}

interface JournalEntry {
  name: string
  voucher_type: string
  posting_date: string
  total_debit: number
  total_credit: number
  company: string
  user_remark: string
}

interface PaymentEntry {
  name: string
  payment_type: string
  posting_date: string
  paid_amount: number
  received_amount: number
  party: string
  party_type: string
  company: string
  mode_of_payment: string
}

interface GL {
  name: string
  account: string
  posting_date: string
  debit: number
  credit: number
  party: string
  against_voucher_type: string
  against_voucher: string
  company: string
}

interface SalesInvoice {
  name: string
  customer: string
  posting_date: string
  grand_total: number
  status: string
  company: string
  due_date: string
}

interface PurchaseInvoice {
  name: string
  supplier: string
  posting_date: string
  grand_total: number
  status: string
  company: string
  due_date: string
}

interface CostCenter {
  name: string
  cost_center_name: string
  company: string
  parent_cost_center: string
}

// ---------------------------------------------------------------------------
// Sidebar items
// ---------------------------------------------------------------------------

const SIDEBAR_ITEMS = [
  { label: "Chart of Accounts", route: "chart-of-accounts", icon: <Landmark className="h-4 w-4" /> },
  { label: "Journal Entry", route: "journal-entry", icon: <BookOpen className="h-4 w-4" /> },
  { label: "Payment Entry", route: "payment-entry", icon: <CircleDollarSign className="h-4 w-4" /> },
  { label: "General Ledger", route: "general-ledger", icon: <ScrollText className="h-4 w-4" /> },
  { label: "Sales Invoice", route: "sales-invoice", icon: <Receipt className="h-4 w-4" /> },
  { label: "Purchase Invoice", route: "purchase-invoice", icon: <ShoppingCart className="h-4 w-4" /> },
  { label: "Cost Center", route: "cost-center", icon: <Building2 className="h-4 w-4" /> },
]

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ListViewSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 rounded bg-surface-gray-2 p-2">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-2">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-ink-gray-4">
      <FileText className="h-8 w-8" />
      <p className="text-p-sm">No {label} found</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const accountColumns: ColumnDef<Account, unknown>[] = [
  {
    accessorKey: "name",
    header: "Account ID",
    size: 200,
    meta: { gridWidth: "2fr" } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "account_name",
    header: "Account Name",
    size: 200,
    meta: { gridWidth: "2fr" } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "account_type",
    header: "Type",
    size: 150,
    meta: { gridWidth: "1fr" } satisfies ListViewColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as string
      return v ? <Badge variant="outline">{v}</Badge> : <span className="text-ink-gray-4">—</span>
    },
  },
  {
    accessorKey: "root_type",
    header: "Root Type",
    size: 120,
    meta: { gridWidth: "1fr" } satisfies ListViewColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as string
      const colorMap: Record<string, string> = {
        Asset: "bg-blue-100 text-blue-700",
        Liability: "bg-red-100 text-red-700",
        Equity: "bg-purple-100 text-purple-700",
        Income: "bg-green-100 text-green-700",
        Expense: "bg-orange-100 text-orange-700",
      }
      return v ? (
        <Badge className={colorMap[v] ?? ""} variant="outline">{v}</Badge>
      ) : (
        <span className="text-ink-gray-4">—</span>
      )
    },
  },
  {
    accessorKey: "company",
    header: "Company",
    size: 160,
    meta: { gridWidth: "1fr" } satisfies ListViewColumnMeta,
  },
]

const journalEntryColumns: ColumnDef<JournalEntry, unknown>[] = [
  {
    accessorKey: "name",
    header: "Entry ID",
    size: 180,
    meta: { gridWidth: "2fr" } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "voucher_type",
    header: "Voucher Type",
    size: 140,
    meta: { gridWidth: "1fr" } satisfies ListViewColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as string
      return v ? <Badge variant="outline">{v}</Badge> : <span className="text-ink-gray-4">—</span>
    },
  },
  {
    accessorKey: "posting_date",
    header: "Date",
    size: 120,
    meta: { gridWidth: "1fr", tabularNums: true } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "total_debit",
    header: "Debit",
    size: 120,
    meta: { gridWidth: "1fr", align: "right", tabularNums: true } satisfies ListViewColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number
      return <span className="tabular-nums">{v?.toLocaleString() ?? "0.00"}</span>
    },
  },
  {
    accessorKey: "total_credit",
    header: "Credit",
    size: 120,
    meta: { gridWidth: "1fr", align: "right", tabularNums: true } satisfies ListViewColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number
      return <span className="tabular-nums">{v?.toLocaleString() ?? "0.00"}</span>
    },
  },
  {
    accessorKey: "company",
    header: "Company",
    size: 140,
    meta: { gridWidth: "1fr" } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "user_remark",
    header: "Remark",
    size: 200,
    meta: { gridWidth: "2fr" } satisfies ListViewColumnMeta,
  },
]

const paymentEntryColumns: ColumnDef<PaymentEntry, unknown>[] = [
  {
    accessorKey: "name",
    header: "Entry ID",
    size: 180,
    meta: { gridWidth: "2fr" } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "payment_type",
    header: "Payment Type",
    size: 130,
    meta: { gridWidth: "1fr" } satisfies ListViewColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as string
      return v ? <Badge variant="outline">{v}</Badge> : <span className="text-ink-gray-4">—</span>
    },
  },
  {
    accessorKey: "posting_date",
    header: "Date",
    size: 120,
    meta: { gridWidth: "1fr", tabularNums: true } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "party",
    header: "Party",
    size: 160,
    meta: { gridWidth: "1.5fr" } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "paid_amount",
    header: "Amount",
    size: 120,
    meta: { gridWidth: "1fr", align: "right", tabularNums: true } satisfies ListViewColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number
      return <span className="tabular-nums">{v?.toLocaleString() ?? "0.00"}</span>
    },
  },
  {
    accessorKey: "mode_of_payment",
    header: "Mode",
    size: 130,
    meta: { gridWidth: "1fr" } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "company",
    header: "Company",
    size: 140,
    meta: { gridWidth: "1fr" } satisfies ListViewColumnMeta,
  },
]

const glColumns: ColumnDef<GL, unknown>[] = [
  {
    accessorKey: "name",
    header: "Entry ID",
    size: 180,
    meta: { gridWidth: "1.5fr" } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "account",
    header: "Account",
    size: 200,
    meta: { gridWidth: "2fr" } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "posting_date",
    header: "Date",
    size: 120,
    meta: { gridWidth: "1fr", tabularNums: true } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "debit",
    header: "Debit",
    size: 120,
    meta: { gridWidth: "1fr", align: "right", tabularNums: true } satisfies ListViewColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number
      return <span className="tabular-nums">{v?.toLocaleString() ?? "0.00"}</span>
    },
  },
  {
    accessorKey: "credit",
    header: "Credit",
    size: 120,
    meta: { gridWidth: "1fr", align: "right", tabularNums: true } satisfies ListViewColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number
      return <span className="tabular-nums">{v?.toLocaleString() ?? "0.00"}</span>
    },
  },
  {
    accessorKey: "party",
    header: "Party",
    size: 140,
    meta: { gridWidth: "1fr" } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "against_voucher",
    header: "Ref Document",
    size: 160,
    meta: { gridWidth: "1.5fr" } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "company",
    header: "Company",
    size: 140,
    meta: { gridWidth: "1fr" } satisfies ListViewColumnMeta,
  },
]

const salesInvoiceColumns: ColumnDef<SalesInvoice, unknown>[] = [
  {
    accessorKey: "name",
    header: "Invoice ID",
    size: 180,
    meta: { gridWidth: "2fr" } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "customer",
    header: "Customer",
    size: 180,
    meta: { gridWidth: "2fr" } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "posting_date",
    header: "Date",
    size: 120,
    meta: { gridWidth: "1fr", tabularNums: true } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "grand_total",
    header: "Total",
    size: 120,
    meta: { gridWidth: "1fr", align: "right", tabularNums: true } satisfies ListViewColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number
      return <span className="tabular-nums">{v?.toLocaleString() ?? "0.00"}</span>
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    size: 120,
    meta: { gridWidth: "1fr" } satisfies ListViewColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as string
      const variant =
        v === "Paid"
          ? "default"
          : v === "Unpaid"
            ? "destructive"
            : "outline"
      return v ? <Badge variant={variant}>{v}</Badge> : <span className="text-ink-gray-4">—</span>
    },
  },
  {
    accessorKey: "due_date",
    header: "Due Date",
    size: 120,
    meta: { gridWidth: "1fr", tabularNums: true } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "company",
    header: "Company",
    size: 140,
    meta: { gridWidth: "1fr" } satisfies ListViewColumnMeta,
  },
]

const purchaseInvoiceColumns: ColumnDef<PurchaseInvoice, unknown>[] = [
  {
    accessorKey: "name",
    header: "Invoice ID",
    size: 180,
    meta: { gridWidth: "2fr" } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "supplier",
    header: "Supplier",
    size: 180,
    meta: { gridWidth: "2fr" } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "posting_date",
    header: "Date",
    size: 120,
    meta: { gridWidth: "1fr", tabularNums: true } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "grand_total",
    header: "Total",
    size: 120,
    meta: { gridWidth: "1fr", align: "right", tabularNums: true } satisfies ListViewColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number
      return <span className="tabular-nums">{v?.toLocaleString() ?? "0.00"}</span>
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    size: 120,
    meta: { gridWidth: "1fr" } satisfies ListViewColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as string
      const variant =
        v === "Paid"
          ? "default"
          : v === "Unpaid"
            ? "destructive"
            : "outline"
      return v ? <Badge variant={variant}>{v}</Badge> : <span className="text-ink-gray-4">—</span>
    },
  },
  {
    accessorKey: "due_date",
    header: "Due Date",
    size: 120,
    meta: { gridWidth: "1fr", tabularNums: true } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "company",
    header: "Company",
    size: 140,
    meta: { gridWidth: "1fr" } satisfies ListViewColumnMeta,
  },
]

const costCenterColumns: ColumnDef<CostCenter, unknown>[] = [
  {
    accessorKey: "name",
    header: "Cost Center ID",
    size: 200,
    meta: { gridWidth: "2fr" } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "cost_center_name",
    header: "Name",
    size: 200,
    meta: { gridWidth: "2fr" } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "parent_cost_center",
    header: "Parent",
    size: 200,
    meta: { gridWidth: "2fr" } satisfies ListViewColumnMeta,
  },
  {
    accessorKey: "company",
    header: "Company",
    size: 160,
    meta: { gridWidth: "1fr" } satisfies ListViewColumnMeta,
  },
]

// ---------------------------------------------------------------------------
// Section components
// ---------------------------------------------------------------------------

function ChartOfAccountsSection({ company }: { company: string }) {
  const { data, isLoading, error } = useFrappeGetDocList<Account>("Account", {
    fields: ["name", "account_name", "account_type", "root_type", "company", "is_group", "disabled"],
    filters: { company },
    limit: 200,
    order_by: "root_type asc, account_name asc",
  })

  if (isLoading) return <ListViewSkeleton rows={8} columns={5} />
  if (error) return <div className="p-4 text-sm text-red-600">Failed to load accounts.</div>

  return (
    <ListView
      data={data ?? []}
      columns={accountColumns}
      emptyState={<EmptyState label="accounts" />}
      maxHeight={520}
    />
  )
}

function JournalEntrySection({ company }: { company: string }) {
  const { data, isLoading, error } = useFrappeGetDocList<JournalEntry>("Journal Entry", {
    fields: ["name", "voucher_type", "posting_date", "total_debit", "total_credit", "company", "user_remark"],
    filters: { company },
    limit: 50,
    order_by: "posting_date desc",
  })

  if (isLoading) return <ListViewSkeleton rows={6} columns={7} />
  if (error) return <div className="p-4 text-sm text-red-600">Failed to load journal entries.</div>

  return (
    <ListView
      data={data ?? []}
      columns={journalEntryColumns}
      emptyState={<EmptyState label="journal entries" />}
      maxHeight={520}
    />
  )
}

function PaymentEntrySection({ company }: { company: string }) {
  const { data, isLoading, error } = useFrappeGetDocList<PaymentEntry>("Payment Entry", {
    fields: ["name", "payment_type", "posting_date", "party", "paid_amount", "mode_of_payment", "company"],
    filters: { company },
    limit: 50,
    order_by: "posting_date desc",
  })

  if (isLoading) return <ListViewSkeleton rows={6} columns={7} />
  if (error) return <div className="p-4 text-sm text-red-600">Failed to load payment entries.</div>

  return (
    <ListView
      data={data ?? []}
      columns={paymentEntryColumns}
      emptyState={<EmptyState label="payment entries" />}
      maxHeight={520}
    />
  )
}

function GeneralLedgerSection({ company }: { company: string }) {
  const { data, isLoading, error } = useFrappeGetDocList<GL>("GL Entry", {
    fields: ["name", "account", "posting_date", "debit", "credit", "party", "against_voucher_type", "against_voucher", "company"],
    filters: { company },
    limit: 100,
    order_by: "posting_date desc",
  })

  if (isLoading) return <ListViewSkeleton rows={8} columns={8} />
  if (error) return <div className="p-4 text-sm text-red-600">Failed to load general ledger.</div>

  return (
    <ListView
      data={data ?? []}
      columns={glColumns}
      emptyState={<EmptyState label="ledger entries" />}
      maxHeight={520}
    />
  )
}

function SalesInvoiceSection({ company }: { company: string }) {
  const { data, isLoading, error } = useFrappeGetDocList<SalesInvoice>("Sales Invoice", {
    fields: ["name", "customer", "posting_date", "grand_total", "status", "company", "due_date"],
    filters: { company },
    limit: 50,
    order_by: "posting_date desc",
  })

  if (isLoading) return <ListViewSkeleton rows={6} columns={7} />
  if (error) return <div className="p-4 text-sm text-red-600">Failed to load sales invoices.</div>

  return (
    <ListView
      data={data ?? []}
      columns={salesInvoiceColumns}
      emptyState={<EmptyState label="sales invoices" />}
      maxHeight={520}
    />
  )
}

function PurchaseInvoiceSection({ company }: { company: string }) {
  const { data, isLoading, error } = useFrappeGetDocList<PurchaseInvoice>("Purchase Invoice", {
    fields: ["name", "supplier", "posting_date", "grand_total", "status", "company", "due_date"],
    filters: { company },
    limit: 50,
    order_by: "posting_date desc",
  })

  if (isLoading) return <ListViewSkeleton rows={6} columns={7} />
  if (error) return <div className="p-4 text-sm text-red-600">Failed to load purchase invoices.</div>

  return (
    <ListView
      data={data ?? []}
      columns={purchaseInvoiceColumns}
      emptyState={<EmptyState label="purchase invoices" />}
      maxHeight={520}
    />
  )
}

function CostCenterSection({ company }: { company: string }) {
  const { data, isLoading, error } = useFrappeGetDocList<CostCenter>("Cost Center", {
    fields: ["name", "cost_center_name", "company", "parent_cost_center"],
    filters: { company },
    limit: 100,
    order_by: "cost_center_name asc",
  })

  if (isLoading) return <ListViewSkeleton rows={6} columns={4} />
  if (error) return <div className="p-4 text-sm text-red-600">Failed to load cost centers.</div>

  return (
    <ListView
      data={data ?? []}
      columns={costCenterColumns}
      emptyState={<EmptyState label="cost centers" />}
      maxHeight={520}
    />
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const SECTION_TITLES: Record<string, string> = {
  "chart-of-accounts": "Chart of Accounts",
  "journal-entry": "Journal Entry",
  "payment-entry": "Payment Entry",
  "general-ledger": "General Ledger",
  "sales-invoice": "Sales Invoice",
  "purchase-invoice": "Purchase Invoice",
  "cost-center": "Cost Center",
}

export default function Accounts() {
  const [company] = useAtom(selectedCompanyAtom)
  const [activeSection, setActiveSection] = useState("chart-of-accounts")

  const sidebarItems = useMemo(
    () =>
      SIDEBAR_ITEMS.map((item) => ({
        ...item,
        route: `/app/accounts/${item.route}`,
      })),
    [],
  )

  const handleSidebarClick = (route: string) => {
    const section = route.split("/").pop() ?? "chart-of-accounts"
    setActiveSection(section)
  }

  const renderSection = () => {
    switch (activeSection) {
      case "chart-of-accounts":
        return <ChartOfAccountsSection company={company} />
      case "journal-entry":
        return <JournalEntrySection company={company} />
      case "payment-entry":
        return <PaymentEntrySection company={company} />
      case "general-ledger":
        return <GeneralLedgerSection company={company} />
      case "sales-invoice":
        return <SalesInvoiceSection company={company} />
      case "purchase-invoice":
        return <PurchaseInvoiceSection company={company} />
      case "cost-center":
        return <CostCenterSection company={company} />
      default:
        return <ChartOfAccountsSection company={company} />
    }
  }

  return (
    <ModuleLayout
      title="Accounts"
      subtitle={company}
      icon={<Landmark className="h-5 w-5" />}
      sidebarItems={sidebarItems}
      activeRoute={`/app/accounts/${activeSection}`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-p-lg font-semibold text-ink-gray-8">
            {SECTION_TITLES[activeSection] ?? "Chart of Accounts"}
          </h2>
        </div>
        {renderSection()}
      </div>
    </ModuleLayout>
  )
}
