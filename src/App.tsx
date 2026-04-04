import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Types
import {
  Property, Room, Booking, MaintenanceLog,
  BillingCycle, PaymentStatus, Customer,
} from './types';

// Repositories
import {
  PropertyRepository, RoomRepository, BookingRepository,
  MaintenanceRepository, CustomerRepository,
} from './repositories';

// Utilities
import { formatCurrency, formatDate } from './utils';

// Layout
import { ManageSidebar, ActiveTab } from './components/layout/ManageSidebar';

// Pages
import { DashboardPage }    from './pages/manage/DashboardPage';
import { PropertiesPage }   from './pages/manage/PropertiesPage';
import { RoomsPage }        from './pages/manage/RoomsPage';
import { MaintenancePage }  from './pages/manage/MaintenancePage';
import { RevenuePage }      from './pages/manage/RevenuePage';
import { CustomersPage }    from './pages/manage/CustomersPage';
import { BookingsPage }     from './pages/manage/BookingsPage';
import { FeesPage }         from './pages/manage/FeesPage';
import { UsersPage }        from './pages/manage/UsersPage';

// Modals
import { PropertyModal }    from './components/manage/PropertyModal';
import { RoomModal }        from './components/manage/RoomModal';
import { BookingModal }     from './components/manage/BookingModal';
import { MaintenanceModal } from './components/manage/MaintenanceModal';
import { CustomerModal }    from './components/manage/CustomerModal';

// Repository singletons
const propertyRepo    = new PropertyRepository();
const roomRepo        = new RoomRepository();
const bookingRepo     = new BookingRepository();
const maintenanceRepo = new MaintenanceRepository();
const customerRepo    = new CustomerRepository();

