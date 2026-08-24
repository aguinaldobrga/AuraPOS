<div align="center">
  <img src="src/assets/icon-512x512.png" alt="AuraPOS Logo" width="100" />
  <h1>AuraPOS — Ponto de Venda Mobile & Offline-First</h1>
  <p><strong>Aplicação Progressiva (PWA) de Gestão de Vendas, Fechamento de Caixa e Sincronização em Nuvem para Eventos e Balcões de Atendimento.</strong></p>

  <div>
    <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React 18" />
    <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Supabase-Database-emerald?style=for-the-badge&logo=supabase" alt="Supabase" />
    <img src="https://img.shields.io/badge/IndexedDB-Offline--First-orange?style=for-the-badge" alt="IndexedDB" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-3-38bdf8?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  </div>
</div>

---

## 📌 Visão Geral do Produto

O **AuraPOS** é um PWA (*Progressive Web App*) de alta performance projetado para operar com **zero latência** e **100% de resiliência em cenários com conexão instável ou inexistente** (feiras, eventos ao ar livre, quiosques e balcões ágeis).

A aplicação adota o paradigma **Offline-First**: todas as transações, cadastros e atualizações de estado ocorrem de forma síncrona no banco de dados local do navegador (**IndexedDB**), garantindo resposta instantânea na interface do operador. Em segundo plano, uma camada desacoplada realiza a sincronização bi-direcional assíncrona com o **Supabase** (PostgreSQL na nuvem).

---

## ✨ Principais Recursos

- **⚡ PWA & Operação Offline-First:** Funciona de forma autônoma sem sinal de internet. Persistência local garantida via IndexedDB com biblioteca `idb`.
- **☁️ Sincronização em Nuvem:** Integração em segundo plano com Supabase para consolidação centralizada de produtos, usuários e vendas.
- **🔐 Autenticação por PIN & RBAC:** Tela de bloqueio por PIN individual com controle de acesso baseado em papéis (*Role-Based Access Control*):
  - **Operador (`OPERATOR`):** Acesso estrito ao terminal de vendas (PDV) e visualização isolada do seu próprio fechamento de caixa.
  - **Administrador (`ADMIN`):** Acesso à gestão de catálogo, cadastro de operadores e auditoria consolidada com filtro por bancas.
- **📱 UX Mobile-First & Toque Direto:** Interface limpa focada em interação por toque com chips horizontais de filtro por categoria, dispensando o uso de teclados virtuais na feira.
- **📄 Relatórios de Fechamento em PDF:** Emissão de relatórios consolidados em PDF via `jsPDF` e `jspdf-autotable`, com agrupamento por produto, método de pagamento, operador e validação estrita por PIN na assinatura digital.
- **🛡️ UUID Fallback em Contexto Não Seguro:** Gerador customizado de UUIDs para garantir funcionamento uniforme via HTTP em redes locais Wi-Fi de dispositivos móveis.

---

## 🏗️ Arquitetura e Engenharia de Software

```text
src/
├── assets/          # Logotipos, ícones e recursos estáticos do PWA
├── components/      # Componentes UI reutilizáveis (ProductGrid, Cart, Dashboard...)
├── context/         # Estado global reativo (PosContext - Gerenciador de Sincronização)
├── lib/             # Camadas de persistência local (db.ts) e cliente Supabase (supabase.ts)
├── types/           # Interfaces e definições estritas de tipos do TypeScript
└── utils/           # Funções puras (gerador de PDF, formatadores de moeda/data e gerador de UUID)
```
## 🔁 Lógica de Sincronização (Local vs Nuvem)
[ Interação do Usuário / PDV ]
             │
             ▼
   [ IndexedDB (Local) ]  ──► (Atualização Imediata da UI - Zero Latência)
             │
             ▼ (Background Sync)
     [ Supabase Cloud ]    ──► (Consolidação Centralizada no PostgreSQL)

## 🛢️ Modelagem do Banco de Dados (Supabase / PostgreSQL)
Para replicar a estrutura no Supabase, execute o script SQL abaixo no SQL Editor:

```SQL
-- Tabela de Produtos
create table public.products (
  id uuid primary key,
  name text not null,
  price numeric not null,
  category text not null,
  color text default '#14b8a6',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Usuários / Operadores
create table public.users (
  id uuid primary key,
  name text not null,
  role text not null check (role in ('ADMIN', 'OPERATOR')),
  pin text not null,
  active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Vendas
create table public.sales (
  id uuid primary key,
  items jsonb not null,
  total numeric not null,
  method text not null,
  timestamp bigint not null,
  status text not null,
  synced boolean default true,
  operator_id text,
  operator_name text,
  cash_received numeric,
  change numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Permissões Row Level Security (RLS)
alter table public.products enable row level security;
alter table public.users enable row level security;
alter table public.sales enable row level security;

create policy "Acesso Total Produtos" on public.products for all using (true) with check (true);
create policy "Acesso Total Usuarios" on public.users for all using (true) with check (true);
create policy "Acesso Total Vendas" on public.sales for all using (true) with check (true);

```

## 🚀 Como Executar o Projeto Localmente
Pré-requisitos
Node.js: versão 18+ ou superior

npm ou yarn

### 1. Clonar o Repositório e Instalar Dependências
```Bash
git clone [https://github.com/seu-usuario/aura-pos.git](https://github.com/seu-usuario/aura-pos.git)
cd aura-pos
npm install
```
### 2. Configurar Variáveis de Ambiente
Crie um arquivo **.env** na raiz do projeto contendo as credenciais do Supabase:

Snippet de código
VITE_SUPABASE_URL=[https://seu-projeto.supabase.co](https://seu-projeto.supabase.co)
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica

### 3. Executar em Modo de Desenvolvimento
```Bash
npm run dev
```
Acesse o sistema no navegador através de http://localhost:3000 ou pelo IP local exibido no terminal para testes no celular na mesma rede Wi-Fi.

### 4. Build de Produção
```Bash
npm run build
```
Os arquivos otimizados e minificados serão gerados no diretório /dist.


## 🔒 Credenciais Padrão no Primeiro Boot
Ao inicializar o banco local sem registros prévios, o sistema cria automaticamente o usuário administrador inicial:

Perfil: Administrador

PIN de Acesso: 1234