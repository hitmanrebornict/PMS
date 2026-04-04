import { Building2, BedDouble, Wrench, BarChart3, Users, CalendarDays, FileText, LayoutDashboard, X, UserCog } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SidebarItem } from '../common/SidebarItem';
import { useAuth } from '../../contexts/AuthContext';

export type ActiveTab = 'dashboard' | 'properties' | 'rooms' | 'maintenance' | 'revenue' | 'customers' | 'bookings' | 'fees' | 'users';

interface ManageSidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function ManageSidebar({ activeTab, setActiveTab, isOpen, setIsOpen }: ManageSidebarProps) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const navigate = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Panel */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Building2 size={20} />
            </div>
            <span>VersaHome</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard"     active={activeTab === 'dashboard'}   onClick={() => navigate('dashboard')} />
          <SidebarItem icon={<Building2 size={20} />}       label="Properties"    active={activeTab === 'properties'}  onClick={() => navigate('properties')} />
          <SidebarItem icon={<BedDouble size={20} />}       label="Rooms"         active={activeTab === 'rooms'}       onClick={() => navigate('rooms')} />
          <SidebarItem icon={<Wrench size={20} />}          label="Maintenance"   active={activeTab === 'maintenance'} onClick={() => navigate('maintenance')} />
          <SidebarItem icon={<BarChart3 size={20} />}       label="Revenue"       active={activeTab === 'revenue'}     onClick={() => navigate('revenue')} />
          <SidebarItem icon={<Users size={20} />}           label="Customers"     active={activeTab === 'customers'}   onClick={() => navigate('customers')} />
          <SidebarItem icon={<CalendarDays size={20} />}    label="Bookings"      active={activeTab === 'bookings'}    onClick={() => navigate('bookings')} />
          <SidebarItem icon={<FileText size={20} />}        label="Fees Collection" active={activeTab === 'fees'}     onClick={() => navigate('fees')} />
          {isSuperAdmin && (
            <>
              <div className="my-2 border-t border-slate-100" />
              <SidebarItem icon={<UserCog size={20} />} label="User Management" active={activeTab === 'users'} onClick={() => navigate('users')} />
            </>
          )}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.name ?? 'User'}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role?.toLowerCase().replace('_', ' ') ?? ''}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
