import { useState } from "react"
import { Link, useLocation } from "react-router"
import { ModuleLayout } from "@/components/ui/module-layout"
import { ListView } from "@/components/ui/list-view"
import { useFrappeGetDocList } from "frappe-react-sdk"
import type { ColumnDef } from "@tanstack/react-table"
import { useAtom } from "jotai"
import { selectedCompanyAtom } from "@/hooks/useCurrentCompany"
import { Receipt, FileSpreadsheet, Send, Zap, Clock } from "lucide-react"

const sidebarLinks = [
  { label: "Salary Structure", path: "/modules/payroll/salary-structure", icon: Receipt },
  { label: "Salary Slip", path: "/modules/payroll/salary-slip", icon: FileSpreadsheet },
  { label: "Payroll Entry", path: "/modules/payroll/payroll-entry", icon: Send },
  { label: "Activity Type", path: "/modules/payroll/activity-type", icon: Zap },
  { label: "Timesheet", path: "/modules/payroll/timesheet", icon: Clock },
]

const salaryStructureColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "salary_structure_name", header: "Name" },
  { accessorKey: "company", header: "Company" },
  { accessorKey: "currency", header: "Currency" },
]

const salarySlipColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "employee", header: "Employee" },
  { accessorKey: "employee_name", header: "Name" },
  { accessorKey: "start_date", header: "Start Date" },
  { accessorKey: "end_date", header: "End Date" },
  { accessorKey: "gross_pay", header: "Gross Pay" },
  { accessorKey: "status", header: "Status" },
]

const payrollEntryColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "posting_date", header: "Posting Date" },
  { accessorKey: "company", header: "Company" },
  { accessorKey: "start_date", header: "Start Date" },
  { accessorKey: "end_date", header: "End Date" },
  { accessorKey: "status", header: "Status" },
]

const activityTypeColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "activity_type", header: "Activity Type" },
  { accessorKey: "costing_rate", header: "Costing Rate" },
  { accessorKey: "billing_rate", header: "Billing Rate" },
]

const timesheetColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "employee", header: "Employee" },
  { accessorKey: "employee_name", header: "Name" },
  { accessorKey: "start_date", header: "Start Date" },
  { accessorKey: "end_date", header: "End Date" },
  { accessorKey: "total_hours", header: "Total Hours" },
]

const docTypeConfig: Record<string, { fields: string[]; columns: ColumnDef<any, any>[]; label: string }> = {
  "salary-structure": { fields: ["name", "salary_structure_name", "company", "currency"], columns: salaryStructureColumns, label: "Salary Structure" },
  "salary-slip": { fields: ["name", "employee", "employee_name", "start_date", "end_date", "gross_pay", "status"], columns: salarySlipColumns, label: "Salary Slip" },
  "payroll-entry": { fields: ["name", "posting_date", "company", "start_date", "end_date", "status"], columns: payrollEntryColumns, label: "Payroll Entry" },
  "activity-type": { fields: ["name", "activity_type", "costing_rate", "billing_rate"], columns: activityTypeColumns, label: "Activity Type" },
  timesheet: { fields: ["name", "employee", "employee_name", "start_date", "end_date", "total_hours"], columns: timesheetColumns, label: "Timesheet" },
}

export default function Payroll() {
  const location = useLocation()
  const [selectedCompany] = useAtom(selectedCompanyAtom)
  const pathParts = location.pathname.split("/")
  const activeKey = pathParts[pathParts.length - 1] || "salary-slip"

  const config = docTypeConfig[activeKey] ?? docTypeConfig["salary-slip"]

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
    <ModuleLayout title="Payroll" sidebar={sidebar}>
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-sm text-ink-gray-5">Loading...</div>
        </div>
      ) : !data?.length ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <FileSpreadsheet className="mb-3 h-10 w-10 text-ink-gray-4" />
          <p className="text-sm text-ink-gray-5">No records found</p>
        </div>
      ) : (
        <ListView columns={config.columns} data={data} />
      )}
    </ModuleLayout>
  )
}
