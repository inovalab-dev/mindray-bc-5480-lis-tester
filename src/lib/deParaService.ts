import { CodeMapping, TranslationResult } from '../types';

export const INITIAL_DEFAULT_MAPPINGS: CodeMapping[] = [
  // --- REGRAS GERAIS / EXEMPLO SOLICITADO ---
  {
    id: 'MAP_GEN_001',
    equipmentFamily: 'ALL',
    lisCode: 'GLICO',
    lisName: 'Glicose em Jejum (LIS)',
    equipmentCode: 'GLI',
    equipmentName: 'Glicose (Equipamento)',
    direction: 'BIDIRECTIONAL',
    unit: 'mg/dL',
    referenceRange: '70.0 - 99.0',
    enabled: true,
    notes: 'Mapeamento padrão LIS: GLICO <-> Equipamento: GLI'
  },
  {
    id: 'MAP_GEN_002',
    equipmentFamily: 'ALL',
    lisCode: 'BILI',
    lisName: 'Bilirrubinas (Total, Direta e Indireta)',
    equipmentCode: 'BILI',
    equipmentName: 'Bilirrubinas (Equipamento)',
    direction: 'BIDIRECTIONAL',
    unit: 'mg/dL',
    referenceRange: '',
    enabled: true,
    notes: 'Mapeamento padrão LIS: BILI <-> Equipamento: BILI'
  },
  // --- MINDRAY BC-5480 (Hematologia) ---
  {
    id: 'MAP_MIND_001',
    equipmentFamily: 'MINDRAY',
    lisCode: '00002',
    lisName: 'Hemograma Completo (LIS)',
    equipmentCode: 'CBC+DIFF',
    equipmentName: 'CBC + 5-Part Differential',
    direction: 'BIDIRECTIONAL',
    unit: '',
    referenceRange: '',
    enabled: true,
    notes: 'Mapeamento padrão de LIS (código 00002) para Mindray BC-5480'
  },
  {
    id: 'MAP_MIND_002',
    equipmentFamily: 'MINDRAY',
    lisCode: 'HEM',
    lisName: 'Hemograma Completo (Sigla LIS)',
    equipmentCode: 'CBC+DIFF',
    equipmentName: 'CBC + 5-Part Differential',
    direction: 'BIDIRECTIONAL',
    unit: '',
    referenceRange: '',
    enabled: true,
    notes: 'Mapeamento secundário por sigla HEM'
  },
  {
    id: 'MAP_MIND_003',
    equipmentFamily: 'MINDRAY',
    lisCode: 'CBC',
    lisName: 'Hemograma Simples sem Dif',
    equipmentCode: 'CBC',
    equipmentName: 'CBC Simple',
    direction: 'BIDIRECTIONAL',
    unit: '',
    referenceRange: '',
    enabled: true,
    notes: 'Modo CBC apenas (sem 5 partes)'
  },
  {
    id: 'MAP_MIND_004',
    equipmentFamily: 'MINDRAY',
    lisCode: 'LEU',
    lisName: 'Leucócitos Totais',
    equipmentCode: 'WBC',
    equipmentName: 'White Blood Cells',
    direction: 'BIDIRECTIONAL',
    unit: '10^9/L',
    referenceRange: '4.0 - 10.0',
    enabled: true,
    notes: 'Traduz LEU (LIS) <-> WBC (Mindray)'
  },
  {
    id: 'MAP_MIND_005',
    equipmentFamily: 'MINDRAY',
    lisCode: 'ERY',
    lisName: 'Hemácias / Eritrócitos',
    equipmentCode: 'RBC',
    equipmentName: 'Red Blood Cells',
    direction: 'BIDIRECTIONAL',
    unit: '10^12/L',
    referenceRange: '3.80 - 5.80',
    enabled: true,
    notes: 'Traduz ERY (LIS) <-> RBC (Mindray)'
  },
  {
    id: 'MAP_MIND_006',
    equipmentFamily: 'MINDRAY',
    lisCode: 'PLA',
    lisName: 'Plaquetas',
    equipmentCode: 'PLT',
    equipmentName: 'Platelets',
    direction: 'BIDIRECTIONAL',
    unit: '10^9/L',
    referenceRange: '150 - 450',
    enabled: true,
    notes: 'Traduz PLA (LIS) <-> PLT (Mindray)'
  },

  // --- URIT-8021A (Bioquímica) ---
  {
    id: 'MAP_URIT_001',
    equipmentFamily: 'URIT',
    lisCode: 'CREAT',
    lisName: 'Creatinina Sérica',
    equipmentCode: '110',
    equipmentName: 'Creatinina (Canal 110)',
    direction: 'BIDIRECTIONAL',
    unit: 'mg/dL',
    referenceRange: '0.70 - 1.20',
    enabled: true,
    notes: 'Canal numérico 110 no analisador URIT'
  },
  {
    id: 'MAP_URIT_002',
    equipmentFamily: 'URIT',
    lisCode: 'GLI',
    lisName: 'Glicose em Jejum',
    equipmentCode: '001',
    equipmentName: 'Glicose Enzymatic (Canal 001)',
    direction: 'BIDIRECTIONAL',
    unit: 'mg/dL',
    referenceRange: '70.0 - 99.0',
    enabled: true,
    notes: 'Canal numérico 001 no URIT'
  },
  {
    id: 'MAP_URIT_003',
    equipmentFamily: 'URIT',
    lisCode: 'BILI_DIRETA',
    parentCode: 'BILI',
    lisName: 'Bilirrubinas - Bilirrubina Direta',
    equipmentCode: 'BD',
    equipmentName: 'Bilirrubina Direta',
    direction: 'BIDIRECTIONAL',
    unit: 'mg/dL',
    referenceRange: '0.0 - 0.4',
    enabled: true,
    notes: 'Perfil de Bilirrubinas (Mapeamento BD)'
  },
  {
    id: 'MAP_URIT_004',
    equipmentFamily: 'URIT',
    lisCode: 'BILI_TOTAL',
    parentCode: 'BILI',
    lisName: 'Bilirrubinas - Bilirrubina Total',
    equipmentCode: 'BT',
    equipmentName: 'Bilirrubina Total',
    direction: 'BIDIRECTIONAL',
    unit: 'mg/dL',
    referenceRange: '0.2 - 1.2',
    enabled: true,
    notes: 'Perfil de Bilirrubinas (Mapeamento BT)'
  },
  {
    id: 'MAP_URIT_005',
    equipmentFamily: 'URIT',
    lisCode: 'ALB',
    lisName: 'Albumina Sérica',
    equipmentCode: 'ALB',
    equipmentName: 'Albumina',
    direction: 'BIDIRECTIONAL',
    unit: 'g/dL',
    referenceRange: '3.5 - 5.2',
    enabled: true,
    notes: 'Albumina URIT'
  },
  {
    id: 'MAP_URIT_006',
    equipmentFamily: 'URIT',
    lisCode: 'AMILA',
    lisName: 'Amilase Sérica',
    equipmentCode: 'AMIL',
    equipmentName: 'Amilase',
    direction: 'BIDIRECTIONAL',
    unit: 'U/L',
    referenceRange: '28 - 100',
    enabled: true,
    notes: 'Amilase URIT'
  },

  // --- MAXION (Eletrólitos ISE) ---
  {
    id: 'MAP_MAXI_001',
    equipmentFamily: 'MAXION',
    lisCode: 'NA',
    lisName: 'Sódio Sérico (Na)',
    equipmentCode: 'SOD',
    equipmentName: 'Sodium ISE',
    direction: 'BIDIRECTIONAL',
    unit: 'mEq/L',
    referenceRange: '135 - 145',
    enabled: true,
    notes: 'Traduz NA (LIS) <-> SOD (Maxion ISE)'
  },
  {
    id: 'MAP_MAXI_002',
    equipmentFamily: 'MAXION',
    lisCode: 'K',
    lisName: 'Potássio Sérico (K)',
    equipmentCode: 'POT',
    equipmentName: 'Potassium ISE',
    direction: 'BIDIRECTIONAL',
    unit: 'mEq/L',
    referenceRange: '3.5 - 5.1',
    enabled: true,
    notes: 'Traduz K (LIS) <-> POT (Maxion ISE)'
  },
  {
    id: 'MAP_MAXI_003',
    equipmentFamily: 'MAXION',
    lisCode: 'CL',
    lisName: 'Cloreto Sérico (Cl)',
    equipmentCode: 'CHL',
    equipmentName: 'Chloride ISE',
    direction: 'BIDIRECTIONAL',
    unit: 'mEq/L',
    referenceRange: '98 - 107',
    enabled: true,
    notes: 'Traduz CL (LIS) <-> CHL (Maxion ISE)'
  },

  // --- MAXCOAG (Coagulação) ---
  {
    id: 'MAP_COAG_001',
    equipmentFamily: 'MAXCOAG',
    lisCode: 'TAP',
    lisName: 'Tempo de Protrombina (TP / TAP)',
    equipmentCode: 'PT',
    equipmentName: 'Prothrombin Time',
    direction: 'BIDIRECTIONAL',
    unit: 's',
    referenceRange: '11.0 - 14.5',
    enabled: true,
    notes: 'Traduz TAP (LIS) <-> PT (MaxCoag)'
  },
  {
    id: 'MAP_COAG_002',
    equipmentFamily: 'MAXCOAG',
    lisCode: 'TTPA',
    lisName: 'Tempo de Tromboplastina Parcial Ativada',
    equipmentCode: 'APTT',
    equipmentName: 'Activated Partial Thromboplastin Time',
    direction: 'BIDIRECTIONAL',
    unit: 's',
    referenceRange: '25.0 - 38.0',
    enabled: true,
    notes: 'Traduz TTPA (LIS) <-> APTT (MaxCoag)'
  },

  // --- FINECARE WONDFO (Imunoensaio POCT) ---
  {
    id: 'MAP_FINE_001',
    equipmentFamily: 'FINECARE',
    lisCode: 'HB1AC',
    lisName: 'Hemoglobina Glicada HbA1c',
    equipmentCode: 'HBA1C',
    equipmentName: 'HbA1c Quantitative',
    direction: 'BIDIRECTIONAL',
    unit: '%',
    referenceRange: '4.0 - 5.6',
    enabled: true,
    notes: 'Traduz HB1AC (LIS) <-> HBA1C (Finecare)'
  },
  {
    id: 'MAP_FINE_002',
    equipmentFamily: 'FINECARE',
    lisCode: 'PCR',
    lisName: 'Proteína C Reativa Ultra-Sensível',
    equipmentCode: 'hs-CRP',
    equipmentName: 'High Sensitivity CRP',
    direction: 'BIDIRECTIONAL',
    unit: 'mg/L',
    referenceRange: '0.0 - 5.0',
    enabled: true,
    notes: 'Traduz PCR (LIS) <-> hs-CRP (Finecare)'
  },
  {
    id: 'MAP_FINE_003',
    equipmentFamily: 'FINECARE',
    lisCode: 'TROP',
    lisName: 'Troponina I Cardíaca',
    equipmentCode: 'cTnI',
    equipmentName: 'Cardiac Troponin I',
    direction: 'BIDIRECTIONAL',
    unit: 'ng/mL',
    referenceRange: '0.00 - 0.04',
    enabled: true,
    notes: 'Traduz TROP (LIS) <-> cTnI (Finecare)'
  },
  {
    id: 'MAP_FINE_004',
    equipmentFamily: 'FINECARE',
    lisCode: 'BHCG',
    lisName: 'Beta-hCG Quantitativo',
    equipmentCode: 'BHCG',
    equipmentName: 'Beta-hCG Quantitative',
    direction: 'BIDIRECTIONAL',
    unit: 'mIU/mL',
    referenceRange: '< 5.0',
    enabled: true,
    notes: 'Mapeamento Wondfo: BHCG (LIS) <-> BHCG (Finecare)'
  },
  {
    id: 'MAP_FINE_005',
    equipmentFamily: 'FINECARE',
    lisCode: 'DDIMER',
    lisName: 'D-Dímero Quantitativo',
    equipmentCode: 'DDIMER',
    equipmentName: 'D-Dimer Quantitative',
    direction: 'BIDIRECTIONAL',
    unit: 'mg/L FEU',
    referenceRange: '< 0.50',
    enabled: true,
    notes: 'Mapeamento Wondfo: DDIMER (LIS) <-> DDIMER (Finecare)'
  }
];

