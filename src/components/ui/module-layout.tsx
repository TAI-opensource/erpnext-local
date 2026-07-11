import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowLeft, Plus, Search } from "lucide-react"
import { ReactNode, useState } from "react"
import { useNavigate } from "react-router"

export type ModuleSidebarItem = {
  label: string
  route: string
  icon?: ReactNode
}

export type ModuleLayoutProps = {
  title: string
  subtitle?: string
  icon?: ReactNode
  sidebarItems: ModuleSidebarItem[]
  activeRoute?: string
  children: ReactNode
  onNew?: () => void
  newLabel?: string
}

export function ModuleLayout({
  title,
  subtitle,
  icon,
  sidebarItems,
  activeRoute,
  children,
  onNew,
  newLabel = "New",
}: ModuleLayoutProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")

  const filtered = sidebarItems.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <div className="flex w-60 flex-col border-r border-outline-gray-1 bg-surface-gray-2">
        <div className="flex items-center gap-2 border-b border-outline-gray-1 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            {icon && <span className="text-ink-gray-5 shrink-0">{icon}</span>}
            <div className="min-w-0">
              <div className="text-p-base font-medium text-ink-gray-8 truncate">{title}</div>
              {subtitle && <div className="text-p-xs text-ink-gray-5 truncate">{subtitle}</div>}
            </div>
          </div>
        </div>

        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-gray-4" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-md border border-outline-gray-2 bg-white pl-7 pr-2 text-sm text-ink-gray-8 placeholder:text-ink-gray-4 focus:border-outline-gray-4 focus:outline-none"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-1">
          {filtered.map((item) => (
            <button
              key={item.route}
              onClick={() => navigate(item.route)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                activeRoute === item.route
                  ? "bg-surface-gray-3 text-ink-gray-8 font-medium"
                  : "text-ink-gray-6 hover:bg-surface-gray-3 hover:text-ink-gray-8"
              )}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-ink-gray-4">No items found</div>
          )}
        </nav>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline-gray-1 px-6 py-3">
          <div>
            <h1 className="text-p-xl font-semibold text-ink-gray-8">{title}</h1>
            {subtitle && <p className="text-p-sm text-ink-gray-5">{subtitle}</p>}
          </div>
          {onNew && (
            <Button onClick={onNew} size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {newLabel}
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
    </div>
  )
}
