import React, { useState } from 'react';
import {
  Plus,
  QrCode,
  Copy,
  Sliders,
  CheckSquare,
  Square,
  Activity,
  Beaker,
  Zap,
  HeartPulse,
  Droplet,
  TestTube,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface CreateOrderTabProps {
  onOrderCreated?: () => void;
}

interface TestOption {
  code: string;
  name: string;
  category: 'Hematologia' | 'Bioquímica' | 'Eletrólitos' | 'Imunoensaio' | 'Coagulação' | 'Uroanálise';
  equipment: string;
  icon: any;
}

const ALL_AVAILABLE_TESTS: TestOption[] = [
  // Hematologia (Mindray) - Tubo Roxo
  { code: 'HEMOGRAMA', name: 'Hemograma Completo (5-Diff / CBC)', category: 'Hematologia', equipment: 'Mindray BC-5480', icon: Activity },
  
  // Bioquímica (URIT / Automação) - Tubo Amarelo
  { code: 'AMIL', name: 'Amilase (AMIL)', category: 'Bioquímica', equipment: 'URIT-8021A', icon: Beaker },
  { code: 'TGP/ALT', name: 'TGP / ALT (Transaminase)', category: 'Bioquímica', equipment: 'URIT-8021A', icon: Beaker },
  { code: 'TGO/AST', name: 'TGO / AST (Transaminase)', category: 'Bioquímica', equipment: 'URIT-8021A', icon: Beaker },
  { code: 'CREAT', name: 'Creatinina', category: 'Bioquímica', equipment: 'URIT-8021A', icon: Beaker },
  { code: 'UREIA', name: 'Ureia', category: 'Bioquímica', equipment: 'URIT-8021A', icon: Beaker },
  { code: 'GLI', name: 'Glicose', category: 'Bioquímica', equipment: 'URIT-8021A', icon: Beaker },
  { code: 'PTT', name: 'Proteínas Totais', category: 'Bioquímica', equipment: 'URIT-8021A', icon: Beaker },
  { code: 'ALB', name: 'Albumina', category: 'Bioquímica', equipment: 'URIT-8021A', icon: Beaker },
  { code: 'COL', name: 'Colesterol Total', category: 'Bioquímica', equipment: 'URIT-8021A', icon: Beaker },
  { code: 'TRI', name: 'Triglicérides', category: 'Bioquímica', equipment: 'URIT-8021A', icon: Beaker },

  // Eletrólitos & Gasometria (Maxion) - Tubo Amarelo (compartilhado com Bioquímica)
  { code: 'NA', name: 'Sódio (Na+)', category: 'Eletrólitos', equipment: 'Maxion Eletrólitos', icon: Zap },
  { code: 'K', name: 'Potássio (K+)', category: 'Eletrólitos', equipment: 'Maxion Eletrólitos', icon: Zap },
  { code: 'CL', name: 'Cloreto (Cl-)', category: 'Eletrólitos', equipment: 'Maxion Eletrólitos', icon: Zap },
  { code: 'ICA', name: 'Cálcio Iônico (iCa++)', category: 'Eletrólitos', equipment: 'Maxion Eletrólitos', icon: Zap },

  // Imunoensaio & POCT (Finecare) - Tubo Vermelho
  { code: 'CRP', name: 'Proteína C Reativa (PCR/CRP)', category: 'Imunoensaio', equipment: 'Finecare FIA', icon: HeartPulse },
  { code: 'PCT', name: 'Procalcitonina (PCT)', category: 'Imunoensaio', equipment: 'Finecare FIA', icon: HeartPulse },
  { code: 'TROP', name: 'Troponina I (TnI)', category: 'Imunoensaio', equipment: 'Finecare FIA', icon: HeartPulse },
  { code: 'D-DIMER', name: 'D-Dímero', category: 'Imunoensaio', equipment: 'Finecare FIA', icon: HeartPulse },
  { code: 'HBA1C', name: 'Hemoglobina Glicada (HbA1c)', category: 'Imunoensaio', equipment: 'Finecare FIA', icon: HeartPulse },

  // Coagulação (Maxcoag) - Tubo Azul
  { code: 'TP', name: 'Tempo de Protrombina (TP / INR)', category: 'Coagulação', equipment: 'Maxcoag', icon: Droplet },
  { code: 'TTPA', name: 'TTPA (Tromboplastina)', category: 'Coagulação', equipment: 'Maxcoag', icon: Droplet },
  { code: 'FIB', name: 'Fibrinogênio', category: 'Coagulação', equipment: 'Maxcoag', icon: Droplet },

  // Uroanálise (Wama) - Tubo Urina
  { code: 'LEU', name: 'Leucócitos (Urina)', category: 'Uroanálise', equipment: 'Wama Urina', icon: TestTube },
  { code: 'NIT', name: 'Nitrito (Urina)', category: 'Uroanálise', equipment: 'Wama Urina', icon: TestTube },
  { code: 'PRO', name: 'Proteína (Urina)', category: 'Uroanálise', equipment: 'Wama Urina', icon: TestTube },
  { code: 'GLU', name: 'Glicose (Urina)', category: 'Uroanálise', equipment: 'Wama Urina', icon: TestTube }
];

export const CreateOrderTab: React.FC<CreateOrderTabProps> = ({ onOrderCreated }) => {
  // Patient Info State
  const [patientId, setPatientId] = useState<string>('P-5541');
  const [patientName, setPatientName] = useState<string>('Ana Paula Silva');
  const [gender, setGender] = useState<'M' | 'F' | 'O'>('F');
  const [age, setAge] = useState<string>('32a');

  // Tube Colors Sample IDs Map
  const [tubeIds, setTubeIds] = useState<{
    purple: string;
    yellow: string;
    blue: string;
    red: string;
    urine: string;
  }>({
    purple: '123',
    yellow: '1234',
    blue: '1235',
    red: '1236',
    urine: '1237'
  });

  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleTubeIdChange = (key: keyof typeof tubeIds, value: string) => {
    setTubeIds(prev => ({ ...prev, [key]: value }));
  };

  const handleCopyYellowToAll = () => {
    const val = tubeIds.yellow || '1234';
    setTubeIds({
      purple: val,
      yellow: val,
      blue: val,
      red: val,
      urine: val
    });
  };

  const handleToggleTest = (code: string) => {
    setSelectedTests(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleSelectAll = () => {
    setSelectedTests(ALL_AVAILABLE_TESTS.map(t => t.code));
  };

  const handleDeselectAll = () => {
    setSelectedTests([]);
  };

  const handleSelectCategory = (category: string) => {
    const categoryCodes = ALL_AVAILABLE_TESTS.filter(t => t.category === category).map(t => t.code);
    const allSelected = categoryCodes.every(c => selectedTests.includes(c));

    if (allSelected) {
      setSelectedTests(prev => prev.filter(c => !categoryCodes.includes(c)));
    } else {
      setSelectedTests(prev => Array.from(new Set([...prev, ...categoryCodes])));
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTests.length === 0) {
      alert('Atenção: Selecione ao menos um exame para cadastrar a ordem no LIS.');
      return;
    }

    const tubeOrdersMap = new Map<string, { tests: string[]; tubeTypeLabel: string }>();

    selectedTests.forEach(testCode => {
      const testDef = ALL_AVAILABLE_TESTS.find(t => t.code === testCode);
      if (!testDef) return;

      let targetTubeId = tubeIds.yellow.trim() || '1234';
      let tubeLabel = 'Tubo Amarelo (Bioquímica & Eletrólitos)';

      if (testDef.category === 'Hematologia') {
        targetTubeId = tubeIds.purple.trim() || '123';
        tubeLabel = 'Tubo Roxo (Hematologia)';
      } else if (testDef.category === 'Bioquímica' || testDef.category === 'Eletrólitos') {
        targetTubeId = tubeIds.yellow.trim() || '1234';
        tubeLabel = 'Tubo Amarelo (Bioquímica & Eletrólitos)';
      } else if (testDef.category === 'Coagulação') {
        targetTubeId = tubeIds.blue.trim() || '1235';
        tubeLabel = 'Tubo Azul (Coagulação)';
      } else if (testDef.category === 'Imunoensaio') {
        targetTubeId = tubeIds.red.trim() || '1236';
        tubeLabel = 'Tubo Vermelho (Imunoensaio)';
      } else if (testDef.category === 'Uroanálise') {
        targetTubeId = tubeIds.urine.trim() || '1237';
        tubeLabel = 'Coletor Urina';
      }

      if (!tubeOrdersMap.has(targetTubeId)) {
        tubeOrdersMap.set(targetTubeId, { tests: [], tubeTypeLabel: tubeLabel });
      }
      tubeOrdersMap.get(targetTubeId)!.tests.push(testCode);
    });

    setSubmitting(true);
    setSuccessMessage(null);
    try {
      const pid = patientId.trim() || `P-${Math.floor(1000 + Math.random() * 9000)}`;
      const pname = patientName.trim() || 'Paciente Desconhecido';

      for (const [sid, group] of tubeOrdersMap.entries()) {
        await fetch('/api/worklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sampleId: sid,
            patientId: pid,
            patientName: pname,
            gender,
            age,
            tests: group.tests,
            analyzerModel: group.tubeTypeLabel
          })
        });
      }

      setSuccessMessage(`✅ Pedido(s) cadastrado(s) com sucesso no LIS para ${pname}!`);
      setSelectedTests([]);

      if (onOrderCreated) {
        setTimeout(() => {
          onOrderCreated();
        }, 1200);
      }
    } catch (err) {
      alert('Erro ao cadastrar ordem(ns) no LIS.');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = Array.from(new Set(ALL_AVAILABLE_TESTS.map(t => t.category)));
  const selectedCategories = Array.from(
    new Set(
      selectedTests
        .map(code => ALL_AVAILABLE_TESTS.find(t => t.code === code)?.category)
        .filter(Boolean) as string[]
    )
  );

  return (
    <div className="space-y-6 font-sans">
      {successMessage && (
        <div className="bg-emerald-950/80 border border-emerald-500/80 text-emerald-200 p-4 rounded-2xl flex items-center justify-between shadow-xl animate-in fade-in">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold text-xs sm:text-sm">{successMessage}</span>
          </div>
          {onOrderCreated && (
            <button
              onClick={onOrderCreated}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 shrink-0 ml-2"
            >
              <span>Ver Ordens Cadastradas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* FORMULÁRIO DE CADASTRO MANUAL DA ORDEM */}
      <form onSubmit={handleCreateOrder} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Novo Pedido de Exames (Cadastro Manual)
              </h3>
              <p className="text-xs text-slate-400">
                Informe os dados do paciente, defina o código de barras dos tubos e escolha os exames solicitados
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 font-semibold bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            {selectedTests.length} exame(s) selecionado(s)
          </span>
        </div>

        {/* Patient Info Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">ID do Paciente:</label>
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
              placeholder="Ex: P-5541"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-slate-400 mb-1 font-semibold">Nome Completo do Paciente:</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-sans text-sm focus:outline-none focus:border-indigo-500"
              placeholder="Ex: Ana Paula Silva"
            />
          </div>

          <div className="flex gap-2">
            <div className="w-1/2">
              <label className="block text-slate-400 mb-1 font-semibold">Gênero:</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-white font-sans text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="F">Fem (F)</option>
                <option value="M">Masc (M)</option>
                <option value="O">Outro (O)</option>
              </select>
            </div>
            <div className="w-1/2">
              <label className="block text-slate-400 mb-1 font-semibold">Idade:</label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                placeholder="32a"
              />
            </div>
          </div>
        </div>

        {/* TUBE CARDS SECTION (CÓDIGO DE BARRAS POR COR DE TUBO) */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <QrCode className="w-4 h-4 text-amber-400" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-amber-400">
                Identificação do Código de Barras (ID do Tubo por Cor)
              </h4>
            </div>
            <button
              type="button"
              onClick={handleCopyYellowToAll}
              className="text-[11px] text-slate-400 hover:text-white flex items-center space-x-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 transition-colors"
              title="Copiar mesmo ID para todos os tubos"
            >
              <Copy className="w-3 h-3 text-amber-400" />
              <span>Usar ID Amarelo ({tubeIds.yellow}) em todos</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* 1. Tubo Roxo (Hematologia) */}
            <div className={`p-3 rounded-xl border transition-all ${
              selectedCategories.includes('Hematologia')
                ? 'bg-purple-950/40 border-purple-500/80 shadow-lg shadow-purple-500/10'
                : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-purple-500 shadow-sm shadow-purple-500" />
                <span className="font-bold text-xs text-purple-300">Tubo Roxo (EDTA)</span>
              </div>
              <p className="text-[10px] text-slate-400 mb-2">Hematologia (Hemograma)</p>
              <input
                type="text"
                value={tubeIds.purple}
                onChange={(e) => handleTubeIdChange('purple', e.target.value)}
                placeholder="Ex: 123"
                className="w-full bg-slate-900 border border-purple-900/60 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* 2. Tubo Amarelo (Bioquímica & Eletrólitos) */}
            <div className={`p-3 rounded-xl border transition-all ${
              selectedCategories.includes('Bioquímica') || selectedCategories.includes('Eletrólitos')
                ? 'bg-amber-950/40 border-amber-500/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
                  <span className="font-bold text-xs text-amber-300">Tubo Amarelo (Gel/Soro)</span>
                </div>
              </div>
              <p className="text-[10px] text-amber-400/90 font-medium mb-2">
                ⭐ Bioquímica e Eletrólitos
              </p>
              <input
                type="text"
                value={tubeIds.yellow}
                onChange={(e) => handleTubeIdChange('yellow', e.target.value)}
                placeholder="Ex: 1234"
                className="w-full bg-slate-900 border border-amber-900/60 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* 3. Tubo Azul (Coagulação) */}
            <div className={`p-3 rounded-xl border transition-all ${
              selectedCategories.includes('Coagulação')
                ? 'bg-sky-950/40 border-sky-500/80 shadow-lg shadow-sky-500/10'
                : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-sky-400 shadow-sm shadow-sky-400" />
                <span className="font-bold text-xs text-sky-300">Tubo Azul (Citrato)</span>
              </div>
              <p className="text-[10px] text-slate-400 mb-2">Coagulação (TP/TTPA)</p>
              <input
                type="text"
                value={tubeIds.blue}
                onChange={(e) => handleTubeIdChange('blue', e.target.value)}
                placeholder="Ex: 1235"
                className="w-full bg-slate-900 border border-sky-900/60 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* 4. Tubo Vermelho (Imunoensaio / POCT) */}
            <div className={`p-3 rounded-xl border transition-all ${
              selectedCategories.includes('Imunoensaio')
                ? 'bg-rose-950/40 border-rose-500/80 shadow-lg shadow-rose-500/10'
                : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500" />
                <span className="font-bold text-xs text-rose-300">Tubo Vermelho / POCT</span>
              </div>
              <p className="text-[10px] text-slate-400 mb-2">Imunoensaio (PCR/Troponina)</p>
              <input
                type="text"
                value={tubeIds.red}
                onChange={(e) => handleTubeIdChange('red', e.target.value)}
                placeholder="Ex: 1236"
                className="w-full bg-slate-900 border border-rose-900/60 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* 5. Coletor Urina */}
            <div className={`p-3 rounded-xl border transition-all ${
              selectedCategories.includes('Uroanálise')
                ? 'bg-teal-950/40 border-teal-500/80 shadow-lg shadow-teal-500/10'
                : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-teal-400 shadow-sm shadow-teal-400" />
                <span className="font-bold text-xs text-teal-300">Coletor de Urina</span>
              </div>
              <p className="text-[10px] text-slate-400 mb-2">Uroanálise (EAS)</p>
              <input
                type="text"
                value={tubeIds.urine}
                onChange={(e) => handleTubeIdChange('urine', e.target.value)}
                placeholder="Ex: 1237"
                className="w-full bg-slate-900 border border-teal-900/60 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* SELEÇÃO DE EXAMES */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-teal-400" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-teal-400">
                Selecione os Exames Desejados
              </h4>
            </div>

            <div className="flex items-center space-x-2 text-[11px]">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-0.5 rounded bg-slate-950 border border-slate-800"
              >
                Marcar Todos
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-slate-400 hover:text-slate-300 font-semibold px-2 py-0.5 rounded bg-slate-950 border border-slate-800"
              >
                Desmarcar Todos
              </button>
            </div>
          </div>

          {/* Grouped Test Checkboxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => {
              const catTests = ALL_AVAILABLE_TESTS.filter(t => t.category === cat);
              const allCatSelected = catTests.every(t => selectedTests.includes(t.code));

              let categoryTubeId = tubeIds.yellow;
              let tubeBadgeText = '🟡 Tubo Amarelo (Bioquímica & Eletrólitos)';
              let tubeBadgeColor = 'text-amber-400 border-amber-500/30 bg-amber-950/40';

              if (cat === 'Hematologia') {
                categoryTubeId = tubeIds.purple;
                tubeBadgeText = '🟣 Tubo Roxo (Hemato)';
                tubeBadgeColor = 'text-purple-400 border-purple-500/30 bg-purple-950/40';
              } else if (cat === 'Bioquímica' || cat === 'Eletrólitos') {
                categoryTubeId = tubeIds.yellow;
                tubeBadgeText = '🟡 Tubo Amarelo (Gel)';
                tubeBadgeColor = 'text-amber-400 border-amber-500/30 bg-amber-950/40';
              } else if (cat === 'Coagulação') {
                categoryTubeId = tubeIds.blue;
                tubeBadgeText = '🔵 Tubo Azul (Citrato)';
                tubeBadgeColor = 'text-sky-400 border-sky-500/30 bg-sky-950/40';
              } else if (cat === 'Imunoensaio') {
                categoryTubeId = tubeIds.red;
                tubeBadgeText = '🔴 Tubo Vermelho (POCT)';
                tubeBadgeColor = 'text-rose-400 border-rose-500/30 bg-rose-950/40';
              } else if (cat === 'Uroanálise') {
                categoryTubeId = tubeIds.urine;
                tubeBadgeText = '🟡 Coletor Urina';
                tubeBadgeColor = 'text-teal-400 border-teal-500/30 bg-teal-950/40';
              }

              return (
                <div key={cat} className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                    <div>
                      <span className="font-bold text-xs text-slate-200 block">{cat}</span>
                      <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border inline-block mt-0.5 ${tubeBadgeColor}`}>
                        {tubeBadgeText}: ID #{categoryTubeId}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectCategory(cat)}
                      className="text-[10px] text-teal-400 hover:underline shrink-0"
                    >
                      {allCatSelected ? 'Desmarcar' : 'Marcar grupo'}
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {catTests.map(test => {
                      const isChecked = selectedTests.includes(test.code);
                      return (
                        <label
                          key={test.code}
                          onClick={() => handleToggleTest(test.code)}
                          className={`flex items-center justify-between p-1.5 rounded-lg border text-xs cursor-pointer transition-all select-none ${
                            isChecked
                              ? 'bg-indigo-600/20 border-indigo-500/80 text-white'
                              : 'bg-slate-900/60 border-slate-800/60 text-slate-400 hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600 shrink-0" />
                            )}
                            <span className="font-mono font-bold text-[11px] text-slate-200">{test.code}</span>
                            <span className="text-[10px] text-slate-400 truncate">{test.name.replace(/ *\([^)]*\) */g, '')}</span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-500 shrink-0 ml-1">
                            {test.equipment.split(' ')[0]}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Order Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-400 font-mono">
            {selectedTests.length > 0 ? (
              <span className="text-emerald-400">
                ✓ Pronto para cadastrar ordens no LIS para o paciente {patientName}
              </span>
            ) : (
              <span>Selecione os exames acima e clique para cadastrar</span>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || selectedTests.length === 0}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Pedido(s) no LIS</span>
          </button>
        </div>
      </form>
    </div>
  );
};
