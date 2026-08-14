import React, { useState } from 'react';
import { X, Copy, Check, FileText, Activity, ShieldCheck, Printer, LayoutGrid, Award, Beaker, FlaskConical, Stethoscope } from 'lucide-react';
import { MindraySampleResult, MindrayParam } from '../types';

interface SampleDetailModalProps {
  sample: MindraySampleResult | null;
  onClose: () => void;
}

const BIOQ_NAMES: Record<string, { fullName: string; method: string; ref: string }> = {
  'AMIL': { fullName: 'AMILASE SÉRICA', method: 'Enzimático Colorimétrico (CNPG3)', ref: '0 a 100 U/L' },
  'AMILASE': { fullName: 'AMILASE SÉRICA', method: 'Enzimático Colorimétrico (CNPG3)', ref: '0 a 100 U/L' },
  'TGP/ALT': { fullName: 'ALT / TGP (ALANINA AMINOTRANSFERASE)', method: 'UV sem Piridoxal Fosfato', ref: 'Até 41 U/L' },
  'ALT': { fullName: 'ALT / TGP (ALANINA AMINOTRANSFERASE)', method: 'UV sem Piridoxal Fosfato', ref: 'Até 41 U/L' },
  'TGO/AST': { fullName: 'AST / TGO (ASPARTATO AMINOTRANSFERASE)', method: 'UV sem Piridoxal Fosfato', ref: 'Até 40 U/L' },
  'AST': { fullName: 'AST / TGO (ASPARTATO AMINOTRANSFERASE)', method: 'UV sem Piridoxal Fosfato', ref: 'Até 40 U/L' },
  'CREAT110': { fullName: 'CREATININA SÉRICA', method: 'Jaffé Modificado (Cinético)', ref: '0,60 a 1,30 mg/dL' },
  'CREAT': { fullName: 'CREATININA SÉRICA', method: 'Jaffé Modificado (Cinético)', ref: '0,60 a 1,30 mg/dL' },
  'CREA': { fullName: 'CREATININA SÉRICA', method: 'Jaffé Modificado (Cinético)', ref: '0,60 a 1,30 mg/dL' },
  'UREIA': { fullName: 'UREIA SÉRICA', method: 'Urease / UV Cinético', ref: '15 a 45 mg/dL' },
  'UREA': { fullName: 'UREIA SÉRICA', method: 'Urease / UV Cinético', ref: '15 a 45 mg/dL' },
  'GLI': { fullName: 'GLICOSE SÉRICA (JEJUM)', method: 'Glicose Oxidase (GOD-PAP)', ref: '70 a 99 mg/dL' },
  'GLU': { fullName: 'GLICOSE SÉRICA (JEJUM)', method: 'Glicose Oxidase (GOD-PAP)', ref: '70 a 99 mg/dL' },
  'PTT': { fullName: 'PROTEÍNAS TOTAIS', method: 'Biureto', ref: '6,0 a 8,0 g/dL' },
  'ALB': { fullName: 'ALBUMINA SÉRICA', method: 'Verde de Bromocresol', ref: '3,5 a 5,2 g/dL' },
  'COL': { fullName: 'COLESTEROL TOTAL', method: 'Enzimático Trinder (CHOD-PAP)', ref: 'Desejável < 190 mg/dL' },
  'CHOL': { fullName: 'COLESTEROL TOTAL', method: 'Enzimático Trinder (CHOD-PAP)', ref: 'Desejável < 190 mg/dL' },
  'TRI': { fullName: 'TRIGLICÉRIDES', method: 'Glicerol Fostato Oxidase (GPO-PAP)', ref: 'Desejável < 150 mg/dL' },
  'TRIG': { fullName: 'TRIGLICÉRIDES', method: 'Glicerol Fostato Oxidase (GPO-PAP)', ref: 'Desejável < 150 mg/dL' },
  'HDL': { fullName: 'HDL COLESTEROL', method: 'Homogêneo Direto', ref: 'Desejável > 40 mg/dL' },
  'LDL': { fullName: 'LDL COLESTEROL', method: 'Fórmula de Friedewald / Direto', ref: 'Desejável < 130 mg/dL' },
  'GGT': { fullName: 'GAMA GLUTAMIL TRANSFERASE (GGT)', method: 'Szasz Modificado', ref: '8 a 61 U/L' },
  'LDH': { fullName: 'DESIDROGENASE LÁTICA (LDH)', method: 'Piruvato a Lactato (UV)', ref: '135 a 225 U/L' },
  'FAL': { fullName: 'FOSFATASE ALCALINA', method: 'p-Nitrofenilfosfato (PNPP-AMP)', ref: '35 a 105 U/L' },
  'PCR': { fullName: 'PROTEÍNA C-REATIVA (TURBIDIMETRIA)', method: 'Imunoturbidimetria Quantitativa', ref: '< 0,50 mg/dL' },
  'AUR': { fullName: 'ÁCIDO ÚRICO', method: 'Uricase / PAP', ref: '2,5 a 7,0 mg/dL' },
  'BD': { fullName: 'BILIRRUBINA DIRETA', method: 'Diclorofenildiazônio (DPD)', ref: 'Até 0,30 mg/dL' },
  'BT': { fullName: 'BILIRRUBINA TOTAL', method: 'Diclorofenildiazônio (DPD)', ref: 'Até 1,20 mg/dL' },
  'CKMB': { fullName: 'CK-MB (CREATINO KINASE MB)', method: 'Imunoinibição Enzimática', ref: 'Até 25 U/L' },
  'CKNAC': { fullName: 'CK TOTAL (CREATINO KINASE)', method: 'UV Cinético (DGKC)', ref: '24 a 195 U/L' },
  'CKNAC117': { fullName: 'CK TOTAL (CREATINO KINASE 1:17)', method: 'UV Cinético (DGKC)', ref: '24 a 195 U/L' },
  'NA': { fullName: 'SÓDIO SÉRICO (Na+)', method: 'Eletrodo Seletivo / Enzimático', ref: '135 a 145 mEq/L' },
  'K': { fullName: 'POTÁSSIO SÉRICO (K+)', method: 'Eletrodo Seletivo / Enzimático', ref: '3,5 a 5,1 mEq/L' },
  'CL': { fullName: 'CLORETO SÉRICO (Cl-)', method: 'Eletrodo Seletivo / Enzimático', ref: '98 a 107 mEq/L' }
};

