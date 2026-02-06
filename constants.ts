
import { Client, OpinionType, ChecklistItemDefinition } from './types';

// Template de perguntas padrão (apenas para uso ao criar novos tipos, não carrega automático)
export const DEFAULT_QUESTIONS: ChecklistItemDefinition[] = [
  { id: 'q1', label: '1. Solicitação de Pagamento' },
  { id: 'q2', label: '2. Cópia do Contrato/Ata de Registro de Preços' },
  { id: 'q3', label: '3. Nota de Empenho' },
  { id: 'q4', label: '4. Liquidação da Despesa' },
  { id: 'q5', label: '5. Documento Fiscal (Nota Fiscal/Fatura)' },
  { id: 'q6', label: '6. Atesto na Nota Fiscal' },
  { id: 'q7', label: '7. Certidões de Regularidade Fiscal' },
  { id: 'q8', label: '8. Autorização de Pagamento' },
  { id: 'q9', label: '9. Dados Bancários do Credor' },
  { id: 'q10', label: '10. Ordem Bancária/Cheque' },
  { id: 'q11', label: '11. Comprovante de Transferência' },
  { id: 'q12', label: '12. Comprovação da Regularidade (SINC/PNCP)' },
];

// Dados iniciais vazios para garantir limpeza do sistema
export const DEFAULT_OPINION_TYPES: OpinionType[] = [];

export const DEFAULT_CLIENTS: Client[] = [];

// Listas padronizadas do sistema (fixas)
export const MODALITIES = [
  { label: 'Dispensa de Licitação', value: 'Dispensa' },
  { label: 'Inexigibilidade', value: 'Inexigibilidade' },
  { label: 'Pregão Eletrônico', value: 'Pregão Eletrônico' },
  { label: 'Pregão Presencial', value: 'Pregão Presencial' },
  { label: 'Concorrência', value: 'Concorrência' },
  { label: 'Tomada de Preços', value: 'Tomada de Preços' },
  { label: 'Adesão à Ata (Carona)', value: 'Adesão à Ata' },
  { label: 'Chamada Pública', value: 'Chamada Pública' },
];

export const COMMITMENT_TYPES = [
  { label: 'Ordinário', value: 'Ordinário' },
  { label: 'Global', value: 'Global' },
  { label: 'Estimativo', value: 'Estimativo' },
];
