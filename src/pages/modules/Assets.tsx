import { useState } from "react"
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

const sidebarItems = [
  { label: "Asset", route: "/app/assets/asset", icon: <Briefcase className="h-4 w-4" /> },
  { label: "Asset Category", route: "/app/assets/asset-category", icon: <LayoutGrid className="h-4 w-4" /> },
  { label: "Asset Movement", route: "/app/assets/asset-movement", icon: <ArrowLeftRight className="h-4 w-4" /> },
  { label: "Asset Maintenance", route: "/app/assets/asset-maintenance", icon: <Wrench className="h-4 w-4" /> },
  { label: "Depreciation Schedule", route: "/app/assets/depreciation-schedule", icon: <CalendarClock className="h-4 w-4" /> },
]

const columns: Record<string, { doctype: string; fields: string[]; columns: ColumnDef<any, unknown>[] }> = {
  asset: { doctype: "Asset", fields: ["name", "asset_name", "asset_category", "status", "company", "gross_purchase_amount"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "asset_name", header: "Asset Name", size: 200 },
    { accessorKey: "asset_category", header: "Category", size: 150 },
    { accessorKey: "status", header: "Status", size: 100 },
    { accessorKey: "company", header: "Company", size: 150 },
    { accessorKey: "gross_purchase_amount", header: "Purchase Amount", size: 120, meta: { align: "right", tabularNums: true } },
  ]},
  "asset-category": { doctype: "Asset Category", fields: ["name", "asset_category_name", "description"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "asset_category_name", header: "Category Name", size: 200 },
    { accessorKey: "description", header: "Description", size: 200 },
  ]},
  "asset-movement": { doctype: "Asset Movement", fields: ["name", "asset", "from_location", "to_location", "movement_date"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "asset", header: "Asset", size: 150 },
    { accessorKey: "from_location", header: "From", size: 150 },
    { accessorKey: "to_location", header: "To", size: 150 },
    { accessorKey: "movement_date", header: "Date", size: 120 },
  ]},
  "asset-maintenance": { doctype: "Asset Maintenance", fields: ["name", "asset", "maintenance_type", "start_date", "end_date", "status"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "asset", header: "Asset", size: 150 },
    { accessorKey: "maintenance_type", header: "Type", size: 120 },
    { accessorKey: "start_date", header: "Start Date", size: 120 },
    { accessorKey: "end_date", header: "End Date", size: 120 },
    { accessorKey: "status", header: "Status", size: 100 },
  ]},
  "depreciation-schedule": { doctype: "Depreciation Schedule", fields: ["name", "asset", "finance_book", "schedule_date", "depreciation_amount", "status"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "asset", header: "Asset", size: 150 },
    { accessorKey: "finance_book", header: "Finance Book", size: 150 },
    { accessorKey: "schedule_date", header: "Schedule Date", size: 120 },
    { accessorKey: "depreciation_amount", header: "Amount", size: 120, meta: { align: "right", tabularNums: true } },
    { accessorKey: "status", header: "Status", size: 100 },
  ]},
}

export default function AssetsModule() {
  const [selectedCompany] = useAtom(selectedCompanyAtom)
  const [activeSection, setActiveSection] = useState("asset")
  const config = columns[activeSection]

  const filters: any[] = []
  if (selectedCompany) filters.push(["company", "=", selectedCompany])

  const { data, isLoading } = useFrappeGetDocList(config.doctype, {
    fields: config.fields,
    filters: filters.length ? filters : undefined,
    limit_page_length: 50,
    order_by: "creation desc",
  })

  return (
    <ModuleLayout
      title="Assets"
      subtitle="Asset Management"
      icon={<Briefcase className="h-5 w-5" />}
      sidebarItems={sidebarItems}
      activeRoute={`/app/assets/${activeSection}`}
    >
      <div className="space-y-4">
        <h2 className="text-p-xl font-semibold text-ink-gray-8">{config.doctype}</h2>
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-ink-gray-4">Loading...</div>
        ) : (
          <ListView
            data={data || []}
            columns={config.columns}
            maxHeight={500}
            emptyState={
              <div className="flex flex-col items-center gap-2 py-8 text-ink-gray-4">
                <Briefcase className="h-8 w-8" />
                <p>No {config.doctype.toLowerCase()} found</p>
              </div>
            }
            onRowClick={(row) => console.log("Selected:", row)}
          />
        )}
      </div>
    </ModuleLayout>
  )
}
