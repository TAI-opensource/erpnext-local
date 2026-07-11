import { useLocation } from "react-router"
import { ModuleLayout } from "@/components/ui/module-layout"
import { ListView } from "@/components/ui/list-view"
import { useFrappeGetDocList } from "frappe-react-sdk"
import type { ColumnDef } from "@tanstack/react-table"
import { useAtom } from "jotai"
import { selectedCompanyAtom } from "@/hooks/useCurrentCompany"
import {
  FolderKanban,
  CheckSquare,
  LayoutTemplate,
  Clock,
} from "lucide-react"
import { Link } from "react-router"

const sidebarLinks = [
  { label: "Project", path: "/modules/projects/project", icon: FolderKanban },
  { label: "Task", path: "/modules/projects/task", icon: CheckSquare },
  { label: "Project Template", path: "/modules/projects/project-template", icon: LayoutTemplate },
  { label: "Timesheet", path: "/modules/projects/timesheet", icon: Clock },
]

const projectColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "project_name", header: "Project Name" },
  { accessorKey: "status", header: "Status" },
  { accessorKey: "company", header: "Company" },
  {
    accessorKey: "percent_complete",
    header: "% Complete",
    meta: { align: "right", tabularNums: true },
  },
]

const taskColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "subject", header: "Subject" },
  { accessorKey: "project", header: "Project" },
  { accessorKey: "status", header: "Status" },
  { accessorKey: "priority", header: "Priority" },
  { accessorKey: "exp_start_date", header: "Start Date" },
  { accessorKey: "exp_end_date", header: "Due Date" },
]

const projectTemplateColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "project_name", header: "Template Name" },
  { accessorKey: "description", header: "Description" },
]

const timesheetColumns: ColumnDef<any, any>[] = [
  { accessorKey: "name", header: "ID" },
  { accessorKey: "employee", header: "Employee" },
  { accessorKey: "employee_name", header: "Name" },
  { accessorKey: "start_date", header: "Start Date" },
  { accessorKey: "end_date", header: "End Date" },
  {
    accessorKey: "total_hours",
    header: "Total Hours",
    meta: { align: "right", tabularNums: true },
  },
]

const docTypeConfig: Record<
  string,
  { fields: string[]; columns: ColumnDef<any, any>[]; label: string }
> = {
  project: {
    fields: ["name", "project_name", "status", "company", "percent_complete"],
    columns: projectColumns,
    label: "Project",
  },
  task: {
    fields: ["name", "subject", "project", "status", "priority", "exp_start_date", "exp_end_date"],
    columns: taskColumns,
    label: "Task",
  },
  "project-template": {
    fields: ["name", "project_name", "description"],
    columns: projectTemplateColumns,
    label: "Project Template",
  },
  timesheet: {
    fields: ["name", "employee", "employee_name", "start_date", "end_date", "total_hours"],
    columns: timesheetColumns,
    label: "Timesheet",
  },
}

export default function Projects() {
  const location = useLocation()
  const [selectedCompany] = useAtom(selectedCompanyAtom)
  const pathParts = location.pathname.split("/")
  const activeKey = pathParts[pathParts.length - 1] || "project"

  const config = docTypeConfig[activeKey] ?? docTypeConfig.project

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
    <ModuleLayout title="Projects" sidebar={sidebar}>
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-sm text-ink-gray-5">Loading...</div>
        </div>
      ) : !data?.length ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <FolderKanban className="mb-3 h-10 w-10 text-ink-gray-4" />
          <p className="text-sm text-ink-gray-5">No records found</p>
        </div>
      ) : (
        <ListView columns={config.columns} data={data} />
      )}
    </ModuleLayout>
  )
}