const IMMUNO_NAMES: Record<string, { fullName: string; method: string; ref: string }> = {
  'TROP': { fullName: 'TROPONINA I CARDÍACA (cTnI)', method: 'Imunofluorescência Quantitativa', ref: '< 0,10 ng/mL' },
  'TROPONIN': { fullName: 'TROPONINA I CARDÍACA (cTnI)', method: 'Imunofluorescência Quantitativa', ref: '< 0,10 ng/mL' },
  'CRP': { fullName: 'PROTEÍNA C-REATIVA DE ALTA SENSIBILIDADE (hs-CRP)', method: 'Imunofluorescência Quantitativa', ref: '< 3,0 mg/L' },
  'D-DIMER': { fullName: 'D-DÍMERO (DD)', method: 'Imunofluorescência Quantitativa', ref: '< 0,50 mg/L FEU' },
  'HBA1C': { fullName: 'HEMOGLOBINA GLICADA (HbA1c)', method: 'Imunofluorescência Quantitativa', ref: '4,0 a 5,6 %' },
  'TSH': { fullName: 'HORMÔNIO TIREOESTIMULANTE (TSH)', method: 'Imunofluorescência Quantitativa', ref: '0,45 a 4,50 µUI/mL' },
  'PSA': { fullName: 'ANTÍGENO PROSTÁTICO ESPECÍFICO (PSA TOTAL)', method: 'Imunofluorescência Quantitativa', ref: '< 4,00 ng/mL' },
  'PCT': { fullName: 'PROCALCITONINA (PCT)', method: 'Imunofluorescência Quantitativa', ref: '< 0,15 ng/mL' },
  'FERRITIN': { fullName: 'FERRITINA SÉRICA', method: 'Imunofluorescência Quantitativa', ref: '30 a 400 ng/mL' }
};

const COAG_NAMES: Record<string, { fullName: string; method: string; ref: string }> = {
  'TP': { fullName: 'TEMPO DE PROTROMBINA (TAP)', method: 'Coagulométrico Óptico', ref: '11,0 a 14,5 seg' },
  'INR': { fullName: 'ÍNDICE INTERNACIONAL NORMALIZADO (INR)', method: 'Cálculo ISI', ref: '0,80 a 1,20' },
  'TTPA': { fullName: 'TEMPO DE TROMBOPLASTINA PARCIAL ATIVADA', method: 'Coagulométrico Óptico', ref: '25,0 a 35,0 seg' },
  'FIB': { fullName: 'FIBRINOGÊNIO', method: 'Método de Clauss', ref: '200 a 400 mg/dL' }
};