export default function App() {
  // ─── Navigation ────────────────────────────────────────────────
  const [activeTab, setActiveTab]       = useState<ActiveTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ─── Data ──────────────────────────────────────────────────────
  const [properties,      setProperties]      = useState<Property[]>([]);
  const [rooms,           setRooms]           = useState<Room[]>([]);
  const [bookings,        setBookings]        = useState<Booking[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [customers,       setCustomers]       = useState<Customer[]>([]);

  // ─── Filters ───────────────────────────────────────────────────
  const [feeFilterStart, setFeeFilterStart] = useState('');
  const [feeFilterEnd,   setFeeFilterEnd]   = useState('');

  // ─── Modal open state ──────────────────────────────────────────
  const [isPropertyModalOpen,    setIsPropertyModalOpen]    = useState(false);
  const [isRoomModalOpen,        setIsRoomModalOpen]        = useState(false);
  const [isBookingModalOpen,     setIsBookingModalOpen]     = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isCustomerModalOpen,    setIsCustomerModalOpen]    = useState(false);

  // ─── Selected items for edit ───────────────────────────────────
  const [selectedProperty,    setSelectedProperty]    = useState<Property | null>(null);
  const [selectedRoom,        setSelectedRoom]        = useState<Room | null>(null);
  const [selectedBookingRoom, setSelectedBookingRoom] = useState<Room | null>(null);
  const [selectedCustomer,    setSelectedCustomer]    = useState<Customer | null>(null);

  // ─── Load data ─────────────────────────────────────────────────
  useEffect(() => { refreshData(); }, []);

  const refreshData = () => {
    setProperties(propertyRepo.getAll());
    setRooms(roomRepo.getAll());
    setBookings(bookingRepo.getAll());
    setMaintenanceLogs(maintenanceRepo.getAll());
    setCustomers(customerRepo.getAll());
  };

  // ─── Derived stats ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const occupiedRoomIds = bookings
      .filter(b => {
        const now = new Date(today);
        return now >= new Date(b.startDate) && now <= new Date(b.endDate);
      })
      .map(b => b.roomId);

    return {
      totalRooms: rooms.length,
      occupied:   occupiedRoomIds.length,
      vacant:     rooms.length - occupiedRoomIds.length,
      arrears:    bookings.filter(b => b.paymentStatus !== PaymentStatus.PAID),
    };
  }, [rooms, bookings]);

  // ─── Handlers ──────────────────────────────────────────────────
  const handleMarkAsPaid = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      bookingRepo.update(bookingId, { ...booking, paymentStatus: PaymentStatus.PAID });
      refreshData();
    }
  };

  const handleAddProperty = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Property = {
      id:         selectedProperty?.id || crypto.randomUUID(),
      name:       fd.get('name') as string,
      address:    fd.get('address') as string,
      totalRooms: Number(fd.get('totalRooms')),
    };
    selectedProperty ? propertyRepo.update(selectedProperty.id, payload) : propertyRepo.create(payload);
    setIsPropertyModalOpen(false);
    setSelectedProperty(null);
    refreshData();
  };

  const handleAddRoom = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Room = {
      id:           selectedRoom?.id || crypto.randomUUID(),
      propertyId:   fd.get('propertyId') as string,
      roomNumber:   fd.get('roomNumber') as string,
      type:         fd.get('type') as string,
      baseRate:     Number(fd.get('baseRate')),
      baseRateType: fd.get('baseRateType') as BillingCycle,
    };
    selectedRoom ? roomRepo.update(selectedRoom.id, payload) : roomRepo.create(payload);
    setIsRoomModalOpen(false);
    setSelectedRoom(null);
    refreshData();
  };

  const handleAddBooking = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBookingRoom) return;
    const fd = new FormData(e.currentTarget);
    const customer = customers.find(c => c.id === fd.get('customerId'));
    if (!customer) { alert('Please select a customer'); return; }

    const startDate = fd.get('startDate') as string;
    const endDate   = fd.get('endDate') as string;
    const diffDays  = Math.ceil(
      Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    ) || 1;
    const rate     = selectedBookingRoom.baseRate;
    const rateType = selectedBookingRoom.baseRateType;
    const total    =
      rateType === BillingCycle.DAILY   ? diffDays * rate :
      rateType === BillingCycle.WEEKLY  ? (diffDays / 7) * rate :
      (diffDays / 30) * rate;

    bookingRepo.create({
      id:            crypto.randomUUID(),
      roomId:        selectedBookingRoom.id,
      customerId:    customer.id,
      customerName:  customer.name,
      customerPhone: customer.phone,
      startDate,
      endDate,
      totalAmount:   total,
      paymentStatus: fd.get('paymentStatus') as PaymentStatus,
      billingCycle:  fd.get('billingCycle') as BillingCycle,
    });
    setIsBookingModalOpen(false);
    setSelectedBookingRoom(null);
    refreshData();
  };

  const handleAddMaintenance = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    maintenanceRepo.create({
      id:          crypto.randomUUID(),
      roomId:      fd.get('roomId') as string,
      description: fd.get('description') as string,
      date:        fd.get('date') as string,
      cost:        Number(fd.get('cost')),
    });
    setIsMaintenanceModalOpen(false);
    refreshData();
  };

  const handleAddCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Customer = {
      id:             selectedCustomer?.id || crypto.randomUUID(),
      name:           fd.get('name') as string,
      phoneLocal:     fd.get('phoneLocal') as string,
      phoneOther:     (fd.get('phoneOther') as string) || undefined,
      icPassport:     fd.get('icPassport') as string,
      email:          (fd.get('email') as string) || undefined,
      currentAddress: fd.get('currentAddress') as string,
      wechatId:       (fd.get('wechatId') as string) || undefined,
      whatsappNumber: (fd.get('whatsappNumber') as string) || undefined,
      remark:         (fd.get('remark') as string) || undefined,
      // legacy compat
      phone:   fd.get('phoneLocal') as string,
      address: fd.get('currentAddress') as string,
    };
    selectedCustomer
      ? customerRepo.update(selectedCustomer.id, payload)
      : customerRepo.create(payload);
    setIsCustomerModalOpen(false);
    setSelectedCustomer(null);
    refreshData();
  };

  const generateInvoice = (booking: Booking) => {
    const room     = rooms.find(r => r.id === booking.roomId);
    const property = properties.find(p => p.id === room?.propertyId);
    const customer = customers.find(c => c.id === booking.customerId);
    const doc      = new jsPDF();

    doc.setFontSize(22);
    doc.text('VersaHome PMS Invoice', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Invoice Date: ${formatDate(new Date().toISOString())}`, 105, 28, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('From:', 20, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(property?.name || 'VersaHome PMS', 20, 52);
    doc.text(property?.address || 'N/A', 20, 58, { maxWidth: 80 });

    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 120, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(customer?.name || booking.customerName, 120, 52);
    doc.text(customer?.address || 'N/A', 120, 58, { maxWidth: 80 });

    autoTable(doc, {
      startY: 80,
      head: [['Description', 'Rate', 'Cycle', 'Duration', 'Total']],
      body: [[
        `Room ${room?.roomNumber} (${room?.type})`,
        formatCurrency(room?.baseRate || 0),
        room?.baseRateType || 'N/A',
        `${Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24))} Days`,
        formatCurrency(booking.totalAmount),
      ]],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Amount: ${formatCurrency(booking.totalAmount)}`, 140, finalY);
    doc.text(`Payment Status: ${booking.paymentStatus}`, 140, finalY + 7);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for choosing VersaHome!', 105, 280, { align: 'center' });
    doc.save(`Invoice_${booking.customerName.replace(/\s+/g, '_')}_${booking.id.slice(0, 8)}.pdf`);
  };

  // ─── Page map ──────────────────────────────────────────────────
  const pageContent: Record<ActiveTab, React.ReactNode> = {
    dashboard: (
      <DashboardPage
        rooms={rooms}
        bookings={bookings}
        stats={stats}
        onBookRoom={room => { setSelectedBookingRoom(room); setIsBookingModalOpen(true); }}
        generateInvoice={generateInvoice}
      />
    ),
    properties: (
      <PropertiesPage
        properties={properties}
        onAdd={() => { setSelectedProperty(null); setIsPropertyModalOpen(true); }}
        onEdit={p => { setSelectedProperty(p); setIsPropertyModalOpen(true); }}
        onDelete={p => { if (confirm('Delete this property and all its rooms?')) { propertyRepo.delete(p.id); refreshData(); } }}
        onViewRooms={() => setActiveTab('rooms')}
      />
    ),
    rooms: (
      <RoomsPage
        rooms={rooms}
        properties={properties}
        onAdd={() => { setSelectedRoom(null); setIsRoomModalOpen(true); }}
        onEdit={r => { setSelectedRoom(r); setIsRoomModalOpen(true); }}
        onDelete={r => { if (confirm('Delete this room?')) { roomRepo.delete(r.id); refreshData(); } }}
      />
    ),
    maintenance: (
      <MaintenancePage
        maintenanceLogs={maintenanceLogs}
        rooms={rooms}
        onAdd={() => setIsMaintenanceModalOpen(true)}
        onDelete={log => { if (confirm('Delete this log?')) { maintenanceRepo.delete(log.id); refreshData(); } }}
      />
    ),
    revenue: (
      <RevenuePage bookings={bookings} maintenanceLogs={maintenanceLogs} />
    ),
    customers: (
      <CustomersPage
        customers={customers}
        onAdd={() => { setSelectedCustomer(null); setIsCustomerModalOpen(true); }}
        onEdit={c => { setSelectedCustomer(c); setIsCustomerModalOpen(true); }}
        onDelete={c => { if (confirm('Delete this customer?')) { customerRepo.delete(c.id); refreshData(); } }}
      />
    ),
    bookings: (
      <BookingsPage
        bookings={bookings}
        rooms={rooms}
        onDelete={b => { if (confirm('Delete this booking?')) { bookingRepo.delete(b.id); refreshData(); } }}
        generateInvoice={generateInvoice}
      />
    ),
    fees: (
      <FeesPage
        bookings={bookings}
        rooms={rooms}
        feeFilterStart={feeFilterStart}
        feeFilterEnd={feeFilterEnd}
        setFeeFilterStart={setFeeFilterStart}
        setFeeFilterEnd={setFeeFilterEnd}
        onMarkPaid={handleMarkAsPaid}
        generateInvoice={generateInvoice}
      />
    ),
    users: <UsersPage />,
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
      <PropertyModal
        isOpen={isPropertyModalOpen}
        onClose={() => { setIsPropertyModalOpen(false); setSelectedProperty(null); }}
        onSubmit={handleAddProperty}
        selectedProperty={selectedProperty}
      />
      <RoomModal
        isOpen={isRoomModalOpen}
        onClose={() => { setIsRoomModalOpen(false); setSelectedRoom(null); }}
        onSubmit={handleAddRoom}
        selectedRoom={selectedRoom}
        properties={properties}
      />
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => { setIsBookingModalOpen(false); setSelectedBookingRoom(null); }}
        onSubmit={handleAddBooking}
        onAddCustomer={() => { setIsBookingModalOpen(false); setIsCustomerModalOpen(true); }}
        selectedRoom={selectedBookingRoom}
        customers={customers}
      />
      <MaintenanceModal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        onSubmit={handleAddMaintenance}
        rooms={rooms}
      />
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => { setIsCustomerModalOpen(false); setSelectedCustomer(null); }}
        onSubmit={handleAddCustomer}
        selectedCustomer={selectedCustomer}
      />
    </div>
  );
}
