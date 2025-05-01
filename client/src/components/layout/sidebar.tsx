import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export interface SidebarLink {
  href: string;
  icon: string;
  text: string;
}

interface SidebarProps {
  links: SidebarLink[];
  title: string;
  isVisible: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ links, title, isVisible }) => {
  const [location] = useLocation();

  const isActive = (href: string) => {
    // For exact match
    if (location === href) return true;
    
    // For parent paths (e.g. /admin/dashboard should highlight /admin)
    if (href !== "/" && location.startsWith(href)) return true;
    
    return false;
  };

  return (
    <aside 
      className={cn(
        "w-64 bg-white shadow-md transition-all duration-300 ease-in-out overflow-y-auto h-full",
        isVisible ? "block" : "hidden md:block"
      )}
    >
      <div className="py-4">
        <div className="px-4 mb-4">
          <div className="font-medium text-sm text-neutral-500 uppercase">{title}</div>
        </div>
        <nav>
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              <a 
                className={cn(
                  "sidebar-link flex items-center px-4 py-3 text-neutral-800 hover:bg-neutral-100",
                  isActive(link.href) && "active"
                )}
              >
                <span className="material-icons ml-3 text-neutral-600">{link.icon}</span>
                <span>{link.text}</span>
              </a>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
