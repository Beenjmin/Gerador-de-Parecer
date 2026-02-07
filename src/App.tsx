
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  FileText, 
  Save, 
  ChevronRight, 
  ChevronLeft, 
  DollarSign, 
  Calendar,
  User as UserIcon,
  FileCheck,
  Building2,
  Landmark,
  Briefcase,
  ArrowRight,
  Plus,
  Search,
  Trash2,
  Clock,
  AlertCircle,
  Settings,
  List,
  X,
  Edit2,
  LogOut,
  Lock,
  Mail,
  Loader2,
  Users,
  UploadCloud,
  Sparkles,
  Filter,
  Copy,
  RefreshCcw,
  Moon,
  Sun,
  UserCog,
  Tags,
  Shield,
  UserPlus,
  Pencil,
  FileDown
} from 'lucide-react';
import { Input } from './components/Input';
import { Select } from './components/Select';
import { 
  ParecerFormData, 
  ChecklistOption, 
  ParecerRecord, 
  Client, 
  OpinionType,
  ChecklistItemDefinition,
  User,
  Creditor
} from './types';
import { 
  DEFAULT_QUESTIONS,
  MODALITIES, 
  COMMITMENT_TYPES 
} from './constants';
import { generateParecerDocx } from './services/documentGenerator';
import { db } from './services/database';

// Constants
const STEPS = [
  { id: 1, title: 'Despesa', subtitle: 'Dados do Processo', icon: DollarSign },
  { id: 2, title: 'Certidões', subtitle: 'Validade fiscal', icon: Calendar },
  { id: 3, title: 'Checklist', subtitle: 'Conformidade', icon: FileCheck },
  { id: 4, title: 'Conclusão', subtitle: 'Responsável', icon: UserIcon },
];

const INITIAL_DATA: ParecerFormData = {
  clientId: '',
  opinionTypeId: '',
  protocolo: '',
  entidade_orcamentaria: '',
  credor: '',
  modalidade_licitacao: 'Dispensa',
  num_contrato: '',
  vigencia_inicial: '',
  vigencia_final: '',
  sinc_num_data: '',
  pncp_num_data: '',
  empenho_tipo: 'Ordinário',
  empenho_numero: '',
  empenho_valor: 0,
  empenho_data: '',
  liquidacao_numero: '',
  liquidacao_valor: 0,
  liquidacao_data: '',
  nota_fiscal_numero: '',
  nota_fiscal_data: '',
  ordem_servico_numero: '',
  ordem_servico_data: '',
  validade_receita_federal: '',
  validade_trabalhista: '',
  validade_fgts: '',
  validade_cnd_estadual: '',
  validade_cnda_estadual: 'N/A',
  validade_municipal: '',
  validade_outros: '',
  checklist_answers: {},
  prazo_pagamento: '',
  nome_usuario: '',
  cargo_usuario: 'Controlador Geral',
  municipio_usuario: '',
};

type SegmentType = 'prefeitura' | 'camara';
type AppView = 'dashboard' | 'setup' | 'form' | 'settings' | 'profile' | 'admin_users';
type SetupStage = 'segment' | 'client' | 'type';
type SettingsTab = 'clients' | 'types' | 'creditors';

