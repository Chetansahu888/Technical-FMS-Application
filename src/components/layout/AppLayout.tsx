import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { TicketDetailsDrawer } from '../tickets/TicketDetailsDrawer';
import { HoldModal, CompleteModal, ReassignModal } from '../tickets/ActionModals';
import { Ticket } from '../../types';
import { ticketService } from '../../services/ticketService';
import { googleSheetsAdapter } from '../../services/googleSheetsAdapter';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export interface AppLayoutContextType {
  openTicketDetails: (ticket: Ticket) => void;
  requestHold: (ticket: Ticket) => void;
  requestComplete: (ticket: Ticket) => void;
  requestReassign: (ticket: Ticket) => void;
  requestDelete?: (ticket: Ticket) => void;
  refreshData: () => void;
}

export const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modals
  const [holdTicket, setHoldTicket] = useState<Ticket | null>(null);
  const [completeTicket, setCompleteTicket] = useState<Ticket | null>(null);
  const [reassignTicket, setReassignTicket] = useState<Ticket | null>(null);

  // Refresh trigger for child routes
  const [tick, setTick] = useState(0);
  const refreshData = () => setTick(t => t + 1);

  // Auto-sync with Google Sheet in background & on window focus
  useEffect(() => {
    if (!googleSheetsAdapter.isConnected()) return;

    let isMounted = true;
    const runBackgroundSync = async () => {
      try {
        const res = await ticketService.syncFromSheet();
        if (isMounted && res.hasChanges) {
          refreshData();
        }
      } catch (err) {
        // silent background sync
      }
    };

    // Run immediately when layout loads
    runBackgroundSync();

    // Auto-poll every 15 seconds
    const interval = setInterval(runBackgroundSync, 15000);

    // Sync when user switches back to this browser tab or triggers manual sync
    window.addEventListener('focus', runBackgroundSync);
    window.addEventListener('tech_fms_synced', refreshData);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', runBackgroundSync);
      window.removeEventListener('tech_fms_synced', refreshData);
    };
  }, []);

  const { currentUser } = useAuth();
  const notification = useNotification();
  const location = useLocation();

  const getPageTitle = (path: string): string => {
    switch (path) {
      case '/dashboard':
        return 'Dashboard';
      case '/new-ticket':
        return 'Raise New Ticket';
      case '/my-tickets':
        return 'My Submitted Tickets';
      case '/assigned-tickets':
        return 'Assigned Technical Tickets';
      case '/all-tickets':
        return 'All System Tickets';
      case '/completed-tickets':
        return 'Completed Tickets Archive';
      case '/master-settings':
        return 'User & Admin Management';
      default:
        return 'Technical Help FMS';
    }
  };

  const handleOpenTicketDetails = (ticket: Ticket) => {
    // Reload fresh data from service
    const fresh = ticketService.getTicketById(ticket.id) || ticket;
    setSelectedTicket(fresh);
    setIsDrawerOpen(true);
  };

  const handleStartWork = (ticketId: string) => {
    if (!currentUser) return;
    try {
      const updated = ticketService.startWork(ticketId, currentUser);
      notification.success('Work Started', `Ticket ${updated.ticketNumber} is now In Progress.`);
      setSelectedTicket(updated);
      refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start work';
      notification.error('Error', msg);
    }
  };

  const handleHoldSubmit = (reason: string) => {
    if (!holdTicket || !currentUser) return;
    try {
      const updated = ticketService.holdWork(holdTicket.id, reason, currentUser);
      notification.warning('Ticket Put On Hold', `Ticket ${updated.ticketNumber} is currently on hold.`);
      if (selectedTicket?.id === updated.id) {
        setSelectedTicket(updated);
      }
      refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to hold ticket';
      notification.error('Error', msg);
    }
  };

  const handleResumeWork = (ticketId: string) => {
    if (!currentUser) return;
    try {
      const updated = ticketService.resumeWork(ticketId, currentUser);
      notification.success('Work Resumed', `Ticket ${updated.ticketNumber} is back In Progress.`);
      setSelectedTicket(updated);
      refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resume work';
      notification.error('Error', msg);
    }
  };

  const handleCompleteSubmit = (solutionRemarks: string) => {
    if (!completeTicket || !currentUser) return;
    try {
      const updated = ticketService.markDone(completeTicket.id, solutionRemarks, currentUser);
      notification.success('Ticket Completed', `Ticket ${updated.ticketNumber} has been resolved.`);
      if (selectedTicket?.id === updated.id) {
        setSelectedTicket(updated);
      }
      refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to complete ticket';
      notification.error('Error', msg);
    }
  };

  const handleReassignSubmit = (newAssigneeId: string, reason: string) => {
    if (!reassignTicket || !currentUser) return;
    try {
      const updated = ticketService.reassignTicket(reassignTicket.id, newAssigneeId, reason, currentUser);
      notification.info('Ticket Reassigned', `Assigned to ${updated.currentlyAssignedToName}.`);
      if (selectedTicket?.id === updated.id) {
        setSelectedTicket(updated);
      }
      refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reassign';
      notification.error('Error', msg);
    }
  };

  const handleDeleteTicket = async (ticket: Ticket) => {
    if (
      !confirm(
        `Are you sure you want to delete ticket "${ticket.ticketNumber}"? It will also be deleted from Google Sheet.`
      )
    ) {
      return;
    }
    try {
      await ticketService.deleteTicket(ticket.id);
      notification.success('Ticket Deleted', `Ticket ${ticket.ticketNumber} was deleted successfully.`);
      if (selectedTicket?.id === ticket.id) {
        setIsDrawerOpen(false);
      }
      refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete ticket';
      notification.error('Error', msg);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className={`main-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <TopNavbar
          pageTitle={getPageTitle(location.pathname)}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          isSidebarCollapsed={sidebarCollapsed}
          onSyncComplete={refreshData}
        />

        <main className="page-container">
          <Outlet
            context={{
              openTicketDetails: handleOpenTicketDetails,
              requestHold: setHoldTicket,
              requestComplete: setCompleteTicket,
              requestReassign: setReassignTicket,
              requestDelete: handleDeleteTicket,
              tick,
              refreshData,
            }}
          />
        </main>
      </div>

      {/* Ticket Details Drawer */}
      <TicketDetailsDrawer
        ticket={selectedTicket}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onStartWork={handleStartWork}
        onRequestHold={ticket => setHoldTicket(ticket)}
        onResumeWork={handleResumeWork}
        onRequestMarkDone={ticket => setCompleteTicket(ticket)}
        onRequestReassign={ticket => setReassignTicket(ticket)}
        onRequestDelete={handleDeleteTicket}
      />

      {/* Hold Modal */}
      {holdTicket && (
        <HoldModal
          ticket={holdTicket}
          isOpen={Boolean(holdTicket)}
          onClose={() => setHoldTicket(null)}
          onSubmit={handleHoldSubmit}
        />
      )}

      {/* Complete Modal */}
      {completeTicket && (
        <CompleteModal
          ticket={completeTicket}
          isOpen={Boolean(completeTicket)}
          onClose={() => setCompleteTicket(null)}
          onSubmit={handleCompleteSubmit}
        />
      )}

      {/* Reassign Modal */}
      {reassignTicket && (
        <ReassignModal
          ticket={reassignTicket}
          isOpen={Boolean(reassignTicket)}
          onClose={() => setReassignTicket(null)}
          onSubmit={handleReassignSubmit}
        />
      )}
    </div>
  );
};
