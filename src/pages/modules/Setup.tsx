import { useState } from "react"
import { ModuleLayout } from "@/components/ui/module-layout"
import { ListView } from "@/components/ui/list-view"
import { useFrappeGetDocList } from "frappe-react-sdk"
import type { ColumnDef } from "@tanstack/react-table"
import { useAtom } from "jotai"
import { selectedCompanyAtom } from "@/hooks/useCurrentCompany"
import {
  Building2,
  Users,
  Shield,
  Settings,
  Globe,
  Banknote,
  Calendar,
  Ruler,
  Tag,
  FileText,
} from "lucide-react"

const sidebarItems = [
  { label: "Company", route: "/app/setup/company", icon: <Building2 className="h-4 w-4" /> },
  { label: "Users", route: "/app/setup/users", icon: <Users className="h-4 w-4" /> },
  { label: "Roles", route: "/app/setup/roles", icon: <Shield className="h-4 w-4" /> },
  { label: "Settings", route: "/app/setup/settings", icon: <Settings className="h-4 w-4" /> },
  { label: "Country", route: "/app/setup/country", icon: <Globe className="h-4 w-4" /> },
  { label: "Currency", route: "/app/setup/currency", icon: <Banknote className="h-4 w-4" /> },
  { label: "Fiscal Year", route: "/app/setup/fiscal-year", icon: <Calendar className="h-4 w-4" /> },
  { label: "UOM", route: "/app/setup/uom", icon: <Ruler className="h-4 w-4" /> },
  { label: "Brand", route: "/app/setup/brand", icon: <Tag className="h-4 w-4" /> },
  { label: "Terms and Conditions", route: "/app/setup/terms-and-conditions", icon: <FileText className="h-4 w-4" /> },
]

const columns: Record<string, { doctype: string; fields: string[]; columns: ColumnDef<any, unknown>[] }> = {
  company: { doctype: "Company", fields: ["name", "company_name", "country", "default_currency"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "company_name", header: "Company Name", size: 200 },
    { accessorKey: "country", header: "Country", size: 150 },
    { accessorKey: "default_currency", header: "Currency", size: 100 },
  ]},
  users: { doctype: "User", fields: ["name", "full_name", "email", "enabled", "last_active"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "full_name", header: "Full Name", size: 200 },
    { accessorKey: "email", header: "Email", size: 200 },
    { accessorKey: "enabled", header: "Enabled", size: 100 },
    { accessorKey: "last_active", header: "Last Active", size: 150 },
  ]},
  roles: { doctype: "Role", fields: ["name", "role_name", "desk_access"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "role_name", header: "Role Name", size: 200 },
    { accessorKey: "desk_access", header: "Desk Access", size: 120 },
  ]},
  settings: { doctype: "System Settings", fields: ["name", "setting", "value"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "setting", header: "Setting", size: 200 },
    { accessorKey: "value", header: "Value", size: 200 },
  ]},
  country: { doctype: "Country", fields: ["name", "country_name", "code"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "country_name", header: "Country", size: 200 },
    { accessorKey: "code", header: "Code", size: 100 },
  ]},
  currency: { doctype: "Currency", fields: ["name", "currency_name", "enabled", "fraction"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "currency_name", header: "Currency", size: 200 },
    { accessorKey: "enabled", header: "Enabled", size: 100 },
    { accessorKey: "fraction", header: "Fraction", size: 100 },
  ]},
  "fiscal-year": { doctype: "Fiscal Year", fields: ["name", "year", "year_start_date", "year_end_date"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "year", header: "Year", size: 100 },
    { accessorKey: "year_start_date", header: "Start Date", size: 120 },
    { accessorKey: "year_end_date", header: "End Date", size: 120 },
  ]},
  uom: { doctype: "UOM", fields: ["name", "uom_name", "description"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "uom_name", header: "UOM", size: 200 },
    { accessorKey: "description", header: "Description", size: 200 },
  ]},
  brand: { doctype: "Brand", fields: ["name", "brand_name", "description"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "brand_name", header: "Brand", size: 200 },
    { accessorKey: "description", header: "Description", size: 200 },
  ]},
  "terms-and-conditions": { doctype: "Terms and Conditions", fields: ["name", "terms_name", "terms_type"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "terms_name", header: "Terms Name", size: 200 },
    { accessorKey: "terms_type", header: "Type", size: 120 },
  ]},
}

export default function SetupModule() {
  const [selectedCompany] = useAtom(selectedCompanyAtom)
  const [activeSection, setActiveSection] = useState("company")
  const config = columns[activeSection]

  const filters: any[] = []
  if (selectedCompany && config.doctype !== "Company") {
    filters.push(["company", "=", selectedCompany])
  }

  const { data, isLoading } = useFrappeGetDocList(config.doctype, {
    fields: config.fields,
    filters: filters.length ? filters : undefined,
    limit_page_length: 50,
    order_by: "creation desc",
  })

  return (
    <ModuleLayout
      title="Setup"
      subtitle="System Setup"
      icon={<Settings className="h-5 w-5" />}
      sidebarItems={sidebarItems}
      activeRoute={`/app/setup/${activeSection}`}
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
                <Settings className="h-8 w-8" />
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
