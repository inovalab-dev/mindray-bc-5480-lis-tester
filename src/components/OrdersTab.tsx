import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Check,
  Clock,
  CheckCircle,
  Trash2,
  RefreshCw,
  Search,
  FileText,
  Beaker,
  Activity,
  Zap,
  HeartPulse,
  Database,
  QrCode,
  Code,
  MessageSquare,
  X,
  Terminal,
  AlertTriangle,
  LayoutList,
  Table as TableIcon,
  Maximize2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { WorklistItem, MindraySampleResult } from '../types';

interface OrdersTabProps {
  onSelectSample: (sample: MindraySampleResult) => void;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({ onSelectSample }) => {
  // List of Orders from LIS Server
  const [orders, setOrders] = useState<WorklistItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PARTIAL' | 'COMPLETED'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // View mode state: 'table' (ultra-compact table), 'compact' (dense card rows), or 'detailed' (expanded cards)
  const [viewMode, setViewMode] = useState<'table' | 'compact' | 'detailed'>('table');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Modal States
  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState<WorklistItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [clearingFake, setClearingFake] = useState<boolean>(false);

  const handleClearFakeOrders = async () => {
    if (!window.confirm('Deseja remover todas as ordens fictícias/de contingência do banco de dados?')) return;
    setClearingFake(true);
    try {
      await fetch('/api/worklist/clear-fake', { method: 'POST' });
      await fetchWorklist();
    } catch (e) {
      console.error('Erro ao limpar ordens fictícias:', e);
    } finally {
      setClearingFake(false);
    }
  };

  const [viewMessagesOrder, setViewMessagesOrder] = useState<WorklistItem | null>(null);
  const [hl7PreviewData, setHl7PreviewData] = useState<{ mindrayHL7: string; uritHL7: string; relatedLogs: any[] } | null>(null);
  const [loadingHL7, setLoadingHL7] = useState<boolean>(false);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [activeMessageTab, setActiveMessageTab] = useState<'HL7_PREVIEW' | 'COMM_LOGS'>('HL7_PREVIEW');

  // Fetch Worklist Orders from Backend
  const fetchWorklist = async () => {
    try {
      const res = await fetch('/api/worklist');
      if (!res.ok) {
        console.error('Erro ao buscar ordens:', res.status, res.statusText);
        return;
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return;
      }
      const data = await res.json();
      if (data && data.worklist) {
        setOrders(data.worklist);
      }
    } catch (e) {
      console.error('Erro ao buscar ordens:', e);
    }
  };

  useEffect(() => {
    fetchWorklist();
    const interval = setInterval(fetchWorklist, 2000);
    return () => clearInterval(interval);
  }, []);

  // Toggle order expansion in compact/table views
  const toggleExpandOrder = (sampleId: string) => {
    setExpandedOrders(prev => ({ ...prev, [sampleId]: !prev[sampleId] }));
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (order: WorklistItem) => {
    setConfirmDeleteOrder(order);
  };

  // Confirm Delete Order
  const handleConfirmDelete = async () => {
    if (!confirmDeleteOrder) return;
    const sid = confirmDeleteOrder.sampleId;
    setDeleting(true);

    try {
      setOrders(prev => prev.filter(o => o.sampleId !== sid));
      await fetch(`/api/worklist/${encodeURIComponent(sid)}`, { method: 'DELETE' });
      await fetchWorklist();
    } catch (e) {
      console.error('Erro ao excluir ordem:', e);
    } finally {
      setDeleting(false);
      setConfirmDeleteOrder(null);
    }
  };

  // Open Messages Modal
  const handleOpenMessagesModal = async (order: WorklistItem) => {
    setViewMessagesOrder(order);
    setLoadingHL7(true);
    setHl7PreviewData(null);
    setActiveMessageTab('HL7_PREVIEW');

    try {
      const res = await fetch(`/api/worklist/${encodeURIComponent(order.sampleId)}/hl7-preview`);
      if (res.ok) {
        const data = await res.json();
        setHl7PreviewData({
          mindrayHL7: data.mindrayHL7 || '',
          uritHL7: data.uritHL7 || '',
          relatedLogs: data.relatedLogs || []
        });
      }
    } catch (e) {
      console.error('Erro ao buscar prévia de mensagens HL7:', e);
    } finally {
      setLoadingHL7(false);
    }
  };

  const handleCopyCode = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
  };

  // Helper to check if a specific requested test is fulfilled in result parameters
  const isTestFulfilled = (testCode: string, resultParams?: Record<string, any>) => {
    if (!resultParams) return false;
    const keys = Object.keys(resultParams).map(k => k.toUpperCase());
    const tc = testCode.toUpperCase();

    if (tc === 'HEMOGRAMA') {
      return keys.some(k => ['WBC', 'RBC', 'HGB', 'HCT', 'PLT'].includes(k));
    }
    return keys.some(k => k.includes(tc) || tc.includes(k));
  };

  // Filter Orders
  const filteredOrders = orders.filter(o => {
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchSid = o.sampleId.toLowerCase().includes(term);
      const matchPid = (o.patientId || '').toLowerCase().includes(term);
      const matchPname = (o.patientName || '').toLowerCase().includes(term);
      return matchSid || matchPid || matchPname;
    }
    return true;
  });

