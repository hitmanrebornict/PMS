import { Property, Room, Booking, MaintenanceLog, Customer } from '../types';

export interface IRepository<T> {
  getAll(): T[];
  getById(id: string): T | undefined;
  create(item: T): void;
  update(id: string, item: T): void;
  delete(id: string): void;
}

abstract class BaseRepository<T extends { id: string }> implements IRepository<T> {
  protected storageKey: string;

  constructor(storageKey: string) {
    this.storageKey = storageKey;
  }

  protected getItems(): T[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  protected saveItems(items: T[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  getAll(): T[] {
    return this.getItems();
  }

  getById(id: string): T | undefined {
    return this.getItems().find(item => item.id === id);
  }

  create(item: T): void {
    const items = this.getItems();
    items.push(item);
    this.saveItems(items);
  }

  update(id: string, updatedItem: T): void {
    const items = this.getItems();
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = updatedItem;
      this.saveItems(items);
    }
  }

  delete(id: string): void {
    const items = this.getItems();
    const filtered = items.filter(item => item.id !== id);
    this.saveItems(filtered);
  }
}

export class PropertyRepository extends BaseRepository<Property> {
  constructor() {
    super('stayflow_properties');
  }
}

export class RoomRepository extends BaseRepository<Room> {
  constructor() {
    super('stayflow_rooms');
  }

  getByPropertyId(propertyId: string): Room[] {
    return this.getAll().filter(room => room.propertyId === propertyId);
  }
}

export class BookingRepository extends BaseRepository<Booking> {
  constructor() {
    super('stayflow_bookings');
  }

  getActiveBookingForRoom(roomId: string, date: string): Booking | undefined {
    return this.getAll().find(booking => {
      if (booking.roomId !== roomId) return false;
      const start = new Date(booking.startDate);
      const end = new Date(booking.endDate);
      const current = new Date(date);
      return current >= start && current <= end;
    });
  }
}

export class CustomerRepository extends BaseRepository<Customer> {
  constructor() {
    super('stayflow_customers');
  }
}

export class MaintenanceRepository extends BaseRepository<MaintenanceLog> {
  constructor() {
    super('stayflow_maintenance');
  }

  getByRoomId(roomId: string): MaintenanceLog[] {
    return this.getAll().filter(log => log.roomId === roomId);
  }
}
