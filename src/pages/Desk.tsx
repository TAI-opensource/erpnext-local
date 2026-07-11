import { useNavigate } from "react-router"
import {
  Landmark,
  ShoppingCart,
  PackageCheck,
  Warehouse,
  Users,
  Wallet,
  Briefcase,
  BarChart3,
  Settings,
  Building2,
  FileText,
  HandCoins,
} from "lucide-react"

const modules = [
  { name: "Accounts", route: "/app/accounts", icon: Landmark, color: "bg-blue-100 text-blue-600" },
  { name: "Selling", route: "/app/selling", icon: ShoppingCart, color: "bg-green-100 text-green-600" },
  { name: "Buying", route: "/app/buying", icon: PackageCheck, color: "bg-orange-100 text-orange-600" },
  { name: "Stock", route: "/app/stock", icon: Warehouse, color: "bg-purple-100 text-purple-600" },
  { name: "HR", route: "/app/hr", icon: Users, color: "bg-pink-100 text-pink-600" },
  { name: "Payroll", route: "/app/payroll", icon: Wallet, color: "bg-yellow-100 text-yellow-600" },
  { name: "Assets", route: "/app/assets", icon: Briefcase, color: "bg-indigo-100 text-indigo-600" },
  { name: "Projects", route: "/app/projects", icon: BarChart3, color: "bg-teal-100 text-teal-600" },
  { name: "CRM", route: "/app/crm", icon: HandCoins, color: "bg-rose-100 text-rose-600" },
  { name: "Setup", route: "/app/setup", icon: Settings, color: "bg-gray-100 text-gray-600" },
  { name: "Banking", route: "/", icon: Building2, color: "bg-cyan-100 text-cyan-600" },
  { name: "Reports", route: "/app/reports", icon: FileText, color: "bg-violet-100 text-violet-600" },
]

export default function Desk() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-surface-gray-1">
      {/* Header */}
      <div className="border-b border-outline-gray-1 bg-white px-8 py-5">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold text-ink-gray-8">ERPNext Local</h1>
          <p className="text-p-sm text-ink-gray-5 mt-1">All your business modules in one place</p>
        </div>
      </div>

      {/* Module Grid */}
      <div className="mx-auto max-w-5xl px-8 py-8">
        <h2 className="text-p-base font-medium text-ink-gray-6 mb-4">Modules</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {modules.map((mod) => (
            <button
              key={mod.name}
              onClick={() => navigate(mod.route)}
              className="group flex flex-col items-center gap-3 rounded-xl border border-outline-gray-1 bg-white p-6 shadow-sm transition-all hover:border-outline-gray-4 hover:shadow-md"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${mod.color}`}>
                <mod.icon className="h-6 w-6" />
              </div>
              <span className="text-p-base font-medium text-ink-gray-8 group-hover:text-ink-blue-link">
                {mod.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
