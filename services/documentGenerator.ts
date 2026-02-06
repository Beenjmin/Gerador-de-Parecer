import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  AlignmentType,
  WidthType,
  BorderStyle,
  Header,
  Footer
} from 'docx';
import saveAs from 'file-saver';
import { ParecerFormData, ChecklistOption, ParecerRecord } from '../types';

const FONT_FAMILY = "Arial";

// --- AJUSTES DE COMPACTAÇÃO ---

// Tamanhos de fonte (em half-points, ou seja, valor/2 = pt)
const SIZE_TITLE = 20;     // 10pt
const SIZE_HEADER = 18;    // 9pt
const SIZE_TEXT = 18;      // 9pt
const SIZE_TABLE = 16;     // 8pt
const SIZE_FOOTER = 14;    // 7pt

// Helper to create a bold title paragraph (Compact)
const createTitle = (text: string) => {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 60 }, // Espaço bem reduzido
    children: [
      new TextRun({
        text: text,
        bold: true,
        font: FONT_FAMILY,
        size: SIZE_TITLE,
      }),
    ],
  });
};

// Helper for section headers (Ultra Compact)
const createSectionHeader = (text: string) => {
    return new Paragraph({
        spacing: { before: 80, after: 20 }, // Quase colado na tabela abaixo
        children: [
            new TextRun({ 
                text: text, 
                bold: true, 
                font: FONT_FAMILY,
                size: SIZE_HEADER 
            })
        ]
    });
};

// Helper to create standard text paragraph (Compact)
const createText = (text: string, bold = false, alignment = AlignmentType.JUSTIFIED) => {
  return new Paragraph({
    alignment: alignment,
    spacing: { after: 30 }, // Pouco espaço entre parágrafos
    children: [
      new TextRun({
        text: text,
        bold: bold,
        font: FONT_FAMILY,
        size: SIZE_TEXT,
      }),
    ],
  });
};

// Helper for table cells (Ultra Compact)
const createCell = (text: string, bold = false, widthPercent = 50) => {
  return new TableCell({
    width: {
      size: widthPercent,
      type: WidthType.PERCENTAGE,
    },
    margins: {
        top: 15,    // Margem interna mínima
        bottom: 15,
        left: 40,
        right: 40
    },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, font: FONT_FAMILY, size: SIZE_TABLE })],
      }),
    ],
  });
};

