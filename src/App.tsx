import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  BedDouble, 
  CalendarDays, 
  Wrench, 
  BarChart3, 
  Plus, 
  Search,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit2,
  X,
  Menu,
  Users,
  FileText,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Property, 
  Room, 
  Booking, 
  MaintenanceLog, 
  BillingCycle, 
  PaymentStatus,
  Customer 
} from './types';
import { 
  PropertyRepository, 
  RoomRepository, 
  BookingRepository, 
  MaintenanceRepository,
  CustomerRepository 
} from './repositories';
import { formatCurrency, formatDate, generateWhatsAppLink } from './utils';

// Repositories
const propertyRepo = new PropertyRepository();
const roomRepo = new RoomRepository();
const bookingRepo = new BookingRepository();
const maintenanceRepo = new MaintenanceRepository();
const customerRepo = new CustomerRepository();

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'properties' | 'rooms' | 'maintenance' | 'revenue' | 'customers' | 'bookings' | 'fees'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Filters
  const [feeFilterStart, setFeeFilterStart] = useState('');
  const [feeFilterEnd, setFeeFilterEnd] = useState('');
  
  // Modals
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  
  // Selected items for editing
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedBookingRoom, setSelectedBookingRoom] = useState<Room | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setProperties(propertyRepo.getAll());
    setRooms(roomRepo.getAll());
    setBookings(bookingRepo.getAll());
    setMaintenanceLogs(maintenanceRepo.getAll());
    setCustomers(customerRepo.getAll());
  };

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const occupiedRoomIds = bookings
      .filter(b => {
        const start = new Date(b.startDate);
        const end = new Date(b.endDate);
        const now = new Date(today);
        return now >= start && now <= end;
      })
      .map(b => b.roomId);
    
    const totalRooms = rooms.length;
    const occupied = occupiedRoomIds.length;
    const vacant = totalRooms - occupied;
    
    const arrears = bookings.filter(b => b.paymentStatus !== PaymentStatus.PAID);
    
    return { totalRooms, occupied, vacant, arrears };
  }, [rooms, bookings]);

  const handleMarkAsPaid = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      const updatedBooking = { ...booking, paymentStatus: PaymentStatus.PAID };
      bookingRepo.update(bookingId, updatedBooking);
      refreshData();
    }
  };

  const handleAddProperty = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newProperty: Property = {
      id: selectedProperty?.id || crypto.randomUUID(),
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      totalRooms: Number(formData.get('totalRooms')),
    };
    
    if (selectedProperty) {
      propertyRepo.update(selectedProperty.id, newProperty);
    } else {
      propertyRepo.create(newProperty);
    }
    
    setIsPropertyModalOpen(false);
    setSelectedProperty(null);
    refreshData();
  };

  const handleAddRoom = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newRoom: Room = {
      id: selectedRoom?.id || crypto.randomUUID(),
      propertyId: formData.get('propertyId') as string,
      roomNumber: formData.get('roomNumber') as string,
      type: formData.get('type') as string,
      baseRate: Number(formData.get('baseRate')),
      baseRateType: formData.get('baseRateType') as BillingCycle,
    };
    
    if (selectedRoom) {
      roomRepo.update(selectedRoom.id, newRoom);
    } else {
      roomRepo.create(newRoom);
    }
    
    setIsRoomModalOpen(false);
    setSelectedRoom(null);
    refreshData();
  };

  const handleAddBookingSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBookingRoom) return;
    
    const formData = new FormData(e.currentTarget);
    const customerId = formData.get('customerId') as string;
    const customer = customers.find(c => c.id === customerId);
    
    if (!customer) {
      alert('Please select a customer');
      return;
    }

    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const cycle = formData.get('billingCycle') as BillingCycle;
    
    // Calculate total amount
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    
    let totalAmount = 0;
    const rate = selectedBookingRoom.baseRate;
    const rateType = selectedBookingRoom.baseRateType;

    if (rateType === BillingCycle.DAILY) {
      totalAmount = diffDays * rate;
    } else if (rateType === BillingCycle.WEEKLY) {
      totalAmount = (diffDays / 7) * rate;
    } else if (rateType === BillingCycle.MONTHLY) {
      totalAmount = (diffDays / 30) * rate;
    }

    const newBooking: Booking = {
      id: crypto.randomUUID(),
      roomId: selectedBookingRoom.id,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      startDate,
      endDate,
      totalAmount,
      paymentStatus: formData.get('paymentStatus') as PaymentStatus,
      billingCycle: cycle,
    };
    
    bookingRepo.create(newBooking);
    setIsBookingModalOpen(false);
    setSelectedBookingRoom(null);
    refreshData();
  };

  const handleAddCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newCustomer: Customer = {
      id: selectedCustomer?.id || crypto.randomUUID(),
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string || undefined,
    };
    
    if (selectedCustomer) {
      customerRepo.update(selectedCustomer.id, newCustomer);
    } else {
      customerRepo.create(newCustomer);
    }
    
    setIsCustomerModalOpen(false);
    setSelectedCustomer(null);
    refreshData();
  };

  const generateInvoice = (booking: Booking) => {
    const doc = new jsPDF();
    const room = rooms.find(r => r.id === booking.roomId);
    const property = properties.find(p => p.id === room?.propertyId);
    const customer = customers.find(c => c.id === booking.customerId);

    // Header
    doc.setFontSize(22);
    doc.text('StayFlow PMS Invoice', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Invoice Date: ${formatDate(new Date().toISOString())}`, 105, 28, { align: 'center' });

    // Property Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('From:', 20, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(property?.name || 'StayFlow PMS', 20, 52);
    doc.text(property?.address || 'N/A', 20, 58, { maxWidth: 80 });

    // Customer Info
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 120, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(customer?.name || booking.customerName, 120, 52);
    doc.text(customer?.address || 'N/A', 120, 58, { maxWidth: 80 });

    // Booking Details
    autoTable(doc, {
      startY: 80,
      head: [['Description', 'Rate', 'Cycle', 'Duration', 'Total']],
      body: [
        [
          `Room ${room?.roomNumber} (${room?.type})`,
          formatCurrency(room?.baseRate || 0),
          room?.baseRateType || 'N/A',
          `${Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24))} Days`,
          formatCurrency(booking.totalAmount)
        ]
      ],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });

    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Amount: ${formatCurrency(booking.totalAmount)}`, 140, finalY);
    doc.text(`Payment Status: ${booking.paymentStatus}`, 140, finalY + 7);

    // Footer
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for choosing StayFlow!', 105, 280, { align: 'center' });

    doc.save(`Invoice_${booking.customerName.replace(/\s+/g, '_')}_${booking.id.slice(0, 8)}.pdf`);
  };

  const handleAddMaintenance = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newLog: MaintenanceLog = {
      id: crypto.randomUUID(),
      roomId: formData.get('roomId') as string,
      description: formData.get('description') as string,
      date: formData.get('date') as string,
      cost: Number(formData.get('cost')),
    };
    
    maintenanceRepo.create(newLog);
    setIsMaintenanceModalOpen(false);
    refreshData();
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Building2 size={20} />
            </div>
            <span>StayFlow PMS</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <SidebarItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<Building2 size={20} />} 
            label="Properties" 
            active={activeTab === 'properties'} 
            onClick={() => { setActiveTab('properties'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<BedDouble size={20} />} 
            label="Rooms" 
            active={activeTab === 'rooms'} 
            onClick={() => { setActiveTab('rooms'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<Wrench size={20} />} 
            label="Maintenance" 
            active={activeTab === 'maintenance'} 
            onClick={() => { setActiveTab('maintenance'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<BarChart3 size={20} />} 
            label="Revenue" 
            active={activeTab === 'revenue'} 
            onClick={() => { setActiveTab('revenue'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<Users size={20} />} 
            label="Customers" 
            active={activeTab === 'customers'} 
            onClick={() => { setActiveTab('customers'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<CalendarDays size={20} />} 
            label="Bookings" 
            active={activeTab === 'bookings'} 
            onClick={() => { setActiveTab('bookings'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<FileText size={20} />} 
            label="Fees Collection" 
            active={activeTab === 'fees'} 
            onClick={() => { setActiveTab('fees'); setIsSidebarOpen(false); }} 
          />
        </nav>
        
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">Admin User</p>
              <p className="text-xs text-slate-500 truncate">StayFlow Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-lg">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Building2 size={16} />
            </div>
            <span>StayFlow</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex bg-white border-b border-slate-200 p-4 items-center sticky top-0 z-30">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg mr-4"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold text-slate-900">StayFlow PMS</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                  <p className="text-slate-500">Welcome back, here's what's happening today.</p>
                </div>
                <div className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200 w-full sm:w-auto text-center">
                  {formatDate(new Date().toISOString())}
                </div>
              </header>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <StatCard 
                  title="Total Rooms" 
                  value={stats.totalRooms} 
                  icon={<BedDouble className="text-blue-600" />} 
                  bgColor="bg-blue-50"
                />
                <StatCard 
                  title="Occupied" 
                  value={stats.occupied} 
                  icon={<CheckCircle2 className="text-rose-600" />} 
                  bgColor="bg-rose-50"
                  subValue={`${Math.round((stats.occupied / stats.totalRooms || 0) * 100)}% Occupancy`}
                />
                <StatCard 
                  title="Vacant" 
                  value={stats.vacant} 
                  icon={<AlertCircle className="text-emerald-600" />} 
                  bgColor="bg-emerald-50"
                  subValue={`${stats.vacant} rooms ready`}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Room Grid */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="font-semibold text-slate-900">Room Status Grid</h2>
                    <div className="flex gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span>Vacant</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                        <span>Occupied</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {rooms.map(room => {
                        const isOccupied = stats.occupied > 0 && bookings.some(b => {
                          const today = new Date().toISOString().split('T')[0];
                          const start = new Date(b.startDate);
                          const end = new Date(b.endDate);
                          const now = new Date(today);
                          return b.roomId === room.id && now >= start && now <= end;
                        });
                        
                        return (
                          <button
                            key={room.id}
                            onClick={() => {
                              if (!isOccupied) {
                                setSelectedBookingRoom(room);
                                setIsBookingModalOpen(true);
                              }
                            }}
                            className={`p-4 rounded-xl border transition-all text-left group ${
                              isOccupied 
                                ? 'bg-rose-50 border-rose-200 text-rose-700' 
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:shadow-md cursor-pointer'
                            }`}
                          >
                            <div className="text-xs font-bold opacity-60 uppercase tracking-wider mb-1">Room {room.roomNumber}</div>
                            <div className="font-semibold truncate">{room.type}</div>
                            <div className="mt-2 text-xs font-medium">
                              {isOccupied ? 'Occupied' : 'Vacant'}
                            </div>
                          </button>
                        );
                      })}
                      {rooms.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400 italic">
                          No rooms added yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Arrears List */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-100">
                    <h2 className="font-semibold text-slate-900">Arrears (Unpaid)</h2>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                    {stats.arrears.map(booking => {
                      const room = rooms.find(r => r.id === booking.roomId);
                      return (
                        <div key={booking.id} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-slate-900">{booking.customerName}</p>
                              <p className="text-xs text-slate-500">Room {room?.roomNumber || 'N/A'}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              booking.paymentStatus === PaymentStatus.UNPAID ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {booking.paymentStatus}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-bold text-slate-900">{formatCurrency(booking.totalAmount)}</p>
                            {booking.customerPhone && (
                              <a 
                                href={generateWhatsAppLink(booking.customerPhone, `Hi ${booking.customerName}, this is a reminder regarding your stay at StayFlow. Your payment of ${formatCurrency(booking.totalAmount)} is currently ${booking.paymentStatus.toLowerCase()}. Please settle it at your earliest convenience. Thank you!`)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                              >
                                <MessageCircle size={14} />
                                Remind
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {stats.arrears.length === 0 && (
                      <div className="p-8 text-center text-slate-400 italic">
                        No outstanding payments.
                      </div>
                    )}
                  </div>

                  <div className="p-6 border-t border-b border-slate-100 bg-slate-50/50">
                    <h2 className="font-semibold text-slate-900">Recent Paid Bookings</h2>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                    {bookings
                      .filter(b => b.paymentStatus === PaymentStatus.PAID)
                      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                      .slice(0, 5)
                      .map(booking => {
                        const room = rooms.find(r => r.id === booking.roomId);
                        return (
                          <div key={booking.id} className="p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium text-slate-900">{booking.customerName}</p>
                                <p className="text-xs text-slate-500">Room {room?.roomNumber || 'N/A'}</p>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">
                                Paid
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <p className="text-sm font-bold text-slate-900">{formatCurrency(booking.totalAmount)}</p>
                              <button 
                                onClick={() => generateInvoice(booking)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                              >
                                <FileText size={14} />
                                Invoice
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    {bookings.filter(b => b.paymentStatus === PaymentStatus.PAID).length === 0 && (
                      <div className="p-8 text-center text-slate-400 italic">
                        No paid bookings yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'properties' && (
            <motion.div
              key="properties"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Properties</h1>
                  <p className="text-slate-500">Manage your homestay locations.</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedProperty(null);
                    setIsPropertyModalOpen(true);
                  }}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus size={20} />
                  Add Property
                </button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map(property => (
                  <div key={property.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative group">
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setSelectedProperty(property);
                          setIsPropertyModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('Delete this property and all its rooms?')) {
                            propertyRepo.delete(property.id);
                            refreshData();
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
                      <Building2 size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{property.name}</h3>
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">{property.address}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-slate-600">
                        <BedDouble size={16} />
                        <span className="text-sm font-medium">{property.totalRooms} Rooms</span>
                      </div>
                      <button 
                        onClick={() => setActiveTab('rooms')}
                        className="text-sm font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                      >
                        View Rooms <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {properties.length === 0 && (
                  <div className="col-span-full py-20 bg-white rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                    <Building2 size={48} className="mb-4 opacity-20" />
                    <p>No properties found. Start by adding one.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'rooms' && (
            <motion.div
              key="rooms"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Rooms</h1>
                  <p className="text-slate-500">Manage individual rooms and their rates.</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedRoom(null);
                    setIsRoomModalOpen(true);
                  }}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus size={20} />
                  Add Room
                </button>
              </header>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Room #</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Property</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Base Rate</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rooms.map(room => {
                      const property = properties.find(p => p.id === room.propertyId);
                      return (
                        <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-900">{room.roomNumber}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{property?.name || 'Unknown'}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">{room.type}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">{formatCurrency(room.baseRate)}</span>
                              <span className="text-[10px] text-slate-400 uppercase font-bold">Per {room.baseRateType}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => {
                                  setSelectedRoom(room);
                                  setIsRoomModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm('Delete this room?')) {
                                    roomRepo.delete(room.id);
                                    refreshData();
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {rooms.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                          No rooms found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

          {activeTab === 'maintenance' && (
            <motion.div
              key="maintenance"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Maintenance Log</h1>
                  <p className="text-slate-500">Track repairs and maintenance costs.</p>
                </div>
                <button 
                  onClick={() => setIsMaintenanceModalOpen(true)}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus size={20} />
                  Log Repair
                </button>
              </header>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Room</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cost</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {maintenanceLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => {
                      const room = rooms.find(r => r.id === log.roomId);
                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-slate-600">{formatDate(log.date)}</td>
                          <td className="px-6 py-4 font-bold text-slate-900">Room {room?.roomNumber || 'N/A'}</td>
                          <td className="px-6 py-4 text-slate-600 max-w-md truncate">{log.description}</td>
                          <td className="px-6 py-4 font-semibold text-rose-600">{formatCurrency(log.cost)}</td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => {
                                if (confirm('Delete this log?')) {
                                  maintenanceRepo.delete(log.id);
                                  refreshData();
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {maintenanceLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                          No maintenance logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

          {activeTab === 'revenue' && (
            <motion.div
              key="revenue"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Revenue Report</h1>
                  <p className="text-slate-500">Monthly earnings summary in MYR.</p>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Total Revenue</h3>
                  <p className="text-3xl font-bold text-emerald-600">
                    {formatCurrency(bookings.reduce((sum, b) => sum + b.totalAmount, 0))}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Total Maintenance</h3>
                  <p className="text-3xl font-bold text-rose-600">
                    {formatCurrency(maintenanceLogs.reduce((sum, l) => sum + l.cost, 0))}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-900">Monthly Breakdown</h2>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Month</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Bookings</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const monthlyData: Record<string, { count: number, total: number }> = {};
                      bookings.forEach(b => {
                        const date = new Date(b.startDate);
                        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        if (!monthlyData[monthKey]) monthlyData[monthKey] = { count: 0, total: 0 };
                        monthlyData[monthKey].count += 1;
                        monthlyData[monthKey].total += b.totalAmount;
                      });
                      
                      return Object.entries(monthlyData)
                        .sort((a, b) => b[0].localeCompare(a[0]))
                        .map(([month, data]) => (
                          <tr key={month} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900">
                              {new Date(month + '-01').toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 text-slate-600">{data.count} bookings</td>
                            <td className="px-6 py-4 font-bold text-emerald-600 text-right">{formatCurrency(data.total)}</td>
                          </tr>
                        ));
                    })()}
                    {bookings.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">
                          No revenue data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'customers' && (
            <motion.div
              key="customers"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
                  <p className="text-slate-500">Manage your guest database.</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedCustomer(null);
                    setIsCustomerModalOpen(true);
                  }}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus size={20} />
                  Add Customer
                </button>
              </header>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Address</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.map(customer => (
                      <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{customer.name}</td>
                        <td className="px-6 py-4 text-slate-600">{customer.phone}</td>
                        <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{customer.address}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setIsCustomerModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm('Delete this customer?')) {
                                  customerRepo.delete(customer.id);
                                  refreshData();
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {customers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                          No customers found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
          {activeTab === 'bookings' && (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">All Bookings</h1>
                  <p className="text-slate-500">History of all guest stays and payments.</p>
                </div>
              </header>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Guest</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Room</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dates</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(booking => {
                      const room = rooms.find(r => r.id === booking.roomId);
                      return (
                        <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{booking.customerName}</div>
                            <div className="text-xs text-slate-500">{booking.customerPhone}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-600">Room {room?.roomNumber || 'N/A'}</td>
                          <td className="px-6 py-4 text-slate-600">
                            <div className="text-sm">{formatDate(booking.startDate)}</div>
                            <div className="text-[10px] text-slate-400">to {formatDate(booking.endDate)}</div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-900">{formatCurrency(booking.totalAmount)}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                              booking.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-100 text-emerald-700' : 
                              booking.paymentStatus === PaymentStatus.UNPAID ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {booking.paymentStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {booking.paymentStatus === PaymentStatus.PAID && (
                                <button 
                                  onClick={() => generateInvoice(booking)}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="Download Invoice"
                                >
                                  <FileText size={18} />
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  if (confirm('Delete this booking?')) {
                                    bookingRepo.delete(booking.id);
                                    refreshData();
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {bookings.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                          No bookings found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
          {activeTab === 'fees' && (
            <motion.div
              key="fees"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Fees Collection</h1>
                  <p className="text-slate-500">Manage unpaid fees and generate invoices.</p>
                </div>
                <div className="flex gap-4 w-full sm:w-auto">
                  <div className="flex flex-col gap-1 flex-1 sm:flex-none">
                    <label className="text-xs font-semibold text-slate-500 uppercase">From</label>
                    <input 
                      type="date" 
                      value={feeFilterStart}
                      onChange={(e) => setFeeFilterStart(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm w-full"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1 sm:flex-none">
                    <label className="text-xs font-semibold text-slate-500 uppercase">To</label>
                    <input 
                      type="date" 
                      value={feeFilterEnd}
                      onChange={(e) => setFeeFilterEnd(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm w-full"
                    />
                  </div>
                </div>
              </header>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Guest</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Room</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dates</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings
                      .filter(b => {
                        const matchesStatus = b.paymentStatus !== PaymentStatus.PAID;
                        const date = new Date(b.startDate);
                        const start = feeFilterStart ? new Date(feeFilterStart) : null;
                        const end = feeFilterEnd ? new Date(feeFilterEnd) : null;
                        
                        const matchesDate = (!start || date >= start) && (!end || date <= end);
                        return matchesStatus && matchesDate;
                      })
                      .map(booking => {
                        const room = rooms.find(r => r.id === booking.roomId);
                        return (
                          <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900">{booking.customerName}</div>
                              <div className="text-xs text-slate-500">{booking.customerPhone}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-600">Room {room?.roomNumber || 'N/A'}</td>
                            <td className="px-6 py-4 text-slate-600">
                              <div className="text-sm">{formatDate(booking.startDate)}</div>
                              <div className="text-[10px] text-slate-400">to {formatDate(booking.endDate)}</div>
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-900">{formatCurrency(booking.totalAmount)}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                booking.paymentStatus === PaymentStatus.UNPAID ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {booking.paymentStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => handleMarkAsPaid(booking.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors"
                                >
                                  <CheckCircle2 size={14} />
                                  Mark Paid
                                </button>
                                <button 
                                  onClick={() => generateInvoice(booking)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="Download Invoice"
                                >
                                  <FileText size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {bookings.filter(b => b.paymentStatus !== PaymentStatus.PAID).length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                          No pending fees found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <Modal 
        isOpen={isPropertyModalOpen} 
        onClose={() => setIsPropertyModalOpen(false)} 
        title={selectedProperty ? "Edit Property" : "Add New Property"}
      >
        <form onSubmit={handleAddProperty} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Property Name</label>
            <input 
              name="name" 
              defaultValue={selectedProperty?.name}
              required 
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="e.g. Sunset Villa"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <textarea 
              name="address" 
              defaultValue={selectedProperty?.address}
              required 
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="Full address here..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Total Rooms</label>
            <input 
              name="totalRooms" 
              type="number"
              defaultValue={selectedProperty?.totalRooms}
              required 
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="e.g. 10"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => setIsPropertyModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              {selectedProperty ? "Update Property" : "Save Property"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isRoomModalOpen} 
        onClose={() => setIsRoomModalOpen(false)} 
        title={selectedRoom ? "Edit Room" : "Add New Room"}
      >
        <form onSubmit={handleAddRoom} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Property</label>
            <select 
              name="propertyId" 
              defaultValue={selectedRoom?.propertyId}
              required 
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
            >
              <option value="">Select Property</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Room Number</label>
              <input 
                name="roomNumber" 
                defaultValue={selectedRoom?.roomNumber}
                required 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="e.g. 101"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select 
                name="type" 
                defaultValue={selectedRoom?.type}
                required 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
              >
                <option value="Single">Single</option>
                <option value="Double">Double</option>
                <option value="Queen">Queen</option>
                <option value="King">King</option>
                <option value="Suite">Suite</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rate Type</label>
              <select 
                name="baseRateType" 
                defaultValue={selectedRoom?.baseRateType || BillingCycle.DAILY}
                required 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
              >
                <option value={BillingCycle.DAILY}>Daily</option>
                <option value={BillingCycle.WEEKLY}>Weekly</option>
                <option value={BillingCycle.MONTHLY}>Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price (MYR)</label>
              <input 
                name="baseRate" 
                type="number"
                defaultValue={selectedRoom?.baseRate}
                required 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="e.g. 150"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => setIsRoomModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              {selectedRoom ? "Update Room" : "Save Room"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isBookingModalOpen} 
        onClose={() => setIsBookingModalOpen(false)} 
        title={`New Booking - Room ${selectedBookingRoom?.roomNumber}`}
      >
        <form onSubmit={handleAddBookingSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Customer</label>
            <select 
              name="customerId" 
              required 
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
            >
              <option value="">Select a customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Can't find customer? <button type="button" onClick={() => { setIsBookingModalOpen(false); setIsCustomerModalOpen(true); }} className="text-indigo-600 hover:underline">Add new customer</button>
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Check-in Date</label>
              <input 
                name="startDate" 
                type="date"
                required 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Check-out Date</label>
              <input 
                name="endDate" 
                type="date"
                required 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Billing Cycle</label>
              <select 
                name="billingCycle" 
                required 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
              >
                <option value={BillingCycle.DAILY}>Daily</option>
                <option value={BillingCycle.WEEKLY}>Weekly</option>
                <option value={BillingCycle.MONTHLY}>Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Status</label>
              <select 
                name="paymentStatus" 
                required 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
              >
                <option value={PaymentStatus.UNPAID}>Unpaid</option>
                <option value={PaymentStatus.PARTIAL}>Partial</option>
                <option value={PaymentStatus.PAID}>Paid</option>
              </select>
            </div>
          </div>
          <div className="p-4 bg-indigo-50 rounded-lg">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Rate Information</p>
            <p className="text-sm text-slate-700">Room Rate: <span className="font-bold">{formatCurrency(selectedBookingRoom?.baseRate || 0)}</span> per {selectedBookingRoom?.baseRateType.toLowerCase()}</p>
            <p className="text-xs text-slate-500 mt-1">Total will be auto-calculated based on the room's rate type.</p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => setIsBookingModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Confirm Booking
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isMaintenanceModalOpen} 
        onClose={() => setIsMaintenanceModalOpen(false)} 
        title="Log Maintenance Repair"
      >
        <form onSubmit={handleAddMaintenance} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
            <select 
              name="roomId" 
              required 
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
            >
              <option value="">Select Room</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>Room {r.roomNumber} ({r.type})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input 
              name="date" 
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]}
              required 
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea 
              name="description" 
              required 
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="What was repaired?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cost (MYR)</label>
            <input 
              name="cost" 
              type="number"
              required 
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="e.g. 50"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => setIsMaintenanceModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Save Log
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isCustomerModalOpen} 
        onClose={() => { setIsCustomerModalOpen(false); setSelectedCustomer(null); }} 
        title={selectedCustomer ? "Edit Customer" : "Add New Customer"}
      >
        <form onSubmit={handleAddCustomer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
            <input 
              name="name" 
              defaultValue={selectedCustomer?.name}
              required 
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="e.g. John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <input 
              name="phone" 
              defaultValue={selectedCustomer?.phone}
              required 
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="e.g. +60123456789"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email (Optional)</label>
            <input 
              name="email" 
              type="email"
              defaultValue={selectedCustomer?.email}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="e.g. john@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <textarea 
              name="address" 
              defaultValue={selectedCustomer?.address}
              required 
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="Full address here..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => { setIsCustomerModalOpen(false); setSelectedCustomer(null); }}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              {selectedCustomer ? "Update Customer" : "Save Customer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active 
          ? 'bg-indigo-50 text-indigo-600 shadow-sm' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StatCard({ title, value, icon, bgColor, subValue }: { title: string, value: number | string, icon: React.ReactNode, bgColor: string, subValue?: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
          {subValue && <p className="text-xs font-medium text-slate-400 mt-1">{subValue}</p>}
        </div>
        <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
