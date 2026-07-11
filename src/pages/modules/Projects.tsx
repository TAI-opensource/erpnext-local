import { useState } from "react"
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

const sidebarItems = [
  { label: "Project", route: "/app/projects/project", icon: <FolderKanban className="h-4 w-4" /> },
  { label: "Task", route: "/app/projects/task", icon: <CheckSquare className="h-4 w-4" /> },
  { label: "Project Template", route: "/app/projects/project-template", icon: <LayoutTemplate className="h-4 w-4" /> },
  { label: "Timesheet", route: "/app/projects/timesheet", icon: <Clock className="h-4 w-4" /> },
]

const columns: Record<string, { doctype: string; fields: string[]; columns: ColumnDef<any, unknown>[] }> = {
  project: { doctype: "Project", fields: ["name", "project_name", "status", "company", "percent_complete"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "project_name", header: "Project Name", size: 200 },
    { accessorKey: "status", header: "Status", size: 100 },
    { accessorKey: "company", header: "Company", size: 150 },
    { accessorKey: "percent_complete", header: "% Complete", size: 100, meta: { align: "right", tabularNums: true } },
  ]},
  task: { doctype: "Task", fields: ["name", "subject", "project", "status", "priority", "exp_start_date", "exp_end_date"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "subject", header: "Subject", size: 200 },
    { accessorKey: "project", header: "Project", size: 150 },
    { accessorKey: "status", header: "Status", size: 100 },
    { accessorKey: "priority", header: "Priority", size: 100 },
    { accessorKey: "exp_start_date", header: "Start Date", size: 120 },
    { accessorKey: "exp_end_date", header: "Due Date", size: 120 },
  ]},
  "project-template": { doctype: "Project Template", fields: ["name", "project_name", "description"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "project_name", header: "Template Name", size: 200 },
    { accessorKey: "description", header: "Description", size: 200 },
  ]},
  timesheet: { doctype: "Timesheet", fields: ["name", "employee", "employee_name", "start_date", "end_date", "total_hours"], columns: [
    { accessorKey: "name", header: "ID", size: 120 },
    { accessorKey: "employee", header: "Employee", size: 120 },
    { accessorKey: "employee_name", header: "Name", size: 200 },
    { accessorKey: "start_date", header: "Start Date", size: 120 },
    { accessorKey: "end_date", header: "End Date", size: 120 },
    { accessorKey: "total_hours", header: "Total Hours", size: 100, meta: { align: "right", tabularNums: true } },
  ]},
}

export default function ProjectsModule() {
  const [selectedCompany] = useAtom(selectedCompanyAtom)
  const [activeSection, setActiveSection] = useState("project")
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
      title="Projects"
      subtitle="Project Management"
      icon={<FolderKanban className="h-5 w-5" />}
      sidebarItems={sidebarItems}
      activeRoute={`/app/projects/${activeSection}`}
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
                <FolderKanban className="h-8 w-8" />
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
