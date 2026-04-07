import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
import {
  Customer, Lease, Company, Investment, Owner, OwnerAgreement,
  MasterProperty, Unit, Carpark, UnitType, AssetStatus,
  ExpenseType, Expense, DataSource,
} from './types';

// Hooks
import { useApi } from './hooks/useApi';

// Layout
import { ManageSidebar, ActiveTab } from './components/layout/ManageSidebar';


import { DashboardPage }         from './pages/manage/DashboardPage';
import { MasterPropertiesPage }  from './pages/manage/MasterPropertiesPage';
import { UnitsPage }             from './pages/manage/UnitsPage';
import { CarparksPage }          from './pages/manage/CarparksPage';
import { TimelinePage }          from './pages/manage/TimelinePage';
import { CustomersPage }         from './pages/manage/CustomersPage';
import { CompaniesPage }         from './pages/manage/CompaniesPage';
import { LeasesPage }            from './pages/manage/LeasesPage';
import { UsersPage }        from './pages/manage/UsersPage';
import { ExpensesPage }     from './pages/manage/ExpensesPage';
import { ProfitPage }       from './pages/manage/ProfitPage';
import { DataSourcesPage }  from './pages/manage/DataSourcesPage';
import { InvestmentsPage }       from './pages/manage/InvestmentsPage';
import { InvestmentProfitPage } from './pages/manage/InvestmentProfitPage';
import { OwnerAgreementsPage }  from './pages/manage/OwnerAgreementsPage';

