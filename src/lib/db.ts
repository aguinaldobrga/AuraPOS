import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Product, Sale, User } from '@/types';

interface AuraPOSDB extends DBSchema {
  products: {
    key: string;
    value: Product;
  };
  sales: {
    key: string;
    value: Sale;
    indexes: {
      'by-synced': number;
      'by-timestamp': number;
    };
  };
  users: {
    key: string;
    value: User;
    indexes: {
      'by-role': string;
      'by-active': number;
    };
  };
}

const DB_NAME = 'aura-pos-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<AuraPOSDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<AuraPOSDB>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion) {
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('sales')) {
          const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
          salesStore.createIndex('by-synced', 'synced');
          salesStore.createIndex('by-timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains('users')) {
          const usersStore = db.createObjectStore('users', { keyPath: 'id' });
          usersStore.createIndex('by-role', 'role');
          usersStore.createIndex('by-active', 'active');
        }
      },
    });
  }
  return dbPromise;
}

// Métodos de Usuários
export async function getAllUsersDB(): Promise<User[]> {
  const db = await getDB();
  return db.getAll('users');
}

export async function saveUserDB(user: User): Promise<void> {
  const db = await getDB();
  await db.put('users', user);
}

export async function updateUserDB(user: User): Promise<void> {
  const db = await getDB();
  await db.put('users', user);
}

export async function deleteUserDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('users', id);
}

export async function clearUsersDB(): Promise<void> {
  const db = await getDB();
  await db.clear('users');
}

// Métodos de Produtos
export async function getAllProductsDB(): Promise<Product[]> {
  const db = await getDB();
  return db.getAll('products');
}

export async function saveProductDB(product: Product): Promise<void> {
  const db = await getDB();
  await db.put('products', product);
}

export async function deleteProductDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('products', id);
}

export async function clearProductsDB(): Promise<void> {
  const db = await getDB();
  await db.clear('products');
}

// Métodos de Vendas (com sanitização blindada do campo synced)
export async function getAllSalesDB(): Promise<Sale[]> {
  const db = await getDB();
  return db.getAllFromIndex('sales', 'by-timestamp');
}

export async function saveSaleDB(sale: Sale): Promise<void> {
  const db = await getDB();
  const record = {
    ...sale,
    synced: sale.synced ? 1 : 0
  };
  await db.put('sales', record as unknown as Sale);
}

export async function updateSaleDB(sale: Sale): Promise<void> {
  const db = await getDB();
  const record = {
    ...sale,
    synced: sale.synced ? 1 : 0
  };
  await db.put('sales', record as unknown as Sale);
}