  return (
    <div className="space-y-4 font-sans w-full">
      {/* HEADER CONTAINER DA TABELA / ORDENS CADASTRADAS */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl w-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <span>Ordens Cadastradas no LIS</span>
                <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-800/80 px-2 py-0.5 rounded-lg font-mono">
                  {filteredOrders.length} {filteredOrders.length === 1 ? 'ordem' : 'ordens'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Lista de solicitações de exames prontas para leitura nos analisadores ou simuladores
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar amostra ou paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 w-full sm:w-56"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchWorklist}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 border border-slate-700"
              title="Atualizar lista de ordens"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            {/* Clear Fake Orders Button */}
            <button
              onClick={handleClearFakeOrders}
              disabled={clearingFake}
              className="bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 border border-amber-800/60 disabled:opacity-50"
              title="Remover ordens fictícias do banco de dados"
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Limpar Fictícias</span>
            </button>

            {/* Status Filter Tabs */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${statusFilter === 'ALL' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Todas ({orders.length})
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-2 py-1 rounded-lg transition-colors flex items-center space-x-1 ${statusFilter === 'PENDING' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                <Clock className="w-3 h-3" />
                <span>Pendentes ({orders.filter(o => o.status === 'PENDING').length})</span>
              </button>
              <button
                onClick={() => setStatusFilter('PARTIAL')}
                className={`px-2 py-1 rounded-lg transition-colors flex items-center space-x-1 ${statusFilter === 'PARTIAL' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                <Activity className="w-3 h-3" />
                <span>Parcial ({orders.filter(o => o.status === 'PARTIAL').length})</span>
              </button>
              <button
                onClick={() => setStatusFilter('COMPLETED')}
                className={`px-2 py-1 rounded-lg transition-colors flex items-center space-x-1 ${statusFilter === 'COMPLETED' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                <CheckCircle className="w-3 h-3" />
                <span>Concluídas ({orders.filter(o => o.status === 'COMPLETED').length})</span>
              </button>
            </div>

            {/* View Mode Switcher (Tabela Compacta / Compacta / Expandida) */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 ${
                  viewMode === 'table' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Visão Tabela Ultra-Compacta (Ideal para muitas ordens)"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabela</span>
              </button>

              <button
                onClick={() => setViewMode('compact')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 ${
                  viewMode === 'compact' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Visão Linhas Compactas"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Linhas</span>
              </button>

              <button
                onClick={() => setViewMode('detailed')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 ${
                  viewMode === 'detailed' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Visão Detalhada Expandida"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Expandida</span>
              </button>
            </div>

          </div>
        </div>

        {/* LISTA / TABELA DE ORDENS */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-slate-800/80 space-y-2">
            <ClipboardList className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-400 font-semibold">Nenhuma ordem cadastrada no momento.</p>
            <p className="text-xs text-slate-500">Acesse a tela "Novo Pedido de Exames" no menu lateral para criar novas solicitações.</p>
          </div>
        ) : viewMode === 'table' ? (
          /* ============================================================ */
          /* 1. ULTRA-COMPACT TABLE VIEW (EXCEL / LIS TABLE FORMAT)       */
          /* ============================================================ */
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 shadow-inner">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Amostra</th>
                  <th className="py-2.5 px-3">Paciente</th>
                  <th className="py-2.5 px-3">Tubo / Equipamento</th>
                  <th className="py-2.5 px-3">Exames Solicitados</th>
                  <th className="py-2.5 px-3">Resultados Lidos</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOrders.map((order, orderIdx) => {
                  const requested = order.tests || [];
                  const resultParams = order.result?.parameters || {};
                  const resultKeys = Object.keys(resultParams);
                  const readCount = resultKeys.length;
                  const isExpanded = !!expandedOrders[order.sampleId];

                  let progressPercent = 0;
                  if (requested.length > 0) {
                    let fulfilledCount = 0;
                    requested.forEach(t => {
                      if (isTestFulfilled(t, resultParams)) fulfilledCount++;
                    });
                    progressPercent = Math.min(100, Math.round((fulfilledCount / requested.length) * 100));
                  } else if (order.status === 'COMPLETED') {
                    progressPercent = 100;
                  }

                  return (
                    <React.Fragment key={`${order.sampleId}-${orderIdx}`}>
                      <tr className={`hover:bg-slate-900/80 transition-colors ${
                        order.status === 'COMPLETED'
                          ? 'bg-emerald-950/5'
                          : order.status === 'PARTIAL'
                          ? 'bg-sky-950/5'
                          : ''
                      }`}>
                        {/* 1. Amostra */}
                        <td className="py-2 px-3 font-mono text-xs font-bold text-indigo-300 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <QrCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>#{order.sampleId}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-sans font-normal block">
                            {order.createdAt}
                          </span>
                        </td>

                        {/* 2. Paciente */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-100 text-xs truncate max-w-[180px]" title={order.patientName}>
                            {order.patientName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {order.patientId} • {order.gender === 'F' ? 'Fem' : 'Masc'}, {order.age}
                          </div>
                        </td>

                        {/* 3. Tubo / Equipamento */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800">
                            {order.analyzerModel || 'Geral'}
                          </span>
                        </td>

                        {/* 4. Exames Solicitados */}
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {requested.map((t, tIdx) => {
                              const isDone = isTestFulfilled(t, resultParams);
                              return (
                                <span
                                  key={`${t}-${tIdx}`}
                                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center space-x-0.5 border ${
                                    isDone
                                      ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800/80'
                                      : 'bg-slate-900 text-slate-400 border-slate-800'
                                  }`}
                                >
                                  {isDone ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Clock className="w-2.5 h-2.5 text-amber-400" />}
                                  <span>{t}</span>
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* 5. Resultados Lidos */}
                        <td className="py-2 px-3">
                          {readCount > 0 ? (
                            <div className="flex flex-wrap items-center gap-1 max-w-sm">
                              {Object.entries(resultParams).slice(0, 4).map(([code, p]: [string, any]) => (
                                <span key={code} className="text-[10px] font-mono bg-slate-900 text-emerald-300 border border-slate-800 px-1.5 py-0.5 rounded">
                                  <strong className="text-slate-400 mr-1">{code}:</strong>
                                  {typeof p === 'object' && p !== null ? p.value : p}
                                </span>
                              ))}
                              {readCount > 4 && (
                                <button
                                  onClick={() => toggleExpandOrder(order.sampleId)}
                                  className="text-[9px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded hover:underline"
                                >
                                  +{readCount - 4} mais
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Aguardando leitura...</span>
                          )}
                        </td>

                        {/* 6. Status */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          {order.status === 'PENDING' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 inline-flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>PENDING</span>
                            </span>
                          )}
                          {order.status === 'PARTIAL' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30 inline-flex items-center space-x-1">
                              <Activity className="w-3 h-3" />
                              <span>PARTIAL ({readCount})</span>
                            </span>
                          )}
                          {order.status === 'COMPLETED' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center space-x-1">
                              <CheckCircle className="w-3 h-3" />
                              <span>COMPLETED</span>
                            </span>
                          )}
                        </td>

                        {/* 7. Ações */}
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Ver Mensagens HL7 */}
                            <button
                              onClick={() => handleOpenMessagesModal(order)}
                              className="p-1 rounded bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                              title="Ver Mensagens HL7 / MLLP"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                            </button>

                            {/* Ver Laudo */}
                            {order.result && (
                              <button
                                onClick={() => onSelectSample(order.result!)}
                                className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                                title="Visualizar Laudo Consolidado"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Toggle Expand Details */}
                            <button
                              onClick={() => toggleExpandOrder(order.sampleId)}
                              className="p-1 rounded bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                              title="Expandir/Recolher Detalhes da Ordem"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleOpenDeleteModal(order)}
                              className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-900"
                              title="Remover ordem do LIS"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Parameters Row */}
                      {isExpanded && (
                        <tr className="bg-slate-950/90 border-b border-slate-800/80 animate-in fade-in">
                          <td colSpan={7} className="p-3">
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                <span className="font-bold text-teal-400 text-xs">
                                  Detalhes e Parâmetros Registrados para a Amostra #{order.sampleId} ({readCount} exames)
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Pac: {order.patientName} ({order.patientId})
                                </span>
                              </div>

                              {readCount > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5 font-mono">
                                  {Object.entries(resultParams).map(([code, p]: [string, any]) => (
                                    <div key={code} className="bg-slate-950 p-1.5 rounded border border-slate-800">
                                      <span className="text-[9px] text-slate-400 block truncate">{code}</span>
                                      <span className="text-xs font-bold text-white">{typeof p === 'object' && p !== null ? p.value : p}</span>
                                      <span className="text-[8px] text-slate-500 block truncate">{typeof p === 'object' && p !== null ? p.unit : ''}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-400 italic">Nenhum parâmetro de resultado registrado ainda. Aguardando leitura do equipamento.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ============================================================ */
          /* 2. COMPACT / DETAILED CARDS VIEW                             */
          /* ============================================================ */
          <div className="space-y-2.5">
            {filteredOrders.map((order, orderIdx) => {
              const requested = order.tests || [];
              const resultParams = order.result?.parameters || {};
              const resultKeys = Object.keys(resultParams);
              const readCount = resultKeys.length;

              let progressPercent = 0;
              if (requested.length > 0) {
                let fulfilledCount = 0;
                requested.forEach(t => {
                  if (isTestFulfilled(t, resultParams)) fulfilledCount++;
                });
                progressPercent = Math.min(100, Math.round((fulfilledCount / requested.length) * 100));
              } else if (order.status === 'COMPLETED') {
                progressPercent = 100;
              }

              return (
                <div
                  key={`${order.sampleId}-${orderIdx}`}
                  className={`bg-slate-950/90 border rounded-xl ${viewMode === 'compact' ? 'p-3' : 'p-4'} space-y-2.5 transition-all shadow-md ${
                    order.status === 'COMPLETED'
                      ? 'border-emerald-500/30 bg-emerald-950/5'
                      : order.status === 'PARTIAL'
                      ? 'border-sky-500/30 bg-sky-950/5'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Line */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-xs font-bold text-white bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg flex items-center space-x-1 shrink-0">
                        <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                        <span>#{order.sampleId}</span>
                      </span>

                      <div className="truncate">
                        <h4 className="font-bold text-xs text-slate-100 flex items-center space-x-1.5 truncate">
                          <span className="truncate">{order.patientName}</span>
                          <span className="text-[11px] text-slate-400 font-mono">({order.patientId})</span>
                        </h4>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{order.gender === 'F' ? 'F' : 'M'}, {order.age}</span>
                          <span>•</span>
                          <span>{order.createdAt}</span>
                          {order.analyzerModel && (
                            <>
                              <span>•</span>
                              <span className="text-amber-300 font-semibold">{order.analyzerModel}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {order.status === 'PENDING' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Aguardando</span>
                        </span>
                      )}

                      {order.status === 'PARTIAL' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center space-x-1">
                          <Activity className="w-3 h-3" />
                          <span>Parcial ({readCount})</span>
                        </span>
                      )}

                      {order.status === 'COMPLETED' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>Concluído</span>
                        </span>
                      )}

                      <button
                        onClick={() => handleOpenMessagesModal(order)}
                        className="bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center space-x-1"
                        title="Ver mensagens HL7 / MLLP"
                      >
                        <MessageSquare className="w-3 h-3 text-indigo-400" />
                        <span>HL7</span>
                      </button>

                      <button
                        onClick={() => handleOpenDeleteModal(order)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-900 transition-colors"
                        title="Remover ordem"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Requested Tests & Parameters Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] font-semibold text-slate-400 mr-1">Exames:</span>
                      {requested.map((t, tIdx) => {
                        const isDone = isTestFulfilled(t, resultParams);
                        return (
                          <span
                            key={`${t}-${tIdx}`}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex items-center space-x-0.5 border ${
                              isDone
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                                : 'bg-slate-900 text-slate-400 border-slate-800'
                            }`}
                          >
                            {isDone ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Clock className="w-2.5 h-2.5 text-amber-400" />}
                            <span>{t}</span>
                          </span>
                        );
                      })}
                    </div>

                    {/* Action buttons */}
                    {order.result && (
                      <div className="flex items-center space-x-1 text-[10px] shrink-0">
                        <button
                          onClick={() => onSelectSample(order.result!)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-sm flex items-center space-x-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Laudo</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Read Parameters Compact Bar */}
                  {readCount > 0 && (
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2 text-xs">
                      <div className="flex flex-wrap items-center gap-1 font-mono">
                        <span className="text-[9px] font-sans font-bold text-teal-400 mr-1">Resultados ({readCount}):</span>
                        {Object.entries(resultParams).map(([code, p]: [string, any]) => (
                          <span key={code} className="bg-slate-950 text-emerald-300 border border-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                            <strong className="text-slate-400 mr-0.5">{code}:</strong>
                            {typeof p === 'object' && p !== null ? p.value : p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: CONFIRMAÇÃO DE EXCLUSÃO DE ORDEM */}
      {confirmDeleteOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-red-400 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Remover Ordem de Trabalho</h3>
                <p className="text-xs text-slate-400">Amostra #{confirmDeleteOrder.sampleId}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p>
                Tem certeza que deseja remover a ordem <strong className="text-white">#{confirmDeleteOrder.sampleId}</strong> do paciente <strong className="text-white">{confirmDeleteOrder.patientName}</strong> (ID: {confirmDeleteOrder.patientId})?
              </p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <p className="text-[11px] text-slate-400"><strong>Exames Solicitados:</strong> {confirmDeleteOrder.tests?.join(', ') || 'Nenhum'}</p>
                <p className="text-[11px] text-slate-400"><strong>Tubos / Equipamentos:</strong> {confirmDeleteOrder.analyzerModel || 'Geral'}</p>
              </div>
              <p className="text-[11px] text-amber-400">
                ⚠️ Esta ação removerá a amostra da fila do servidor LIS. Caso o equipamento tente ler esta amostra novamente, o servidor informará que a ordem não foi encontrada.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOrder(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-colors flex items-center space-x-2 shadow-lg shadow-red-600/20 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Removendo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MENSAGENS HL7 / MLLP DA AMOSTRA */}
      {viewMessagesOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                    <span>Mensagens HL7 / MLLP da Amostra #{viewMessagesOrder.sampleId}</span>
                    <span className="text-xs text-indigo-400 font-mono">({viewMessagesOrder.patientName})</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Quadros MLLP e segmentos HL7 trocados entre o analisador e o servidor LIS
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewMessagesOrder(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Patient and Sample Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">ID Amostra:</span>
                  <span className="font-mono font-bold text-indigo-400">#{viewMessagesOrder.sampleId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Paciente:</span>
                  <span className="font-semibold text-slate-200 truncate block">{viewMessagesOrder.patientName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Exames Cadastrados:</span>
                  <span className="font-mono text-emerald-400 truncate block">{viewMessagesOrder.tests?.join(', ')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Status no LIS:</span>
                  <span className="font-bold text-amber-400 font-mono">{viewMessagesOrder.status}</span>
                </div>
              </div>

              {/* Navigation Tabs inside Modal */}
              <div className="flex border-b border-slate-800">
                <button
                  onClick={() => setActiveMessageTab('HL7_PREVIEW')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
                    activeMessageTab === 'HL7_PREVIEW'
                      ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Mensagem HL7 de Resposta (LIS → Equipamento)</span>
                </button>
                <button
                  onClick={() => setActiveMessageTab('COMM_LOGS')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
                    activeMessageTab === 'COMM_LOGS'
                      ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Logs Brutos da Porta TCP/MLLP ({hl7PreviewData?.relatedLogs.length || 0})</span>
                </button>
              </div>

              {loadingHL7 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
                  <p className="text-xs font-mono">Gerando e buscando quadros MLLP para a amostra #{viewMessagesOrder.sampleId}...</p>
                </div>
              ) : activeMessageTab === 'HL7_PREVIEW' ? (
                <div className="space-y-4">
                  {/* Mindray HL7 Box */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                        <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                          Formato HL7 2.3.1 - Mindray BC-5480 (ORR^O02 / ORM^O01)
                        </h4>
                      </div>
                      <button
                        onClick={() => handleCopyCode(hl7PreviewData?.mindrayHL7 || '', 'Mindray')}
                        className="text-[11px] bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-700 px-2.5 py-1 rounded-lg flex items-center space-x-1 transition-colors"
                      >
                        {copiedLabel === 'Mindray' ? <Check className="w-3 h-3 text-emerald-400" /> : <Code className="w-3 h-3 text-indigo-400" />}
                        <span>{copiedLabel === 'Mindray' ? 'Copiado!' : 'Copiar HL7 Mindray'}</span>
                      </button>
                    </div>

                    <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto whitespace-pre border border-slate-800 leading-relaxed">
                      {hl7PreviewData?.mindrayHL7 || 'Nenhuma mensagem gerada.'}
                    </pre>
                  </div>

                  {/* URIT HL7 Box */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                          Formato HL7 2.3.1 - URIT-8021A / Analisadores de Bioquímica (DSR^Q03)
                        </h4>
                      </div>
                      <button
                        onClick={() => handleCopyCode(hl7PreviewData?.uritHL7 || '', 'URIT')}
                        className="text-[11px] bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-700 px-2.5 py-1 rounded-lg flex items-center space-x-1 transition-colors"
                      >
                        {copiedLabel === 'URIT' ? <Check className="w-3 h-3 text-emerald-400" /> : <Code className="w-3 h-3 text-emerald-400" />}
                        <span>{copiedLabel === 'URIT' ? 'Copiado!' : 'Copiar HL7 URIT'}</span>
                      </button>
                    </div>

                    <pre className="p-3 bg-slate-900 text-emerald-300 rounded-xl font-mono text-[11px] overflow-x-auto whitespace-pre border border-slate-800 leading-relaxed">
                      {hl7PreviewData?.uritHL7 || 'Nenhuma mensagem gerada.'}
                    </pre>
                  </div>
                </div>
              ) : (
                /* COMM LOGS TAB */
                <div className="space-y-3">
                  {hl7PreviewData?.relatedLogs && hl7PreviewData.relatedLogs.length > 0 ? (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {hl7PreviewData.relatedLogs.map((log, idx) => (
                        <div key={log.id || idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 font-mono text-xs">
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span className="font-bold text-indigo-400">{log.source}</span>
                            <span>{log.timestamp}</span>
                          </div>
                          <p className="text-slate-200 text-[11px] whitespace-pre-wrap">{log.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                      <Terminal className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400">Ainda não há registros de comunicação transmitidos na porta TCP para a amostra #{viewMessagesOrder.sampleId}.</p>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                Porta LIS MLLP/TCP: 5151 • Protocolo HL7 v2.3.1
              </span>
              <button
                type="button"
                onClick={() => setViewMessagesOrder(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
