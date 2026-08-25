import { useState, FormEvent } from 'react';
import { usePos } from '@/context/PosContext';
import { UserRole } from '@/types';
import { UserPlus, Shield, User as UserIcon, Lock, CheckCircle, XCircle, Trash2 } from 'lucide-react';

export function UserAdmin() {
  const { users, addUser, toggleUserActive, deleteUser } = usePos();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<UserRole>('OPERATOR');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || pin.length < 4) return;

    await addUser({
      name: name.trim(),
      pin,
      role,
      active: true
    });

    setName('');
    setPin('');
    setRole('OPERATOR');
  };

  return (
    <div className="p-4 max-w-4xl mx-auto pb-20">
      <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2">
        <Shield className="text-teal-400" />
        <span>Gestão de Operadores e Acessos</span>
      </h2>

      {/* Form de Cadastro */}
      <div className="bg-surface border border-slate-800 p-6 rounded-2xl mb-8 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <UserPlus size={20} className="text-teal-400" />
          <span>Cadastrar Novo Operador</span>
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Nome Completo</label>
            <div className="relative">
              <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full bg-main border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">PIN de Acesso (4 dígitos)</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-main border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-100 focus:outline-none focus:border-teal-500 tracking-widest"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Função</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              className="w-full bg-main border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="OPERATOR">Operador de Caixa</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          <div className="md:col-span-3 pt-2">
            <button
              type="submit"
              className="w-full md:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl shadow-lg active:scale-95 transition-all"
            >
              Cadastrar Operador
            </button>
          </div>
        </form>
      </div>

      {/* Tabela/Lista de Usuários */}
      <h3 className="text-xl font-bold text-slate-100 mb-4">Operadores Cadastrados</h3>
      <div className="space-y-3">
        {users.map(user => (
          <div
            key={user.id}
            className="bg-surface border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${user.role === 'ADMIN' ? 'bg-amber-500/10 text-amber-400' : 'bg-teal-500/10 text-teal-400'}`}>
                {user.role === 'ADMIN' ? <Shield size={20} /> : <UserIcon size={20} />}
              </div>
              <div>
                <div className="font-bold text-slate-100 flex items-center gap-2">
                  <span>{user.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
                    {user.role === 'ADMIN' ? 'Admin' : 'Operador'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">PIN: ••••</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleUserActive(user.id)}
                className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  user.active
                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                }`}
              >
                {user.active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                <span>{user.active ? 'Ativo' : 'Inativo'}</span>
              </button>

              {user.id !== 'admin-default-id' && (
                <button
                  onClick={() => {
                    if (confirm(`Remover operador ${user.name}?`)) deleteUser(user.id);
                  }}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}