// Modals
import { MasterPropertyModal }   from './components/manage/MasterPropertyModal';
import { UnitModal }             from './components/manage/UnitModal';
import { CarparkModal }          from './components/manage/CarparkModal';
import { CustomerModal }         from './components/manage/CustomerModal';
import { CompanyModal }          from './components/manage/CompanyModal';
import { LeaseBookingModal }     from './components/manage/LeaseBookingModal';
import { LeaseDetailModal }      from './components/manage/LeaseDetailModal';
import { ExpenseTypeModal }      from './components/manage/ExpenseTypeModal';
import { ExpenseModal }          from './components/manage/ExpenseModal';
import { DataSourceModal }       from './components/manage/DataSourceModal';
import { InvestmentModal }        from './components/manage/InvestmentModal';
import { OwnerModal }             from './components/manage/OwnerModal';
import { OwnerAgreementModal }    from './components/manage/OwnerAgreementModal';

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
  const [leases,          setLeases]          = useState<Lease[]>([]);

  // ─── Modal open state ──────────────────────────────────────────
  const [isMasterPropertyModalOpen, setIsMasterPropertyModalOpen] = useState(false);
  const [isUnitModalOpen,           setIsUnitModalOpen]           = useState(false);
  const [isCarparkModalOpen,        setIsCarparkModalOpen]        = useState(false);
  const [isCustomerModalOpen,       setIsCustomerModalOpen]       = useState(false);
  const [isLeaseModalOpen,          setIsLeaseModalOpen]          = useState(false);
  const [isLeaseDetailModalOpen,    setIsLeaseDetailModalOpen]    = useState(false);
  const [selectedLeaseId,           setSelectedLeaseId]           = useState<string | null>(null);
  const [isExpenseTypeModalOpen,    setIsExpenseTypeModalOpen]    = useState(false);
  const [isExpenseModalOpen,        setIsExpenseModalOpen]        = useState(false);

  // ─── Selected items for edit ───────────────────────────────────
  const [selectedMasterProperty, setSelectedMasterProperty] = useState<MasterProperty | null>(null);
  const [selectedUnit,           setSelectedUnit]           = useState<Unit | null>(null);
  const [selectedCarpark,        setSelectedCarpark]        = useState<Carpark | null>(null);
  const [selectedCustomer,       setSelectedCustomer]       = useState<Customer | null>(null);
  const [leaseModalPrefill,     setLeaseModalPrefill]     = useState<{ assetId: string; assetType: 'unit' | 'carpark'; assetName: string; date: string; suggestedPrice: number } | null>(null);
  const [selectedExpenseType,   setSelectedExpenseType]   = useState<ExpenseType | null>(null);
  const [selectedExpense,       setSelectedExpense]       = useState<Expense | null>(null);
  const [expensePrefillUnitId,  setExpensePrefillUnitId]  = useState<string | null>(null);
  const [expenseTypes,          setExpenseTypes]          = useState<ExpenseType[]>([]);
  const [expenseRefreshSignal,  setExpenseRefreshSignal]  = useState(0);
  const [dataSources,           setDataSources]           = useState<DataSource[]>([]);
  const [isDataSourceModalOpen, setIsDataSourceModalOpen] = useState(false);
  const [selectedDataSource,    setSelectedDataSource]    = useState<DataSource | null>(null);
  const [companies,             setCompanies]             = useState<Company[]>([]);
  const [isCompanyModalOpen,    setIsCompanyModalOpen]    = useState(false);
  const [selectedCompany,       setSelectedCompany]       = useState<Company | null>(null);
  const [isInvestmentModalOpen, setIsInvestmentModalOpen] = useState(false);
  const [selectedInvestment,    setSelectedInvestment]    = useState<Investment | null>(null);
  const [investmentRefreshSignal, setInvestmentRefreshSignal] = useState(0);
  const [isOwnerModalOpen,       setIsOwnerModalOpen]       = useState(false);
  const [selectedOwner,          setSelectedOwner]          = useState<Owner | null>(null);
  const [owners,                 setOwners]                 = useState<Owner[]>([]);
  const [isOwnerAgreementModalOpen, setIsOwnerAgreementModalOpen] = useState(false);
  const [selectedOwnerAgreement,    setSelectedOwnerAgreement]    = useState<OwnerAgreement | null>(null);
  const [ownerAgreementRefreshSignal, setOwnerAgreementRefreshSignal] = useState(0);

  // ─── Load data from API ────────────────────────────────────────
  const refreshData = useCallback(async () => {
    const [propsRes, unitsRes, carparksRes, customersRes, leasesRes, expTypesRes, dsRes, companiesRes, ownersRes] = await Promise.all([
      apiFetch('/api/assets/properties'),
      apiFetch('/api/assets/units'),
      apiFetch('/api/assets/carparks'),
      apiFetch('/api/customers'),
      apiFetch('/api/leases'),
      apiFetch('/api/expenses/types'),
      apiFetch('/api/datasources'),
      apiFetch('/api/companies'),
      apiFetch('/api/owners'),
    ]);
    if (propsRes.ok) setMasterProperties(await propsRes.json());
    if (unitsRes.ok) setUnits(await unitsRes.json());
    if (carparksRes.ok) setCarparks(await carparksRes.json());
    if (customersRes.ok) setCustomers(await customersRes.json());
    if (leasesRes.ok) setLeases(await leasesRes.json());
    if (expTypesRes.ok) setExpenseTypes(await expTypesRes.json());
    if (dsRes.ok) setDataSources(await dsRes.json());
    if (companiesRes.ok) setCompanies(await companiesRes.json());
    if (ownersRes.ok) setOwners(await ownersRes.json());
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
    const unitNo = (fd.get('unitNo') as string).trim();
    const payload = {
      carparkNumber:        fd.get('carparkNumber') as string,
      suggestedRentalPrice: Number(fd.get('suggestedRentalPrice')),
      unitNo:               unitNo || undefined,
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
    const dataSourceId = fd.get('dataSourceId') as string;
    const genderRaw = fd.get('gender') as string;
    const payload = {
      name:           fd.get('name') as string,
      gender:         genderRaw || null,
      phoneLocal:     (fd.get('phoneLocal') as string) || undefined,
      phoneOther:     (fd.get('phoneOther') as string) || undefined,
      icPassport:     fd.get('icPassport') as string,
      email:          (fd.get('email') as string) || undefined,
      currentAddress: (fd.get('currentAddress') as string) || undefined,
      wechatId:       (fd.get('wechatId') as string) || undefined,
      whatsappNumber: (fd.get('whatsappNumber') as string) || undefined,
      remark:         (fd.get('remark') as string) || undefined,
      dataSourceId:   dataSourceId || null,
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

  // ─── Data Source Handlers ──────────────────────────────────────

  const handleSaveDataSource = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name:        fd.get('name') as string,
      description: (fd.get('description') as string) || undefined,
      isActive:    selectedDataSource ? (e.currentTarget.querySelector<HTMLInputElement>('#isActive')?.checked ?? true) : true,
    };
    const url = selectedDataSource
      ? `/api/datasources/${selectedDataSource.id}`
      : '/api/datasources';
    const method = selectedDataSource ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      setIsDataSourceModalOpen(false);
      setSelectedDataSource(null);
      await refreshData();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to save data source');
    }
  };

  const handleDeleteDataSource = async (source: DataSource) => {
    if (!confirm(`Delete data source "${source.name}"? Customers linked to it will have their source cleared.`)) return;
    const res = await apiFetch(`/api/datasources/${source.id}`, { method: 'DELETE' });
    if (res.ok) {
      await refreshData();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete data source');
    }
  };

  // ─── Company Handlers ──────────────────────────────────────────

  const handleSaveCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const dataSourceId = fd.get('dataSourceId') as string;
    const payload = {
      name:           fd.get('name') as string,
      managerName:    (fd.get('managerName') as string) || undefined,
      email:          (fd.get('email') as string) || undefined,
      phone:          (fd.get('phone') as string) || undefined,
      tinNumber:      (fd.get('tinNumber') as string) || undefined,
      address:        (fd.get('address') as string) || undefined,
      wechatId:       (fd.get('wechatId') as string) || undefined,
      whatsappNumber: (fd.get('whatsappNumber') as string) || undefined,
      remark:         (fd.get('remark') as string) || undefined,
      dataSourceId:   dataSourceId || null,
    };
    const url = selectedCompany
      ? `/api/companies/${selectedCompany.id}`
      : '/api/companies';
    const method = selectedCompany ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      setIsCompanyModalOpen(false);
      setSelectedCompany(null);
      await refreshData();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to save company');
    }
  };

  const handleDeleteCompany = async (c: Company) => {
    if (!confirm(`Delete company "${c.name}"?`)) return;
    const res = await apiFetch(`/api/companies/${c.id}`, { method: 'DELETE' });
    if (res.ok) {
      await refreshData();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete company');
    }
  };

  // ─── Investment Handlers ───────────────────────────────────────

  const handleSaveInvestment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      customerId:    fd.get('customerId') as string,
      unitId:        fd.get('unitId') as string,
      capitalAmount: parseFloat(fd.get('capitalAmount') as string),
      startDate:     fd.get('startDate') as string,
      endDate:       fd.get('endDate') as string,
      status:        fd.get('status') as string,
      notes:         (fd.get('notes') as string) || undefined,
    };
    const url    = selectedInvestment ? `/api/investments/${selectedInvestment.id}` : '/api/investments';
    const method = selectedInvestment ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      setIsInvestmentModalOpen(false);
      setSelectedInvestment(null);
      setInvestmentRefreshSignal(s => s + 1);
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to save investment');
    }
  };

  const handleDeleteInvestment = async (inv: Investment) => {
    if (!confirm(`Delete this investment record for "${inv.customer?.name}"?`)) return;
    const res = await apiFetch(`/api/investments/${inv.id}`, { method: 'DELETE' });
    if (res.ok) {
      setInvestmentRefreshSignal(s => s + 1);
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete investment');
    }
  };

  // ─── Owner / OwnerAgreement Handlers ──────────────────────────

  const handleSaveOwner = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name:        fd.get('name') as string,
      phone:       (fd.get('phone') as string) || undefined,
      email:       (fd.get('email') as string) || undefined,
      icPassport:  (fd.get('icPassport') as string) || undefined,
      bankAccount: (fd.get('bankAccount') as string) || undefined,
      bankName:    (fd.get('bankName') as string) || undefined,
      address:     (fd.get('address') as string) || undefined,
      notes:       (fd.get('notes') as string) || undefined,
    };
    const url    = selectedOwner ? `/api/owners/${selectedOwner.id}` : '/api/owners';
    const method = selectedOwner ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      setIsOwnerModalOpen(false);
      setSelectedOwner(null);
      await refreshData();
      setOwnerAgreementRefreshSignal(s => s + 1);
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to save owner');
    }
  };

  const handleDeleteOwner = async (o: Owner) => {
    if (!confirm(`Delete owner "${o.name}"?`)) return;
    const res = await apiFetch(`/api/owners/${o.id}`, { method: 'DELETE' });
    if (res.ok) {
      await refreshData();
      setOwnerAgreementRefreshSignal(s => s + 1);
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete owner');
    }
  };

  const handleSaveOwnerAgreement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      ownerId:    fd.get('ownerId') as string,
      unitId:     fd.get('unitId') as string,
      amount:     parseFloat(fd.get('amount') as string),
      startDate:  fd.get('startDate') as string,
      endDate:    fd.get('endDate') as string,
      paymentDay: parseInt(fd.get('paymentDay') as string, 10),
      notes:      (fd.get('notes') as string) || undefined,
    };
    const url    = selectedOwnerAgreement ? `/api/owner-agreements/${selectedOwnerAgreement.id}` : '/api/owner-agreements';
    const method = selectedOwnerAgreement ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      setIsOwnerAgreementModalOpen(false);
      setSelectedOwnerAgreement(null);
      setOwnerAgreementRefreshSignal(s => s + 1);
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to save agreement');
    }
  };

  const handleDeleteOwnerAgreement = async (ag: OwnerAgreement) => {
    if (!confirm('Delete this agreement? All pending expenses will be voided.')) return;
    const res = await apiFetch(`/api/owner-agreements/${ag.id}`, { method: 'DELETE' });
    if (res.ok) {
      setOwnerAgreementRefreshSignal(s => s + 1);
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete agreement');
    }
  };

  // ─── Expense Type Handlers ─────────────────────────────────────

  const handleSaveExpenseType = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name:        fd.get('name') as string,
      description: (fd.get('description') as string) || undefined,
      isActive:    selectedExpenseType ? (e.currentTarget.querySelector<HTMLInputElement>('#isActive')?.checked ?? true) : true,
    };
    const url = selectedExpenseType
      ? `/api/expenses/types/${selectedExpenseType.id}`
      : '/api/expenses/types';
    const method = selectedExpenseType ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      setIsExpenseTypeModalOpen(false);
      setSelectedExpenseType(null);
      await refreshData();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to save expense type');
    }
  };

  const handleDeleteExpenseType = async (type: ExpenseType) => {
    if (!confirm(`Delete expense type "${type.name}"?`)) return;
    const res = await apiFetch(`/api/expenses/types/${type.id}`, { method: 'DELETE' });
    if (res.ok) {
      await refreshData();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete expense type');
    }
  };

  // ─── Expense Handlers ──────────────────────────────────────────

  const handleSaveExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      unitId:        fd.get('unitId') as string,
      expenseTypeId: fd.get('expenseTypeId') as string,
      amount:        Number(fd.get('amount')),
      description:   (fd.get('description') as string) || undefined,
      expenseDate:   fd.get('expenseDate') as string,
    };
    const url = selectedExpense
      ? `/api/expenses/${selectedExpense.id}`
      : '/api/expenses';
    const method = selectedExpense ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      setIsExpenseModalOpen(false);
      setSelectedExpense(null);
      setExpensePrefillUnitId(null);
      setExpenseRefreshSignal(s => s + 1);
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to save expense');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Delete this expense record?')) return;
    const res = await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setExpenseRefreshSignal(s => s + 1);
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete expense');
    }
  };

  // To edit an expense we need to fetch it first from the summary already loaded in ExpensesPage,
  // so we accept the full expense object via onEditExpense in the page.
  const handleEditExpense = async (expenseId: string, unitId: string) => {
    // Fetch the single expense record
    const res = await apiFetch(`/api/expenses?unitId=${unitId}`);
    if (res.ok) {
      const list: Expense[] = await res.json();
      const found = list.find(e => e.id === expenseId);
      if (found) {
        setSelectedExpense(found);
        setExpensePrefillUnitId(found.unit.id);
        setIsExpenseModalOpen(true);
      }
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
          setLeaseModalPrefill({ assetId: asset.id, assetType: asset.type, assetName: asset.name, date: asset.date, suggestedPrice: asset.suggestedPrice });
          setIsLeaseModalOpen(true);
        }}
      />
    ),
    leases: (
      <LeasesPage
        leases={leases}
        onViewDetail={(lease) => {
          setSelectedLeaseId(lease.id);
          setIsLeaseDetailModalOpen(true);
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
    companies: (
      <CompaniesPage
        companies={companies}
        onAdd={() => { setSelectedCompany(null); setIsCompanyModalOpen(true); }}
        onEdit={c => { setSelectedCompany(c); setIsCompanyModalOpen(true); }}
        onDelete={handleDeleteCompany}
      />
    ),
    dataSources: (
      <DataSourcesPage
        dataSources={dataSources}
        onAdd={() => { setSelectedDataSource(null); setIsDataSourceModalOpen(true); }}
        onEdit={s => { setSelectedDataSource(s); setIsDataSourceModalOpen(true); }}
        onDelete={handleDeleteDataSource}
      />
    ),
    users: <UsersPage />,
    profit: <ProfitPage properties={masterProperties} units={units} carparks={carparks} />,
    ownerAgreements: (
      <OwnerAgreementsPage
        units={units}
        onAddOwner={() => { setSelectedOwner(null); setIsOwnerModalOpen(true); }}
        onEditOwner={o => { setSelectedOwner(o); setIsOwnerModalOpen(true); }}
        onDeleteOwner={handleDeleteOwner}
        onAddAgreement={() => { setSelectedOwnerAgreement(null); setIsOwnerAgreementModalOpen(true); }}
        onEditAgreement={ag => { setSelectedOwnerAgreement(ag); setIsOwnerAgreementModalOpen(true); }}
        onDeleteAgreement={handleDeleteOwnerAgreement}
        refreshSignal={ownerAgreementRefreshSignal}
      />
    ),
    investments: (
      <InvestmentsPage
        units={units}
        customers={customers}
        onAdd={() => { setSelectedInvestment(null); setIsInvestmentModalOpen(true); }}
        onEdit={inv => { setSelectedInvestment(inv); setIsInvestmentModalOpen(true); }}
        onDelete={handleDeleteInvestment}
        refreshSignal={investmentRefreshSignal}
      />
    ),
    investmentProfit: <InvestmentProfitPage />,
    expenses: (
      <ExpensesPage
        expenseTypes={expenseTypes}
        onAddExpense={(unitId) => { setSelectedExpense(null); setExpensePrefillUnitId(unitId ?? null); setIsExpenseModalOpen(true); }}
        onEditExpense={handleEditExpense}
        onDeleteExpense={(id) => handleDeleteExpense(id)}
        onAddType={() => { setSelectedExpenseType(null); setIsExpenseTypeModalOpen(true); }}
        onEditType={t => { setSelectedExpenseType(t); setIsExpenseTypeModalOpen(true); }}
        onDeleteType={handleDeleteExpenseType}
        refreshSignal={expenseRefreshSignal}
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
      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => { setIsCompanyModalOpen(false); setSelectedCompany(null); }}
        onSubmit={handleSaveCompany}
        selectedCompany={selectedCompany}
        dataSources={dataSources}
      />
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => { setIsCustomerModalOpen(false); setSelectedCustomer(null); }}
        onSubmit={handleAddCustomer}
        selectedCustomer={selectedCustomer}
        dataSources={dataSources}
      />
      <LeaseBookingModal
        isOpen={isLeaseModalOpen}
        onClose={() => { setIsLeaseModalOpen(false); setLeaseModalPrefill(null); }}
        onSuccess={() => { refreshData(); }}
        dataSources={dataSources}
        prefill={leaseModalPrefill}
      />
      <LeaseDetailModal
        isOpen={isLeaseDetailModalOpen}
        onClose={() => { setIsLeaseDetailModalOpen(false); setSelectedLeaseId(null); }}
        leaseId={selectedLeaseId}
        onAction={() => { refreshData(); }}
      />
      <DataSourceModal
        isOpen={isDataSourceModalOpen}
        onClose={() => { setIsDataSourceModalOpen(false); setSelectedDataSource(null); }}
        onSubmit={handleSaveDataSource}
        selectedSource={selectedDataSource}
      />
      <ExpenseTypeModal
        isOpen={isExpenseTypeModalOpen}
        onClose={() => { setIsExpenseTypeModalOpen(false); setSelectedExpenseType(null); }}
        onSubmit={handleSaveExpenseType}
        selectedType={selectedExpenseType}
      />
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => { setIsExpenseModalOpen(false); setSelectedExpense(null); setExpensePrefillUnitId(null); }}
        onSubmit={handleSaveExpense}
        selectedExpense={selectedExpense}
        expenseTypes={expenseTypes}
        properties={masterProperties}
        units={units}
        prefillUnitId={expensePrefillUnitId}
      />
      <InvestmentModal
        isOpen={isInvestmentModalOpen}
        onClose={() => { setIsInvestmentModalOpen(false); setSelectedInvestment(null); }}
        onSubmit={handleSaveInvestment}
        selectedInvestment={selectedInvestment}
        units={units}
        customers={customers}
      />
      <OwnerModal
        isOpen={isOwnerModalOpen}
        onClose={() => { setIsOwnerModalOpen(false); setSelectedOwner(null); }}
        onSubmit={handleSaveOwner}
        selectedOwner={selectedOwner}
      />
      <OwnerAgreementModal
        isOpen={isOwnerAgreementModalOpen}
        onClose={() => { setIsOwnerAgreementModalOpen(false); setSelectedOwnerAgreement(null); }}
        onSubmit={handleSaveOwnerAgreement}
        selectedAgreement={selectedOwnerAgreement}
        owners={owners}
        units={units}
      />
    </div>
  );
}
