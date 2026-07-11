import { useLocation } from "react-router"
import { ModuleLayout } from "@/components/ui/module-layout"
import { ListView } from "@/components/ui/list-view"
import { useFrappeGetDocList } from "frappe-react-sdk"
import type { ColumnDef } from "@tanstack/react-table"
import { useAtom } from "jotai"
import { selectedCompanyAtom } from "@/hooks/useCurrentCompany"
import {
  Briefcase,
  LayoutGrid,
  ArrowLeftRight,
  Wrench,
  CalendarClock,
} from "lucide-react"
import { Link } from "react-router"

const sidebarLinks = [
  { label: "Asset", path: "/modules/assets/asset", icon: Briefcase },
  { label: "Asset Category", path: "/modules/assets/asset-category", icon: LayoutGrid },
  { label: "Asset Movement", path: "/modules/assets/asset-movement", icon: ArrowLeftRight },
  { label: "Asset Maintenance", path: "/modules/assets/asset-maintenance", icon: Wrench },
  { label: "Depreciation Schedule", path: "/modules/assets/depreciation-schedule", icon: CalendarClock },
]

const assetColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "asset_name", header: "Asset Name" },
  { accessorKey: "asset_category", header: "Category" },
  { accessorKey: "status", header: "Status" },
  { accessorKey: "company", header: "Company" },
  {
    accessorKey: "gross_purchase_amount",
    header: "Purchase Amount",
    meta: { align: "right", tabularNums: true },
  },
]

const assetCategoryColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "asset_category_name", header: "Category Name" },
  { accessorKey: "description", header: "Description" },
]

const assetMovementColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "asset", header: "Asset" },
  { accessorKey: "from_location", header: "From" },
  { accessorKey: "to_location", header: "To" },
  { accessorKey: "movement_date", header: "Date" },
]

const assetMaintenanceColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "asset", header: "Asset" },
  { accessorKey: "maintenance_type", header: "Type" },
  { accessorKey: "start_date", header: "Start Date" },
  { accessorKey: "end_date", header: "End Date" },
  { accessorKey: "status", header: "Status" },
]

const depreciationScheduleColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "asset", header: "Asset" },
  { accessorKey: "finance_book", header: "Finance Book" },
  { accessorKey: "schedule_date", header: "Schedule Date" },
  {
    accessorKey: "depreciation_amount",
    header: "Amount",
    meta: { align: "right", tabularNums: true },
  },
  { accessorKey: "status", header: "Status" },
]

const docTypeConfig: Record<
  string,
  { fields: string[]; columns: ColumnDef<any, any>[]; label: string }
> = {
  asset: {
    fields: ["name", "asset_name", "asset_category", "status", "company", "gross_purchase_amount"],
    columns: assetColumns,
    label: "Asset",
  },
  "asset-category": {
    fields: ["name", "asset_category_name", "description"],
    columns: assetCategoryColumns,
    label: "Asset Category",
  },
  "asset-movement": {
    fields: ["name", "asset", "from_location", "to_location", "movement_date"],
    columns: assetMovementColumns,
    label: "Asset Movement",
  },
  "asset-maintenance": {
    fields: ["name", "asset", "maintenance_type", "start_date", "end_date", "status"],
    columns: assetMaintenanceColumns,
    label: "Asset Maintenance",
  },
  "depreciation-schedule": {
    fields: ["name", "asset", "finance_book", "schedule_date", "depreciation_amount", "status"],
    columns: depreciationScheduleColumns,
    label: "Depreciation Schedule",
  },
}

export default function Assets() {
  const location = useLocation()
  const [selectedCompany] = useAtom(selectedCompanyAtom)
  const pathParts = location.pathname.split("/")
  const activeKey = pathParts[pathParts.length - 1] || "asset"

  const config = docTypeConfig[activeKey] ?? docTypeConfig.asset

  const filters: any[] = []
  if (selectedCompany) {
    filters.push(["company", "=", selectedCompany])
  }

  const { data, isLoading } = useFrappeGetDocList(config.label, {
    fields: config.fields,
    filters,
    limit_page_length: 50,
    order_by: "creation desc",
  })

  const sidebar = (
    <nav className="flex flex-col gap-1 p-2">
      {sidebarLinks.map((link) => {
        const Icon = link.icon
        const isActive = activeKey === link.path.split("/").pop()
        return (
          <Link
            key={link.path}
            to={link.path}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-surface-gray-2 text-ink-gray-9 font-medium"
                : "text-ink-gray-6 hover:bg-surface-gray-1 hover:text-ink-gray-8"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {link.label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <ModuleLayout title="Assets" sidebar={sidebar}>
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-sm text-ink-gray-5">Loading...</div>
        </div>
      ) : !data?.length ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Briefcase className="mb-3 h-10 w-10 text-ink-gray-4" />
          <p className="text-sm text-ink-gray-5">No records found</p>
        </div>
      ) : (
        <ListView columns={config.columns} data={data} />
      )}
    </ModuleLayout>
  )
}