export default function App() {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState('');

  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Navigation State
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  
  // Data State
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [history, setHistory] = useState<ParecerRecord[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [opinionTypes, setOpinionTypes] = useState<OpinionType[]>([]);
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);

  // Admin User Form State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [adminFormName, setAdminFormName] = useState('');
  const [adminFormEmail, setAdminFormEmail] = useState('');
  const [adminFormPass, setAdminFormPass] = useState('');
  const [adminFormRole, setAdminFormRole] = useState('user');
  const [adminFormTitle, setAdminFormTitle] = useState('');
  const [adminFormCity, setAdminFormCity] = useState('');

  // Search/Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterCreditor, setFilterCreditor] = useState<string>('');
  const [filterOpinionType, setFilterOpinionType] = useState<string>('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  // Setup State
  const [setupStage, setSetupStage] = useState<SetupStage>('segment');
  const [selectedSegment, setSelectedSegment] = useState<SegmentType | null>(null);
  
  // Settings State
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('clients');
  const [editingType, setEditingType] = useState<OpinionType | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<ParecerFormData>(INITIAL_DATA);
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingParecerId, setEditingParecerId] = useState<string | null>(null);
  
  // AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Initialization ---
  useEffect(() => {
    // Carrega sessão local
    const sessionUser = db.auth.getUser();
    setUser(sessionUser);

    // Carrega dados iniciais do banco
    const fetchData = async () => {
        setIsLoadingData(true);
        try {
            const [h, c, t, cr, u] = await Promise.all([
                db.history.getAll(),
                db.clients.getAll(),
                db.types.getAll(),
                db.creditors.getAll(),
                db.users.getAll()
            ]);
            setHistory(h);
            setClients(c);
            setOpinionTypes(t);
            setCreditors(cr);
            setUsersList(u);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setIsLoadingData(false);
        }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  // --- Auth Actions ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError('');
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
        const validUser = await db.users.validateLogin(email, password);
        
        if (validUser) {
            setUser(validUser);
            db.auth.login(validUser);
        } else {
            setAuthError('Email ou senha inválidos.');
        }
    } catch (err) {
        setAuthError('Erro ao conectar ao servidor.');
    } finally {
        setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
      setUser(null);
      db.auth.logout();
      setCurrentView('dashboard');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      const form = e.target as HTMLFormElement;
      const updatedUser: User = {
          ...user,
          name: (form.elements.namedItem('profileName') as HTMLInputElement).value,
          email: (form.elements.namedItem('profileEmail') as HTMLInputElement).value,
          title: (form.elements.namedItem('profileTitle') as HTMLInputElement).value,
          city: (form.elements.namedItem('profileCity') as HTMLInputElement).value,
      };
      
      try {
          const newUser = await db.auth.updateUser(updatedUser);
          setUser(newUser);
          alert("Perfil atualizado com sucesso!");
          setCurrentView('dashboard');
      } catch (err: any) {
          alert(err.message);
      }
  };

  // --- User Management Actions ---

  const resetAdminForm = () => {
      setEditingUserId(null);
      setAdminFormName('');
      setAdminFormEmail('');
      setAdminFormPass('');
      setAdminFormRole('user');
      setAdminFormTitle('');
      setAdminFormCity('');
  };

  const handleStartEditUser = (u: User) => {
      setEditingUserId(u.id);
      setAdminFormName(u.name);
      setAdminFormEmail(u.email);
      setAdminFormPass(''); // Senha vazia para indicar "não alterar" se não for preenchida
      setAdminFormRole(u.role);
      setAdminFormTitle(u.title || '');
      setAdminFormCity(u.city || '');
  };

  const handleSaveUser = async (e: React.FormEvent) => {
      e.preventDefault();
      
      try {
          let updatedList;
          if (editingUserId) {
              // Edit Mode
              // Recupera usuário original da lista para manter a senha se estiver vazia
              const originalUser = usersList.find(u => u.id === editingUserId);
              const passwordToSend = adminFormPass ? adminFormPass : (originalUser?.password || '');

              const updatedUser: User = {
                  id: editingUserId,
                  name: adminFormName,
                  email: adminFormEmail,
                  password: passwordToSend,
                  role: adminFormRole,
                  title: adminFormTitle,
                  city: adminFormCity
              };
              updatedList = await db.users.update(updatedUser);
              alert("Usuário atualizado com sucesso.");
          } else {
              // Create Mode
              if (!adminFormPass) {
                  alert("Senha é obrigatória para novos usuários.");
                  return;
              }
              const newUser: User = {
                  id: crypto.randomUUID(),
                  name: adminFormName,
                  email: adminFormEmail,
                  password: adminFormPass,
                  role: adminFormRole,
                  title: adminFormTitle,
                  city: adminFormCity
              };
              updatedList = await db.users.add(newUser);
              alert("Usuário adicionado com sucesso.");
          }
          setUsersList(updatedList);
          resetAdminForm();
      } catch (error: any) {
          alert(error.message);
      }
  };

  const handleRemoveUser = async (userId: string) => {
      if (userId === user?.id) {
          alert("Você não pode excluir a si mesmo.");
          return;
      }
      if(window.confirm("Deseja realmente excluir este usuário?")) {
          try {
            const updated = await db.users.remove(userId);
            setUsersList(updated);
            if (editingUserId === userId) resetAdminForm();
          } catch(err: any) {
              alert(err.message);
          }
      }
  };

  // --- CRUD Actions ---

  const addClient = async (name: string, segment: SegmentType) => {
    try {
        const newClient: Client = { id: crypto.randomUUID(), name, segment };
        const updated = await db.clients.add(newClient);
        setClients(updated);
    } catch (err: any) { alert(err.message); }
  };

  const removeClient = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este cliente?')) {
        try {
            const updated = await db.clients.remove(id);
            setClients(updated);
        } catch (err: any) { alert(err.message); }
    }
  };

  const addCreditor = async (data: Omit<Creditor, 'id'>) => {
    try {
        const newCreditor: Creditor = { id: crypto.randomUUID(), ...data };
        const updated = await db.creditors.add(newCreditor);
        setCreditors(updated);
    } catch (err: any) { alert(err.message); }
  };

  const removeCreditor = async (id: string) => {
    if (window.confirm('Remover este credor da lista?')) {
        try {
            const updated = await db.creditors.remove(id);
            setCreditors(updated);
        } catch (err: any) { alert(err.message); }
    }
  };

  const addOpinionType = async (name: string) => {
    try {
        const newType: OpinionType = { 
            id: crypto.randomUUID(), 
            name, 
            icon: 'file', 
            questions: DEFAULT_QUESTIONS 
        };
        const updatedList = [...opinionTypes, newType];
        const result = await db.types.save(updatedList);
        setOpinionTypes(result);
    } catch (err: any) { alert(err.message); }
  };

  const updateOpinionTypeQuestions = async (typeId: string, questions: ChecklistItemDefinition[]) => {
    try {
        const updatedList = opinionTypes.map(t => t.id === typeId ? { ...t, questions } : t);
        const result = await db.types.save(updatedList);
        setOpinionTypes(result);
        
        if (editingType?.id === typeId) {
            setEditingType(result.find(t => t.id === typeId) || null);
        }
    } catch(err: any) { console.error(err); }
  };

  const removeOpinionType = async (id: string) => {
    if (window.confirm('Remover este tipo de parecer?')) {
        try {
            await db.types.delete(id); 
            const updated = await db.types.getAll();
            setOpinionTypes(updated);
            if(editingType?.id === id) setEditingType(null);
        } catch(err: any) { alert(err.message); }
    }
  };
  
  const restoreDefaultTypes = async () => {
      if(window.confirm('Isso irá substituir os tipos atuais pelos modelos padrão no banco de dados. Deseja continuar?')) {
          try {
            const updated = await db.types.restoreDefaults();
            setOpinionTypes(updated);
          } catch(err: any) { alert(err.message); }
      }
  };

  // --- AI Actions (Gemini) ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!process.env.API_KEY) {
        alert("Chave de API não configurada no ambiente.");
        return;
    }

    setIsAnalyzing(true);
    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const base64Data = reader.result as string;
            const base64Content = base64Data.split(',')[1];
            const mimeType = file.type;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-3-pro-preview',
                    contents: {
                      parts: [
                        { text: "Analise esta imagem que é uma CAPA DE PROCESSO / PROTOCOLO. Extraia o protocolo e o interessado." },
                        { inlineData: { mimeType: mimeType, data: base64Content } }
                      ]
                    },
                    config: {
                      responseMimeType: 'application/json',
                      responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                          protocolo: { type: Type.STRING },
                          interessado: { type: Type.STRING }
                        }
                      }
                    }
                });

                const aiData = JSON.parse(response.text || '{}');

                const interestedName = aiData.interessado || "";
                const matchingCreditor = creditors.find(c => 
                    interestedName.toLowerCase().includes(c.name.toLowerCase()) ||
                    c.name.toLowerCase().includes(interestedName.toLowerCase())
                );

                setFormData(prev => {
                    let updates = { 
                        ...prev, 
                        protocolo: aiData.protocolo || prev.protocolo,
                        credor: interestedName
                    };
                    
                    if (matchingCreditor) {
                        updates = {
                            ...updates,
                            credor: matchingCreditor.name,
                            num_contrato: matchingCreditor.contractNumber || prev.num_contrato,
                            modalidade_licitacao: matchingCreditor.modality || prev.modalidade_licitacao,
                            vigencia_inicial: matchingCreditor.initialDate || prev.vigencia_inicial,
                            vigencia_final: matchingCreditor.finalDate || prev.vigencia_final,
                            entidade_orcamentaria: matchingCreditor.secretaria || prev.entidade_orcamentaria,
                            sinc_num_data: matchingCreditor.sincNumData || prev.sinc_num_data,
                            pncp_num_data: matchingCreditor.pncpNumData || prev.pncp_num_data
                        };
                    }
                    return updates;
                });
                
                alert(matchingCreditor 
                    ? `Protocolo reconhecido! Credor "${matchingCreditor.name}" localizado e dados preenchidos.` 
                    : "Protocolo reconhecido! Credor não localizado na base, preencha os dados manualmente.");

            } catch (err) {
                console.error("Gemini Error:", err);
                alert("Erro ao processar o arquivo com IA.");
            } finally {
                setIsAnalyzing(false);
                if(fileInputRef.current) fileInputRef.current.value = '';
            }
        };
    } catch (error) {
        console.error("File reading error", error);
        setIsAnalyzing(false);
    }
  };

  // --- Main Flow Actions ---

  const handleStartNew = () => {
    if(clients.length === 0) {
        alert("Você precisa cadastrar pelo menos um Cliente nas configurações primeiro.");
        setCurrentView('settings');
        setSettingsTab('clients');
        return;
    }
    if(opinionTypes.length === 0) {
        alert("Você precisa cadastrar pelo menos um Tipo de Parecer nas configurações primeiro.");
        setCurrentView('settings');
        setSettingsTab('types');
        return;
    }
    setEditingParecerId(null);
    setFormData({
        ...INITIAL_DATA,
        nome_usuario: user?.name || '', 
        cargo_usuario: user?.title || 'Controlador Geral',
        municipio_usuario: user?.city || ''
    });
    setSetupStage('segment');
    setSelectedSegment(null);
    setCurrentStep(1);
    setCurrentView('setup');
  };

  const handleEdit = (record: ParecerRecord) => {
    setEditingParecerId(record.id);

    // Carregar dados
    const client = clients.find(c => c.id === record.clientId);
    const type = opinionTypes.find(t => t.id === record.opinionTypeId);

    // Mesclar respostas para garantir estrutura correta
    let mergedAnswers = { ...record.checklist_answers };
    if (type) {
        type.questions.forEach(q => {
            if (mergedAnswers[q.id] === undefined) {
                mergedAnswers[q.id] = ChecklistOption.SIM;
            }
        });
    }

    setFormData({
        ...record,
        checklist_answers: mergedAnswers
    });

    // Configurar navegação
    if (client) {
        setSelectedSegment(client.segment);
    }
    // Ao editar, pulamos direto para o formulário
    setCurrentStep(1);
    setCurrentView('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDuplicate = async (record: ParecerRecord) => {
    if(!window.confirm('Deseja criar uma cópia deste parecer?')) return;

    try {
        setIsLoadingData(true);
        // Cria um novo registro com ID diferente e marca como cópia
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = record;
        
        const newRecord: ParecerRecord = {
            ...rest,
            id: crypto.randomUUID(),
            protocolo: `${rest.protocolo} (Cópia)`,
            createdAt: new Date().toISOString(),
            status: 'Ressalvas', // Reseta status ou mantem? Vamos resetar para forçar revisão
        };

        const updatedHistory = await db.history.add(newRecord);
        setHistory(updatedHistory);
        alert("Parecer duplicado com sucesso! Veja na lista.");
    } catch(err: any) {
        alert("Erro ao duplicar: " + err.message);
    } finally {
        setIsLoadingData(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
      if(!window.confirm("Tem certeza que deseja excluir este parecer? Esta ação não pode ser desfeita.")) {
          return;
      }
      
      try {
          setIsLoadingData(true);
          const updated = await db.history.remove(id);
          setHistory(updated);
      } catch(err: any) {
          alert("Erro ao excluir: " + err.message);
      } finally {
          setIsLoadingData(false);
      }
  };

  const handleSelectSegment = (segment: SegmentType) => {
    setSelectedSegment(segment);
    setSetupStage('client');
  };

  const handleSelectClient = (client: Client) => {
    setFormData(prev => ({
        ...prev,
        clientId: client.id,
        municipio_usuario: client.name,
    }));
    setSetupStage('type');
  };

  const handleSelectOpinionType = (type: OpinionType) => {
    const prefix = selectedSegment === 'prefeitura' ? 'Prefeitura Municipal de' : 'Câmara Municipal de';
    const initialAnswers: Record<string, ChecklistOption> = {};
    type.questions.forEach(q => initialAnswers[q.id] = ChecklistOption.SIM);
    setFormData(prev => ({
      ...prev,
      opinionTypeId: type.id,
      tipo_processo_label: type.name,
      entidade_orcamentaria: `${prefix} ${prev.municipio_usuario}`,
      checklist_answers: initialAnswers
    }));
    setCurrentView('form');
  };

  const handleFinishParecer = async (generateDoc: boolean) => {
    setIsGenerating(true);
    try {
      const selectedType = opinionTypes.find(t => t.id === formData.opinionTypeId);
      const currentQuestions = selectedType ? selectedType.questions : DEFAULT_QUESTIONS;
      const answers = Object.values(formData.checklist_answers);
      const hasRestrictions = answers.includes(ChecklistOption.NAO);
      
      let updatedHistory;

      if (editingParecerId) {
          // Edição
          const original = history.find(h => h.id === editingParecerId);
          const updatedRecord: ParecerRecord = {
              ...formData,
              id: editingParecerId,
              createdAt: original?.createdAt || new Date().toISOString(),
              status: hasRestrictions ? 'Ressalvas' : 'Aprovado',
              questionsSnapshot: currentQuestions
          };
          updatedHistory = await db.history.update(updatedRecord);
          
          if (generateDoc) await generateParecerDocx(updatedRecord);
          alert("Parecer atualizado com sucesso!");
      } else {
          // Novo
          const newRecord: ParecerRecord = {
            ...formData,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            status: hasRestrictions ? 'Ressalvas' : 'Aprovado',
            questionsSnapshot: currentQuestions
          };
          updatedHistory = await db.history.add(newRecord);
          
          if (generateDoc) await generateParecerDocx(newRecord);
          alert("Parecer salvo com sucesso!");
      }
      
      setHistory(updatedHistory);
      
      if(window.confirm("Voltar ao painel?")) {
        setCurrentView('dashboard');
        setEditingParecerId(null);
      }

    } catch (error) {
      console.error("Error saving/generating:", error);
      alert("Erro ao processar solicitação.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChecklistChange = (questionId: string, value: string) => {
    setFormData(prev => ({
        ...prev,
        checklist_answers: { ...prev.checklist_answers, [questionId]: value as ChecklistOption }
    }));
  };

  const setAllChecklist = (option: ChecklistOption, questions: ChecklistItemDefinition[]) => {
    const newAnswers: Record<string, ChecklistOption> = {};
    questions.forEach(q => newAnswers[q.id] = option);
    setFormData(prev => ({ ...prev, checklist_answers: newAnswers }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };
  
  const handleCreditorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedName = e.target.value;
      const selectedCreditor = creditors.find(c => c.name === selectedName);
      setFormData(prev => {
          let updates = { ...prev, credor: selectedName };
          if (selectedCreditor) {
              if (selectedCreditor.contractNumber) updates.num_contrato = selectedCreditor.contractNumber;
              if (selectedCreditor.modality) updates.modalidade_licitacao = selectedCreditor.modality;
              if (selectedCreditor.initialDate) updates.vigencia_inicial = selectedCreditor.initialDate;
              if (selectedCreditor.finalDate) updates.vigencia_final = selectedCreditor.finalDate;
              if (selectedCreditor.secretaria) updates.entidade_orcamentaria = selectedCreditor.secretaria;
              if (selectedCreditor.sincNumData) updates.sinc_num_data = selectedCreditor.sincNumData;
              if (selectedCreditor.pncpNumData) updates.pncp_num_data = selectedCreditor.pncpNumData;
          }
          return updates;
      });
  };

  // --- Render Sections ---

  const renderAdminUsers = () => {
    if (user?.role !== 'admin') {
        setCurrentView('dashboard');
        return null;
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-12 animate-in fade-in slide-in-from-bottom-4">
              <div className="mb-8 flex items-center gap-4">
                  <button onClick={() => setCurrentView('dashboard')} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
                      <ChevronLeft size={20} className="text-slate-600 dark:text-slate-300"/>
                  </button>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gerenciar Usuários</h2>
              </div>
              
              <div className="grid gap-6 lg:grid-cols-3">
                  {/* Formulário de Cadastro / Edição */}
                  <div className="lg:col-span-1 h-fit">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-blue-600">
                                {editingUserId ? <Pencil size={20} /> : <UserPlus size={20} />}
                                <h3 className="font-semibold text-slate-800 dark:text-white">
                                    {editingUserId ? 'Editar Usuário' : 'Adicionar Usuário'}
                                </h3>
                            </div>
                            {editingUserId && (
                                <button onClick={resetAdminForm} className="text-xs text-slate-400 hover:text-slate-600 underline">
                                    Cancelar
                                </button>
                            )}
                        </div>
                        <form onSubmit={handleSaveUser} className="space-y-4">
                            <Input 
                                label="Nome Completo" 
                                value={adminFormName} 
                                onChange={e => setAdminFormName(e.target.value)} 
                                required 
                                placeholder="Ex: João da Silva" 
                            />
                            <Input 
                                label="Email de Acesso" 
                                type="email"
                                value={adminFormEmail} 
                                onChange={e => setAdminFormEmail(e.target.value)} 
                                required 
                                placeholder="joao@email.com" 
                            />
                            <Input 
                                label={editingUserId ? "Nova Senha (opcional)" : "Senha"}
                                type="password" 
                                value={adminFormPass} 
                                onChange={e => setAdminFormPass(e.target.value)} 
                                required={!editingUserId}
                                placeholder={editingUserId ? "Deixe vazio para manter" : "******"} 
                            />
                            <Select 
                                label="Nível de Acesso" 
                                value={adminFormRole}
                                onChange={e => setAdminFormRole(e.target.value)}
                                options={[{label: 'Administrador', value: 'admin'}, {label: 'Usuário Padrão', value: 'user'}]} 
                            />
                            <Input 
                                label="Cargo Padrão" 
                                value={adminFormTitle} 
                                onChange={e => setAdminFormTitle(e.target.value)} 
                                placeholder="Ex: Analista" 
                            />
                            <Input 
                                label="Município Padrão" 
                                value={adminFormCity} 
                                onChange={e => setAdminFormCity(e.target.value)} 
                                placeholder="Ex: São Paulo" 
                            />
                            <button type="submit" className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors ${editingUserId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}> 
                                {editingUserId ? 'Salvar Alterações' : 'Cadastrar Usuário'} 
                            </button>
                        </form>
                    </div>
                  </div>

                  {/* Lista de Usuários */}
                  <div className="lg:col-span-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                        <h3 className="mb-4 font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            <Users size={20} className="text-slate-400" />
                            Usuários Cadastrados ({usersList.length})
                        </h3>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                            {usersList.map(u => (
                                <div key={u.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4 transition-all ${editingUserId === u.id ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10' : 'border-slate-100 bg-slate-50 dark:bg-slate-800 dark:border-slate-700'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm ${u.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                                            {u.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-white">{u.name}</p>
                                            <p className="text-sm text-slate-500">{u.email}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                                                    {u.role === 'admin' ? 'Administrador' : 'Usuário'}
                                                </span>
                                                {u.title && <span className="text-xs text-slate-400">• {u.title}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => handleStartEditUser(u)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors dark:hover:bg-blue-900/20"
                                            title="Editar usuário"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        {u.id !== user?.id && (
                                            <button 
                                                onClick={() => handleRemoveUser(u.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors dark:hover:bg-red-900/20"
                                                title="Remover usuário"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  </div>
              </div>
        </div>
    );
  };

  const renderDashboard = () => {
    // Show Loading
    if (isLoadingData) {
        return (
            <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center">
                <Loader2 size={40} className="animate-spin text-blue-600" />
                <p className="mt-4 text-slate-500">Sincronizando dados...</p>
            </div>
        );
    }

    const filteredHistory = history.filter(item => {
      const matchesTerm = item.credor.toLowerCase().includes(searchTerm.toLowerCase()) || item.protocolo.toLowerCase().includes(searchTerm.toLowerCase()) || item.entidade_orcamentaria.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCreditor = !filterCreditor || item.credor === filterCreditor;
      const matchesType = !filterOpinionType || item.opinionTypeId === filterOpinionType;
      const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
      const matchesStart = !filterDateStart || itemDate >= filterDateStart;
      const matchesEnd = !filterDateEnd || itemDate <= filterDateEnd;
      return matchesTerm && matchesCreditor && matchesType && matchesStart && matchesEnd;
    });
    const clearFilters = () => { 
        setSearchTerm(''); 
        setFilterCreditor(''); 
        setFilterOpinionType(''); 
        setFilterDateStart(''); 
        setFilterDateEnd(''); 
    };
    const hasActiveFilters = searchTerm || filterCreditor || filterOpinionType || filterDateStart || filterDateEnd;

    return (
      <div className="mx-auto max-w-5xl px-4 py-8 animate-in fade-in duration-500">
        <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
           <div> <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Meus Pareceres</h2> <p className="text-slate-500">Gerencie e visualize seus pareceres recentes.</p> </div>
           <div className="flex gap-3">
               {user?.role === 'admin' && (
                   <button onClick={() => setCurrentView('admin_users')} className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 font-semibold text-blue-700 shadow-sm hover:bg-blue-100 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300"> 
                        <Shield size={20} /> Usuários 
                   </button>
               )}
               <button onClick={() => setCurrentView('settings')} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"> <Settings size={20} /> Configurações </button>
               <button onClick={handleStartNew} className="group flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg transition-all hover:bg-blue-700"> <Plus size={20} /> Novo Parecer </button>
           </div>
        </div>
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
           <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
               <div className="relative flex-1"> <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400"> <Search size={20} /> </div> <input type="text" placeholder="Buscar por protocolo, credor ou entidade..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white" /> </div>
               <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={`flex items-center gap-2 rounded-xl border px-4 py-3 font-medium transition-colors ${showAdvancedFilters ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}> <Filter size={18} /> Filtros </button>
           </div>
           {showAdvancedFilters && (
               <div className="mt-4 grid gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 sm:grid-cols-2 lg:grid-cols-5 animate-in slide-in-from-top-2">
                   <div> 
                       <label className="mb-1 block text-xs font-medium text-slate-500">Tipo (Material/Serviço)</label> 
                       <select value={filterOpinionType} onChange={(e) => setFilterOpinionType(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"> 
                           <option value="">Todos os Tipos</option> 
                           {opinionTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)} 
                       </select> 
                   </div>
                   <div> <label className="mb-1 block text-xs font-medium text-slate-500">Credor</label> <select value={filterCreditor} onChange={(e) => setFilterCreditor(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"> <option value="">Todos os Credores</option> {creditors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)} </select> </div>
                   <div> <label className="mb-1 block text-xs font-medium text-slate-500">De</label> <input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" /> </div>
                   <div> <label className="mb-1 block text-xs font-medium text-slate-500">Até</label> <input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" /> </div>
                   <div className="flex items-end"> <button onClick={clearFilters} disabled={!hasActiveFilters} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-500 hover:text-red-500"> <X size={16} /> Limpar </button> </div>
               </div>
           )}
        </div>
        {filteredHistory.length === 0 ? <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-20 text-center dark:bg-slate-900"> <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400 dark:bg-slate-800"> <FileText size={48} /> </div> <h3 className="text-lg font-medium">Nenhum parecer encontrado</h3> <p className="mt-1 text-slate-500"> {hasActiveFilters ? 'Ajuste os filtros.' : 'Banco de dados limpo.'} </p> </div> : 
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
             {filteredHistory.map((item) => (
                <div key={item.id} className="group relative flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:border-blue-200 dark:bg-slate-900 dark:border-slate-800">
                   <div>
                      <div className="mb-4 flex items-start justify-between">
                         <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30'}`}> {item.status === 'Aprovado' ? <FileCheck size={12} /> : <AlertCircle size={12} />} {item.status} </div>
                         <div className="flex items-center gap-1"> 
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(item);
                                }} 
                                className="rounded-lg p-1.5 text-slate-300 hover:text-blue-500"
                                title="Editar"
                            > 
                                <Pencil size={16} /> 
                            </button> 
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicate(item);
                                }} 
                                className="rounded-lg p-1.5 text-slate-300 hover:text-blue-500"
                                title="Duplicar e Editar"
                            > 
                                <Copy size={16} /> 
                            </button> 
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteRecord(item.id);
                                }} 
                                className="rounded-lg p-1.5 text-slate-300 hover:text-red-500"
                                title="Excluir"
                            > 
                                <Trash2 size={16} /> 
                            </button> 
                         </div>
                      </div>
                      <h3 className="mb-1 text-lg font-bold line-clamp-1">{item.credor}</h3> <p className="mb-4 text-sm text-slate-500 line-clamp-1">{item.entidade_orcamentaria}</p>
                      <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                         <div className="flex items-center gap-2"> <FileText size={14} className="text-slate-400" /> <span>Prot: <span className="font-medium text-slate-900 dark:text-slate-200">{item.protocolo}</span></span> </div>
                         <div className="flex items-center gap-2"> <Tags size={14} className="text-slate-400" /> <span className="capitalize">{item.tipo_processo_label || 'Geral'}</span> </div>
                      </div>
                   </div>
                   <div className="mt-6 border-t border-slate-50 pt-4 dark:border-slate-800">
                      <div className="flex items-center justify-between"> <div className="flex items-center gap-1.5 text-xs text-slate-400"> <Clock size={12} /> {new Date(item.createdAt).toLocaleDateString('pt-BR')} </div> <button onClick={() => generateParecerDocx(item)} className="text-sm font-semibold text-blue-600 hover:underline"> Baixar DOCX </button> </div>
                   </div>
                </div>
             ))}
          </div>
        }
      </div>
    );
  };

  const renderSetup = () => (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button onClick={() => setCurrentView('dashboard')} className="mb-6 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"> <ArrowRight className="rotate-180" size={16} /> Voltar </button>
      <div className="mb-8 text-center"> <h2 className="text-2xl font-bold">Novo Parecer</h2> <p className="text-slate-500">Configure os dados iniciais do processo.</p> </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <div className="mb-8 flex justify-center gap-4"> <div className={`h-2 w-16 rounded-full ${['segment', 'client', 'type'].includes(setupStage) ? 'bg-blue-600' : 'bg-slate-200'}`} /> <div className={`h-2 w-16 rounded-full ${['client', 'type'].includes(setupStage) ? 'bg-blue-600' : 'bg-slate-200'}`} /> <div className={`h-2 w-16 rounded-full ${['type'].includes(setupStage) ? 'bg-blue-600' : 'bg-slate-200'}`} /> </div>
        {setupStage === 'segment' && (
             <div className="animate-in fade-in slide-in-from-right-4">
                 <h3 className="mb-6 text-center text-lg font-medium">Qual o tipo de entidade?</h3>
                 <div className="grid gap-4 sm:grid-cols-2">
                     <button onClick={() => handleSelectSegment('prefeitura')} className="flex flex-col items-center gap-3 rounded-xl border-2 border-slate-100 p-8 hover:border-blue-500 hover:bg-blue-50 dark:border-slate-800"> <Building2 size={32} className="text-blue-600"/> <span className="font-semibold">Prefeitura</span> </button>
                     <button onClick={() => handleSelectSegment('camara')} className="flex flex-col items-center gap-3 rounded-xl border-2 border-slate-100 p-8 hover:border-purple-500 hover:bg-purple-50 dark:border-slate-800"> <Landmark size={32} className="text-purple-600"/> <span className="font-semibold">Câmara</span> </button>
                 </div>
             </div>
        )}
        {setupStage === 'client' && (
            <div className="animate-in fade-in slide-in-from-right-4">
                 <h3 className="mb-6 text-center text-lg font-medium">Selecione o Cliente</h3>
                 <div className="grid gap-3 max-h-[400px] overflow-y-auto">
                     {clients.filter(c => c.segment === selectedSegment).map(client => (
                         <button key={client.id} onClick={() => handleSelectClient(client)} className="flex items-center justify-between rounded-xl border border-slate-100 p-4 text-left hover:border-blue-500 dark:border-slate-800 dark:bg-slate-800"> <span className="font-medium">{client.name}</span> <ChevronRight className="text-slate-400"/> </button>
                     ))}
                 </div>
            </div>
        )}
        {setupStage === 'type' && (
            <div className="animate-in fade-in slide-in-from-right-4">
                 <h3 className="mb-6 text-center text-lg font-medium">Tipo de Parecer</h3>
                 <div className="grid gap-3">
                     {opinionTypes.map(type => (
                         <button key={type.id} onClick={() => handleSelectOpinionType(type)} className="flex items-center gap-4 rounded-xl border border-slate-100 p-4 text-left hover:border-blue-500 dark:border-slate-800"> <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-700"> <Briefcase size={20}/> </div> <span className="font-medium">{type.name}</span> </button>
                     ))}
                 </div>
            </div>
        )}
      </div>
    </div>
  );

  const renderForm = () => {
    const selectedType = opinionTypes.find(t => t.id === formData.opinionTypeId);
    const questionsToRender = selectedType ? selectedType.questions : DEFAULT_QUESTIONS;
    return (
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">
            <aside className="w-full border-b border-slate-200 bg-white p-6 lg:w-80 lg:border-b-0 lg:border-r dark:bg-slate-900 dark:border-slate-800">
                 <div className="space-y-6">
                     <div> <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"> <ArrowRight className="rotate-180" size={16} /> Voltar </button> </div>
                     <div className="mb-4">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                            {editingParecerId ? 'Editando Parecer' : 'Novo Parecer'}
                        </h3>
                        <p className="text-xs text-slate-500">
                            {editingParecerId ? 'Atualize as informações abaixo.' : 'Preencha os dados do processo.'}
                        </p>
                     </div>
                     <div className="space-y-1">
                         {STEPS.map((step) => {
                             const Icon = step.icon;
                             const isActive = currentStep === step.id;
                             const isCompleted = currentStep > step.id;
                             return (
                                 <div key={step.id} onClick={() => setCurrentStep(step.id)} className={`flex cursor-pointer items-center gap-3 rounded-xl p-3 ${isActive ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20' : 'text-slate-600 dark:text-slate-400'}`}>
                                     <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isActive ? 'bg-blue-100' : isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800'}`}> {isCompleted ? <FileCheck size={20}/> : <Icon size={20}/>} </div>
                                     <div> <p className="font-semibold text-sm">{step.title}</p> <p className="text-xs opacity-70">{step.subtitle}</p> </div>
                                 </div>
                             )
                         })}
                     </div>
                 </div>
            </aside>
            <div className="flex-1 bg-slate-50 p-6 lg:p-10 dark:bg-slate-950">
                <form className="mx-auto max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {currentStep === 1 && (
                        <>
                             <div className="mb-6 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white shadow-lg">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div> <h3 className="flex items-center gap-2 text-lg font-bold"><Sparkles size={20}/> Capa de Protocolo AI</h3> <p className="text-sm text-blue-100">Envie a CAPA para preencher protocolo, credor e dados pré-configurados.</p> </div>
                                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing} className="flex items-center justify-center gap-2 rounded-lg bg-white/20 px-4 py-2 font-medium backdrop-blur-sm hover:bg-white/30"> {isAnalyzing ? <Loader2 size={18} className="animate-spin"/> : <UploadCloud size={18} />} Analisar Capa </button>
                                    <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} accept="image/*,application/pdf" />
                                </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                                <h3 className="mb-6 text-lg font-semibold">Dados Básicos</h3>
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <Input label="Nº Protocolo" name="protocolo" value={formData.protocolo} onChange={handleChange} required />
                                    <Input label="Entidade (Auto)" name="entidade_orcamentaria" value={formData.entidade_orcamentaria} disabled className="opacity-70" />
                                    <div className="sm:col-span-2">
                                        <label className="mb-1.5 block text-sm font-medium">Credor</label>
                                        <select name="credor" value={formData.credor} onChange={handleCreditorChange} className="block w-full rounded-lg border border-slate-200 bg-white py-3 px-3 text-sm dark:bg-slate-800 dark:border-slate-700" required> <option value="">Selecione...</option> {creditors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)} </select>
                                    </div>
                                    <Select label="Modalidade" name="modalidade_licitacao" value={formData.modalidade_licitacao} onChange={handleChange} options={MODALITIES} />
                                    <Input label="Nº Contrato / Ata" name="num_contrato" value={formData.num_contrato} onChange={handleChange} />
                                    <Input label="Vigência Inicial" type="date" name="vigencia_inicial" value={formData.vigencia_inicial} onChange={handleChange} />
                                    <Input label="Vigência Final" type="date" name="vigencia_final" value={formData.vigencia_final} onChange={handleChange} />
                                    <Input label="SINC Nº/Data" name="sinc_num_data" value={formData.sinc_num_data} onChange={handleChange} />
                                    <Input label="PNCP Nº/Data" name="pncp_num_data" value={formData.pncp_num_data} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                                <h3 className="mb-6 text-lg font-semibold">Dados Financeiros</h3>
                                <div className="grid gap-6 sm:grid-cols-3">
                                    <Select label="Tipo Empenho" name="empenho_tipo" value={formData.empenho_tipo} onChange={handleChange} options={COMMITMENT_TYPES} />
                                    <Input label="Nº Empenho" name="empenho_numero" value={formData.empenho_numero} onChange={handleChange} />
                                    <Input label="Valor Empenho" type="number" step="0.01" name="empenho_valor" value={formData.empenho_valor} onChange={handleChange} prefix="R$" />
                                    <Input label="Data Empenho" type="date" name="empenho_data" value={formData.empenho_data} onChange={handleChange} />
                                    <div className="sm:col-span-2 grid sm:grid-cols-2 gap-6"> <Input label="Nº Liquidação" name="liquidacao_numero" value={formData.liquidacao_numero} onChange={handleChange} /> <Input label="Data Liquidação" type="date" name="liquidacao_data" value={formData.liquidacao_data} onChange={handleChange} /> </div>
                                    <Input label="Valor Liquidação" type="number" step="0.01" name="liquidacao_valor" value={formData.liquidacao_valor} onChange={handleChange} prefix="R$" />
                                    <Input label="Nota Fiscal Nº" name="nota_fiscal_numero" value={formData.nota_fiscal_numero} onChange={handleChange} />
                                    <Input label="Data NF" type="date" name="nota_fiscal_data" value={formData.nota_fiscal_data} onChange={handleChange} />
                                </div>
                            </div>
                        </>
                    )}
                    {currentStep === 2 && (
                         <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                            <h3 className="mb-6 text-lg font-semibold">Validade das Certidões</h3>
                            <div className="grid gap-6 sm:grid-cols-2">
                                <Input label="Receita Federal" type="date" name="validade_receita_federal" value={formData.validade_receita_federal} onChange={handleChange} />
                                <Input label="Trabalhista (CNDT)" type="date" name="validade_trabalhista" value={formData.validade_trabalhista} onChange={handleChange} />
                                <Input label="FGTS" type="date" name="validade_fgts" value={formData.validade_fgts} onChange={handleChange} />
                                <Input label="Estadual (Fiscal)" type="date" name="validade_cnd_estadual" value={formData.validade_cnd_estadual} onChange={handleChange} />
                                <Input label="Estadual (Dívida Ativa)" name="validade_cnda_estadual" value={formData.validade_cnda_estadual} onChange={handleChange} placeholder="Data ou N/A" />
                                <Input label="Municipal" type="date" name="validade_municipal" value={formData.validade_municipal} onChange={handleChange} />
                            </div>
                        </div>
                    )}
                    {currentStep === 3 && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                             <div className="mb-6 flex items-center justify-between"> <h3 className="text-lg font-semibold">Checklist de Conformidade</h3> <div className="flex gap-2"> <button type="button" onClick={() => setAllChecklist(ChecklistOption.SIM, questionsToRender)} className="text-xs text-blue-600 hover:underline">Marcar Tudo Sim</button> </div> </div>
                             <div className="space-y-4">
                                 {questionsToRender.map((q) => (
                                     <div key={q.id} className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-800/50">
                                         <p className="flex-1 text-sm font-medium">{q.label}</p>
                                         <div className="flex gap-2">
                                             {Object.values(ChecklistOption).map((opt) => (
                                                 <label key={opt} className={`flex cursor-pointer items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-all ${formData.checklist_answers[q.id] === opt ? (opt === ChecklistOption.SIM ? 'bg-green-100 text-green-700' : opt === ChecklistOption.NAO ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600') : 'bg-white text-slate-500'}`}>
                                                     <input type="radio" name={`q_${q.id}`} className="hidden" checked={formData.checklist_answers[q.id] === opt} onChange={() => handleChecklistChange(q.id, opt)} /> {opt.toUpperCase()}
                                                 </label>
                                             ))}
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    )}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                                <h3 className="mb-6 text-lg font-semibold">Conclusão e Responsável</h3>
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <Input label="Data Limite Pagamento" type="date" name="prazo_pagamento" value={formData.prazo_pagamento} onChange={handleChange} required />
                                    <Input label="Responsável" name="nome_usuario" value={formData.nome_usuario} onChange={handleChange} />
                                    <Input label="Cargo" name="cargo_usuario" value={formData.cargo_usuario} onChange={handleChange} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center justify-between pt-4">
                        <button type="button" onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} disabled={currentStep === 1} className="flex items-center gap-2 rounded-xl px-6 py-3 text-slate-600 hover:bg-slate-100 disabled:opacity-50"> <ChevronLeft size={20}/> Anterior </button>
                        
                        {currentStep < 4 ? (
                            <button type="button" onClick={() => setCurrentStep(Math.min(4, currentStep + 1))} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-blue-700"> Próximo <ChevronRight size={20}/> </button> 
                        ) : (
                            <div className="flex gap-3">
                                <button type="button" onClick={() => handleFinishParecer(false)} disabled={isGenerating} className="flex items-center gap-2 rounded-xl border border-emerald-600 px-6 py-3 font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50"> 
                                    <Save size={20}/> {editingParecerId ? "Salvar Alterações" : "Salvar"}
                                </button>
                                <button type="button" onClick={() => handleFinishParecer(true)} disabled={isGenerating} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 font-semibold text-white shadow-lg hover:bg-emerald-700 disabled:opacity-50"> 
                                    {isGenerating ? <Loader2 className="animate-spin"/> : <FileDown size={20}/>} {editingParecerId ? "Salvar e Gerar DOCX" : "Salvar e Gerar DOCX"}
                                </button>
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
  };

  const renderLogin = () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-slate-900">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <FileText size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gerador de Parecer</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Faça login para acessar o sistema</p>
        </div>
        
        {authError && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300">
            {authError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <Input label="Email" name="email" type="email" placeholder="seu@email.com" required />
          <Input label="Senha" name="password" type="password" placeholder="••••••••" required />
          
          <button
            type="submit"
            disabled={isLoggingIn}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:opacity-70"
          >
            {isLoggingIn ? <Loader2 className="animate-spin" /> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="mx-auto max-w-5xl px-4 py-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="mb-8 flex items-center gap-4">
        <button onClick={() => setCurrentView('dashboard')} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
          <ChevronLeft size={20} className="text-slate-600 dark:text-slate-300"/>
        </button>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações</h2>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        <div className="space-y-2 lg:col-span-1">
          <button 
            onClick={() => setSettingsTab('clients')}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 font-medium transition-colors ${settingsTab === 'clients' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}
          >
            <Building2 size={20} /> Clientes
          </button>
          <button 
            onClick={() => setSettingsTab('types')}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 font-medium transition-colors ${settingsTab === 'types' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}
          >
            <FileText size={20} /> Tipos de Parecer
          </button>
           <button 
            onClick={() => setSettingsTab('creditors')}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 font-medium transition-colors ${settingsTab === 'creditors' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}
          >
            <Users size={20} /> Credores
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3 dark:bg-slate-900 dark:border-slate-800">
          {settingsTab === 'clients' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Gerenciar Clientes</h3>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const name = (form.elements.namedItem('clientName') as HTMLInputElement).value;
                const segment = (form.elements.namedItem('clientSegment') as HTMLSelectElement).value as SegmentType;
                if(name) {
                    addClient(name, segment);
                    form.reset();
                }
              }} className="flex gap-4 items-end">
                <div className="flex-1">
                    <Input label="Nome do Cliente" name="clientName" placeholder="Ex: Prefeitura de São Luís" required />
                </div>
                <div className="w-40">
                    <Select 
                        label="Tipo" 
                        name="clientSegment" 
                        options={[{label: 'Prefeitura', value: 'prefeitura'}, {label: 'Câmara', value: 'camara'}]} 
                    />
                </div>
                <button type="submit" className="rounded-lg bg-blue-600 p-3 text-white hover:bg-blue-700 h-[46px] w-[46px] flex items-center justify-center">
                    <Plus size={20} />
                </button>
              </form>

              <div className="space-y-2">
                {clients.length === 0 && <p className="text-center text-slate-500 py-4">Nenhum cliente cadastrado.</p>}
                {clients.map(client => (
                  <div key={client.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4 dark:bg-slate-800 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${client.segment === 'prefeitura' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                            {client.segment === 'prefeitura' ? <Building2 size={18} /> : <Landmark size={18} />}
                        </div>
                        <span className="font-medium">{client.name}</span>
                    </div>
                    <button onClick={() => removeClient(client.id)} className="text-slate-400 hover:text-red-500">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {settingsTab === 'types' && !editingType && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Tipos de Parecer</h3>
                <button onClick={restoreDefaultTypes} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    <RefreshCcw size={14} /> Restaurar Padrões
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const input = (e.target as HTMLFormElement).elements.namedItem('typeName') as HTMLInputElement;
                if(input.value) {
                    addOpinionType(input.value);
                    input.value = '';
                }
              }} className="flex gap-4 items-end">
                 <div className="flex-1">
                    <Input label="Novo Tipo" name="typeName" placeholder="Ex: Dispensa de Licitação" required />
                 </div>
                 <button type="submit" className="rounded-lg bg-blue-600 p-3 text-white hover:bg-blue-700 h-[46px] w-[46px] flex items-center justify-center">
                    <Plus size={20} />
                </button>
              </form>

              <div className="space-y-2">
                {opinionTypes.length === 0 && <p className="text-center text-slate-500 py-4">Nenhum tipo cadastrado.</p>}
                {opinionTypes.map(type => (
                  <div key={type.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4 dark:bg-slate-800 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-200 text-slate-600 dark:bg-slate-700">
                            <FileText size={18} />
                        </div>
                        <span className="font-medium">{type.name}</span>
                        <span className="text-xs text-slate-400">({type.questions.length} perguntas)</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setEditingType(type)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                            <List size={18} />
                        </button>
                        <button onClick={() => removeOpinionType(type.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 size={18} />
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {settingsTab === 'types' && editingType && (
               <div className="space-y-6">
                   <div className="flex items-center gap-2 mb-4">
                       <button onClick={() => setEditingType(null)} className="p-1 hover:bg-slate-100 rounded dark:hover:bg-slate-800">
                           <ChevronLeft size={20} />
                       </button>
                       <h3 className="text-lg font-semibold">Editando: {editingType.name}</h3>
                   </div>

                   <div className="space-y-3">
                       {editingType.questions.map((q, idx) => (
                           <div key={q.id} className="flex gap-2 items-center">
                               <span className="text-xs text-slate-400 w-6">{idx + 1}.</span>
                               <input 
                                   type="text" 
                                   value={q.label}
                                   onChange={(e) => {
                                       const newQuestions = [...editingType.questions];
                                       newQuestions[idx] = { ...q, label: e.target.value };
                                       updateOpinionTypeQuestions(editingType.id, newQuestions);
                                   }}
                                   className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:bg-slate-800 dark:border-slate-700"
                               />
                               <button 
                                   onClick={() => {
                                       const newQuestions = editingType.questions.filter((_, i) => i !== idx);
                                       updateOpinionTypeQuestions(editingType.id, newQuestions);
                                   }}
                                   className="text-slate-400 hover:text-red-500"
                               >
                                   <Trash2 size={16} />
                               </button>
                           </div>
                       ))}
                   </div>
                   
                   <button 
                       onClick={() => {
                           const newId = `q${Date.now()}`;
                           const newQuestions = [...editingType.questions, { id: newId, label: 'Nova pergunta' }];
                           updateOpinionTypeQuestions(editingType.id, newQuestions);
                       }}
                       className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 hover:border-blue-500 hover:text-blue-600 transition-colors text-sm font-medium"
                   >
                       + Adicionar Pergunta
                   </button>
               </div>
          )}

          {settingsTab === 'creditors' && (
             <div className="space-y-6">
               <h3 className="text-lg font-semibold">Gerenciar Credores</h3>
               <form onSubmit={(e) => {
                 e.preventDefault();
                 const form = e.target as HTMLFormElement;
                 const name = (form.elements.namedItem('cName') as HTMLInputElement).value;
                 const doc = (form.elements.namedItem('cDoc') as HTMLInputElement).value;
                 // Campos opcionais
                 const contract = (form.elements.namedItem('cContract') as HTMLInputElement).value;
                 const modality = (form.elements.namedItem('cModality') as HTMLSelectElement).value;
                 const dateI = (form.elements.namedItem('cDateI') as HTMLInputElement).value;
                 const dateF = (form.elements.namedItem('cDateF') as HTMLInputElement).value;
                 const sec = (form.elements.namedItem('cSec') as HTMLInputElement).value;
                 const sinc = (form.elements.namedItem('cSinc') as HTMLInputElement).value;
                 const pncp = (form.elements.namedItem('cPncp') as HTMLInputElement).value;

                 if(name) {
                     addCreditor({
                         name, 
                         document: doc,
                         contractNumber: contract,
                         modality,
                         initialDate: dateI,
                         finalDate: dateF,
                         secretaria: sec,
                         sincNumData: sinc,
                         pncpNumData: pncp
                     });
                     form.reset();
                 }
               }} className="grid gap-4 bg-slate-50 p-4 rounded-xl dark:bg-slate-800">
                  <div className="grid sm:grid-cols-2 gap-4">
                      <Input label="Nome / Razão Social" name="cName" required />
                      <Input label="CPF / CNPJ" name="cDoc" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                      <Input label="Secretaria/Entidade Vinculada" name="cSec" placeholder="Ex: Secretaria de Saúde" />
                      <Select label="Modalidade Padrão" name="cModality" options={[{label: 'Selecione...', value: ''}, ...MODALITIES]} />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                      <Input label="Nº Contrato" name="cContract" />
                      <Input label="Vigência Início" type="date" name="cDateI" />
                      <Input label="Vigência Fim" type="date" name="cDateF" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                      <Input label="SINC Nº/Data" name="cSinc" />
                      <Input label="PNCP Nº/Data" name="cPncp" />
                  </div>
                  <button type="submit" className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700">
                      Cadastrar Credor
                  </button>
               </form>

               <div className="space-y-2 mt-4">
                   {creditors.length === 0 && <p className="text-center text-slate-500 py-4">Nenhum credor cadastrado.</p>}
                   {creditors.map(c => (
                       <div key={c.id} className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-4 dark:bg-slate-800 dark:border-slate-700">
                           <div className="flex items-center justify-between">
                               <span className="font-semibold">{c.name}</span>
                               <button onClick={() => removeCreditor(c.id)} className="text-slate-400 hover:text-red-500">
                                   <Trash2 size={18} />
                               </button>
                           </div>
                           <div className="text-xs text-slate-500 grid grid-cols-2 gap-2">
                               {c.document && <span>Doc: {c.document}</span>}
                               {c.contractNumber && <span>Contrato: {c.contractNumber}</span>}
                               {c.secretaria && <span>Entidade: {c.secretaria}</span>}
                           </div>
                       </div>
                   ))}
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="mx-auto max-w-md px-4 py-12 animate-in fade-in slide-in-from-bottom-4">
         <div className="mb-8 flex items-center gap-4">
            <button onClick={() => setCurrentView('dashboard')} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
                <ChevronLeft size={20} className="text-slate-600 dark:text-slate-300"/>
            </button>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Editar Perfil</h2>
         </div>
         <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
             <div className="mb-6 flex justify-center">
                 <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                     {user?.name?.charAt(0) || 'U'}
                 </div>
             </div>
             <form onSubmit={handleUpdateProfile} className="space-y-4">
                 <Input label="Nome Completo" name="profileName" defaultValue={user?.name} required />
                 <Input label="Email" name="profileEmail" type="email" defaultValue={user?.email} required />
                 <Input label="Cargo" name="profileTitle" defaultValue={user?.title} placeholder="Ex: Controlador Geral" />
                 <Input label="Município Padrão" name="profileCity" defaultValue={user?.city} placeholder="Ex: São Paulo" />
                 
                 <div className="pt-4">
                     <button type="submit" className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white shadow-lg hover:bg-blue-700">
                         Salvar Alterações
                     </button>
                 </div>
             </form>
         </div>
    </div>
  );

  if (!user) return renderLogin();

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-300 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
       <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <div className="flex items-center gap-2 font-bold cursor-pointer" onClick={() => setCurrentView('dashboard')}> <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"> <FileText size={20} /> </div> <span className="hidden sm:inline">Gerador de Parecer</span> </div>
            <div className="flex items-center gap-4">
              <button onClick={toggleTheme} className="text-slate-500 hover:text-slate-700 dark:text-slate-400"> {darkMode ? <Sun size={20} /> : <Moon size={20} />} </button>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
              <div className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors" onClick={() => setCurrentView('profile')}> <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800"> <UserIcon size={16} /> </div> <span className="hidden sm:inline font-medium">{user.name}</span> <UserCog size={14} className="text-slate-400" /> </div>
              <button onClick={handleLogout} className="flex items-center gap-1.5 text-slate-400 hover:text-red-500 transition-colors"> <span className="text-xs font-semibold hidden sm:inline">SAIR</span> <LogOut size={18} /> </button>
            </div>
          </div>
        </header>
      <main>
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'setup' && renderSetup()}
        {currentView === 'form' && renderForm()}
        {currentView === 'settings' && renderSettings()}
        {currentView === 'profile' && renderProfile()}
        {currentView === 'admin_users' && renderAdminUsers()}
      </main>
    </div>
  );
}
