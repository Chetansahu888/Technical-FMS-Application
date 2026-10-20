import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ticketService } from '../../services/ticketService';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  CheckSquare,
  ListOrdered,
  FileCheck2,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'employee';

  const allTickets = ticketService.getTickets();
  const myAssignedCount = allTickets.filter(
    t => t.currentlyAssignedToId === currentUser?.id && t.status !== 'Completed'
  ).length;
  const myCreatedCount = allTickets.filter(
    t => t.requesterId === currentUser?.id && t.status !== 'Completed'
  ).length;
  const pendingTotal = allTickets.filter(t => t.status === 'Pending').length;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} aria-label="Sidebar navigation">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <img src="/logo.png" alt="Technical Help FMS" className="brand-logo-img" />
        </div>
        {!collapsed && (
          <div className="brand-info">
            <span className="brand-name">Technical Help FMS</span>
            <span className="brand-tagline">Issue Tracking</span>
          </div>
        )}
      </div>

      {/* Nav Links */}
      <nav className="sidebar-nav">
        {/* Dashboard - All */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          title="Dashboard"
        >
          <LayoutDashboard size={18} />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        {/* New Ticket - All Authenticated Users */}
        <NavLink
          to="/new-ticket"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          title="Raise New Ticket"
        >
          <PlusCircle size={18} />
          {!collapsed && <span>New Ticket</span>}
        </NavLink>

        {/* My Tickets - All Authenticated Users */}
        <NavLink
          to="/my-tickets"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          title="My Tickets"
        >
          <FileText size={18} />
          {!collapsed && <span>My Tickets</span>}
          {!collapsed && myCreatedCount > 0 && (
            <span className="badge-count">{myCreatedCount}</span>
          )}
        </NavLink>

        {/* Assigned Tickets - IT Staff & Admin */}
        {(role === 'it_person' || role === 'admin') && (
          <NavLink
            to="/assigned-tickets"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            title="Assigned Tickets"
          >
            <CheckSquare size={18} />
            {!collapsed && <span>Assigned Tickets</span>}
            {!collapsed && myAssignedCount > 0 && (
              <span className="badge-count">{myAssignedCount}</span>
            )}
          </NavLink>
        )}

        {/* All Tickets - Admin only */}
        {role === 'admin' && (
          <NavLink
            to="/all-tickets"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            title="All Tickets"
          >
            <ListOrdered size={18} />
            {!collapsed && <span>All Tickets</span>}
            {!collapsed && pendingTotal > 0 && (
              <span className="badge-count">{pendingTotal}</span>
            )}
          </NavLink>
        )}

        {/* Completed Tickets - All */}
        <NavLink
          to="/completed-tickets"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          title="Completed Tickets"
        >
          <FileCheck2 size={18} />
          {!collapsed && <span>Completed</span>}
        </NavLink>


        {/* User & Admin Management - Admin only */}
        {role === 'admin' && (
          <NavLink
            to="/master-settings"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            title="User & Admin Management"
          >
            <Settings size={18} />
            {!collapsed && <span>User Management</span>}
          </NavLink>
        )}
      </nav>
    </aside>
  );
};