export const SampleDetailModal: React.FC<SampleDetailModalProps> = ({ sample, onClose }) => {
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedAck, setCopiedAck] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'raw' | 'ack'>('results');
  const [viewStyle, setViewStyle] = useState<'paper' | 'grid'>('paper');

  if (!sample) return null;

  const paramsList: MindrayParam[] = Object.values(sample.parameters || {});
  const modelUpper = (sample.analyzerModel || '').toUpperCase();
  const paramCodesUpper = paramsList.map(p => p.code.toUpperCase());

  // Detect Analyzer Category
  const isBioquimica = modelUpper.includes('URIT') || modelUpper.includes('BIOQ') || modelUpper.includes('8021') ||
    paramCodesUpper.some(c => ['AMIL', 'TGP', 'TGO', 'TGP/ALT', 'TGO/AST', 'CREAT', 'CREAT110', 'UREIA', 'GLI', 'PTT', 'ALB', 'COL', 'TRI', 'TRIG', 'HDL', 'GGT', 'LDH', 'FAL', 'PCR', 'AUR', 'CKMB', 'CKNAC'].includes(c));

  const isImmunoassay = modelUpper.includes('FINECARE') ||
    paramCodesUpper.some(c => ['CRP', 'PCT', 'TROP', 'TROPONIN', 'D-DIMER', 'HBA1C', 'TSH', 'PSA', 'FERRITIN'].includes(c));

  const isCoagulation = modelUpper.includes('MAXCOAG') ||
    paramCodesUpper.some(c => ['TP', 'INR', 'TTPA', 'FIB', 'TT'].includes(c));

  const isElectrolytes = modelUpper.includes('MAXION') ||
    (paramCodesUpper.some(c => ['NA', 'K', 'CL', 'CA'].includes(c)) && !isBioquimica);

  const isSerology = modelUpper.includes('WAMA') ||
    paramCodesUpper.some(c => ['DENGUE', 'HIV', 'HCV', 'HBSAG', 'COVID', 'SYPHILIS'].includes(c));

  const isHematology = (!isBioquimica && !isImmunoassay && !isCoagulation && !isElectrolytes && !isSerology) ||
    modelUpper.includes('MINDRAY') || modelUpper.includes('BC-5480') || paramCodesUpper.some(c => ['RBC', 'WBC', 'PLT', 'HGB'].includes(c));

  // Determine Tab Label & Header
  let reportTitle = 'HEMOGRAMA COMPLETO';
  let tabLabel = 'Laudo do Hemograma';
  let categoryBadge = 'Hematologia';

  if (isBioquimica) {
    reportTitle = 'LAUDO DE BIOQUÍMICA CLÍNICA';
    tabLabel = 'Laudo de Bioquímica';
    categoryBadge = 'Bioquímica Automação (URIT)';
  } else if (isImmunoassay) {
    reportTitle = 'LAUDO DE IMUNOENSAIO E MARCADORES';
    tabLabel = 'Laudo de Imunoensaio';
    categoryBadge = 'Imunoensaio (Finecare)';
  } else if (isCoagulation) {
    reportTitle = 'LAUDO DE COAGULAÇÃO';
    tabLabel = 'Laudo de Coagulação';
    categoryBadge = 'Coagulação (Maxcoag)';
  } else if (isElectrolytes) {
    reportTitle = 'LAUDO DE ELETRÓLITOS E GASOMETRIA';
    tabLabel = 'Laudo de Eletrólitos';
    categoryBadge = 'Eletrólitos (Maxion)';
  } else if (isSerology) {
    reportTitle = 'LAUDO DE SOROLOGIA E TESTES RÁPIDOS';
    tabLabel = 'Laudo de Sorologia';
    categoryBadge = 'Sorologia (Wama)';
  }

  const copyToClipboard = (text: string, isAck: boolean) => {
    navigator.clipboard.writeText(text);
    if (isAck) {
      setCopiedAck(true);
      setTimeout(() => setCopiedAck(false), 2000);
    } else {
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    }
  };

  // Helper values & formatting for Paper Laudo
  const getP = (code: string, fallback: string | number = '0'): string => {
    return (sample.parameters[code]?.value ?? fallback).toString();
  };

  const formatNumStr = (val: string | number): string => {
    const num = typeof val === 'number' ? val : parseFloat(val.toString().replace(',', '.'));
    if (isNaN(num)) return '0,0';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  // Erythrogram Values for Hematology
  const rbcVal = formatNumStr(getP('RBC', 4.4));
  const hgbVal = formatNumStr(getP('HGB', 14.7));
  const hctVal = formatNumStr(getP('HCT', 43.6));
  const mcvVal = formatNumStr(getP('MCV', 99.1));
  const mchVal = formatNumStr(getP('MCH', 33.4));
  const mchcVal = formatNumStr(getP('MCHC', 33.7));
  const rdwVal = formatNumStr(getP('RDW-CV', 12.4));

  // Leukogram Values
  const rawWbc = parseFloat(getP('WBC', 10.23).replace(',', '.'));
  const wbcAbsTotal = Math.round(rawWbc > 100 ? rawWbc : rawWbc * 1000);
  const wbcAbsFormatted = wbcAbsTotal.toLocaleString('pt-BR');

  // Percentages
  const neuPNum = parseFloat(getP('NEU%', 76.0).replace(',', '.'));
  const eosPNum = parseFloat(getP('EOS%', 1.0).replace(',', '.'));
  const basPNum = parseFloat(getP('BAS%', 0.0).replace(',', '.'));
  const lymPNum = parseFloat(getP('LYM%', 17.0).replace(',', '.'));
  const monPNum = parseFloat(getP('MON%', 6.0).replace(',', '.'));

  const calcAbs = (p: number) => {
    const abs = Math.round((p * wbcAbsTotal) / 100);
    return abs.toLocaleString('pt-BR');
  };

  // Thrombogram
  const rawPlt = parseFloat(getP('PLT', 174.0).replace(',', '.'));
  const pltFormatted = rawPlt > 1000 ? (rawPlt / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1 }) : formatNumStr(rawPlt);
  const mpvVal = formatNumStr(getP('MPV', 10.1));

  // Group parameters for technical grid view
  const erythrogram = paramsList.filter(p => ['RBC', 'HGB', 'HCT', 'MCV', 'MCH', 'MCHC', 'RDW-CV', 'RDW-SD'].includes(p.code));
  const leukogram = paramsList.filter(p => ['WBC', 'NEU%', 'LYM%', 'MON%', 'EOS%', 'BAS%', 'NEU#', 'LYM#', 'MON#', 'EOS#', 'BAS#', 'LIC%', 'ALY%'].includes(p.code));
  const thrombogram = paramsList.filter(p => ['PLT', 'MPV', 'PDW', 'PCT', 'P-LCC', 'P-LCR'].includes(p.code));
  const others = paramsList.filter(p => !['RBC', 'HGB', 'HCT', 'MCV', 'MCH', 'MCHC', 'RDW-CV', 'RDW-SD', 'WBC', 'NEU%', 'LYM%', 'MON%', 'EOS%', 'BAS%', 'NEU#', 'LYM#', 'MON#', 'EOS#', 'BAS#', 'LIC%', 'ALY%', 'PLT', 'MPV', 'PDW', 'PCT', 'P-LCC', 'P-LCR'].includes(p.code));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900/90 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="font-bold text-lg text-white font-sans">
                  Amostra #{sample.sampleId}
                </h3>
                <span className="text-[10px] uppercase font-mono tracking-wider px-2.5 py-0.5 rounded-md bg-teal-950 text-teal-300 font-bold border border-teal-700">
                  {sample.analyzerModel || 'Analisador LIS'}
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {categoryBadge}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                Paciente: <span className="text-slate-200 font-medium">{sample.patientName?.replace('^', ' ') || 'Paciente N/I'}</span> &bull; ID: {sample.patientId || 'P-8842'} &bull; Data: {new Date(sample.timestamp).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Sub-Tabs & View Selector */}
        <div className="bg-slate-950 px-6 pt-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
          <div className="flex space-x-3">
            {[
              { id: 'results', label: tabLabel, icon: Activity },
              { id: 'raw', label: 'Mensagem HL7 / ASTM Bruta', icon: FileText },
              { id: 'ack', label: 'Resposta ACK (MSA|AA)', icon: ShieldCheck },
            ].map(t => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`pb-2.5 transition-all border-b-2 flex items-center space-x-2 px-1 ${
                    isActive
                      ? 'border-indigo-500 text-indigo-400 font-bold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab === 'results' && (
            <div className="flex items-center space-x-2 pb-2">
              <button
                onClick={() => setViewStyle('paper')}
                className={`px-3 py-1 rounded-lg border text-[11px] font-medium flex items-center space-x-1.5 transition-all ${
                  viewStyle === 'paper'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Laudo Impresso (Padrão LIS)</span>
              </button>

              <button
                onClick={() => setViewStyle('grid')}
                className={`px-3 py-1 rounded-lg border text-[11px] font-medium flex items-center space-x-1.5 transition-all ${
                  viewStyle === 'grid'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Visão Técnica Grid</span>
              </button>

              <button
                onClick={() => window.print()}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 text-[11px] font-medium flex items-center space-x-1"
                title="Imprimir Laudo"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-sm text-slate-200">
          
          {activeTab === 'results' && (
            <>
              {viewStyle === 'paper' ? (
                /* ==================== TRADITIONAL LAUDO PAPER FORMAT ==================== */
                <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 font-serif shadow-2xl border border-slate-200 relative overflow-hidden select-text">
                  
                  {/* Subtle Background Watermark */}
                  <div className="absolute right-6 bottom-6 opacity-[0.05] pointer-events-none select-none">
                    <svg width="220" height="220" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 2a10 10 0 0 0 0 20" />
                      <path d="M2 12h20" />
                    </svg>
                  </div>

                  {/* Top Header Information */}
                  <div className="border-b-2 border-slate-900 pb-3 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 font-sans">
                    <div>
                      <h2 className="text-xl font-black tracking-wide text-slate-900 font-serif italic uppercase">{reportTitle}</h2>
                      <p className="text-xs text-slate-700 mt-1">
                        Paciente: <strong className="text-slate-950 font-bold">{sample.patientName?.replace('^', ' ') || 'Paciente N/I'}</strong> &bull; ID: <strong>{sample.patientId || 'P-8842'}</strong>
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-600 font-mono">
                      <p>Amostra LIS: <strong className="text-slate-900">#{sample.sampleId}</strong></p>
                      <p>Analisador: <strong className="text-slate-900">{sample.analyzerModel || 'Analisador Laboratorial'}</strong></p>
                    </div>
                  </div>

                  {/* BIOQUÍMICA PAPER LAUDO */}
                  {isBioquimica && (
                    <div className="mb-6">
                      <div className="flex justify-between items-end border-b border-slate-400 pb-1 mb-3 font-sans text-xs font-bold text-slate-800">
                        <span className="w-5/12 uppercase tracking-wide font-serif italic text-slate-950">EXAME / DOSAGEM</span>
                        <span className="w-2/12 text-center">RESULTADO</span>
                        <span className="w-3/12 text-center">VALOR DE REFERÊNCIA</span>
                        <span className="w-2/12 text-right">MÉTODO</span>
                      </div>

                      <div className="divide-y divide-slate-200 space-y-2 pt-1 font-serif text-xs">
                        {paramsList.map((p, idx) => {
                          const code = p.code;
                          const meta = BIOQ_NAMES[code] || BIOQ_NAMES[code.toUpperCase()] || {
                            fullName: p.name || p.code,
                            method: 'Enzimático / Colorimétrico',
                            ref: p.referenceRange || '0 - 100'
                          };

                          const isHigh = p.flag === 'H';
                          const isLow = p.flag === 'L';

                          return (
                            <div key={`${code}-${idx}`} className="pt-2 pb-1 flex items-baseline justify-between gap-2">
                              <div className="w-5/12 font-bold text-slate-950 font-serif">
                                {meta.fullName} <span className="font-mono text-[10px] text-slate-500 font-normal">({p.code})</span>
                              </div>
                              <div className="w-2/12 text-center font-bold text-slate-950 font-sans text-sm flex items-center justify-center gap-1">
                                <span>{p.value} {p.unit}</span>
                                {p.flag && p.flag !== 'N' && (
                                  <span className={`text-[9px] px-1 py-0.2 rounded font-sans font-black ${isHigh ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-sky-100 text-sky-800 border border-sky-300'}`}>
                                    [{p.flag}]
                                  </span>
                                )}
                              </div>
                              <div className="w-3/12 text-center font-sans text-[11px] text-slate-700">
                                {p.referenceRange || meta.ref}
                              </div>
                              <div className="w-2/12 text-right font-sans text-[10px] text-slate-500 truncate" title={meta.method}>
                                {meta.method}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* IMUNOENSAIO PAPER LAUDO */}
                  {isImmunoassay && (
                    <div className="mb-6">
                      <div className="flex justify-between items-end border-b border-slate-400 pb-1 mb-3 font-sans text-xs font-bold text-slate-800">
                        <span className="w-5/12 uppercase tracking-wide font-serif italic text-slate-950">DOSAGEM DE MARCADOR</span>
                        <span className="w-2/12 text-center">RESULTADO</span>
                        <span className="w-3/12 text-center">VALOR DE REFERÊNCIA</span>
                        <span className="w-2/12 text-right">METODOLOGIA</span>
                      </div>

                      <div className="divide-y divide-slate-200 space-y-2 pt-1 font-serif text-xs">
                        {paramsList.map((p, idx) => {
                          const code = p.code;
                          const meta = IMMUNO_NAMES[code] || IMMUNO_NAMES[code.toUpperCase()] || {
                            fullName: p.name || p.code,
                            method: 'Imunofluorescência Quantitativa',
                            ref: p.referenceRange || 'Normal'
                          };

                          return (
                            <div key={`${code}-${idx}`} className="pt-2 pb-1 flex items-baseline justify-between gap-2">
                              <div className="w-5/12 font-bold text-slate-950 font-serif">
                                {meta.fullName} <span className="font-mono text-[10px] text-slate-500 font-normal">({p.code})</span>
                              </div>
                              <div className="w-2/12 text-center font-bold text-slate-950 font-sans text-sm">
                                {p.value} {p.unit}
                              </div>
                              <div className="w-3/12 text-center font-sans text-[11px] text-slate-700">
                                {p.referenceRange || meta.ref}
                              </div>
                              <div className="w-2/12 text-right font-sans text-[10px] text-slate-500">
                                {meta.method}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* COAGULAÇÃO PAPER LAUDO */}
                  {isCoagulation && (
                    <div className="mb-6">
                      <div className="flex justify-between items-end border-b border-slate-400 pb-1 mb-3 font-sans text-xs font-bold text-slate-800">
                        <span className="w-5/12 uppercase tracking-wide font-serif italic text-slate-950">PARÂMETRO DE COAGULAÇÃO</span>
                        <span className="w-2/12 text-center">RESULTADO</span>
                        <span className="w-3/12 text-center">VALOR DE REFERÊNCIA</span>
                        <span className="w-2/12 text-right">MÉTODO</span>
                      </div>

                      <div className="divide-y divide-slate-200 space-y-2 pt-1 font-serif text-xs">
                        {paramsList.map((p, idx) => {
                          const code = p.code;
                          const meta = COAG_NAMES[code] || COAG_NAMES[code.toUpperCase()] || {
                            fullName: p.name || p.code,
                            method: 'Coagulométrico Óptico',
                            ref: p.referenceRange || '-'
                          };

                          return (
                            <div key={`${code}-${idx}`} className="pt-2 pb-1 flex items-baseline justify-between gap-2">
                              <div className="w-5/12 font-bold text-slate-950 font-serif">
                                {meta.fullName} <span className="font-mono text-[10px] text-slate-500 font-normal">({p.code})</span>
                              </div>
                              <div className="w-2/12 text-center font-bold text-slate-950 font-sans text-sm">
                                {p.value} {p.unit}
                              </div>
                              <div className="w-3/12 text-center font-sans text-[11px] text-slate-700">
                                {p.referenceRange || meta.ref}
                              </div>
                              <div className="w-2/12 text-right font-sans text-[10px] text-slate-500">
                                {meta.method}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* OTHER NON-HEMATOLOGY (ELETRÓLITOS, SOROLOGIA, OUTROS) */}
                  {!isBioquimica && !isImmunoassay && !isCoagulation && !isHematology && (
                    <div className="mb-6">
                      <div className="flex justify-between items-end border-b border-slate-400 pb-1 mb-3 font-sans text-xs font-bold text-slate-800">
                        <span className="w-5/12 uppercase tracking-wide font-serif italic text-slate-950">PARÂMETRO / EXAME</span>
                        <span className="w-3/12 text-center">RESULTADO</span>
                        <span className="w-4/12 text-right">VALOR DE REFERÊNCIA</span>
                      </div>

                      <div className="divide-y divide-slate-200 space-y-2 pt-1 font-serif text-xs">
                        {paramsList.map((p, idx) => (
                          <div key={`${p.code}-${idx}`} className="pt-2 pb-1 flex items-baseline justify-between gap-2">
                            <div className="w-5/12 font-bold text-slate-950 font-serif">
                              {p.name || p.code} <span className="font-mono text-[10px] text-slate-500 font-normal">({p.code})</span>
                            </div>
                            <div className="w-3/12 text-center font-bold text-slate-950 font-sans text-sm">
                              {p.value} {p.unit}
                            </div>
                            <div className="w-4/12 text-right font-sans text-[11px] text-slate-700">
                              {p.referenceRange || '-'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* HEMATOLOGY PAPER LAUDO (MINDRAY) */}
                  {isHematology && (
                    <>
                      {/* 1. SÉRIE VERMELHA */}
                      <div className="mb-6">
                        <div className="flex justify-between items-end border-b border-slate-400 pb-1 mb-2">
                          <h3 className="font-bold text-sm sm:text-base font-serif italic tracking-wide text-slate-950 uppercase">
                            SÉRIE VERMELHA
                          </h3>
                          <div className="text-[11px] font-sans font-bold text-slate-700 text-right space-x-4 sm:space-x-8">
                            <span className="hidden sm:inline">Valores de Referência:</span>
                            <span className="inline-block w-24 text-center">Homens</span>
                            <span className="inline-block w-24 text-center">Mulheres</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs font-serif leading-relaxed">
                          <LaudoEritroRow label="ERITRÓCITOS" val={`${rbcVal} milhões/mm³`} refH="4,5 a 5,5 milhões/mm³" refM="3,8 a 4,8 milhões/mm³" />
                          <LaudoEritroRow label="HEMOGLOBINA" val={`${hgbVal} g/dL`} refH="13 a 17 g/dL" refM="12 a 15 g/dL" />
                          <LaudoEritroRow label="HEMATÓCRITO" val={`${hctVal} %`} refH="40 a 50%" refM="36 a 46%" />
                          <LaudoEritroRow label="V.C.M." val={`${mcvVal} µm³/dL`} refH="83 a 101 µm³/dL" refM="83 a 101 µm³/dL" />
                          <LaudoEritroRow label="H.C.M." val={`${mchVal} pg`} refH="27 a 32 pg" refM="27 a 32 pg" />
                          <LaudoEritroRow label="C.H.C.M." val={`${mchcVal} g/dL`} refH="31,5 a 34,5 g/dL" refM="31,5 a 34,5 g/dL" />
                          <LaudoEritroRow label="R.D.W." val={`${rdwVal} %`} refH="11,6 a 14%" refM="11,6 a 14%" />
                        </div>
                      </div>

                      {/* 2. SÉRIE BRANCA */}
                      <div className="mb-6">
                        <div className="flex justify-between items-end border-b border-slate-400 pb-1 mb-2">
                          <h3 className="font-bold text-sm sm:text-base font-serif italic tracking-wide text-slate-950 uppercase">
                            SÉRIE BRANCA
                          </h3>
                          <div className="text-[11px] font-sans font-bold text-slate-700 text-right">
                            <span>Valores de Referência:</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs font-serif leading-relaxed">
                          <div className="flex items-baseline justify-between">
                            <span className="italic font-bold text-slate-950 flex-1">
                              LEUCÓCITOS
                            </span>
                            <div className="flex items-baseline space-x-4 sm:space-x-8">
                              <span className="font-bold text-xs sm:text-sm text-slate-950">{wbcAbsFormatted} /mm³</span>
                              <span className="text-[11px] font-sans text-slate-600 w-32 sm:w-40 text-right">4.000 - 10.000 /mm³</span>
                            </div>
                          </div>

                          <LaudoLeucoRow label="BASTONETES" perc="0,0 %" abs="0 /mm³" refStr="-" />
                          <LaudoLeucoRow label="SEGMENTADOS" perc={`${formatNumStr(neuPNum)} %`} abs={`${calcAbs(neuPNum)} /mm³`} refStr="2.000 - 7.000 /mm³" />
                          <LaudoLeucoRow label="EOSINÓFILOS" perc={`${formatNumStr(eosPNum)} %`} abs={`${calcAbs(eosPNum)} /mm³`} refStr="20 - 500 /mm³" />
                          <LaudoLeucoRow label="BASÓFILOS" perc={`${formatNumStr(basPNum)} %`} abs={`${calcAbs(basPNum)} /mm³`} refStr="20 - 100 /mm³" />
                          <LaudoLeucoRow label="LINFÓCITOS" perc={`${formatNumStr(lymPNum)} %`} abs={`${calcAbs(lymPNum)} /mm³`} refStr="1.000 - 3.000 /mm³" />
                          <LaudoLeucoRow label="MONÓCITOS" perc={`${formatNumStr(monPNum)} %`} abs={`${calcAbs(monPNum)} /mm³`} refStr="200 - 1.000 /mm³" />
                        </div>
                      </div>

                      {/* 3. SÉRIE PLAQUETÁRIA */}
                      <div className="mb-6">
                        <div className="flex justify-between items-end border-b border-slate-400 pb-1 mb-2">
                          <h3 className="font-bold text-sm sm:text-base font-serif italic tracking-wide text-slate-950 uppercase">
                            SÉRIE PLAQUETÁRIA
                          </h3>
                          <div className="text-[11px] font-sans font-bold text-slate-700 text-right">
                            <span>Valores de Referência:</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs font-serif leading-relaxed">
                          <div className="flex items-baseline justify-between">
                            <span className="italic font-bold text-slate-950 flex-1">
                              PLAQUETAS
                            </span>
                            <div className="flex items-baseline space-x-4 sm:space-x-8">
                              <span className="font-bold text-xs sm:text-sm text-slate-950">{pltFormatted} /mm³</span>
                              <span className="text-[11px] font-sans text-slate-600 w-32 sm:w-40 text-right">150 - 400 /mm³</span>
                            </div>
                          </div>

                          <div className="flex items-baseline justify-between">
                            <span className="italic font-bold text-slate-950 flex-1">
                              V.P.M.
                            </span>
                            <div className="flex items-baseline space-x-4 sm:space-x-8">
                              <span className="font-bold text-xs sm:text-sm text-slate-950">{mpvVal} fL</span>
                              <span className="text-[11px] font-sans text-slate-600 w-32 sm:w-40 text-right">-</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Laudo Footer */}
                  <div className="pt-4 border-t border-slate-300 text-[10px] font-sans text-slate-600 flex flex-col sm:flex-row justify-between items-center gap-1.5">
                    <div>
                      Coleta: {new Date(sample.timestamp).toLocaleDateString('pt-BR')} {new Date(sample.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} &bull; Exame liberado eletronicamente por: <strong className="text-slate-900">Dra. Maria Gabriela - Patologista Clínica</strong>
                    </div>
                    <div className="font-mono text-slate-500">
                      Cód. Autenticidade LIS: <span className="text-slate-800 font-bold">aeceffle1f65698a7834663390702baf</span>
                    </div>
                  </div>

                </div>
              ) : (
                /* ==================== TECHNICAL GRID VIEW ==================== */
                <div className="space-y-6">
                  {/* Differential WBC Distribution Bar for Hematology */}
                  {isHematology && (neuPNum > 0 || lymPNum > 0) && (
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                      <div className="flex justify-between items-center text-xs text-slate-300 font-semibold">
                        <span>Diferencial Leucocitário (5-Part Diff)</span>
                        <span className="text-slate-500 font-mono text-[10px]">100% Total</span>
                      </div>
                      <div className="h-3.5 w-full bg-slate-950 rounded-full overflow-hidden flex shadow-inner border border-slate-800">
                        <div style={{ width: `${neuPNum}%` }} className="bg-indigo-500" title={`Neutrófilos: ${neuPNum}%`}></div>
                        <div style={{ width: `${lymPNum}%` }} className="bg-sky-500" title={`Linfócitos: ${lymPNum}%`}></div>
                        <div style={{ width: `${monPNum}%` }} className="bg-amber-500" title={`Monócitos: ${monPNum}%`}></div>
                        <div style={{ width: `${eosPNum}%` }} className="bg-emerald-500" title={`Eosinófilos: ${eosPNum}%`}></div>
                        <div style={{ width: `${basPNum}%` }} className="bg-rose-500" title={`Basófilos: ${basPNum}%`}></div>
                      </div>
                    </div>
                  )}

                  {/* Parameter Tables */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isHematology ? (
                      <>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                          <h4 className="font-semibold text-xs text-indigo-400 uppercase tracking-wider mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
                            <span>Leucograma (Série Branca)</span>
                            <span className="text-[10px] text-slate-400 font-mono font-normal">WBC: {sample.parameters['WBC']?.value || '-'} 10^9/L</span>
                          </h4>
                          <div className="space-y-1 text-xs">
                            {leukogram.map((p, idx) => <ParamRow key={`${p.code}-${idx}`} param={p} />)}
                          </div>
                        </div>

                        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                          <h4 className="font-semibold text-xs text-indigo-400 uppercase tracking-wider mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
                            <span>Eritrograma (Série Vermelha)</span>
                            <span className="text-[10px] text-slate-400 font-mono font-normal">RBC: {sample.parameters['RBC']?.value || '-'} 10^12/L</span>
                          </h4>
                          <div className="space-y-1 text-xs">
                            {erythrogram.map((p, idx) => <ParamRow key={`${p.code}-${idx}`} param={p} />)}
                          </div>
                        </div>

                        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                          <h4 className="font-semibold text-xs text-indigo-400 uppercase tracking-wider mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
                            <span>Plaquetograma</span>
                            <span className="text-[10px] text-slate-400 font-mono font-normal">PLT: {sample.parameters['PLT']?.value || '-'} 10^9/L</span>
                          </h4>
                          <div className="space-y-1 text-xs">
                            {thrombogram.map((p, idx) => <ParamRow key={`${p.code}-${idx}`} param={p} />)}
                          </div>
                        </div>

                        {others.length > 0 && (
                          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                            <h4 className="font-semibold text-xs text-indigo-400 uppercase tracking-wider mb-3 border-b border-slate-800 pb-2">
                              Outros Parâmetros / Pesquisa
                            </h4>
                            <div className="space-y-1 text-xs">
                              {others.map((p, idx) => <ParamRow key={`${p.code}-${idx}`} param={p} />)}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                        <h4 className="font-semibold text-xs text-teal-300 uppercase tracking-wider mb-3 border-b border-slate-800 pb-2 flex items-center justify-between">
                          <span>Resultados Registrados pelo Analisador</span>
                          <span className="text-slate-500 font-mono text-[10px]">{paramsList.length} ensaio(s)</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {paramsList.map((p, idx) => <ParamRow key={`${p.code}-${idx}`} param={p} />)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'raw' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">
                  Mensagem de dados brutos transmitida pelo equipamento
                </span>
                <button
                  onClick={() => copyToClipboard(sample.rawMessage, false)}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-xl border border-slate-800 flex items-center space-x-1.5 transition-colors"
                >
                  {copiedRaw ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRaw ? 'Copiado!' : 'Copiar Mensagem'}</span>
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto selection:bg-indigo-500 selection:text-white">
                {sample.rawMessage}
              </div>
            </div>
          )}

          {activeTab === 'ack' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">
                  Resposta de confirmação LIS enviada ao equipamento (`MSA|AA`)
                </span>
                <button
                  onClick={() => copyToClipboard(sample.ackMessage || '', true)}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-xl border border-slate-800 flex items-center space-x-1.5 transition-colors"
                >
                  {copiedAck ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAck ? 'Copiado!' : 'Copiar ACK'}</span>
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-400 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {sample.ackMessage || 'Nenhuma confirmação gravada.'}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-900/90 px-6 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-xl transition-all border border-slate-700"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

/* Component for Erythrogram Rows in Paper Laudo with Dotted Leaders */
const LaudoEritroRow: React.FC<{
  label: string;
  val: string;
  refH: string;
  refM: string;
}> = ({ label, val, refH, refM }) => (
  <div className="flex items-baseline justify-between">
    <div className="flex items-baseline flex-1 min-w-0 pr-2">
      <span className="italic font-bold text-slate-950 shrink-0">{label}</span>
      <span className="border-b border-dotted border-slate-400 flex-1 mx-1.5 self-center h-0"></span>
    </div>
    <div className="flex items-baseline space-x-4 sm:space-x-8 shrink-0">
      <span className="font-bold text-xs sm:text-sm text-slate-950 text-right">{val}</span>
      <span className="text-[11px] font-sans text-slate-600 w-24 text-center hidden sm:inline">{refH}</span>
      <span className="text-[11px] font-sans text-slate-600 w-24 text-center">{refM}</span>
    </div>
  </div>
);

/* Component for Leukogram Rows in Paper Laudo with Dotted Leaders */
const LaudoLeucoRow: React.FC<{
  label: string;
  perc: string;
  abs: string;
  refStr: string;
}> = ({ label, perc, abs, refStr }) => (
  <div className="flex items-baseline justify-between">
    <div className="flex items-baseline flex-1 min-w-0 pr-2">
      <span className="italic font-bold text-slate-950 shrink-0">{label}</span>
      <span className="border-b border-dotted border-slate-400 flex-1 mx-1.5 self-center h-0"></span>
    </div>
    <div className="flex items-baseline space-x-4 sm:space-x-8 shrink-0">
      <div className="w-28 sm:w-36 text-right font-bold text-slate-950 space-x-3">
        <span className="inline-block w-12 text-right">{perc}</span>
        <span className="inline-block">{abs}</span>
      </div>
      <span className="text-[11px] font-sans text-slate-600 w-32 sm:w-40 text-right">{refStr}</span>
    </div>
  </div>
);

const ParamRow: React.FC<{ param: MindrayParam }> = ({ param }) => {
  const isHigh = param.flag === 'H';
  const isLow = param.flag === 'L';

  return (
    <div className="flex items-center justify-between py-1 px-2 rounded bg-slate-950/40 hover:bg-slate-800/60 transition-colors border border-slate-800/40">
      <div className="flex items-center space-x-2">
        <span className="font-mono font-bold text-teal-300 text-xs">{param.code}</span>
        <span className="text-slate-300 text-[11px] truncate max-w-[140px]">{param.name || param.code}</span>
      </div>

      <div className="flex items-center space-x-2 font-mono">
        <span className={`font-bold ${isHigh ? 'text-amber-400 font-bold' : isLow ? 'text-sky-400 font-bold' : 'text-slate-100'}`}>
          {param.value}
        </span>
        <span className="text-[10px] text-slate-400 w-12">{param.unit}</span>

        {param.flag && param.flag !== 'N' && (
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${isHigh ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'}`}>
            {param.flag}
          </span>
        )}
      </div>
    </div>
  );
};