const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  try {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateString;
  }
};

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export const generateParecerDocx = async (data: ParecerRecord) => {
  const currentDate = new Date();
  const formattedCurrentDate = currentDate.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // --- Logic for Analysis/Conclusion ---
  const answers = Object.values(data.checklist_answers || {});
  const hasNao = answers.includes(ChecklistOption.NAO);

  const analiseText1 = `O Processo encontra-se instruído atendendo as conformidades da lei, estando apto para o pagamento até o dia ${formatDate(data.prazo_pagamento)}.`;
  const analiseText2 = `Após a data, revalidar certidões vencidas.`;

  let conclusaoText1 = "";
  let conclusaoText2 = "";

  if (hasNao) {
    conclusaoText1 = "Diante do exposto, o órgão de Controle Interno emite parecer recomendando APROVAÇÃO COM RESSALVAS.";
    conclusaoText2 = "Assim, conclui que o referido processo se encontra revestido das formalidades legais COM BASE NO ARTIGO 74, II, DA CONSTITUIÇÃO FEDERAL DE 1988, estando apto para pagamento da despesa, desde que sanadas as pendências apontadas no checklist (Seção III).";
  } else {
    conclusaoText1 = "Diante do exposto, o órgão de Controle Interno emite parecer recomendando APROVAÇÃO.";
    conclusaoText2 = "Assim, conclui que o referido processo se encontra revestido das formalidades legais COM BASE NO ARTIGO 74, II, DA CONSTITUIÇÃO FEDERAL DE 1988, estando apto para pronto pagamento da despesa.";
  }

  const conclusaoFinal = "Cumpre observar que o procedimento de controle interno não exime o gestor de sua responsabilidade, cabendo-lhe zelar pela correta aplicação dos recursos públicos.";

  // --- Table I Construction ---
  const table1Rows = [
    ["Protocolo:", data.protocolo],
    ["Entidade Orçamentária:", data.entidade_orcamentaria],
    ["Credor:", data.credor],
    ["Modalidade Licitação:", data.modalidade_licitacao],
    ["Nº Contrato:", data.num_contrato],
    ["Vigência:", `${formatDate(data.vigencia_inicial)} a ${formatDate(data.vigencia_final)}`],
    ["SINC Nº/Data:", data.sinc_num_data],
    ["PNCP Nº/Data:", data.pncp_num_data],
    ["Empenho (Tipo/Nº):", `${data.empenho_tipo} - ${data.empenho_numero}`],
    ["Empenho (Valor/Data):", `${formatCurrency(data.empenho_valor)} - ${formatDate(data.empenho_data)}`],
    ["Liquidação (Nº/Valor/Data):", `${data.liquidacao_numero} - ${formatCurrency(data.liquidacao_valor)} - ${formatDate(data.liquidacao_data)}`],
    ["Nota Fiscal (Nº/Data):", `${data.nota_fiscal_numero} - ${formatDate(data.nota_fiscal_data)}`],
    ["Ordem de Serviço (Nº/Data):", `${data.ordem_servico_numero} - ${formatDate(data.ordem_servico_data)}`],
  ].map(([label, value]) =>
    new TableRow({
      children: [createCell(label as string, true, 40), createCell(value as string, false, 60)],
    })
  );

  // --- Table II Construction ---
  const table2Rows = [
    ["Receita Federal:", formatDate(data.validade_receita_federal)],
    ["Trabalhista:", formatDate(data.validade_trabalhista)],
    ["FGTS:", formatDate(data.validade_fgts)],
    ["CND Estadual:", formatDate(data.validade_cnd_estadual)],
    ["CNDA Estadual:", data.validade_cnda_estadual],
    ["Municipal:", formatDate(data.validade_municipal)],
    ["Outros:", data.validade_outros || "N/A"],
  ].map(([label, value]) =>
    new TableRow({
      children: [createCell(label as string, true, 40), createCell(value as string, false, 60)],
    })
  );

  // --- Table III Construction (Dynamic) ---
  const table3Header = new TableRow({
    children: [
      createCell("Descrição do Item", true, 55),
      createCell("Sim", true, 15),
      createCell("Não", true, 15),
      createCell("N/A", true, 15),
    ],
  });

  const questionsToRender = data.questionsSnapshot || [];

  const table3Rows = questionsToRender.map((item) => {
    const val = data.checklist_answers[item.id];
    return new TableRow({
      children: [
        createCell(item.label, false, 55),
        createCell(val === ChecklistOption.SIM ? "X" : "", false, 15),
        createCell(val === ChecklistOption.NAO ? "X" : "", false, 15),
        createCell(val === ChecklistOption.NA ? "X" : "", false, 15),
      ],
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 340,    // ~0.6 cm
              bottom: 340, // ~0.6 cm
              left: 500,   // ~0.9 cm
              right: 500,  // ~0.9 cm
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 30 },
                children: [
                  new TextRun({ 
                    text: data.entidade_orcamentaria.toUpperCase(), 
                    bold: true, 
                    size: SIZE_HEADER,
                    font: FONT_FAMILY 
                  }),
                ],
              }),
              new Paragraph({
                 alignment: AlignmentType.CENTER,
                 spacing: { after: 30 },
                 children: [
                    new TextRun({ text: "CONTROLADORIA GERAL DO MUNICÍPIO", size: 16, font: FONT_FAMILY }), // 8pt
                 ]
              })
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Controle Interno", size: SIZE_FOOTER, font: FONT_FAMILY }),
                ],
              }),
            ],
          }),
        },
        children: [
          createTitle("PARECER DA CONTROLADORIA"),
          createText(
            "O Órgão de Controle Interno, no uso de suas atribuições legais, procede à análise documental referente ao processo de pagamento abaixo:",
            false
          ),

          // Table I
          createSectionHeader("I - DADOS DA DESPESA"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: table1Rows,
          }),

          // Table II
          createSectionHeader("II - CERTIDÕES (Validade)"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: table2Rows,
          }),

          // Table III
          createSectionHeader("III - DO EXAME (Checklist)"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [table3Header, ...table3Rows],
          }),

          // Section IV
          createSectionHeader("IV - DA ANÁLISE"),
          createText(analiseText1),
          createText(analiseText2),

          // Section V
          createSectionHeader("V - DA CONCLUSÃO"),
          createText(conclusaoText1),
          createText(conclusaoText2),
          
          new Paragraph({ text: "", spacing: { after: 60 } }), // Espaçador mínimo
          createText(conclusaoFinal),

          new Paragraph({ text: "", spacing: { before: 240 } }), // Espaço para assinatura reduzido (~2 linhas)

          // Date and City
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: `${data.municipio_usuario} - MA, ${formattedCurrentDate}.`,
                font: FONT_FAMILY,
                size: SIZE_TEXT,
              }),
            ],
          }),

          // Signature Line
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({ text: "______________________________________________________", font: FONT_FAMILY, size: SIZE_TEXT})
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: data.nome_usuario.toUpperCase(), bold: true, font: FONT_FAMILY, size: SIZE_TEXT }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: data.cargo_usuario, font: FONT_FAMILY, size: SIZE_TEXT }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "parecer_controladoria.docx");
};
