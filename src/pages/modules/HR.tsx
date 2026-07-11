import { useState } from "react"
import { Link, useLocation } from "react-router"
import { ModuleLayout } from "@/components/ui/module-layout"
import { ListView } from "@/components/ui/list-view"
import { useFrappeGetDocList } from "frappe-react-sdk"
import type { ColumnDef } from "@tanstack/react-table"
import { useAtom } from "jotai"
import { selectedCompanyAtom } from "@/hooks/useCurrentCompany"
import { Users, Building2, Briefcase, CalendarCheck, FileText, Clock } from "lucide-react"

const sidebarLinks = [
  { label: "Employee", path: "/modules/hr/employee", icon: Users },
  { label: "Department", path: "/modules/hr/department", icon: Building2 },
  { label: "Designation", path: "/modules/hr/designation", icon: Briefcase },
  { label: "Attendance", path: "/modules/hr/attendance", icon: CalendarCheck },
  { label: "Leave Application", path: "/modules/hr/leave-application", icon: FileText },
  { label: "Shift Type", path: "/modules/hr/shift-type", icon: Clock },
]

const employeeColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "employee_name", header: "Name" },
  { accessorKey: "department", header: "Department" },
  { accessorKey: "designation", header: "Designation" },
  { accessorKey: "company", header: "Company" },
  { accessorKey: "status", header: "Status" },
]

const departmentColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "department_name", header: "Department Name" },
  { accessorKey: "company", header: "Company" },
  { accessorKey: "parent_department", header: "Parent Department" },
]

const designationColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "designation_name", header: "Designation" },
]

const attendanceColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "employee", header: "Employee" },
  { accessorKey: "employee_name", header: "Name" },
  { accessorKey: "attendance_date", header: "Date" },
  { accessorKey: "status", header: "Status" },
]

const leaveColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "employee", header: "Employee" },
  { accessorKey: "employee_name", header: "Name" },
  { accessorKey: "leave_type", header: "Leave Type" },
  { accessorKey: "from_date", header: "From" },
  { accessorKey: "to_date", header: "To" },
  { accessorKey: "status", header: "Status" },
]

const shiftTypeColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "shift_type_name", header: "Shift Type" },
  { accessorKey: "start_time", header: "Start Time" },
  { accessorKey: "end_time", header: "End Time" },
]

const docTypeConfig: Record<string, { fields: string[]; columns: ColumnDef<any, any>[]; label: string }> = {
  employee: { fields: ["name", "employee_name", "department", "designation", "company", "status"], columns: employeeColumns, label: "Employee" },
  department: { fields: ["name", "department_name", "company", "parent_department"], columns: departmentColumns, label: "Department" },
  designation: { fields: ["name", "designation_name"], columns: designationColumns, label: "Designation" },
  attendance: { fields: ["name", "employee", "employee_name", "attendance_date", "status"], columns: attendanceColumns, label: "Attendance" },
  "leave-application": { fields: ["name", "employee", "employee_name", "leave_type", "from_date", "to_date", "status"], columns: leaveColumns, label: "Leave Application" },
  "shift-type": { fields: ["name", "shift_type_name", "start_time", "end_time"], columns: shiftTypeColumns, label: "Shift Type" },
}

export default function HR() {
  const location = useLocation()
  const [selectedCompany] = useAtom(selectedCompanyAtom)
  const pathParts = location.pathname.split("/")
  const activeKey = pathParts[pathParts.length - 1] || "employee"

  const config = docTypeConfig[activeKey] ?? docTypeConfig.employee

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
    <ModuleLayout title="HR" sidebar={sidebar}>
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-sm text-ink-gray-5">Loading...</div>
        </div>
      ) : !data?.length ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Users className="mb-3 h-10 w-10 text-ink-gray-4" />
          <p className="text-sm text-ink-gray-5">No records found</p>
        </div>
      ) : (
        <ListView columns={config.columns} data={data} />
      )}
    </ModuleLayout>
  )
}
