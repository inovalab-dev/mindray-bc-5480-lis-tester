import React, { useState } from 'react';
import { Search, Filter, Terminal, Activity, ArrowDownRight, ArrowUpRight, CheckCircle2, AlertTriangle, Eye, ShieldCheck } from 'lucide-react';
import { CommLogEntry, MindraySampleResult } from '../types';

interface LogsMonitorProps {
  logs: CommLogEntry[];
  onSelectSample: (sample: MindraySampleResult) => void;
  onClearLogs: () => void;
}

export const LogsMonitor: React.FC<LogsMonitorProps> = ({ logs, onSelectSample, onClearLogs }) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [filterEquipment, setFilterEquipment] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedHexId, setExpandedHexId] = useState<string | null>(null);

  const filteredLogs = logs.filter(entry => {
    if (filterLevel !== 'ALL' && entry.level !== filterLevel) {
      return false;
    }

    if (filterEquipment === 'TCP_ONLY') {
      const isTcp = entry.source.includes('TCP') || entry.source.includes('Socket') || entry.message.includes('TCP') || entry.message.includes('5151') || entry.message.includes('0x0B');
      if (!isTcp) return false;
    } else if (filterEquipment === 'URIT') {
      const isUrit = entry.source.includes('URIT') || entry.message.includes('URIT') || entry.message.includes('8021');
      if (!isUrit) return false;
    } else if (filterEquipment === 'MINDRAY') {
      const isMindray = entry.source.includes('Mindray') || entry.message.includes('Mindray') || entry.message.includes('BC-5480');
      if (!isMindray) return false;
    } else if (filterEquipment === 'FINECARE') {
      const isFinecare = entry.source.includes('Finecare') || entry.message.includes('Finecare');
      if (!isFinecare) return false;
    } else if (filterEquipment === 'MAXION') {
      const isMaxion = entry.source.includes('Maxion') || entry.message.includes('Maxion');
      if (!isMaxion) return false;
    } else if (filterEquipment === 'MAXCOAG') {
      const isMaxcoag = entry.source.includes('Maxcoag') || entry.message.includes('Maxcoag');
      if (!isMaxcoag) return false;
    } else if (filterEquipment === 'WAMA') {
      const isWama = entry.source.includes('Wama') || entry.message.includes('Wama');
      if (!isWama) return false;
    } else if (filterEquipment === 'LIS') {
      if (!entry.source.includes('LIS') && !entry.source.includes('Server')) return false;
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchMsg = entry.message.toLowerCase().includes(q);
      const matchSample = entry.parsedResult?.sampleId.toLowerCase().includes(q);
      const matchPatient = entry.parsedResult?.patientName?.toLowerCase().includes(q);
      const matchSource = entry.source.toLowerCase().includes(q);
      return matchMsg || matchSample || matchPatient || matchSource;
    }
    return true;
  });

  return (
    <div className="space-y-4 font-sans">
      
      {/* TCP Socket Status Banner */}
      <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs text-white">Servidor TCP Socket MLLP LIS</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                0.0.0.0:5151 ATIVO
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Escutando conexões diretas via cabo de rede/IP na porta <code className="text-emerald-400 font-mono">5151</code> (HL7 MLLP: <code>VT 0x0B</code> ... <code>FS 0x1C CR 0x0D</code>)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterEquipment('TCP_ONLY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border transition-all ${
              filterEquipment === 'TCP_ONLY'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900'
            }`}
          >
            <span>🔌 Apenas TCP / Socket (Porta 5151)</span>
          </button>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        
        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por amostra, paciente ou texto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        {/* Equipment Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs w-full md:w-auto">
          <span className="text-slate-400 flex items-center mr-1 text-[11px] font-medium">
            Equipamento:
          </span>
          <button
            onClick={() => setFilterEquipment('ALL')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
              filterEquipment === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterEquipment('TCP_ONLY')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
              filterEquipment === 'TCP_ONLY' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/60'
            }`}
          >
            🔌 Apenas TCP
          </button>
          <button
            onClick={() => setFilterEquipment('URIT')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
              filterEquipment === 'URIT' ? 'bg-teal-600 text-white border-teal-500' : 'bg-teal-950/60 text-teal-300 border-teal-800/60 hover:bg-teal-900/60'
            }`}
          >
            🧪 URIT-8021A
          </button>
          <button
            onClick={() => setFilterEquipment('MINDRAY')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
              filterEquipment === 'MINDRAY' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60 hover:bg-indigo-900/60'
            }`}
          >
            🩸 Mindray BC-5480
          </button>
          <button
            onClick={() => setFilterEquipment('FINECARE')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
              filterEquipment === 'FINECARE' ? 'bg-amber-600 text-white border-amber-500' : 'bg-amber-950/60 text-amber-300 border-amber-800/60 hover:bg-amber-900/60'
            }`}
          >
            🔬 Finecare
          </button>
          <button
            onClick={() => setFilterEquipment('MAXION')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
              filterEquipment === 'MAXION' ? 'bg-sky-600 text-white border-sky-500' : 'bg-sky-950/60 text-sky-300 border-sky-800/60 hover:bg-sky-900/60'
            }`}
          >
            💧 Maxion
          </button>
          <button
            onClick={() => setFilterEquipment('MAXCOAG')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
              filterEquipment === 'MAXCOAG' ? 'bg-rose-600 text-white border-rose-500' : 'bg-rose-950/60 text-rose-300 border-rose-800/60 hover:bg-rose-900/60'
            }`}
          >
            ⏱️ Maxcoag
          </button>
          <button
            onClick={() => setFilterEquipment('WAMA')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
              filterEquipment === 'WAMA' ? 'bg-purple-600 text-white border-purple-500' : 'bg-purple-950/60 text-purple-300 border-purple-800/60 hover:bg-purple-900/60'
            }`}
          >
            🧬 Wama
          </button>
          <button
            onClick={() => setFilterEquipment('LIS')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
              filterEquipment === 'LIS' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/60'
            }`}
          >
            🖥️ Servidor LIS
          </button>
        </div>

        {/* Level Filters & Clear */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs w-full md:w-auto justify-end">
          <span className="text-slate-400 flex items-center mr-1 text-[11px] font-medium">
            <Filter className="w-3 h-3 mr-1" />
            Nível:
          </span>

          {['ALL', 'SUCCESS', 'RAW_IN', 'RAW_OUT', 'WARN', 'ERROR'].map(lvl => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                filterLevel === lvl
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {lvl === 'ALL' && 'Todos'}
              {lvl === 'SUCCESS' && 'OK'}
              {lvl === 'RAW_IN' && 'Entrada'}
              {lvl === 'RAW_OUT' && 'ACK/Saída'}
              {lvl === 'WARN' && 'Avisos'}
              {lvl === 'ERROR' && 'Erros'}
            </button>
          ))}

          {onClearLogs && (
            <button
              onClick={onClearLogs}
              className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 px-2 py-0.5 rounded text-[10px] font-semibold transition-all ml-1"
            >
              Limpar Logs
            </button>
          )}
        </div>
      </div>

      {/* Log Entries Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
        <div className="bg-slate-800/60 px-4 py-2.5 border-b border-slate-800 flex justify-between items-center text-xs font-semibold text-slate-300">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>Feed de Comunicação LIS em Tempo Real</span>
          </div>
          <span className="font-mono text-slate-400 text-[11px]">
            {filteredLogs.length} evento(s) exibido(s)
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <Activity className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
            <p className="text-slate-300 font-semibold">Nenhum evento registrado com o filtro selecionado.</p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Conecte o equipamento URIT-8021A ou Mindray BC-5480 via TCP na porta 5151 ou execute uma transmissão de teste pelas abas de simulador.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto font-mono text-xs">
            {filteredLogs.map((entry, idx) => {
              const isUrit = entry.source.includes('URIT');
              const isMindray = entry.source.includes('Mindray');
              const isLis = entry.source.includes('LIS');

              let sourceBadgeStyle = "bg-slate-950 text-slate-300 border-slate-800";
              if (isUrit) sourceBadgeStyle = "bg-teal-950 text-teal-300 border-teal-800/80 font-bold";
              else if (isMindray) sourceBadgeStyle = "bg-indigo-950 text-indigo-300 border-indigo-800/80 font-bold";
              else if (isLis) sourceBadgeStyle = "bg-emerald-950 text-emerald-300 border-emerald-800/80 font-bold";

              return (
                <div key={`${entry.id || 'log'}-${idx}`} className="p-3.5 hover:bg-slate-800/40 transition-colors space-y-2">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-slate-500 font-semibold">{entry.timestamp}</span>
                      <LevelBadge level={entry.level} />
                      <span className={`text-[11px] px-2 py-0.5 rounded border ${sourceBadgeStyle}`}>
                        {entry.source}
                      </span>
                    </div>

                    {/* Actions if result is attached */}
                    <div className="flex items-center space-x-2">
                      {entry.parsedResult && (
                        <button
                          onClick={() => onSelectSample(entry.parsedResult!)}
                          className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 px-2.5 py-1 rounded-lg text-[11px] font-sans font-medium flex items-center space-x-1.5 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Ver Detalhes do Exame</span>
                        </button>
                      )}

                      {entry.rawHex && (
                        <button
                          onClick={() => setExpandedHexId(expandedHexId === entry.id ? null : entry.id)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded text-[10px] font-sans transition-colors"
                        >
                          {expandedHexId === entry.id ? 'Ocultar Hex' : 'Ver Hex'}
                        </button>
                      )}
                    </div>
                  </div>

                  {entry.message.includes('\n') || entry.message.includes('MSH|') || entry.message.includes('H|') || entry.level === 'RAW_IN' || entry.level === 'RAW_OUT' ? (
                    <div className={`p-3 rounded-lg border font-mono text-[11px] whitespace-pre-wrap leading-relaxed overflow-x-auto shadow-inner ${
                      entry.level === 'RAW_IN' 
                        ? 'bg-slate-950/95 text-teal-300 border-teal-900/60 border-l-4 border-l-teal-500' 
                        : entry.level === 'RAW_OUT'
                        ? 'bg-slate-950/95 text-sky-300 border-indigo-900/60 border-l-4 border-l-indigo-500'
                        : 'bg-slate-950/90 text-emerald-300 border-slate-800 border-l-4 border-l-emerald-500'
                    }`}>
                      <div className="flex items-center justify-between text-[10px] font-sans font-bold text-slate-500 mb-1 border-b border-slate-800/60 pb-1">
                        <span>
                          {entry.level === 'RAW_IN' && '📥 MENSAGEM RECEBIDA DO EQUIPAMENTO (EQUIPAMENTO ➔ LIS)'}
                          {entry.level === 'RAW_OUT' && '📤 RESPOSTA TRANSMITIDA PELO LIS (LIS ➔ EQUIPAMENTO)'}
                          {entry.level !== 'RAW_IN' && entry.level !== 'RAW_OUT' && '📋 MENSAGEM DO SISTEMA'}
                        </span>
                        {entry.rawHex && <span className="text-[9px] text-slate-600 font-mono">HEX ATIVO</span>}
                      </div>
                      {entry.message}
                    </div>
                  ) : (
                    <p className="text-slate-200 text-xs font-sans whitespace-pre-wrap leading-relaxed">
                      {entry.message}
                    </p>
                  )}

                  {/* Hex Inspection */}
                  {expandedHexId === entry.id && entry.rawHex && (
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[10px] text-slate-400 font-mono overflow-x-auto">
                      <div className="text-indigo-400 font-semibold mb-1">Mapeamento de Bytes Envelope (Hex):</div>
                      {entry.rawHex}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const LevelBadge: React.FC<{ level: CommLogEntry['level'] }> = ({ level }) => {
  switch (level) {
    case 'SUCCESS':
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> OK
        </span>
      );
    case 'RAW_IN':
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1">
          <ArrowDownRight className="w-3 h-3" /> ENTRADA
        </span>
      );
    case 'RAW_OUT':
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
          <ArrowUpRight className="w-3 h-3" /> ACK SAÍDA
        </span>
      );
    case 'WARN':
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> AVISO
        </span>
      );
    case 'ERROR':
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> ERRO
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
          INFO
        </span>
      );
  }
};
