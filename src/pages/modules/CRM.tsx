import { useState } from "react"
import { ModuleLayout } from "@/components/ui/module-layout"
import { ListView } from "@/components/ui/list-view"
import type { ColumnDef } from "@tanstack/react-table"
import { useFrappeGetDocList } from "frappe-react-sdk"
import { useAtom } from "jotai"
import { selectedCompanyAtom } from "@/hooks/useCurrentCompany"
import { HandCoins, Users, Target, FileText } from "lucide-react"

const sidebarItems = [
  { label: "Lead", route: "/app/crm/lead", icon: <Users className="h-4 w-4" /> },
  { label: "Opportunity", route: "/app/crm/opportunity", icon: <Target className="h-4 w-4" /> },
  { label: "Prospect", route: "/app/crm/prospect", icon: <HandCoins className="h-4 w-4" /> },
  { label: "Campaign", route: "/app/crm/campaign", icon: <FileText className="h-4 w-4" /> },
]

const leadColumns: ColumnDef<any, unknown>[] = [
  { accessorKey: "name", header: "ID", size: 120 },
  { accessorKey: "lead_name", header: "Lead Name", size: 200 },
  { accessorKey: "company_name", header: "Company", size: 150 },
  { accessorKey: "email_id", header: "Email", size: 200 },
  { accessorKey: "status", header: "Status", size: 120 },
  { accessorKey: "source", header: "Source", size: 120 },
]

const opportunityColumns: ColumnDef<any, unknown>[] = [
  { accessorKey: "name", header: "ID", size: 120 },
  { accessorKey: "title", header: "Title", size: 200 },
  { accessorKey: "party_name", header: "Party", size: 150 },
  { accessorKey: "opportunity_type", header: "Type", size: 120 },
  { accessorKey: "status", header: "Status", size: 120 },
  { accessorKey: "company", header: "Company", size: 150 },
]

const prospectColumns: ColumnDef<any, unknown>[] = [
  { accessorKey: "name", header: "ID", size: 120 },
  { accessorKey: "prospect_name", header: "Name", size: 200 },
  { accessorKey: "company_name", header: "Company", size: 150 },
  { accessorKey: "email_id", header: "Email", size: 200 },
]

const campaignColumns: ColumnDef<any, unknown>[] = [
  { accessorKey: "name", header: "ID", size: 120 },
  { accessorKey: "campaign_name", header: "Campaign Name", size: 200 },
  { accessorKey: "campaign_type", header: "Type", size: 150 },
  { accessorKey: "status", header: "Status", size: 120 },
]

const sectionConfig: Record<string, { doctype: string; fields: string[]; columns: ColumnDef<any, unknown>[] }> = {
  lead: { doctype: "Lead", fields: ["name", "lead_name", "company_name", "email_id", "status", "source"], columns: leadColumns },
  opportunity: { doctype: "Opportunity", fields: ["name", "title", "party_name", "opportunity_type", "status", "company"], columns: opportunityColumns },
  prospect: { doctype: "Prospect", fields: ["name", "prospect_name", "company_name", "email_id"], columns: prospectColumns },
  campaign: { doctype: "Campaign", fields: ["name", "campaign_name", "campaign_type", "status"], columns: campaignColumns },
}

export default function CRMModule() {
  const [selectedCompany] = useAtom(selectedCompanyAtom)
  const [activeSection, setActiveSection] = useState("lead")
  const config = sectionConfig[activeSection]

  const filters = selectedCompany ? { company: selectedCompany } : undefined
  const { data, isLoading } = useFrappeGetDocList(config.doctype, {
    fields: config.fields,
    filters,
    limit_page_length: 50,
    order_by: "creation desc",
  })

  return (
    <ModuleLayout
      title="CRM"
      subtitle="Customer Relationship Management"
      icon={<HandCoins className="h-5 w-5" />}
      sidebarItems={sidebarItems}
      activeRoute={`/app/crm/${activeSection}`}
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
                <HandCoins className="h-8 w-8" />
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
