
import { Client, Creditor, OpinionType, ParecerRecord, User } from '../types';
import { DEFAULT_QUESTIONS } from '../constants';
import { supabase } from './supabase';

const DB_KEYS = {
  USER_SESSION: 'parecer_user_session',
};

// Usuário Admin Padrão (para fallback/inicialização se o banco estiver vazio)
const DEFAULT_ADMIN: User = {
    id: 'usr_admin',
    email: 'gabrielmachado.tkd@gmail.com',
    name: 'Administrador',
    role: 'admin',
    title: 'Controlador Geral',
    city: '',
    password: 'admin'
};

export const db = {
  // --- Clients ---
  clients: {
    getAll: async (): Promise<Client[]> => {
      const { data, error } = await supabase.from('clients').select('*');
      if (error) {
        console.error("Error fetching clients:", error);
        return [];
      }
      return data || [];
    },
    add: async (client: Client): Promise<Client[]> => {
      const { error } = await supabase.from('clients').insert([client]);
      if (error) throw new Error("Erro ao salvar cliente: " + error.message);
      return await db.clients.getAll();
    },
    remove: async (id: string): Promise<Client[]> => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw new Error("Erro ao remover cliente: " + error.message);
      return await db.clients.getAll();
    }
  },

  // --- Creditors ---
  creditors: {
    getAll: async (): Promise<Creditor[]> => {
      const { data, error } = await supabase.from('creditors').select('*');
      if (error) {
        console.error("Error fetching creditors:", error);
        return [];
      }
      return data || [];
    },
    add: async (creditor: Creditor): Promise<Creditor[]> => {
      const { error } = await supabase.from('creditors').insert([creditor]);
      if (error) throw new Error("Erro ao salvar credor: " + error.message);
      return await db.creditors.getAll();
    },
    remove: async (id: string): Promise<Creditor[]> => {
      const { error } = await supabase.from('creditors').delete().eq('id', id);
      if (error) throw new Error("Erro ao remover credor: " + error.message);
      return await db.creditors.getAll();
    }
  },

  // --- Opinion Types ---
  types: {
    getAll: async (): Promise<OpinionType[]> => {
      const { data, error } = await supabase.from('opinion_types').select('*');
      if (error) {
        console.error("Error fetching opinion types:", error);
        return [];
      }
      return data || [];
    },
    save: async (types: OpinionType[]): Promise<OpinionType[]> => {
      // Como 'types' recebe o array completo, no Supabase idealmente faríamos upsert ou delete/insert.
      // Para simplificar e manter a assinatura, vamos assumir que 'save' recebe a lista completa e sincroniza.
      // Porém, para performance, vamos adaptar para salvar um por um ou lidar com a lógica no App.
      // AQUI: Vamos assumir que a App.tsx chama 'save' com a lista ATUALIZADA. 
      // O ideal seria ter métodos add/update individuais. Vou ajustar para fazer Upsert em lote.
      
      const { error } = await supabase.from('opinion_types').upsert(types);
      if (error) throw new Error("Erro ao salvar tipos: " + error.message);
      
      // Se houver deletados na lista local vs remota, o upsert não remove.
      // Neste modelo simples, não trataremos a remoção automática de itens que não estão no array 'types'
      // a menos que o App chame um método de delete específico.
      // O App.tsx atual chama 'removeOpinionType' que chama 'save' com o filtro.
      // Precisamos mudar essa lógica.
      
      // NOTA: Para manter compatibilidade com o código do App.tsx que espera receber a lista atualizada:
      return await db.types.getAll();
    },
    // Método auxiliar para deletar explicitamente, já que o 'save' (upsert) não deleta
    delete: async (id: string) => {
        const { error } = await supabase.from('opinion_types').delete().eq('id', id);
        if (error) throw new Error("Erro ao deletar tipo: " + error.message);
    },
    restoreDefaults: async (): Promise<OpinionType[]> => {
       const defaults: OpinionType[] = [
          {
            id: 'type_servico',
            name: 'Serviço',
            icon: 'briefcase',
            questions: DEFAULT_QUESTIONS,
          },
          {
            id: 'type_material',
            name: 'Material',
            icon: 'package',
            questions: DEFAULT_QUESTIONS,
          }
       ];
       // Limpa tabela e insere padrões
       await supabase.from('opinion_types').delete().neq('id', '0'); // Delete all unsafe
       const { error } = await supabase.from('opinion_types').insert(defaults);
       if(error) throw error;
       return defaults;
    }
  },

  // --- History ---
  history: {
    getAll: async (): Promise<ParecerRecord[]> => {
      // Ordenar por data de criação desc
      const { data, error } = await supabase.from('parecer_history').select('*').order('createdAt', { ascending: false });
      if (error) {
        console.error("Error fetching history:", error);
        return [];
      }
      return data || [];
    },
    add: async (record: ParecerRecord): Promise<ParecerRecord[]> => {
      const { error } = await supabase.from('parecer_history').insert([record]);
      if (error) throw new Error("Erro ao salvar parecer: " + error.message);
      return await db.history.getAll();
    },
    update: async (record: ParecerRecord): Promise<ParecerRecord[]> => {
      const { error } = await supabase.from('parecer_history').update(record).eq('id', record.id);
      if (error) throw new Error("Erro ao atualizar parecer: " + error.message);
      return await db.history.getAll();
    },
    remove: async (id: string): Promise<ParecerRecord[]> => {
      const { error } = await supabase.from('parecer_history').delete().eq('id', id);
      if (error) throw new Error("Erro ao remover parecer: " + error.message);
      return await db.history.getAll();
    }
  },

  // --- Users Management ---
  users: {
      getAll: async (): Promise<User[]> => {
          const { data, error } = await supabase.from('users').select('*');
          
          if ((!data || data.length === 0) && !error) {
              // Se vazio, cria admin padrão
              await supabase.from('users').insert([DEFAULT_ADMIN]);
              return [DEFAULT_ADMIN];
          }
          if (error) {
              console.error("Error fetching users:", error);
              return [];
          }
          return data;
      },
      add: async (user: User): Promise<User[]> => {
          // Verifica email duplicado
          const { data: existing } = await supabase.from('users').select('id').eq('email', user.email);
          if (existing && existing.length > 0) {
              throw new Error("Email já cadastrado.");
          }

          const { error } = await supabase.from('users').insert([user]);
          if (error) throw new Error("Erro ao adicionar usuário: " + error.message);
          return await db.users.getAll();
      },
      update: async (user: User): Promise<User[]> => {
          // A lógica de senha vazia deve ser tratada ANTES de chamar update ou aqui.
          // Aqui, assumimos que o objeto user já tem a senha correta (nova ou mantida).
          
          // Verifica duplicidade de email exceto o próprio ID
          const { data: existing } = await supabase.from('users').select('id').eq('email', user.email).neq('id', user.id);
          if (existing && existing.length > 0) {
              throw new Error("Este email já está em uso.");
          }

          const { error } = await supabase.from('users').update(user).eq('id', user.id);
          if (error) throw new Error("Erro ao atualizar usuário: " + error.message);
          return await db.users.getAll();
      },
      remove: async (id: string): Promise<User[]> => {
          const { error } = await supabase.from('users').delete().eq('id', id);
          if (error) throw new Error("Erro ao remover usuário: " + error.message);
          
          // Garante que não fique vazio
          const remaining = await db.users.getAll();
          if (remaining.length === 0) {
              await supabase.from('users').insert([DEFAULT_ADMIN]);
              return [DEFAULT_ADMIN];
          }
          return remaining;
      },
      validateLogin: async (email: string, password: string): Promise<User | null> => {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .single();
          
          if (error || !data) {
              // Fallback para admin hardcoded APENAS se não houver usuários no banco (caso de erro de config)
              // ou para compatibilidade temporária
              if (password === 'admin') {
                  const { data: adminData } = await supabase.from('users').select('*').eq('role', 'admin').limit(1).single();
                  if (adminData) return adminData;
              }
              return null;
          }
          return data;
      }
  },

  // --- Auth Session (Client Side Persistence) ---
  auth: {
    getUser: (): User | null => {
      const data = localStorage.getItem(DB_KEYS.USER_SESSION);
      return data ? JSON.parse(data) : null;
    },
    login: (user: User) => {
      localStorage.setItem(DB_KEYS.USER_SESSION, JSON.stringify(user));
    },
    updateUser: async (userData: User): Promise<User> => {
      // Atualiza no banco
      const { error } = await supabase.from('users').update(userData).eq('id', userData.id);
      if (error) throw new Error("Erro ao atualizar perfil: " + error.message);

      // Atualiza na sessão
      // Precisamos buscar o usuário atualizado do banco para garantir que temos todos os campos (ex: senha que não mudou)
      const { data: refreshedUser } = await supabase.from('users').select('*').eq('id', userData.id).single();
      
      if (refreshedUser) {
          localStorage.setItem(DB_KEYS.USER_SESSION, JSON.stringify(refreshedUser));
          return refreshedUser;
      }
      return userData;
    },
    logout: () => {
      localStorage.removeItem(DB_KEYS.USER_SESSION);
    }
  }
};