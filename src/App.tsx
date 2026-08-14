import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LogsMonitor } from './components/LogsMonitor';
import { SimulatorTab } from './components/SimulatorTab';
import { UritSimulatorTab } from './components/UritSimulatorTab';
import { MaxionSimulatorTab } from './components/MaxionSimulatorTab';
import { MaxcoagSimulatorTab } from './components/MaxcoagSimulatorTab';
import { WamaSimulatorTab } from './components/WamaSimulatorTab';
import { FinecareSimulatorTab } from './components/FinecareSimulatorTab';
import { UniversalSimulatorTab } from './components/UniversalSimulatorTab';
import { OrdersTab } from './components/OrdersTab';
import { CreateOrderTab } from './components/CreateOrderTab';
import { MappingTab } from './components/MappingTab';
import { EquipmentsTab } from './components/EquipmentsTab';
import { DecoderTab } from './components/DecoderTab';
import { GuideTab } from './components/GuideTab';
import { SampleDetailModal } from './components/SampleDetailModal';
import { ServerStatus, CommLogEntry, MindraySampleResult, SimulationConfig } from './types';

export default function App() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [logs, setLogs] = useState<CommLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<string>('orders');
  const [selectedSample, setSelectedSample] = useState<MindraySampleResult | null>(null);
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);

  const safeFetchJson = async (url: string, options?: RequestInit) => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await res.json();
      }
    } catch (e) {
      // Ignore transient fetch errors (e.g. server restart / brief disconnects)
    }
    return null;
  };

  const fetchStatus = async () => {
    const data = await safeFetchJson('/api/status');
    if (data) {
      setStatus(data);
    }
  };

  const fetchLogs = async () => {
    const data = await safeFetchJson('/api/logs');
    if (data) {
      setLogs(data.logs || []);
    }
  };

  const handleClearLogs = async () => {
    try {
      await safeFetchJson('/api/clear-logs', { method: 'POST' });
      fetchLogs();
    } catch (e) {
      console.error('Erro ao limpar logs:', e);
    }
  };

  const handleSimulateQuick = async () => {
    try {
      const data = await safeFetchJson('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleId: Math.floor(100000 + Math.random() * 900000).toString(),
          patientId: 'P-' + Math.floor(1000 + Math.random() * 9000),
          patientName: 'Paciente^Teste',
          profile: 'NORMAL',
          includeFlags: true,
          protocol: 'HL7_MLLP'
        })
      });
      if (data) {
        fetchLogs();
        fetchStatus();
        if (data.parsedResult) {
          setSelectedSample(data.parsedResult);
        }
      }
    } catch (e) {
      console.error('Erro na simulação rápida:', e);
    }
  };

  const handleSimulateConfig = async (config: SimulationConfig) => {
    const data = await safeFetchJson('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    fetchLogs();
    fetchStatus();
    return data;
  };

  const handleSimulateUrit = async (config: any) => {
    const data = await safeFetchJson('/api/simulate-urit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    fetchLogs();
    fetchStatus();
    return data;
  };

  const handleSimulateMaxion = async (config: any) => {
    const data = await safeFetchJson('/api/simulate-maxion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    fetchLogs();
    fetchStatus();
    return data;
  };

  const handleSimulateMaxcoag = async (config: any) => {
    const data = await safeFetchJson('/api/simulate-maxcoag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    fetchLogs();
    fetchStatus();
    return data;
  };

  const handleSimulateWama = async (config: any) => {
    const data = await safeFetchJson('/api/simulate-wama', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    fetchLogs();
    fetchStatus();
    return data;
  };

  const handleSimulateFinecare = async (config: any) => {
    const data = await safeFetchJson('/api/simulate-finecare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    fetchLogs();
    fetchStatus();
    return data;
  };

  const handleParseRaw = async (rawText: string) => {
    const data = await safeFetchJson('/api/parse-raw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText })
    });
    fetchLogs();
    fetchStatus();
    return data;
  };

  useEffect(() => {
    fetchStatus();
    fetchLogs();
    const interval = setInterval(() => {
      fetchLogs();
      fetchStatus();
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white flex flex-col lg:flex-row">
      
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        status={status}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header & Status Bar */}
        <Header
          status={status}
          onRefresh={() => {
            fetchStatus();
            fetchLogs();
          }}
          onClearLogs={handleClearLogs}
          onSimulateQuick={handleSimulateQuick}
          activeTab={activeTab}
          onMenuToggle={() => setIsOpenMobile(true)}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 py-5">
          {activeTab === 'create-order' && (
            <CreateOrderTab
              onOrderCreated={() => setActiveTab('orders')}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersTab
              onSelectSample={(sample) => setSelectedSample(sample)}
            />
          )}

          {activeTab === 'equipments' && (
            <EquipmentsTab />
          )}

          {activeTab === 'depara-mapping' && (
            <MappingTab />
          )}

          {activeTab === 'logs' && (
            <LogsMonitor
              logs={logs}
              onSelectSample={(sample) => setSelectedSample(sample)}
              onClearLogs={handleClearLogs}
            />
          )}

          {activeTab === 'universal-simulator' && (
            <UniversalSimulatorTab
              onSelectSample={(sample) => setSelectedSample(sample)}
            />
          )}

          {activeTab === 'simulator' && (
            <SimulatorTab
              onSimulate={handleSimulateConfig}
              onSelectSample={(sample) => setSelectedSample(sample)}
            />
          )}

          {activeTab === 'urit-simulator' && (
            <UritSimulatorTab
              onSimulateUrit={handleSimulateUrit}
              onSelectSample={(sample) => setSelectedSample(sample)}
            />
          )}

          {activeTab === 'maxion-simulator' && (
            <MaxionSimulatorTab
              onSimulateMaxion={handleSimulateMaxion}
              onSelectSample={(sample) => setSelectedSample(sample)}
            />
          )}

          {activeTab === 'maxcoag-simulator' && (
            <MaxcoagSimulatorTab
              onSimulateMaxcoag={handleSimulateMaxcoag}
              onSelectSample={(sample) => setSelectedSample(sample)}
            />
          )}

          {activeTab === 'wama-simulator' && (
            <WamaSimulatorTab
              onSimulateWama={handleSimulateWama}
              onSelectSample={(sample) => setSelectedSample(sample)}
            />
          )}

          {activeTab === 'finecare-simulator' && (
            <FinecareSimulatorTab
              onSimulateFinecare={handleSimulateFinecare}
              onSelectSample={(sample) => setSelectedSample(sample)}
            />
          )}

          {activeTab === 'decoder' && (
            <DecoderTab
              onParseRaw={handleParseRaw}
              onSelectSample={(sample) => setSelectedSample(sample)}
            />
          )}

          {activeTab === 'guide' && <GuideTab />}
        </main>
      </div>

      {/* Sample Details Modal */}
      <SampleDetailModal
        sample={selectedSample}
        onClose={() => setSelectedSample(null)}
      />

    </div>
  );
}

