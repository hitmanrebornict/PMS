import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
import {
  Customer,
  MasterProperty, Unit, Carpark, UnitType, AssetStatus,
} from './types';

// Hooks
import { useApi } from './hooks/useApi';

// Layout
import { ManageSidebar, ActiveTab } from './components/layout/ManageSidebar';

// Pages
import { DashboardPage }         from './pages/manage/DashboardPage';
import { MasterPropertiesPage }  from './pages/manage/MasterPropertiesPage';
import { UnitsPage }             from './pages/manage/UnitsPage';
import { CarparksPage }          from './pages/manage/CarparksPage';
import { TimelinePage }          from './pages/manage/TimelinePage';
import { CustomersPage }         from './pages/manage/CustomersPage';

// Modals
import { MasterPropertyModal }   from './components/manage/MasterPropertyModal';
import { UnitModal }             from './components/manage/UnitModal';
import { CarparkModal }          from './components/manage/CarparkModal';
import { CustomerModal }         from './components/manage/CustomerModal';
import { LeaseBookingModal }     from './components/manage/LeaseBookingModal';

export default function App() {
  const { apiFetch } = useApi();

  // ─── Navigation ────────────────────────────────────────────────
  const [activeTab, setActiveTab]       = useState<ActiveTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ─── Data ──────────────────────────────────────────────────────
  const [masterProperties, setMasterProperties] = useState<MasterProperty[]>([]);
  const [units,           setUnits]           = useState<Unit[]>([]);
  const [carparks,        setCarparks]        = useState<Carpark[]>([]);
  const [customers,       setCustomers]       = useState<Customer[]>([]);

  // ─── Modal open state ──────────────────────────────────────────
  const [isMasterPropertyModalOpen, setIsMasterPropertyModalOpen] = useState(false);
  const [isUnitModalOpen,           setIsUnitModalOpen]           = useState(false);
  const [isCarparkModalOpen,        setIsCarparkModalOpen]        = useState(false);
  const [isCustomerModalOpen,       setIsCustomerModalOpen]       = useState(false);
  const [isLeaseModalOpen,          setIsLeaseModalOpen]          = useState(false);

  // ─── Selected items for edit ───────────────────────────────────
  const [selectedMasterProperty, setSelectedMasterProperty] = useState<MasterProperty | null>(null);
  const [selectedUnit,           setSelectedUnit]           = useState<Unit | null>(null);
  const [selectedCarpark,        setSelectedCarpark]        = useState<Carpark | null>(null);
  const [selectedCustomer,       setSelectedCustomer]       = useState<Customer | null>(null);
  const [leaseModalPrefill,     setLeaseModalPrefill]     = useState<{ assetId: string; assetType: 'unit' | 'carpark'; date: string; suggestedPrice: number } | null>(null);

  // ─── Load data from API ────────────────────────────────────────
  const refreshData = useCallback(async () => {
    const [propsRes, unitsRes, carparksRes, customersRes] = await Promise.all([
      apiFetch('/api/assets/properties'),
      apiFetch('/api/assets/units'),
      apiFetch('/api/assets/carparks'),
      apiFetch('/api/customers'),
    ]);
    if (propsRes.ok) setMasterProperties(await propsRes.json());
    if (unitsRes.ok) setUnits(await unitsRes.json());
    if (carparksRes.ok) setCarparks(await carparksRes.json());
    if (customersRes.ok) setCustomers(await customersRes.json());
  }, [apiFetch]);

  useEffect(() => { refreshData(); }, [refreshData]);

  // ─── Handlers ──────────────────────────────────────────────────

  const handleAddMasterProperty = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name:    fd.get('name') as string,
      address: (fd.get('address') as string) || undefined,
    };
    const url = selectedMasterProperty
      ? `/api/assets/properties/${selectedMasterProperty.id}`
      : '/api/assets/properties';
    const method = selectedMasterProperty ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      setIsMasterPropertyModalOpen(false);
      setSelectedMasterProperty(null);
      await refreshData();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to save property');
    }
  };

  const handleAddUnit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      propertyId:           fd.get('propertyId') as string,
      unitNumber:           fd.get('unitNumber') as string,
      type:                 fd.get('type') as UnitType,
      suggestedRentalPrice: Number(fd.get('suggestedRentalPrice')),
      status:               fd.get('status') as AssetStatus,
    };
    const url = selectedUnit
      ? `/api/assets/units/${selectedUnit.id}`
      : '/api/assets/units';
    const method = selectedUnit ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      setIsUnitModalOpen(false);
      setSelectedUnit(null);
      await refreshData();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to save unit');
    }
  };

  const handleAddCarpark = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      carparkNumber:        fd.get('carparkNumber') as string,
      suggestedRentalPrice: Number(fd.get('suggestedRentalPrice')),
      status:               fd.get('status') as AssetStatus,
    };
    const url = selectedCarpark
      ? `/api/assets/carparks/${selectedCarpark.id}`
      : '/api/assets/carparks';
    const method = selectedCarpark ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      setIsCarparkModalOpen(false);
      setSelectedCarpark(null);
      await refreshData();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to save carpark');
    }
  };

  const handleAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name:           fd.get('name') as string,
      phoneLocal:     fd.get('phoneLocal') as string,
      phoneOther:     (fd.get('phoneOther') as string) || undefined,
      icPassport:     fd.get('icPassport') as string,
      email:          (fd.get('email') as string) || undefined,
      currentAddress: fd.get('currentAddress') as string,
      wechatId:       (fd.get('wechatId') as string) || undefined,
      whatsappNumber: (fd.get('whatsappNumber') as string) || undefined,
      remark:         (fd.get('remark') as string) || undefined,
    };
    const url = selectedCustomer
      ? `/api/customers/${selectedCustomer.id}`
      : '/api/customers';
    const method = selectedCustomer ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      setIsCustomerModalOpen(false);
      setSelectedCustomer(null);
      await refreshData();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to save customer');
    }
  };

  const handleDeleteMasterProperty = async (p: MasterProperty) => {
    if (!confirm('Delete this property and all its units?')) return;
    const res = await apiFetch(`/api/assets/properties/${p.id}`, { method: 'DELETE' });
    if (res.ok) {
      await refreshData();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete property');
    }
  };

  const handleDeleteUnit = async (u: Unit) => {
    if (!confirm('Delete this unit?')) return;
    const res = await apiFetch(`/api/assets/units/${u.id}`, { method: 'DELETE' });
    if (res.ok) {
      await refreshData();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete unit');
    }
  };

  const handleDeleteCarpark = async (c: Carpark) => {
    if (!confirm('Delete this carpark?')) return;
    const res = await apiFetch(`/api/assets/carparks/${c.id}`, { method: 'DELETE' });
    if (res.ok) {
      await refreshData();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete carpark');
    }
  };

  const handleDeleteCustomer = async (c: Customer) => {
    if (!confirm('Delete this customer?')) return;
    const res = await apiFetch(`/api/customers/${c.id}`, { method: 'DELETE' });
    if (res.ok) {
      await refreshData();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete customer');
    }
  };

  // ─── Page map ──────────────────────────────────────────────────
  const pageContent: Record<ActiveTab, React.ReactNode> = {
    dashboard: (
      <DashboardPage
        units={units}
        carparks={carparks}
        masterProperties={masterProperties}
      />
    ),
    masterProperties: (
      <MasterPropertiesPage
        properties={masterProperties}
        units={units}
        onAdd={() => { setSelectedMasterProperty(null); setIsMasterPropertyModalOpen(true); }}
        onEdit={p => { setSelectedMasterProperty(p); setIsMasterPropertyModalOpen(true); }}
        onDelete={handleDeleteMasterProperty}
        onViewUnits={() => setActiveTab('units')}
      />
    ),
    units: (
      <UnitsPage
        units={units}
        properties={masterProperties}
        onAdd={() => { setSelectedUnit(null); setIsUnitModalOpen(true); }}
        onEdit={u => { setSelectedUnit(u); setIsUnitModalOpen(true); }}
        onDelete={handleDeleteUnit}
      />
    ),
    carparks: (
      <CarparksPage
        carparks={carparks}
        onAdd={() => { setSelectedCarpark(null); setIsCarparkModalOpen(true); }}
        onEdit={c => { setSelectedCarpark(c); setIsCarparkModalOpen(true); }}
        onDelete={handleDeleteCarpark}
      />
    ),
    timeline: (
      <TimelinePage
        onBookAsset={(asset) => {
          setLeaseModalPrefill(asset);
          setIsLeaseModalOpen(true);
        }}
      />
    ),
    customers: (
      <CustomersPage
        customers={customers}
        onAdd={() => { setSelectedCustomer(null); setIsCustomerModalOpen(true); }}
        onEdit={c => { setSelectedCustomer(c); setIsCustomerModalOpen(true); }}
        onDelete={handleDeleteCustomer}
      />
    ),
  };

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      <ManageSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-lg">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Building2 size={16} />
            </div>
            <span>VersaHome</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex bg-white border-b border-slate-200 p-4 items-center sticky top-0 z-30">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg mr-4"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold text-slate-900">VersaHome PMS</h1>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {pageContent[activeTab]}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Modals ─────────────────────────────────────────────── */}
      <MasterPropertyModal
        isOpen={isMasterPropertyModalOpen}
        onClose={() => { setIsMasterPropertyModalOpen(false); setSelectedMasterProperty(null); }}
        onSubmit={handleAddMasterProperty}
        selectedProperty={selectedMasterProperty}
      />
      <UnitModal
        isOpen={isUnitModalOpen}
        onClose={() => { setIsUnitModalOpen(false); setSelectedUnit(null); }}
        onSubmit={handleAddUnit}
        selectedUnit={selectedUnit}
        properties={masterProperties}
      />
      <CarparkModal
        isOpen={isCarparkModalOpen}
        onClose={() => { setIsCarparkModalOpen(false); setSelectedCarpark(null); }}
        onSubmit={handleAddCarpark}
        selectedCarpark={selectedCarpark}
      />
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => { setIsCustomerModalOpen(false); setSelectedCustomer(null); }}
        onSubmit={handleAddCustomer}
        selectedCustomer={selectedCustomer}
      />
      <LeaseBookingModal
        isOpen={isLeaseModalOpen}
        onClose={() => { setIsLeaseModalOpen(false); setLeaseModalPrefill(null); }}
        onSuccess={() => { /* TimelinePage auto-refreshes via its own useEffect */ }}
        prefill={leaseModalPrefill}
      />
    </div>
  );
}
