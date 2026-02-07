
export enum ChecklistOption {
  SIM = 'sim',
  NAO = 'nao',
  NA = 'na'
}

export interface ChecklistItemDefinition {
  id: string;
  label: string;
}

export interface Client {
  id: string;
  name: string;
  segment: 'prefeitura' | 'camara';
}

export interface Creditor {
  id: string;
  name: string; // Nome ou Razão Social
  document: string; // CPF ou CNPJ (opcional, para referência)
  // Dados de Contrato Vinculado (Opcional)
  secretaria?: string; // Entidade vinculada (ex: Secretaria de Saúde)
  contractNumber?: string;
  modality?: string;
  initialDate?: string;
  finalDate?: string;
  sincNumData?: string; // NOVO: SINC Nº/Data
  pncpNumData?: string; // NOVO: PNCP Nº/Data
}

export interface OpinionType {
  id: string;
  name: string; // Ex: "Material", "Serviço", "Obras"
  icon: string; // Identificador do ícone
  questions: ChecklistItemDefinition[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string; // 'admin' | 'user'
  title?: string; // Cargo (ex: Controlador Geral)
  city?: string;  // Município padrão
  password?: string; // Para validação de login simples
}

export interface ParecerFormData {
  // Configuração
  clientId: string;
  opinionTypeId: string;
  tipo_processo_label?: string; // Para exibição (ex: "Material")

  // Seção I - Dados da Despesa
  protocolo: string;
  entidade_orcamentaria: string;
  credor: string;
  modalidade_licitacao: string;
  num_contrato: string;
  vigencia_inicial: string;
  vigencia_final: string;
  sinc_num_data: string;
  pncp_num_data: string;
  empenho_tipo: string;
  empenho_numero: string;
  empenho_valor: number;
  empenho_data: string;
  liquidacao_numero: string;
  liquidacao_valor: number;
  liquidacao_data: string;
  nota_fiscal_numero: string;
  nota_fiscal_data: string;
  ordem_servico_numero: string;
  ordem_servico_data: string;

  // Seção II - Certidões
  validade_receita_federal: string;
  validade_trabalhista: string;
  validade_fgts: string;
  validade_cnd_estadual: string;
  validade_cnda_estadual: string;
  validade_municipal: string;
  validade_outros: string;

  // Seção III - Checklist Dinâmico
  // Chave = ID da pergunta, Valor = Resposta
  checklist_answers: Record<string, ChecklistOption>;

  // Seção IV e Info Usuário
  prazo_pagamento: string;
  nome_usuario: string;
  cargo_usuario: string;
  municipio_usuario: string;
}

export interface ParecerRecord extends ParecerFormData {
  id: string;
  createdAt: string;
  status: 'Aprovado' | 'Ressalvas';
  // Snapshot das perguntas no momento da criação para garantir integridade histórica
  questionsSnapshot: ChecklistItemDefinition[];
}