import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Workflow, 
  Library, 
  BarChart2, 
  FileText, 
  Settings, 
  User 
} from "lucide-react";

export function Sidebar() {
  const navItems = [
    { name: "Dashboard", path: "/", icon: <LayoutDashboard size={20} /> },
    { name: "Sales Calls", path: "/workflows", icon: <Workflow size={20} /> },
    { name: "Playbooks", path: "/knowledge", icon: <Library size={20} /> },
    { name: "Analytics", path: "/analytics", icon: <BarChart2 size={20} /> },
    { name: "Reports", path: "/reports", icon: <FileText size={20} /> },
    { name: "Settings", path: "/settings", icon: <Settings size={20} /> },
    { name: "Profile", path: "/profile", icon: <User size={20} /> },
  ];

  return (
    <div className="w-64 bg-card border-r border-border h-full flex flex-col shadow-sm">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold text-primary tracking-tight">SalesOS</h1>
        <p className="text-xs text-muted-foreground mt-1">Intelligence & Coaching</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-md transition-colors ${
                isActive 
                  ? "bg-secondary text-primary font-medium" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
          <span>v2.0 Enterprise</span>
        </div>
      </div>
    </div>
  );
}
