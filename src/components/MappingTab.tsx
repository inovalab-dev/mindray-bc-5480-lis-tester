import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  Check, 
  X, 
  Zap, 
  Download, 
  Upload, 
  Filter, 
  Beaker, 
  Info,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { CodeMapping, TranslationResult } from '../types';

export const MappingTab: React.FC = () => {
  const [mappings, setMappings] = useState<CodeMapping[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFamily, setSelectedFamily] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingMapping, setEditingMapping] = useState<CodeMapping | null>(null);
  
  // Form Fields
  const [mappingMode, setMappingMode] = useState<'SINGLE' | 'PROFILE'>('SINGLE');
  const [profileParentCode, setProfileParentCode] = useState<string>('');
  const [profileParentName, setProfileParentName] = useState<string>('');
  const [profileItems, setProfileItems] = useState<{ equipmentCode: string; lisCode: string; name: string; unit: string }[]>([
    { equipmentCode: 'BD', lisCode: 'BILI_DIRETA', name: 'Bilirrubina Direta', unit: 'mg/dL' },
    { equipmentCode: 'BT', lisCode: 'BILI_TOTAL', name: 'Bilirrubina Total', unit: 'mg/dL' }
  ]);

  const [formData, setFormData] = useState<Partial<CodeMapping>>({
    equipmentFamily: 'MINDRAY',
    lisCode: '',
    lisName: '',
    equipmentCode: '',
    equipmentName: '',
    direction: 'BIDIRECTIONAL',
    unit: '',
    referenceRange: '',
    enabled: true,
    parentCode: '',
    notes: ''
  });

  // Test Translation State
  const [testCode, setTestCode] = useState<string>('00002');
  const [testSource, setTestSource] = useState<'LIS' | 'EQUIPMENT'>('LIS');
  const [testFamily, setTestFamily] = useState<string>('MINDRAY');
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);

  // Fetch Mappings
  const fetchMappings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mappings${selectedFamily !== 'ALL' ? `?family=${selectedFamily}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setMappings(data.mappings || []);
      }
    } catch (err) {
      console.error('Erro ao buscar tabela De/Para:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, [selectedFamily]);

  // Test translation whenever test inputs change
  useEffect(() => {
    if (!testCode.trim()) {
      setTranslationResult(null);
      return;
    }

    const runTest = async () => {
      try {
        const res = await fetch('/api/mappings/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: testCode.trim(),
            source: testSource,
            family: testFamily
          })
        });
        if (res.ok) {
          const data: TranslationResult = await res.json();
          setTranslationResult(data);
        }
      } catch (err) {
        console.error('Erro ao testar tradução:', err);
      }
    };

    const timer = setTimeout(runTest, 200);
    return () => clearTimeout(timer);
  }, [testCode, testSource, testFamily, mappings]);

  // Save (Create or Update)
  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingMapping && mappingMode === 'PROFILE') {
      if (!profileParentCode.trim()) {
        alert('Por favor, informe o Código Pai do perfil no LIS (Ex: BILI).');
        return;
      }
      if (profileItems.length === 0) {
        alert('Adicione pelo menos 1 parâmetro de teste na lista de de/para.');
        return;
      }
      for (const item of profileItems) {
        if (!item.equipmentCode.trim() || !item.lisCode.trim()) {
          alert('Todos os itens da lista devem ter Código do Equipamento e Código LIS.');
          return;
        }
      }

      const payload = profileItems.map(item => ({
        equipmentFamily: formData.equipmentFamily || 'ALL',
        parentCode: profileParentCode.trim().toUpperCase(),
        lisCode: item.lisCode.trim().toUpperCase(),
        lisName: item.name ? `${profileParentName ? profileParentName + ' - ' : ''}${item.name}` : profileParentName || item.lisCode,
        equipmentCode: item.equipmentCode.trim().toUpperCase(),
        equipmentName: item.name || item.equipmentCode,
        direction: formData.direction || 'BIDIRECTIONAL',
        unit: item.unit || formData.unit || '',
        referenceRange: formData.referenceRange || '',
        enabled: true,
        notes: formData.notes || `Perfil Pai: ${profileParentCode.trim().toUpperCase()}`
      }));

      try {
        const res = await fetch('/api/mappings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          setIsModalOpen(false);
          setEditingMapping(null);
          resetForm();
          fetchMappings();
        } else {
          const errData = await res.json();
          alert(errData.error || 'Erro ao salvar perfil de mapeamento.');
        }
      } catch (err) {
        alert('Erro ao conectar ao servidor para salvar perfil.');
      }
      return;
    }

    if (!formData.lisCode || !formData.equipmentCode) {
      alert('Por favor, informe os códigos do LIS e do Equipamento.');
      return;
    }

    try {
      const url = editingMapping ? `/api/mappings/${editingMapping.id}` : '/api/mappings';
      const method = editingMapping ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingMapping(null);
        resetForm();
        fetchMappings();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Erro ao salvar mapeamento.');
      }
    } catch (err) {
      alert('Erro ao conectar ao servidor para salvar mapeamento.');
    }
  };

  // Toggle Active/Inactive
  const handleToggleEnabled = async (mapping: CodeMapping) => {
    try {
      const res = await fetch(`/api/mappings/${mapping.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !mapping.enabled })
      });
      if (res.ok) {
        fetchMappings();
      }
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  };

  // Delete Mapping
  const handleDeleteMapping = async (id: string) => {
    if (!confirm('Deseja realmente remover esta regra de De/Para?')) return;
    try {
      const res = await fetch(`/api/mappings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMappings();
      }
    } catch (err) {
      alert('Erro ao excluir regra de De/Para.');
    }
  };

  // Reset to Defaults
  const handleResetDefaults = async () => {
    if (!confirm('Deseja restaurar a tabela De/Para com as regras de fábrica do sistema?')) return;
    try {
      const res = await fetch('/api/mappings/reset', { method: 'POST' });
      if (res.ok) {
        fetchMappings();
      }
    } catch (err) {
      alert('Erro ao restaurar padrões.');
    }
  };

  const openCreateModal = () => {
    setEditingMapping(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (m: CodeMapping) => {
    setEditingMapping(m);
    setMappingMode('SINGLE');
    setFormData({
      equipmentFamily: m.equipmentFamily,
      lisCode: m.lisCode,
      lisName: m.lisName,
      equipmentCode: m.equipmentCode,
      equipmentName: m.equipmentName || '',
      direction: m.direction,
      unit: m.unit || '',
      referenceRange: m.referenceRange || '',
      enabled: m.enabled,
      parentCode: m.parentCode || '',
      notes: m.notes || ''
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setMappingMode('SINGLE');
    setProfileParentCode('');
    setProfileParentName('');
    setProfileItems([
      { equipmentCode: 'BD', lisCode: 'BILI_DIRETA', name: 'Bilirrubina Direta', unit: 'mg/dL' },
      { equipmentCode: 'BT', lisCode: 'BILI_TOTAL', name: 'Bilirrubina Total', unit: 'mg/dL' }
    ]);
    setFormData({
      equipmentFamily: 'MINDRAY',
      lisCode: '',
      lisName: '',
      equipmentCode: '',
      equipmentName: '',
      direction: 'BIDIRECTIONAL',
      unit: '',
      referenceRange: '',
      enabled: true,
      parentCode: '',
      notes: ''
    });
  };

  // Filtered Mappings for display
  const filteredMappings = mappings.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.lisCode.toLowerCase().includes(q) ||
      m.lisName.toLowerCase().includes(q) ||
      m.equipmentCode.toLowerCase().includes(q) ||
      (m.equipmentName || '').toLowerCase().includes(q) ||
      m.equipmentFamily.toLowerCase().includes(q)
    );
  });

  // Export JSON
  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mappings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `tabela_depara_lablink_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* HEADER HERO CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
            <ArrowLeftRight className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Tabela de Mapeamento "De/Para" de Exames & Parâmetros</span>
              <span className="text-[10px] bg-indigo-950 text-indigo-400 font-mono px-2 py-0.5 rounded-full border border-indigo-800">Tradução LIS ↔ Equipamento</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Configuração central de tradução de códigos entre o <strong>LIS</strong> (sistema do laboratório) e os <strong>Equipamentos de Diagnóstico</strong> (Mindray, URIT, Maxion, MaxCoag, Wama, Finecare).
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={openCreateModal}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar De/Para</span>
          </button>
          
          <button
            onClick={handleResetDefaults}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center space-x-1.5 border border-slate-700"
            title="Restaurar padrão de fábrica"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restaurar Padrões</span>
          </button>

          <button
            onClick={handleExportJson}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs px-3 py-2.5 rounded-xl transition-all border border-slate-700"
            title="Exportar JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* LIVE INTERACTIVE TEST PLAYGROUND CARD */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white">Testador em Tempo Real de Tradução "De/Para"</h3>
          </div>
          <span className="text-[11px] text-slate-400">Verifique instantaneamente o código traduzido</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Direção da Consulta
            </label>
            <select
              value={testSource}
              onChange={(e) => setTestSource(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="LIS">LIS → Equipamento (Envio / Worklist)</option>
              <option value="EQUIPMENT">Equipamento → LIS (Recepção / Resultados)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Família / Protocolo
            </label>
            <select
              value={testFamily}
              onChange={(e) => setTestFamily(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="MINDRAY">Mindray BC-5480 (Hematologia)</option>
              <option value="URIT">URIT-8021A (Bioquímica)</option>
              <option value="MAXION">Maxion (Eletrólitos ISE)</option>
              <option value="MAXCOAG">MaxCoag (Coagulação)</option>
              <option value="FINECARE">Finecare Wondfo (POCT)</option>
              <option value="ALL">Todas as Famílias</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Código de Entrada ({testSource === 'LIS' ? 'Código LIS' : 'Código Equipamento'})
            </label>
            <input
              type="text"
              value={testCode}
              onChange={(e) => setTestCode(e.target.value)}
              placeholder={testSource === 'LIS' ? "Ex: 00002, CREAT, GLI, NA" : "Ex: CBC+DIFF, 110, 001, SOD"}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">Código Traduzido:</span>
              <span className="text-sm font-bold font-mono text-emerald-400">
                {translationResult?.translatedCode || testCode || '-'}
              </span>
            </div>
            {translationResult?.mappingApplied ? (
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-medium">
                Regra #{translationResult.mappingApplied.id}
              </span>
            ) : (
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-medium">
                Sem Regra (Mantido)
              </span>
            )}
          </div>
        </div>

        {translationResult?.mappingApplied && (
          <div className="mt-3 p-2.5 bg-emerald-950/30 border border-emerald-900/50 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Regra Encontrada:</strong> LIS "<code>{translationResult.mappingApplied.lisCode}</code>" ({translationResult.mappingApplied.lisName}) 
                <ArrowRight className="w-3 h-3 inline mx-1.5" /> 
                Equipamento "<code>{translationResult.mappingApplied.equipmentCode}</code>" ({translationResult.mappingApplied.equipmentName || 'Sem nome especificado'})
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400/80">
              {translationResult.mappingApplied.unit ? `Unidade: ${translationResult.mappingApplied.unit}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* FILTER BAR & SEARCH */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Family Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1">
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'MINDRAY', label: 'Mindray' },
            { id: 'URIT', label: 'URIT Bioq' },
            { id: 'MAXION', label: 'Maxion ISE' },
            { id: 'MAXCOAG', label: 'MaxCoag' },
            { id: 'FINECARE', label: 'Finecare' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFamily(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedFamily === f.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por código, nome ou exames..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* TABLE OF DE/PARA MAPPINGS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Família / Equipamento</th>
                <th className="py-3 px-4">Código LIS</th>
                <th className="py-3 px-4">Nome Exame / LIS</th>
                <th className="py-3 px-4">Código Equipamento</th>
                <th className="py-3 px-4">Nome Equipamento</th>
                <th className="py-3 px-4">Direção</th>
                <th className="py-3 px-4">Unid / Ref</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Carregando mapeamentos De/Para...
                  </td>
                </tr>
              ) : filteredMappings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500">
                    Nenhum mapeamento De/Para encontrado para a busca.
                  </td>
                </tr>
              ) : (
                filteredMappings.map((m, idx) => (
                  <tr key={`${m.id}-${idx}`} className={`hover:bg-slate-800/40 transition-colors ${!m.enabled ? 'opacity-50 bg-slate-950/40' : ''}`}>
                    
                    {/* Status Toggle */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleEnabled(m)}
                        className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors ${
                          m.enabled ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'
                        }`}
                        title={m.enabled ? 'Ativo - Clique para desativar' : 'Inativo - Clique para ativar'}
                      >
                        <div className="w-3 h-3 bg-white rounded-full shadow-md" />
                      </button>
                    </td>

                    {/* Family */}
                    <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] border ${
                        m.equipmentFamily === 'MINDRAY' ? 'bg-purple-950/80 text-purple-300 border-purple-800' :
                        m.equipmentFamily === 'URIT' ? 'bg-amber-950/80 text-amber-300 border-amber-800' :
                        m.equipmentFamily === 'MAXION' ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800' :
                        m.equipmentFamily === 'MAXCOAG' ? 'bg-rose-950/80 text-rose-300 border-rose-800' :
                        'bg-indigo-950/80 text-indigo-300 border-indigo-800'
                      }`}>
                        {m.equipmentFamily}
                      </span>
                    </td>

                    {/* LIS Code */}
                    <td className="py-3 px-4 font-mono font-bold text-indigo-300 text-sm whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>{m.lisCode}</span>
                        {m.parentCode && (
                          <span className="text-[10px] font-sans font-medium mt-0.5 inline-flex items-center">
                            <span className="px-1.5 py-0.2 rounded bg-amber-950/90 text-amber-300 border border-amber-800/80 font-mono text-[9px]">Pai: {m.parentCode}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* LIS Name */}
                    <td className="py-3 px-4 text-slate-200 font-medium max-w-xs truncate">
                      {m.lisName}
                    </td>

                    {/* Equipment Code */}
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-sm whitespace-nowrap">
                      {m.equipmentCode}
                    </td>

                    {/* Equipment Name */}
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                      {m.equipmentName || '-'}
                    </td>

                    {/* Direction */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-mono">
                        {m.direction === 'BIDIRECTIONAL' ? '⇄ LIS ↔ EQ' : m.direction === 'LIS_TO_EQUIPMENT' ? '→ LIS → EQ' : '← EQ → LIS'}
                      </span>
                    </td>

                    {/* Unit / Ref */}
                    <td className="py-3 px-4 text-[11px] font-mono text-slate-400 whitespace-nowrap">
                      {m.unit ? `${m.unit}` : '-'} {m.referenceRange ? `(${m.referenceRange})` : ''}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => openEditModal(m)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
                          title="Editar regra"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteMapping(m.id)}
                          className="p-1.5 bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-400 rounded-lg transition-all"
                          title="Remover regra"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
                <span>{editingMapping ? 'Editar Mapeamento De/Para' : 'Novo Mapeamento De/Para'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode selector if creating new */}
            {!editingMapping && (
              <div className="flex border-b border-slate-800 bg-slate-950 p-1.5 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setMappingMode('SINGLE')}
                  className={`flex-1 py-2 px-3 rounded-xl font-medium transition-all ${
                    mappingMode === 'SINGLE'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  Exame Único (1 para 1)
                </button>
                <button
                  type="button"
                  onClick={() => setMappingMode('PROFILE')}
                  className={`flex-1 py-2 px-3 rounded-xl font-medium transition-all flex items-center justify-center space-x-1.5 ${
                    mappingMode === 'PROFILE'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Perfil / Grupo (Ex: Bilirrubinas, Lipídios)</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSaveMapping} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              
              {/* Equipment Family & Direction */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Família do Equipamento
                  </label>
                  <select
                    value={formData.equipmentFamily}
                    onChange={(e) => setFormData({ ...formData, equipmentFamily: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">ALL (Geral para Todos)</option>
                    <option value="MINDRAY">Mindray BC-5480 (Hematologia)</option>
                    <option value="URIT">URIT-8021A (Bioquímica)</option>
                    <option value="MAXION">Maxion (Eletrólitos ISE)</option>
                    <option value="MAXCOAG">MaxCoag (Coagulação)</option>
                    <option value="WAMA">Wama (Uroanálise)</option>
                    <option value="FINECARE">Finecare Wondfo (POCT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Direção da Tradução
                  </label>
                  <select
                    value={formData.direction}
                    onChange={(e) => setFormData({ ...formData, direction: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="BIDIRECTIONAL">Bidirecional (LIS ↔ Equipamento)</option>
                    <option value="LIS_TO_EQUIPMENT">LIS → Equipamento (Apenas Worklist)</option>
                    <option value="EQUIPMENT_TO_LIS">Equipamento → LIS (Apenas Resultados)</option>
                  </select>
                </div>
              </div>

              {/* IF PROFILE MODE */}
              {!editingMapping && mappingMode === 'PROFILE' ? (
                <div className="space-y-4 border-t border-slate-800/80 pt-3">
                  
                  {/* Parent Code & Name */}
                  <div className="grid grid-cols-2 gap-3 bg-indigo-950/30 border border-indigo-800/40 p-3 rounded-xl">
                    <div>
                      <label className="block text-indigo-300 font-bold mb-1">
                        Código Pai / Perfil no LIS <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={profileParentCode}
                        onChange={(e) => setProfileParentCode(e.target.value.toUpperCase())}
                        placeholder="Ex: BILI"
                        className="w-full bg-slate-950 border border-indigo-700/60 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-indigo-400 font-bold"
                      />
                      <span className="text-[10px] text-indigo-300/70 mt-1 block">Código pai recebido do LIS</span>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Nome / Descrição do Perfil
                      </label>
                      <input
                        type="text"
                        value={profileParentName}
                        onChange={(e) => setProfileParentName(e.target.value)}
                        placeholder="Ex: Bilirrubinas (Total e Direta)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Dynamic Items List */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-slate-300 font-bold flex items-center space-x-1.5">
                        <span>Lista de Parâmetros De/Para</span>
                        <span className="text-indigo-400 font-mono text-[11px]">({profileItems.length} itens)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setProfileItems([...profileItems, { equipmentCode: '', lisCode: profileParentCode || '', name: '', unit: 'mg/dL' }])}
                        className="text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-lg flex items-center space-x-1 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Parâmetro</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {profileItems.map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 relative group">
                          <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                            <span className="font-mono text-indigo-400 font-bold text-[11px]">
                              ITEM #{idx + 1}
                            </span>
                            {profileItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setProfileItems(profileItems.filter((_, i) => i !== idx))}
                                className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/50"
                                title="Remover item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-0.5">
                                cod Equipamento <span className="text-red-400">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={item.equipmentCode}
                                onChange={(e) => {
                                  const newItems = [...profileItems];
                                  newItems[idx].equipmentCode = e.target.value.toUpperCase();
                                  setProfileItems(newItems);
                                }}
                                placeholder="Ex: BD"
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500 uppercase"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-slate-400 mb-0.5">
                                cod LIS <span className="text-red-400">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={item.lisCode}
                                onChange={(e) => {
                                  const newItems = [...profileItems];
                                  newItems[idx].lisCode = e.target.value.toUpperCase();
                                  setProfileItems(newItems);
                                }}
                                placeholder="Ex: BILI_DIRETA"
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500 uppercase"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-slate-400 mb-0.5">Nome Parâmetro</label>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => {
                                  const newItems = [...profileItems];
                                  newItems[idx].name = e.target.value;
                                  setProfileItems(newItems);
                                }}
                                placeholder="Ex: Bilirrubina Direta"
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-slate-400 mb-0.5">Unidade</label>
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(e) => {
                                  const newItems = [...profileItems];
                                  newItems[idx].unit = e.target.value;
                                  setProfileItems(newItems);
                                }}
                                placeholder="Ex: mg/dL"
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                /* SINGLE ITEM MODE */
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">
                        Código no LIS <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.lisCode || ''}
                        onChange={(e) => setFormData({ ...formData, lisCode: e.target.value })}
                        placeholder="Ex: CREAT, 00002, GLI"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-medium mb-1">
                        Código no Equipamento <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.equipmentCode || ''}
                        onChange={(e) => setFormData({ ...formData, equipmentCode: e.target.value })}
                        placeholder="Ex: 110, CBC+DIFF, 001"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">
                        Código Pai (Perfil/Grupo)
                      </label>
                      <input
                        type="text"
                        value={formData.parentCode || ''}
                        onChange={(e) => setFormData({ ...formData, parentCode: e.target.value.toUpperCase() })}
                        placeholder="Ex: BILI (Opcional)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-300 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-medium mb-1">
                        Nome do Exame / LIS
                      </label>
                      <input
                        type="text"
                        value={formData.lisName || ''}
                        onChange={(e) => setFormData({ ...formData, lisName: e.target.value })}
                        placeholder="Ex: Creatinina Sérica"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-medium mb-1">
                        Nome no Equipamento
                      </label>
                      <input
                        type="text"
                        value={formData.equipmentName || ''}
                        onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
                        placeholder="Ex: Creatinina Enzymatic"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-medium mb-1">
                        Unidade de Medida
                      </label>
                      <input
                        type="text"
                        value={formData.unit || ''}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        placeholder="Ex: mg/dL, 10^9/L, mEq/L"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">
                      Intervalo de Referência Padrão
                    </label>
                    <input
                      type="text"
                      value={formData.referenceRange || ''}
                      onChange={(e) => setFormData({ ...formData, referenceRange: e.target.value })}
                      placeholder="Ex: 0.70 - 1.20"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Observações Técnicas
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Instruções ou detalhes do canal do equipamento..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                >
                  {editingMapping ? 'Atualizar Regra' : mappingMode === 'PROFILE' ? 'Salvar Lista De/Para' : 'Salvar Regra'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
