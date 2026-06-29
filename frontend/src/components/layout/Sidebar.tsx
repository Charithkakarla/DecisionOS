import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Workflow, History, BookOpen,
  GitBranch, BarChart2, FileText, Settings, User, Layers,
} from "lucide-react";

const NAV = [
  { path: "/", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
  { path: "/workflows", icon: <Workflow size={18} />, label: "Sales Calls" },
  { path: "/history", icon: <History size={18} />, label: "History" },
  { path: "/knowledge", icon: <BookOpen size={18} />, label: "Playbooks" },
  { path: "/pipeline", icon: <GitBranch size={18} />, label: "Pipeline" },
  { path: "/analytics", icon: <BarChart2 size={18} />, label: "Analytics" },
  { path: "/reports", icon: <FileText size={18} />, label: "Reports" },
];

const BOTTOM = [
  { path: "/settings", icon: <Settings size={18} />, label: "Settings" },
  { path: "/profile", icon: <User size={18} />, label: "Profile" },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  return (
    <aside
      className="h-full flex flex-col shrink-0 overflow-hidden"
      style={{
        width: collapsed ? 52 : 220,
        backgroundColor: "hsl(var(--sidebar-bg))",
        borderRight: "1px solid hsl(var(--sidebar-border))",
      }}
    >
      {/* Logo */}
      <div
        className="flex h-[65px] items-center shrink-0 px-3 gap-3"
        style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded cursor-pointer select-none"
          style={{
            backgroundColor: "hsl(var(--sidebar-active-fg) / 0.15)",
            color: "hsl(var(--sidebar-active-fg))",
          }}
        >
          <Layers size={15} strokeWidth={2.5} />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              key="logo-label"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="text-sm font-bold whitespace-nowrap overflow-hidden tracking-tight"
              style={{ color: "hsl(var(--sidebar-fg))" }}
            >
              DecisionOS
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Search Shortcut Bar */}
      {!collapsed && (
        <div className="px-3 py-2 mt-2 shrink-0">
          <div
            onClick={() => {
              const e = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true });
              window.dispatchEvent(e);
            }}
            className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[10px] font-bold cursor-pointer select-none transition-colors"
            style={{
              backgroundColor: "hsl(var(--sidebar-hover-bg))",
              border: "1px solid hsl(var(--sidebar-border))",
              color: "hsl(var(--sidebar-muted))",
            }}
          >
            <span>Search actions...</span>
            <span
              className="px-1.5 py-0.5 rounded font-mono text-[9px] font-black"
              style={{
                backgroundColor: "hsl(var(--sidebar-bg))",
                border: "1px solid hsl(var(--sidebar-border))",
                color: "hsl(var(--sidebar-muted))",
              }}
            >
              Ctrl+K
            </span>
          </div>
        </div>
      )}

      {/* Main nav */}
      <nav className="flex-1 flex flex-col py-3 gap-0.5 overflow-y-auto px-2">
        {NAV.map((item, i) => (
          <motion.div
            key={item.path}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.2 }}
            className="w-full"
          >
            <NavLink
              to={item.path}
              end={item.path === "/"}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `sidebar-nav-link flex h-9 items-center gap-3 rounded-lg px-2.5 transition-all duration-150 ${collapsed ? "justify-center w-9 mx-auto" : "w-full"
                } ${isActive ? "sidebar-active" : ""}`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive
                  ? "hsl(var(--sidebar-active-bg))"
                  : "transparent",
                color: isActive
                  ? "hsl(var(--sidebar-active-fg))"
                  : "hsl(var(--sidebar-muted))",
              })}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                if (!el.classList.contains("sidebar-active")) {
                  el.style.backgroundColor = "hsl(var(--sidebar-hover-bg))";
                  el.style.color = "hsl(var(--sidebar-fg))";
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                if (!el.classList.contains("sidebar-active")) {
                  el.style.backgroundColor = "transparent";
                  el.style.color = "hsl(var(--sidebar-muted))";
                }
              }}
            >
              {({ isActive }) => (
                <>
                  <span className="shrink-0">{item.icon}</span>
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        key={`label-${item.path}`}
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className={`text-sm whitespace-nowrap overflow-hidden ${isActive ? "font-semibold" : "font-medium"}`}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* Bottom nav */}
      <div
        className="flex flex-col py-3 gap-0.5 shrink-0 px-2"
        style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}
      >
        {BOTTOM.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `sidebar-nav-link flex h-9 items-center gap-3 rounded-lg px-2.5 transition-all duration-150 ${collapsed ? "justify-center w-9 mx-auto" : "w-full"
              } ${isActive ? "sidebar-active" : ""}`
            }
            style={({ isActive }) => ({
              backgroundColor: isActive
                ? "hsl(var(--sidebar-active-bg))"
                : "transparent",
              color: isActive
                ? "hsl(var(--sidebar-active-fg))"
                : "hsl(var(--sidebar-muted))",
            })}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              if (!el.classList.contains("sidebar-active")) {
                el.style.backgroundColor = "hsl(var(--sidebar-hover-bg))";
                el.style.color = "hsl(var(--sidebar-fg))";
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              if (!el.classList.contains("sidebar-active")) {
                el.style.backgroundColor = "transparent";
                el.style.color = "hsl(var(--sidebar-muted))";
              }
            }}
          >
            {({ isActive }) => (
              <>
                <span className="shrink-0">{item.icon}</span>
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      key={`bottom-label-${item.path}`}
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className={`text-sm whitespace-nowrap overflow-hidden ${isActive ? "font-semibold" : "font-medium"}`}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
