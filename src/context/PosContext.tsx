import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, CartItem, Sale, PaymentMethod, User } from '@/types';
import {
  getAllProductsDB, saveProductDB, deleteProductDB,
  getAllSalesDB, saveSaleDB, updateSaleDB,
  getAllUsersDB, saveUserDB, deleteUserDB, updateUserDB
} from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { generateUUID, hashPin } from '@/utils';

interface PosContextType {
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  cartTotal: number;
  
  sales: Sale[];
  registerSale: (method: PaymentMethod, cashReceived?: number, change?: number) => Promise<void>;
  cancelSale: (id: string) => Promise<void>;
  
  users: User[];
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
  toggleUserActive: (id: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  
  isLoading: boolean;
}

const PosContext = createContext<PosContextType | null>(null);

export function PosProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // -------------------------------------------------------------------
  // PROVISIONAMENTO AUTOMÁTICO DO ADMINISTRADOR PADRÃO (COM HASH)
  // -------------------------------------------------------------------
  const ensureDefaultAdmin = async (currentUsers: User[]): Promise<User[]> => {
    const hasAdmin = currentUsers.some(u => u.role === 'ADMIN');
    if (hasAdmin) return currentUsers;

    try {
      const rawPin = import.meta.env.VITE_DEFAULT_ADMIN_PIN;
      const adminName = import.meta.env.VITE_DEFAULT_ADMIN_NAME || 'Administrador Gui Studio';
      
      // Criptografa o PIN do .env via código
      const hashedPin = await hashPin(rawPin.trim());

      const defaultAdmin: User = {
        // USAMOS UUID V4 VÁLIDO PARA EVITAR ERRO 400 NO SUPABASE
        id: generateUUID(), 
        name: adminName,
        role: 'ADMIN',
        pin: hashedPin,
        active: true,
        createdAt: Date.now()
      };

      await saveUserDB(defaultAdmin);

      // Envia para o Supabase com UUID compatível
      const { error: cloudError } = await supabase.from('users').upsert({
        id: defaultAdmin.id,
        name: defaultAdmin.name,
        role: defaultAdmin.role,
        pin: defaultAdmin.pin,
        active: defaultAdmin.active
      });

      if (cloudError) {
        console.warn('[AuraPOS] Detalhes do erro no Supabase:', cloudError.message, cloudError.details);
      } else {
        console.log('[AuraPOS] Admin padrão provisionado no Supabase com sucesso!');
      }

      return [...currentUsers, defaultAdmin];
    } catch (error) {
      console.error('[AuraPOS] Erro ao criar o Admin padrão:', error);
      return currentUsers;
    }
  };

