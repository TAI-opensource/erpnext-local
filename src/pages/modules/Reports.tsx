import { ModuleLayout } from "@/components/ui/module-layout"
import {
  BookOpen,
  TrendingUp,
  Building,
  UserCheck,
  UserX,
  Package,
  ShoppingCart,
  Receipt,
} from "lucide-react"
import { Link } from "react-router"

const sidebarLinks = [
  { label: "General Ledger", path: "/modules/reports/general-ledger", icon: BookOpen },
  { label: "Profit and Loss", path: "/modules/reports/profit-and-loss", icon: TrendingUp },
  { label: "Balance Sheet", path: "/modules/reports/balance-sheet", icon: Building },
  { label: "Accounts Receivable", path: "/modules/reports/accounts-receivable", icon: UserCheck },
  { label: "Accounts Payable", path: "/modules/reports/accounts-payable", icon: UserX },
  { label: "Stock Balance", path: "/modules/reports/stock-balance", icon: Package },
  { label: "Sales Register", path: "/modules/reports/sales-register", icon: ShoppingCart },
  { label: "Purchase Register", path: "/modules/reports/purchase-register", icon: Receipt },
]

const reportCards = [
  {
    title: "General Ledger",
    description: "View all accounting transactions with filters for account, date range, and party.",
    icon: BookOpen,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Profit and Loss",
    description: "Analyze income and expenses over a period to determine profitability.",
    icon: TrendingUp,
    color: "bg-green-100 text-green-600",
  },
  {
    title: "Balance Sheet",
    description: "View assets, liabilities, and equity at a specific point in time.",
    icon: Building,
    color: "bg-purple-100 text-purple-600",
  },
  {
    title: "Accounts Receivable",
    description: "Track outstanding customer invoices and aging analysis.",
    icon: UserCheck,
    color: "bg-orange-100 text-orange-600",
  },
  {
    title: "Accounts Payable",
    description: "Track outstanding vendor bills and payment schedules.",
    icon: UserX,
    color: "bg-red-100 text-red-600",
  },
  {
    title: "Stock Balance",
    description: "View current stock levels and valuation across warehouses.",
    icon: Package,
    color: "bg-yellow-100 text-yellow-600",
  },
  {
    title: "Sales Register",
    description: "Summary of all sales invoices with tax breakdowns.",
    icon: ShoppingCart,
    color: "bg-teal-100 text-teal-600",
  },
  {
    title: "Purchase Register",
    description: "Summary of all purchase invoices with tax breakdowns.",
    icon: Receipt,
    color: "bg-pink-100 text-pink-600",
  },
]

const sidebar = (
  <nav className="flex flex-col gap-1 p-2">
    {sidebarLinks.map((link) => {
      const Icon = link.icon
      return (
        <Link
          key={link.path}
          to={link.path}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-gray-6 transition-colors hover:bg-surface-gray-1 hover:text-ink-gray-8"
        >
          <Icon className="h-4 w-4 shrink-0" />
          {link.label}
        </Link>
      )
    })}
  </nav>
)

export default function Reports() {
  return (
    <ModuleLayout title="Reports" sidebar={sidebar}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportCards.map((report) => {
          const Icon = report.icon
          return (
            <div
              key={report.title}
              className="flex flex-col gap-3 rounded-xl border border-outline-gray-1 bg-white p-6 shadow-sm transition-all hover:border-outline-gray-4 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${report.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-p-base font-medium text-ink-gray-8">{report.title}</h3>
              </div>
              <p className="text-p-sm text-ink-gray-5">{report.description}</p>
            </div>
          )
        })}
      </div>
    </ModuleLayout>
  )
}
