import React from 'react';
import { Menu, Activity, RefreshCw, Trash2, Play, Server, Wifi, ArrowLeftRight, ClipboardList, Plus, Sliders, Beaker, Zap, Droplet, TestTube, HeartPulse, Code, Download } from 'lucide-react';
import { ServerStatus } from '../types';

interface HeaderProps {
  status: ServerStatus | null;
  onRefresh: () => void;
  onClearLogs: () => void;
  onSimulateQuick: () => void;
  activeTab: string;
  onMenuToggle: () => void;
}

const TAB_TITLES: Record<string, { title: string; category: string; icon: any }> = {
  'create-order': { title: 'Novo Pedido de Exames (Cadastro Manual)', category: 'GERENCIAMENTO LIS', icon: Plus },
  'orders': { title: 'Ordens Cadastradas no LIS', category: 'GERENCIAMENTO LIS', icon: ClipboardList },
  'depara-mapping': { title: 'Tabela De/Para de Exames', category: 'GERENCIAMENTO LIS', icon: ArrowLeftRight },
  'universal-simulator': { title: 'Simulador Universal & Resposta LIS', category: 'GERENCIAMENTO LIS', icon: Sliders },
  'logs': { title: 'Monitor LIS & Logs em Tempo Real', category: 'GERENCIAMENTO LIS', icon: Activity },
  'simulator': { title: 'Simulador Mindray BC-5480 (Hematologia)', category: 'SIMULADORES', icon: Play },
  'urit-simulator': { title: 'Simulador URIT-8021A (Bioquímica)', category: 'SIMULADORES', icon: Beaker },
  'maxion-simulator': { title: 'Simulador Maxion (Eletrólitos)', category: 'SIMULADORES', icon: Zap },
  'maxcoag-simulator': { title: 'Simulador MaxCoag (Coagulação)', category: 'SIMULADORES', icon: Droplet },
  'wama-simulator': { title: 'Simulador Wama (Uroanálise)', category: 'SIMULADORES', icon: TestTube },
  'finecare-simulator': { title: 'Simulador Finecare Wondfo (POCT)', category: 'SIMULADORES', icon: HeartPulse },
  'decoder': { title: 'Decodificador MLLP / ASTM', category: 'FERRAMENTAS', icon: Code },
  'guide': { title: 'Instalação & Scripts LIS', category: 'FERRAMENTAS', icon: Download },
};

export const Header: React.FC<HeaderProps> = ({
  status,
  onRefresh,
  onClearLogs,
  onSimulateQuick,
  activeTab,
  onMenuToggle
}) => {
  const currentTabInfo = TAB_TITLES[activeTab] || {
    title: 'Terminal LIS',
    category: 'SISTEMA',
    icon: Activity
  };
  const ActiveIcon = currentTabInfo.icon;

  return (
    <header className="bg-slate-950/90 border-b border-slate-800/80 text-white sticky top-0 z-30 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        {/* Left Side: Mobile Menu Button + Current Section Title / Breadcrumbs */}
        <div className="flex items-center space-x-3.5">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Abrir Menu Lateral"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-indigo-950/80 border border-indigo-800/80 rounded-xl flex items-center justify-center shrink-0">
              <ActiveIcon className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold bg-indigo-950/50 border border-indigo-900/60 px-2 py-0.5 rounded-md">
                  {currentTabInfo.category}
                </span>
              </div>
              <h1 className="text-base font-bold tracking-tight text-white font-sans">
                {currentTabInfo.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Right Side: Server Badges & Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Badges */}
          <div className="hidden sm:flex bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 items-center space-x-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Servidor LIS</span>
              <span className="font-mono font-medium text-slate-300 text-xs">
                {status?.ipAddresses?.[0] || '127.0.0.1'}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center space-x-2">
            <div className="flex flex-col">
              <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Porta TCP</span>
              <span className="font-mono font-bold text-slate-200 text-xs">
                :{status?.tcpPort || 5151}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center space-x-2">
            <div className="flex flex-col">
              <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Amostras</span>
              <span className="font-mono font-bold text-emerald-400 text-xs">
                {status?.totalReceived || 0}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1.5 ml-1">
            <button
              onClick={onSimulateQuick}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
              title="Gera uma amostra de teste instantânea"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Simular Teste</span>
            </button>

            <button
              onClick={onRefresh}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 p-2 rounded-xl transition-all border border-slate-800 hover:border-slate-700"
              title="Atualizar Status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClearLogs}
              className="bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 p-2 rounded-xl transition-all border border-slate-800 hover:border-red-900/40"
              title="Limpar Histórico de Logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </header>
  );
};

