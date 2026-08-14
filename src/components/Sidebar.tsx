import React, { useState } from 'react';
import {
  Activity,
  ClipboardList,
  Plus,
  ArrowLeftRight,
  Sliders,
  Play,
  Beaker,
  Zap,
  Droplet,
  TestTube,
  HeartPulse,
  Code,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Server,
  Layers,
  Terminal,
  Database
} from 'lucide-react';
import { ServerStatus } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  status: ServerStatus | null;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  status,
  isOpenMobile,
  setIsOpenMobile
}) => {
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState(false);

  const menuGroups = [
    {
      title: 'GERENCIAMENTO LIS',
      items: [
        { id: 'create-order', label: 'Novo Pedido de Exames', icon: Plus, badge: 'Manual' },
        { id: 'orders', label: 'Ordens Cadastradas no LIS', icon: ClipboardList, badge: null },
        { id: 'equipments', label: 'Cadastro de Equipamentos', icon: Server, badge: null },
        { id: 'depara-mapping', label: 'Tabela De/Para Exames', icon: ArrowLeftRight, badge: null },
        { id: 'universal-simulator', label: 'Simulador Universal LIS', icon: Sliders, badge: 'HL7/ASTM' },
        { id: 'logs', label: 'Monitor LIS & Logs', icon: Activity, badge: status?.totalReceived ? `${status.totalReceived}` : null }
      ]
    },
    {
      title: 'SIMULADORES DE EQUIPAMENTOS',
      items: [
        { id: 'simulator', label: 'Mindray BC-5480 (Hematologia)', icon: Play, badge: 'HL7' },
        { id: 'urit-simulator', label: 'URIT-8021A (Bioquímica)', icon: Beaker, badge: 'HL7' },
        { id: 'maxion-simulator', label: 'Maxion (Eletrólitos)', icon: Zap, badge: 'ASTM' },
        { id: 'maxcoag-simulator', label: 'MaxCoag (Coagulação)', icon: Droplet, badge: 'ASTM' },
        { id: 'wama-simulator', label: 'Wama (Uroanálise)', icon: TestTube, badge: 'ASTM' },
        { id: 'finecare-simulator', label: 'Finecare Wondfo (POCT)', icon: HeartPulse, badge: 'HL7' }
      ]
    },
    {
      title: 'FERRAMENTAS & SISTEMA',
      items: [
        { id: 'decoder', label: 'Decodificador MLLP / ASTM', icon: Code, badge: null },
        { id: 'guide', label: 'Instalação & Scripts', icon: Download, badge: null }
      ]
    }
  ];

  const handleSelect = (tabId: string) => {
    setActiveTab(tabId);
    setIsOpenMobile(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 bottom-0 left-0 z-50 h-screen bg-slate-950 border-r border-slate-800/80 text-slate-100 flex flex-col transition-all duration-300 ease-in-out shrink-0 ${
          isOpenMobile ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsedDesktop ? 'lg:w-20' : 'lg:w-72'}`}
      >
        {/* Sidebar Header / Brand Logo */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 shrink-0">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>

            {(!isCollapsedDesktop || isOpenMobile) && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm tracking-tight text-white font-sans truncate">
                  Monitor Interface LIS x Equipamentos
                </span>
                <span className="text-[10px] text-indigo-400 font-mono tracking-wider font-semibold truncate">
                  LIS & EQUIPAMENTOS
                </span>
              </div>
            )}
          </div>

          {/* Close Mobile Button */}
          <button
            onClick={() => setIsOpenMobile(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Collapse/Expand Desktop Button */}
          <button
            onClick={() => setIsCollapsedDesktop(!isCollapsedDesktop)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/60 transition-colors"
            title={isCollapsedDesktop ? 'Expandir Menu' : 'Recolher Menu'}
          >
            {isCollapsedDesktop ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Server Status Compact Widget */}
        {(!isCollapsedDesktop || isOpenMobile) && (
          <div className="mx-3 my-3 p-3 bg-slate-900/90 border border-slate-800/90 rounded-2xl shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center space-x-1">
                <Server className="w-3 h-3 text-indigo-400" />
                <span>Servidor LIS</span>
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
              <div className="bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800/50">
                <span className="text-[9px] text-slate-500 block">PORTA</span>
                <span className="text-slate-200 font-bold">:{status?.tcpPort || 5151}</span>
              </div>
              <div className="bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800/50">
                <span className="text-[9px] text-slate-500 block">AMOSTRAS</span>
                <span className="text-emerald-400 font-bold">{status?.totalReceived || 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5 custom-scrollbar">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {/* Group Header */}
              {(!isCollapsedDesktop || isOpenMobile) ? (
                <div className="px-3 pb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                  {group.title}
                </div>
              ) : (
                <div className="h-px bg-slate-800/60 my-2 mx-1" />
              )}

              {/* Group Items */}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    title={isCollapsedDesktop && !isOpenMobile ? item.label : undefined}
                    className={`w-full text-left flex items-center rounded-xl transition-all font-sans text-xs font-medium group relative ${
                      isCollapsedDesktop && !isOpenMobile
                        ? 'p-3 justify-center'
                        : 'px-3 py-2.5 space-x-3'
                    } ${
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/20'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                    }`}
                  >
                    <Icon
                      className={`shrink-0 transition-transform group-hover:scale-110 ${
                        isCollapsedDesktop && !isOpenMobile ? 'w-5 h-5' : 'w-4 h-4'
                      } ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`}
                    />

                    {(!isCollapsedDesktop || isOpenMobile) && (
                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md font-bold uppercase shrink-0 ml-1.5 ${
                              isActive
                                ? 'bg-indigo-800 text-indigo-100'
                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Active Indicator Bar when collapsed */}
                    {isCollapsedDesktop && !isOpenMobile && isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-400 rounded-r-full" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        {(!isCollapsedDesktop || isOpenMobile) && (
          <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono text-center shrink-0 bg-slate-950">
            LabLink LIS Gateway &bull; v2.4.0
          </div>
        )}
      </aside>
    </>
  );
};
