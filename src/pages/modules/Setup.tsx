import { useLocation } from "react-router"
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
import { Link } from "react-router"

const sidebarLinks = [
  { label: "Company", path: "/modules/setup/company", icon: Building2 },
  { label: "Users", path: "/modules/setup/users", icon: Users },
  { label: "Roles", path: "/modules/setup/roles", icon: Shield },
  { label: "Settings", path: "/modules/setup/settings", icon: Settings },
  { label: "Country", path: "/modules/setup/country", icon: Globe },
  { label: "Currency", path: "/modules/setup/currency", icon: Banknote },
  { label: "Fiscal Year", path: "/modules/setup/fiscal-year", icon: Calendar },
  { label: "UOM", path: "/modules/setup/uom", icon: Ruler },
  { label: "Brand", path: "/modules/setup/brand", icon: Tag },
  { label: "Terms and Conditions", path: "/modules/setup/terms-and-conditions", icon: FileText },
]

const companyColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "company_name", header: "Company Name" },
  { accessorKey: "country", header: "Country" },
  { accessorKey: "default_currency", header: "Currency" },
]

const userColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "full_name", header: "Full Name" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "enabled", header: "Enabled" },
  { accessorKey: "last_active", header: "Last Active" },
]

const roleColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "role_name", header: "Role Name" },
  { accessorKey: "desk_access", header: "Desk Access" },
]

const settingsColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "setting", header: "Setting" },
  { accessorKey: "value", header: "Value" },
]

const countryColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "country_name", header: "Country" },
  { accessorKey: "code", header: "Code" },
]

const currencyColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "currency_name", header: "Currency" },
  { accessorKey: "enabled", header: "Enabled" },
  { accessorKey: "fraction", header: "Fraction" },
]

const fiscalYearColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "year", header: "Year" },
  { accessorKey: "year_start_date", header: "Start Date" },
  { accessorKey: "year_end_date", header: "End Date" },
]

const uomColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "uom_name", header: "UOM" },
  { accessorKey: "description", header: "Description" },
]

const brandColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "brand_name", header: "Brand" },
  { accessorKey: "description", header: "Description" },
]

const termsColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "terms_name", header: "Terms Name" },
  { accessorKey: "terms_type", header: "Type" },
]

const docTypeConfig: Record<
  string,
  { fields: string[]; columns: ColumnDef<any, any>[]; label: string }
> = {
  company: {
    fields: ["name", "company_name", "country", "default_currency"],
    columns: companyColumns,
    label: "Company",
  },
  users: {
    fields: ["name", "full_name", "email", "enabled", "last_active"],
    columns: userColumns,
    label: "User",
  },
  roles: {
    fields: ["name", "role_name", "desk_access"],
    columns: roleColumns,
    label: "Role",
  },
  settings: {
    fields: ["name", "setting", "value"],
    columns: settingsColumns,
    label: "System Settings",
  },
  country: {
    fields: ["name", "country_name", "code"],
    columns: countryColumns,
    label: "Country",
  },
  currency: {
    fields: ["name", "currency_name", "enabled", "fraction"],
    columns: currencyColumns,
    label: "Currency",
  },
  "fiscal-year": {
    fields: ["name", "year", "year_start_date", "year_end_date"],
    columns: fiscalYearColumns,
    label: "Fiscal Year",
  },
  uom: {
    fields: ["name", "uom_name", "description"],
    columns: uomColumns,
    label: "UOM",
  },
  brand: {
    fields: ["name", "brand_name", "description"],
    columns: brandColumns,
    label: "Brand",
  },
  "terms-and-conditions": {
    fields: ["name", "terms_name", "terms_type"],
    columns: termsColumns,
    label: "Terms and Conditions",
  },
}

export default function Setup() {
  const location = useLocation()
  const [selectedCompany] = useAtom(selectedCompanyAtom)
  const pathParts = location.pathname.split("/")
  const activeKey = pathParts[pathParts.length - 1] || "company"

  const config = docTypeConfig[activeKey] ?? docTypeConfig.company

  const filters: any[] = []
  if (selectedCompany && config.label === "Company") {
    // Don't filter Company by itself
  } else if (selectedCompany) {
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
    <ModuleLayout title="Setup" sidebar={sidebar}>
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-sm text-ink-gray-5">Loading...</div>
        </div>
      ) : !data?.length ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Settings className="mb-3 h-10 w-10 text-ink-gray-4" />
          <p className="text-sm text-ink-gray-5">No records found</p>
        </div>
      ) : (
        <ListView columns={config.columns} data={data} />
      )}
    </ModuleLayout>
  )
}
