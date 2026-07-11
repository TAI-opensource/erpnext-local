import { useState } from "react"
import { ModuleLayout } from "@/components/ui/module-layout"
import { ListView } from "@/components/ui/list-view"
import { useFrappeGetDocList } from "frappe-react-sdk"
import type { ColumnDef } from "@tanstack/react-table"
import { useAtom } from "jotai"
import { selectedCompanyAtom } from "@/hooks/useCurrentCompany"
import { Receipt, FileSpreadsheet, Send, Zap, Clock } from "lucide-react"

const sidebarItems = [
  { label: "Salary Structure", route: "/app/payroll/salary-structure", icon: <Receipt className="h-4 w-4" /> },
  { label: "Salary Slip", route: "/app/payroll/salary-slip", icon: <FileSpreadsheet className="h-4 w-4" /> },
  { label: "Payroll Entry", route: "/app/payroll/payroll-entry", icon: <Send className="h-4 w-4" /> },
  { label: "Activity Type", route: "/app/payroll/activity-type", icon: <Zap className="h-4 w-4" /> },
  { label: "Timesheet", route: "/app/payroll/timesheet", icon: <Clock className="h-4 w-4" /> },
]

const columns: Record<string, { doctype: string; fields: string[]; columns: ColumnDef<any, unknown>[] }> = {
  "salary-structure": { doctype: "Salary Structure", fields: ["name", "salary_structure_name", "company", "currency"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "salary_structure_name", header: "Name", size: 200 },
    { accessorKey: "company", header: "Company", size: 150 },
    { accessorKey: "currency", header: "Currency", size: 100 },
  ]},
  "salary-slip": { doctype: "Salary Slip", fields: ["name", "employee", "employee_name", "start_date", "end_date", "gross_pay", "status"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "employee", header: "Employee", size: 120 },
    { accessorKey: "employee_name", header: "Name", size: 200 },
    { accessorKey: "start_date", header: "Start Date", size: 120 },
    { accessorKey: "end_date", header: "End Date", size: 120 },
    { accessorKey: "gross_pay", header: "Gross Pay", size: 120 },
    { accessorKey: "status", header: "Status", size: 100 },
  ]},
  "payroll-entry": { doctype: "Payroll Entry", fields: ["name", "posting_date", "company", "start_date", "end_date", "status"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "posting_date", header: "Posting Date", size: 120 },
    { accessorKey: "company", header: "Company", size: 150 },
    { accessorKey: "start_date", header: "Start Date", size: 120 },
    { accessorKey: "end_date", header: "End Date", size: 120 },
    { accessorKey: "status", header: "Status", size: 100 },
  ]},
  "activity-type": { doctype: "Activity Type", fields: ["name", "activity_type", "costing_rate", "billing_rate"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "activity_type", header: "Activity Type", size: 200 },
    { accessorKey: "costing_rate", header: "Costing Rate", size: 120 },
    { accessorKey: "billing_rate", header: "Billing Rate", size: 120 },
  ]},
  timesheet: { doctype: "Timesheet", fields: ["name", "employee", "employee_name", "start_date", "end_date", "total_hours"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "employee", header: "Employee", size: 120 },
    { accessorKey: "employee_name", header: "Name", size: 200 },
    { accessorKey: "start_date", header: "Start Date", size: 120 },
    { accessorKey: "end_date", header: "End Date", size: 120 },
    { accessorKey: "total_hours", header: "Total Hours", size: 100 },
  ]},
}

export default function PayrollModule() {
  const [selectedCompany] = useAtom(selectedCompanyAtom)
  const [activeSection, setActiveSection] = useState("salary-slip")
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
      title="Payroll"
      subtitle="Payroll Management"
      icon={<Receipt className="h-5 w-5" />}
      sidebarItems={sidebarItems}
      activeRoute={`/app/payroll/${activeSection}`}
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
                <Receipt className="h-8 w-8" />
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
