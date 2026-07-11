import { useState } from "react"
import { ModuleLayout } from "@/components/ui/module-layout"
import { ListView } from "@/components/ui/list-view"
import { useFrappeGetDocList } from "frappe-react-sdk"
import type { ColumnDef } from "@tanstack/react-table"
import { useAtom } from "jotai"
import { selectedCompanyAtom } from "@/hooks/useCurrentCompany"
import { Users, Building2, Briefcase, CalendarCheck, FileText, Clock } from "lucide-react"

const sidebarItems = [
  { label: "Employee", route: "/app/hr/employee", icon: <Users className="h-4 w-4" /> },
  { label: "Department", route: "/app/hr/department", icon: <Building2 className="h-4 w-4" /> },
  { label: "Designation", route: "/app/hr/designation", icon: <Briefcase className="h-4 w-4" /> },
  { label: "Attendance", route: "/app/hr/attendance", icon: <CalendarCheck className="h-4 w-4" /> },
  { label: "Leave Application", route: "/app/hr/leave-application", icon: <FileText className="h-4 w-4" /> },
  { label: "Shift Type", route: "/app/hr/shift-type", icon: <Clock className="h-4 w-4" /> },
]

const columns: Record<string, { doctype: string; fields: string[]; columns: ColumnDef<any, unknown>[] }> = {
  employee: { doctype: "Employee", fields: ["name", "employee_name", "department", "designation", "company", "status"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "employee_name", header: "Name", size: 200 },
    { accessorKey: "department", header: "Department", size: 150 },
    { accessorKey: "designation", header: "Designation", size: 150 },
    { accessorKey: "company", header: "Company", size: 150 },
    { accessorKey: "status", header: "Status", size: 100 },
  ]},
  department: { doctype: "Department", fields: ["name", "department_name", "company", "parent_department"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "department_name", header: "Department Name", size: 200 },
    { accessorKey: "company", header: "Company", size: 150 },
    { accessorKey: "parent_department", header: "Parent", size: 150 },
  ]},
  designation: { doctype: "Designation", fields: ["name", "designation_name"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "designation_name", header: "Designation Name", size: 200 },
  ]},
  attendance: { doctype: "Attendance", fields: ["name", "employee", "employee_name", "attendance_date", "status"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "employee", header: "Employee", size: 120 },
    { accessorKey: "employee_name", header: "Name", size: 200 },
    { accessorKey: "attendance_date", header: "Date", size: 120 },
    { accessorKey: "status", header: "Status", size: 100 },
  ]},
  "leave-application": { doctype: "Leave Application", fields: ["name", "employee", "employee_name", "leave_type", "status", "from_date", "to_date"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "employee", header: "Employee", size: 120 },
    { accessorKey: "employee_name", header: "Name", size: 200 },
    { accessorKey: "leave_type", header: "Leave Type", size: 120 },
    { accessorKey: "status", header: "Status", size: 100 },
  ]},
  "shift-type": { doctype: "Shift Type", fields: ["name", "shift_type_name", "start_time", "end_time"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "shift_type_name", header: "Shift Name", size: 200 },
    { accessorKey: "start_time", header: "Start", size: 100 },
    { accessorKey: "end_time", header: "End", size: 100 },
  ]},
}

export default function HRModule() {
  const [selectedCompany] = useAtom(selectedCompanyAtom)
  const [activeSection, setActiveSection] = useState("employee")
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
      title="HR"
      subtitle="Human Resources"
      icon={<Users className="h-5 w-5" />}
      sidebarItems={sidebarItems}
      activeRoute={`/app/hr/${activeSection}`}
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
                <Users className="h-8 w-8" />
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