export function translateLisToEquipmentCode(
  lisCode: string,
  family: string = 'ALL',
  mappings: CodeMapping[] = INITIAL_DEFAULT_MAPPINGS
): TranslationResult {
  if (!lisCode) {
    return { originalCode: lisCode, translatedCode: lisCode, source: 'LIS', target: 'EQUIPMENT' };
  }

  const clean = lisCode.trim().toUpperCase();

  // 1. Match mappings by family or ALL where lisCode or parentCode matches clean exactly
  const matches = mappings.filter(m => {
    if (!m.enabled) return false;
    if (m.direction === 'EQUIPMENT_TO_LIS') return false;
    const isFamilyMatch = m.equipmentFamily === 'ALL' || m.equipmentFamily.toUpperCase() === family.toUpperCase() || family === 'ALL';
    
    const mLis = m.lisCode.trim().toUpperCase();
    const mParent = m.parentCode ? m.parentCode.trim().toUpperCase() : '';

    const isExactMatch = mLis === clean || (mParent !== '' && mParent === clean);
    return isFamilyMatch && isExactMatch;
  });

  // 2. Fallback prefix/profile matching (e.g. querying "BILI" when mappings have "BILI_DIRETA" or "BILI_TOTAL")
  let finalMatches = matches;
  if (finalMatches.length === 0) {
    finalMatches = mappings.filter(m => {
      if (!m.enabled) return false;
      if (m.direction === 'EQUIPMENT_TO_LIS') return false;
      const isFamilyMatch = m.equipmentFamily === 'ALL' || m.equipmentFamily.toUpperCase() === family.toUpperCase() || family === 'ALL';
      
      const mLis = m.lisCode.trim().toUpperCase();
      const isPrefixMatch = mLis.startsWith(clean + '_') || mLis.startsWith(clean + '-') || mLis.startsWith(clean + ' ');
      return isFamilyMatch && isPrefixMatch;
    });
  }

  if (finalMatches.length > 0) {
    const translatedCodes = Array.from(new Set(finalMatches.map(m => m.equipmentCode)));
    return {
      originalCode: lisCode,
      translatedCode: translatedCodes.join(', '),
      translatedCodes,
      mappingApplied: finalMatches[0],
      mappingsApplied: finalMatches,
      source: 'LIS',
      target: 'EQUIPMENT'
    };
  }

  return { originalCode: lisCode, translatedCode: lisCode, source: 'LIS', target: 'EQUIPMENT' };
}

export function translateEquipmentToLisCode(
  eqCode: string,
  family: string = 'ALL',
  mappings: CodeMapping[] = INITIAL_DEFAULT_MAPPINGS
): TranslationResult {
  if (!eqCode) {
    return { originalCode: eqCode, translatedCode: eqCode, source: 'EQUIPMENT', target: 'LIS' };
  }

  const clean = eqCode.trim().toUpperCase();

  const match = mappings.find(m => {
    if (!m.enabled) return false;
    if (m.direction === 'LIS_TO_EQUIPMENT') return false;
    const isFamilyMatch = m.equipmentFamily === 'ALL' || m.equipmentFamily.toUpperCase() === family.toUpperCase() || family === 'ALL';
    return isFamilyMatch && m.equipmentCode.trim().toUpperCase() === clean;
  });

  if (match) {
    return {
      originalCode: eqCode,
      translatedCode: match.lisCode,
      mappingApplied: match,
      source: 'EQUIPMENT',
      target: 'LIS'
    };
  }

  return { originalCode: eqCode, translatedCode: eqCode, source: 'EQUIPMENT', target: 'LIS' };
}