  // -------------------------------------------------------------------
  // CARGA E SINCRONIZAÇÃO INICIAL DE DADOS
  // -------------------------------------------------------------------
  useEffect(() => {
    async function loadAndSyncData() {
      try {
        // 1. SINCRONIZAÇÃO DE USUÁRIOS
        try {
          const { data: cloudUsers, error: userError } = await supabase.from('users').select('*');
          if (!userError && cloudUsers && cloudUsers.length > 0) {
            for (const cloudUser of cloudUsers) {
              await saveUserDB({
                id: cloudUser.id,
                name: cloudUser.name,
                role: cloudUser.role,
                pin: cloudUser.pin,
                active: cloudUser.active,
                createdAt: cloudUser.created_at ? new Date(cloudUser.created_at).getTime() : Date.now()
              });
            }
          }
        } catch (err) {
          console.warn('[AuraPOS] Nuvem indisponível para usuários:', err);
        }

        let loadedUsers = await getAllUsersDB();
        
        // Se o banco estiver zerado, provisiona o Admin com PIN criptografado
        loadedUsers = await ensureDefaultAdmin(loadedUsers);

        setUsers(loadedUsers);
        setCurrentUser(loadedUsers[0] || null);

        // 2. SINCRONIZAÇÃO DE PRODUTOS
        try {
          const { data: cloudProducts, error: prodError } = await supabase.from('products').select('*');
          if (!prodError && cloudProducts && cloudProducts.length > 0) {
            for (const cloudProd of cloudProducts) {
              await saveProductDB({
                id: cloudProd.id,
                name: cloudProd.name,
                price: Number(cloudProd.price),
                category: cloudProd.category,
                color: cloudProd.color
              });
            }
          }
        } catch (err) {
          console.warn('[AuraPOS] Nuvem indisponível para produtos:', err);
        }

        const loadedProducts = await getAllProductsDB();
        setProducts(loadedProducts);

        // 3. SINCRONIZAÇÃO DE VENDAS
        try {
          const { data: cloudSales, error: salesError } = await supabase.from('sales').select('*');
          if (!salesError && cloudSales && cloudSales.length > 0) {
            for (const cs of cloudSales) {
              await saveSaleDB({
                id: cs.id,
                items: typeof cs.items === 'string' ? JSON.parse(cs.items) : cs.items,
                total: Number(cs.total),
                method: cs.method,
                timestamp: Number(cs.timestamp),
                status: cs.status,
                synced: true,
                operatorId: cs.operator_id,
                operatorName: cs.operator_name,
                cashReceived: cs.cash_received ? Number(cs.cash_received) : undefined,
                change: cs.change ? Number(cs.change) : undefined
              });
            }
          }
        } catch (err) {
          console.warn('[AuraPOS] Nuvem indisponível para vendas:', err);
        }

        const loadedSales = await getAllSalesDB();
        setSales(loadedSales.reverse());

      } catch (error) {
        console.error('[AuraPOS] Erro ao carregar banco local:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadAndSyncData();
  }, []);

  // -------------------------------------------------------------------
  // AÇÕES DE USUÁRIOS
  // -------------------------------------------------------------------
  const addUser = async (userData: Omit<User, 'id' | 'createdAt'>) => {
    try {
      const hashedPin = await hashPin(userData.pin.trim());

      const newUser: User = {
        ...userData,
        pin: hashedPin,
        id: generateUUID(),
        createdAt: Date.now()
      };

      await saveUserDB(newUser);
      setUsers(prev => [...prev, newUser]);

      try {
        const { error: supabaseError } = await supabase.from('users').insert([{
          id: newUser.id,
          name: newUser.name,
          role: newUser.role,
          pin: newUser.pin,
          active: newUser.active
        }]);

        if (supabaseError) {
          console.warn('[AuraPOS] Usuário salvo localmente. Aviso do Supabase:', supabaseError.message);
        }
      } catch (err) {
        console.warn('[AuraPOS] Usuário salvo localmente. Pendente de sync na nuvem:', err);
      }

    } catch (error) {
      console.error('[AuraPOS] Erro ao criptografar ou salvar novo usuário:', error);
      alert('Não foi possível cadastrar o operador com segurança.');
    }
  };

  const toggleUserActive = async (id: string) => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return;

    const updatedUser = { ...targetUser, active: !targetUser.active };
    await updateUserDB(updatedUser);
    setUsers(prev => prev.map(u => u.id === id ? updatedUser : u));

    try {
      await supabase.from('users').update({ active: updatedUser.active }).eq('id', id);
    } catch (err) {
      console.warn('[AuraPOS] Status atualizado localmente:', err);
    }
  };

  const deleteUser = async (id: string) => {
    await deleteUserDB(id);
    setUsers(prev => prev.filter(u => u.id !== id));

    try {
      await supabase.from('users').delete().eq('id', id);
    } catch (err) {
      console.warn('[AuraPOS] Usuário removido localmente:', err);
    }
  };

  // -------------------------------------------------------------------
  // AÇÕES DE PRODUTOS
  // -------------------------------------------------------------------
  const addProduct = async (productData: Omit<Product, 'id'>) => {
    const newProduct: Product = { ...productData, id: generateUUID() };

    await saveProductDB(newProduct);
    setProducts(prev => [...prev, newProduct]);

    try {
      await supabase.from('products').insert([newProduct]);
    } catch (err) {
      console.warn('[AuraPOS] Produto salvo localmente:', err);
    }
  };

  const deleteProduct = async (id: string) => {
    await deleteProductDB(id);
    setProducts(prev => prev.filter(p => p.id !== id));

    try {
      await supabase.from('products').delete().eq('id', id);
    } catch (err) {
      console.warn('[AuraPOS] Produto removido localmente:', err);
    }
  };

  // -------------------------------------------------------------------
  // CARRINHO DE COMPRAS
  // -------------------------------------------------------------------
  const addToCart = (product: Product) => {
    if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);
  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // -------------------------------------------------------------------
  // REGISTRO DE VENDAS
  // -------------------------------------------------------------------
  const registerSale = async (method: PaymentMethod, cashReceived?: number, change?: number) => {
    try {
      const cleanItems = cart.map(item => ({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        color: item.color || '#14b8a6',
        category: item.category || 'Geral',
        quantity: Number(item.quantity)
      }));

      const sale: Sale = {
        id: generateUUID(),
        items: cleanItems,
        total: Number(cartTotal),
        method,
        timestamp: Date.now(),
        status: 'APROVADA',
        synced: false,
        operatorId: currentUser?.id,
        operatorName: currentUser?.name || 'Operador Padrão',
        cashReceived: cashReceived ? Number(cashReceived) : undefined,
        change: change ? Number(change) : undefined
      };

      await saveSaleDB(sale);
      setSales(prev => [sale, ...prev]);
      clearCart();

      if (typeof window !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      try {
        const { error: supabaseError } = await supabase.from('sales').insert([{
          id: sale.id,
          items: sale.items,
          total: sale.total,
          method: sale.method,
          timestamp: sale.timestamp,
          status: sale.status,
          synced: true,
          operator_id: sale.operatorId,
          operator_name: sale.operatorName,
          cash_received: sale.cashReceived,
          change: sale.change
        }]);

        if (!supabaseError) {
          const syncedSale = { ...sale, synced: true };
          await updateSaleDB(syncedSale);
          setSales(prev => prev.map(s => s.id === sale.id ? syncedSale : s));
        } else {
          console.warn('[AuraPOS] Venda salva localmente. Aviso do Supabase:', supabaseError.message);
        }
      } catch (cloudErr) {
        console.warn('[AuraPOS] Dispositivo offline. Venda mantida localmente:', cloudErr);
      }

    } catch (localErr) {
      console.error('[AuraPOS] Erro crítico ao salvar venda localmente:', localErr);
      alert(`Erro no banco local: ${localErr instanceof Error ? localErr.message : 'Falha ao salvar'}`);
    }
  };

  const cancelSale = async (id: string) => {
    const saleToUpdate = sales.find(s => s.id === id);
    if (!saleToUpdate) return;

    const updatedSale: Sale = { ...saleToUpdate, status: 'CANCELADA', synced: false };
    await updateSaleDB(updatedSale);
    setSales(prev => prev.map(s => s.id === id ? updatedSale : s));

    try {
      await supabase.from('sales').update({ status: 'CANCELADA' }).eq('id', id);
    } catch (err) {
      console.warn('[AuraPOS] Cancelamento salvo localmente:', err);
    }
  };

  return (
    <PosContext.Provider value={{
      products, addProduct, deleteProduct,
      cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal,
      sales, registerSale, cancelSale,
      users, currentUser, setCurrentUser, addUser, toggleUserActive, deleteUser,
      isLoading
    }}>
      {children}
    </PosContext.Provider>
  );
}

export function usePos() {
  const context = useContext(PosContext);
  if (!context) throw new Error('usePos deve ser usado dentro de PosProvider');
  return context;
}