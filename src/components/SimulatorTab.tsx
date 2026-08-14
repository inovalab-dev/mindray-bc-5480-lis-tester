import React, { useState, useEffect } from 'react';
import { Play, Activity, Sparkles, ShieldCheck, FileCode, Copy, Check, Server, Sliders, AlertTriangle, ArrowRightLeft, User, FileText, CheckCircle, Clock, Trash2, Send, Database, Cpu, Plus, ListFilter, RefreshCw } from 'lucide-react';
import { SimulationConfig, MindraySampleResult, MindrayParam, WorklistItem } from '../types';

interface SimulatorTabProps {
  onSimulate: (config: SimulationConfig) => Promise<{
    success?: boolean;
    error?: string;
    mode?: string;
    parsedResult?: MindraySampleResult;
    ackMessage?: string;
    rawHL7Message?: string;
  }>;
  onSelectSample: (sample: MindraySampleResult) => void;
}

interface TimelineStep {
  id: string;
  time: string;
  stage: 'LIS' | 'MINDRAY' | 'NETWORK' | 'ACK';
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
  payload?: string;
}

// Mindray Default HL7 Protocol Configuration - FIXED TO PRESET 1 (WORKS WITH REAL EQUIPMENT)
const FIXED_PRESET_1 = {
  testCode: '00002^CBC+DIFF^99MRC',
  sampleMode: 'BLANK',
  orcCode: 'AF',
  msgTypeResponse: 'ORR^O02',
  useBarcodeAsPatientId: true,
  includePv1: true,
  placerIdMode: 'SAME' as const,
  includeDatesInObr: true,
  dobMode: 'YYYYMMDD' as const,
  includeModeObx: true,
  takeMode: 'CT',
  bloodMode: 'W',
  testModeObx: 'CBC+DIFF'
};

export const SimulatorTab: React.FC<SimulatorTabProps> = ({ onSimulate, onSelectSample }) => {
  // Simulation Mode & LIS State
  const [simWorkflow, setSimWorkflow] = useState<'LIS_WORKLIST' | 'MINDRAY_PUSH'>('LIS_WORKLIST');
  const [sampleId, setSampleId] = useState<string>('548001');
  const [patientId, setPatientId] = useState<string>('P-8842');
  const [patientName, setPatientName] = useState<string>('Silva^Maria');

  // Fixed Preset 1 Values
  const testCode = FIXED_PRESET_1.testCode;
  const sampleMode = FIXED_PRESET_1.sampleMode;
  const orcCode = FIXED_PRESET_1.orcCode;
  const msgTypeResponse = FIXED_PRESET_1.msgTypeResponse;
  const useBarcodeAsPatientId = FIXED_PRESET_1.useBarcodeAsPatientId;
  const includePv1 = FIXED_PRESET_1.includePv1;
  const placerIdMode = FIXED_PRESET_1.placerIdMode;
  const includeDatesInObr = FIXED_PRESET_1.includeDatesInObr;
  const dobMode = FIXED_PRESET_1.dobMode;
  const includeModeObx = FIXED_PRESET_1.includeModeObx;
  const takeMode = FIXED_PRESET_1.takeMode;
  const bloodMode = FIXED_PRESET_1.bloodMode;
  const testModeObx = FIXED_PRESET_1.testModeObx;

  // Mindray Analyzer State (Configured on Mindray side)
  const [profile, setProfile] = useState<SimulationConfig['profile']>('NORMAL');
  const [useCustomValues, setUseCustomValues] = useState<boolean>(false);
  const [wbc, setWbc] = useState<number>(7.2);
  const [rbc, setRbc] = useState<number>(4.65);
  const [hgb, setHgb] = useState<number>(13.8);
  const [hct, setHct] = useState<number>(41.2);
  const [plt, setPlt] = useState<number>(245);

  // Target Mode & Socket Config - DEFAULT TO REAL TCP SOCKET COMMUNICATION
  const [targetMode, setTargetMode] = useState<'INTERNAL' | 'SOCKET_TCP'>('SOCKET_TCP');
  const [targetHost, setTargetHost] = useState<string>('127.0.0.1');
  const [targetPort, setTargetPort] = useState<number>(5151);

  // Execution & Timeline State
  const [loading, setLoading] = useState(false);
  const [timeline, setTimeline] = useState<TimelineStep[]>([]);
  const [lastResult, setLastResult] = useState<{
    success?: boolean;
    error?: string;
    mode?: string;
    parsedResult?: MindraySampleResult;
    ackMessage?: string;
    rawHL7Message?: string;
  } | null>(null);

  const [copiedRaw, setCopiedRaw] = useState(false);
  const [worklistItems, setWorklistItems] = useState<WorklistItem[]>([]);
  const [registerSuccessMsg, setRegisterSuccessMsg] = useState<string>('');

  const fetchWorklist = async () => {
    try {
      const res = await fetch('/api/worklist');
      if (!res.ok) return;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const data = await res.json();
      if (data && data.worklist) {
        setWorklistItems(data.worklist);
      }
    } catch (e) {
      console.error('Erro ao carregar worklist:', e);
    }
  };

  useEffect(() => {
    fetchWorklist();
    const interval = setInterval(fetchWorklist, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRegisterWorklist = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sampleId.trim()) return;

    try {
      const res = await fetch('/api/worklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleId: sampleId.trim(),
          patientId: patientId.trim(),
          patientName: patientName.trim(),
          gender: 'F',
          age: '34a',
          testCode,
          sampleMode,
          orcCode,
          msgTypeResponse,
          useBarcodeAsPatientId,
          includePv1,
          placerIdMode,
          includeDatesInObr,
          dobMode,
          includeModeObx,
          takeMode,
          bloodMode,
          testModeObx
        })
      });
      const data = await res.json();
      if (data.success) {
        setRegisterSuccessMsg(`Ordem para Amostra #${sampleId} cadastrada no LIS com SUCESSO!`);
        setTimeout(() => setRegisterSuccessMsg(''), 4000);
        fetchWorklist();
      }
    } catch (e: any) {
      console.error('Erro ao cadastrar na worklist:', e);
    }
  };

  const handleRunSimulation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setLastResult(null);
    setTimeline([]);

    const nowStr = () => new Date().toLocaleTimeString('pt-BR', { hour12: false });

    // Step 1: LIS Order Registration
    const step1: TimelineStep = {
      id: 'step-1',
      time: nowStr(),
      stage: 'LIS',
      title: simWorkflow === 'LIS_WORKLIST' 
        ? '1. LIS &rarr; Envio de Cadastro / Worklist (ORM^O01)'
        : '1. LIS &rarr; Cadastro de Pedido Aguardando Processamento',
      description: `LIS cadastra ordem para Amostra #${sampleId} - Paciente: ${patientName} (ID: ${patientId || 'N/A'}) e notifica a interface do equipamento.`,
      type: 'info'
    };

    setTimeline([step1]);

    try {
      await new Promise(r => setTimeout(r, 250));

      // Step 2: Mindray Barcode Read & Query
      const step2: TimelineStep = {
        id: 'step-2',
        time: nowStr(),
        stage: 'MINDRAY',
        title: '2. Mindray BC-5480 &rarr; Leitura do Barcode e Consulta (QRY^Q02)',
        description: `Equipamento Mindray aspira a amostra #${sampleId}, reconhece o cadastro no LIS, realiza a contagem celular (${useCustomValues ? `WBC: ${wbc}, RBC: ${rbc}, HGB: ${hgb}, PLT: ${plt}` : `Perfil: ${profile}`}).`,
        type: 'info'
      };

      setTimeline([step1, step2]);

      const res = await onSimulate({
        sampleId,
        patientId,
        patientName,
        profile: useCustomValues ? 'CUSTOM' : profile,
        includeFlags: true,
        protocol: 'HL7_MLLP',
        targetMode,
        targetHost,
        targetPort,
        customValues: useCustomValues ? { wbc, rbc, hgb, hct, plt } : undefined
      });

      setLastResult(res);

      if (res?.success) {
        // Step 3: Mindray Transmits HL7 Result (ORU^R01)
        const step3: TimelineStep = {
          id: 'step-3',
          time: nowStr(),
          stage: 'MINDRAY',
          title: `3. Mindray &rarr; LIS: Envio do Resultado do Exame (ORU^R01 via TCP ${targetMode === 'SOCKET_TCP' ? `${targetHost}:${targetPort}` : '5151'})`,
          description: 'Equipamento encapsula os parâmetros do hemograma no envelope HL7 MLLP e transmite via Socket TCP.',
          type: 'info',
          payload: res.rawHL7Message
        };

        // Step 4: LIS Decodes and Populates Report
        const step4: TimelineStep = {
          id: 'step-4',
          time: nowStr(),
          stage: 'LIS',
          title: '4. Servidor LIS &rarr; Decodificação e Gravação do Laudo',
          description: `LIS recebe os segmentos MSH/PID/OBR/OBX, valida os intervalos numéricos e salva ${Object.keys(res.parsedResult?.parameters || {}).length} parâmetros no laudo do paciente.`,
          type: 'success'
        };

        // Step 5: LIS Sends ACK (MSA|AA) Back to Mindray
        const step5: TimelineStep = {
          id: 'step-5',
          time: nowStr(),
          stage: 'ACK',
          title: '5. LIS &rarr; Mindray: Confirmação ACK (MSA|AA) Devolvida',
          description: 'LIS confirma recebimento com sucesso. O Mindray libera o tubo de ensaio e finaliza o ciclo.',
          type: 'success',
          payload: res.ackMessage
        };

        setTimeline([step1, step2, step3, step4, step5]);

        // Auto increment sample ID for convenience
        const num = parseInt(sampleId.replace(/\D/g, ''), 10) || 548000;
        setSampleId((num + 1).toString());
      } else {
        const errStep: TimelineStep = {
          id: 'step-err',
          time: nowStr(),
          stage: 'NETWORK',
          title: 'Erro de Comunicação TCP',
          description: res?.error || 'Não foi possível completar a troca de mensagens com o LIS.',
          type: 'error'
        };
        setTimeline([step1, step2, errStep]);
      }
    } catch (err: any) {
      setLastResult({
        success: false,
        error: err?.message || 'Erro inesperado na transmissão.'
      });
      setTimeline(prev => [
        ...prev,
        {
          id: 'step-fatal',
          time: nowStr(),
          stage: 'NETWORK',
          title: 'Falha na Conexão',
          description: err?.message || 'Conexão recusada ou timeout.',
          type: 'error'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearTimeline = () => {
    setTimeline([]);
    setLastResult(null);
  };

  const copyRaw = () => {
    if (lastResult?.rawHL7Message) {
      navigator.clipboard.writeText(lastResult.rawHL7Message);
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Selector between Simulation Mode & Real Equipment Connection */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Selecione o Modo de Operação:</span>
          </label>
          <span className="text-[11px] text-slate-400 font-mono">
            Protocolo: HL7 v2.3.1 (MLLP \x0B ... \x1C\x0D)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Mode 1: Simulated Web Flow */}
          <button
            type="button"
            onClick={() => setTargetMode('INTERNAL')}
            className={`p-4 rounded-2xl border transition-all text-left flex items-start space-x-3.5 cursor-pointer ${
              targetMode === 'INTERNAL'
                ? 'bg-gradient-to-r from-indigo-950/80 to-slate-900 border-indigo-500 shadow-xl ring-2 ring-indigo-500/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
            }`}
          >
            <div className={`p-3 rounded-xl shrink-0 ${targetMode === 'INTERNAL' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-800 text-slate-400'}`}>
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm text-white">1. Fluxo Simulado (Sandbox Web)</h3>
                {targetMode === 'INTERNAL' && (
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono px-2 py-0.5 rounded-full font-bold">
                    ATIVO
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Simula o LIS e o Mindray BC-5480 no navegador. Ideal para testar envio de parâmetros, gerar laudos e validar respostas ACK sem precisar de equipamento físico ligado.
              </p>
            </div>
          </button>

          {/* Mode 2: Real TCP Connection Flow */}
          <button
            type="button"
            onClick={() => setTargetMode('SOCKET_TCP')}
            className={`p-4 rounded-2xl border transition-all text-left flex items-start space-x-3.5 cursor-pointer ${
              targetMode === 'SOCKET_TCP'
                ? 'bg-gradient-to-r from-emerald-950/80 to-slate-900 border-emerald-500 shadow-xl ring-2 ring-emerald-500/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
            }`}
          >
            <div className={`p-3 rounded-xl shrink-0 ${targetMode === 'SOCKET_TCP' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'bg-slate-800 text-slate-400'}`}>
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm text-white">2. Fluxo Real (LIS &hArr; Equipamento Mindray Físico)</h3>
                {targetMode === 'SOCKET_TCP' && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono px-2 py-0.5 rounded-full font-bold">
                    ATIVO
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Comunicação direta via Socket TCP MLLP (Porta 5151). Aponta para o IP do seu LIS Real ou do Equipamento na rede local do laboratório (LAN).
              </p>
            </div>
          </button>

        </div>
      </div>

      {/* Mode Specific Guidance / TCP Configuration Box */}
      {targetMode === 'SOCKET_TCP' && (
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Configuração do Socket TCP Direto (Fluxo Real LIS)</h3>
                <p className="text-[11px] text-slate-400">Insira o IP e Porta do LIS/Equipamento para disparar ou escutar conexões MLLP reais</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-400">Status TCP:</span>
              <span className="text-emerald-400 font-bold">Escutando 0.0.0.0:5151</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">IP do Servidor LIS / Equipamento</label>
              <input
                type="text"
                value={targetHost}
                onChange={(e) => setTargetHost(e.target.value)}
                placeholder="192.168.68.203"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Porta Socket TCP MLLP</label>
              <input
                type="number"
                value={targetPort}
                onChange={(e) => setTargetPort(Number(e.target.value))}
                placeholder="5151"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-indigo-300 font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => handleRunSimulation()}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                {loading ? (
                  <Activity className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
                <span>Testar Socket TCP Direto</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5 leading-relaxed">
            <p className="font-semibold text-emerald-400 flex items-center space-x-1.5">
              <CheckCircle className="w-4 h-4" />
              <span>Como Funciona a Integração Real do Equipamento no Laboratório:</span>
            </p>
            <p className="text-[11px] text-slate-400">
              1. No menu <strong>"Config interface"</strong> do Mindray BC-5480, configure o IP do seu computador (ex: <code className="text-emerald-400 font-mono">192.168.68.203</code>) e a porta <code className="text-indigo-300 font-mono">5151</code>.
            </p>
            <p className="text-[11px] text-slate-400">
              2. Quando o equipamento finaliza a amostra, ele abre uma conexão TCP Socket e envia o pacote MLLP <code className="text-amber-300 font-mono">ORU^R01</code>.
            </p>
            <p className="text-[11px] text-slate-400">
              3. O seu LIS ou o nosso script receptor lê o envelope, grava no banco do LIS e devolve a confirmação <code className="text-emerald-300 font-mono">MSA|AA</code> para liberar a máquina.
            </p>
          </div>
        </div>
      )}

      {/* Top Banner Indicator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <span>Simulador Bidirecional LIS &hArr; Mindray BC-5480</span>
            </h2>
            <p className="text-xs text-slate-400">
              {targetMode === 'INTERNAL'
                ? 'Cadastre a ordem no LIS Web • Modifique os parâmetros do Hemograma • Visualize o Laudo em tempo real.'
                : `Transmissão TCP Socket MLLP Ativa em ${targetHost}:${targetPort} • Dispare pacotes HL7 reais.`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">Modo Atual:</span>
            <span className="text-emerald-400 font-bold">{targetMode === 'SOCKET_TCP' ? `TCP (${targetHost}:${targetPort})` : 'Web Sandbox'}</span>
          </div>

          {timeline.length > 0 && (
            <button
              onClick={clearTimeline}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
              title="Limpar Histórico da Timeline"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Limpar Timeline</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Side 1 LIS | Side 2 Mindray */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ==================== 1. SERVIDOR LIS (SOLICITANTE & RECEPTOR) ==================== */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* Header LIS */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-md">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">1. Servidor LIS (Laboratório)</h3>
                  <p className="text-[11px] text-slate-400">Solicitante de Exames & Receptor de Laudos</p>
                </div>
              </div>
              <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase">
                LIS Server
              </span>
            </div>

            {/* Form LIS: Sample & Patient Registration */}
            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cadastro do Pedido de Exame no LIS</span>
              </h4>
              
              {registerSuccessMsg && (
                <div className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs px-3 py-2 rounded-lg flex items-center space-x-2 animate-fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{registerSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Cód. Amostra (Barcode)</label>
                  <input
                    type="text"
                    value={sampleId}
                    onChange={(e) => setSampleId(e.target.value)}
                    placeholder="Ex: 548001"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">ID do Paciente</label>
                  <input
                    type="text"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="Ex: P-8842"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-slate-400 font-medium mb-1">Nome do Paciente (Sobrenome^Nome)</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Ex: Silva^Maria"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Preset 1 Fixed Configuration Indicator */}
              <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-900 border border-emerald-500/50 rounded-xl p-3 text-xs space-y-1.5 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>Preset 1 Fixado (Padrão Oficial OBX Mindray BC-5480)</span>
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold border border-emerald-500/40">
                    ⭐ ATIVO E FIXADO
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Configuração HL7 v2.3.1 otimizada para comunicação real com o equipamento <strong>Mindray BC-5480</strong>.
                </p>
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-[10px] font-mono text-emerald-300 grid grid-cols-2 gap-1.5">
                  <div>• OBR-4: <span className="text-white">00002^CBC+DIFF^99MRC</span></div>
                  <div>• 08001 Take: <span className="text-white">CT (Closed Tube)</span></div>
                  <div>• 08002 Blood: <span className="text-white">W (Whole Blood)</span></div>
                  <div>• 08003 Test: <span className="text-white">CBC+DIFF</span></div>
                </div>
              </div>

              {/* LIS Action Trigger Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRegisterWorklist}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>Cadastrar na Worklist LIS</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunSimulation()}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
                >
                  {loading ? (
                    <Activity className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Send className="w-4 h-4 text-white" />
                  )}
                  <span>Simular Resposta</span>
                </button>
              </div>
            </div>

            {/* Registered Worklist Queue List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-bold text-slate-300 flex items-center space-x-1.5">
                  <ListFilter className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Ordens Cadastradas no LIS ({worklistItems.length})</span>
                </span>
                <button
                  type="button"
                  onClick={fetchWorklist}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Atualizar</span>
                </button>
              </div>

              {worklistItems.length === 0 ? (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                  Nenhuma ordem pendente cadastrada no LIS.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {worklistItems.map((item, idx) => (
                    <div
                      key={`${item.sampleId}-${idx}`}
                      className={`p-3 rounded-xl border transition-all text-xs flex items-center justify-between gap-3 ${
                        item.status === 'COMPLETED'
                          ? 'bg-emerald-950/30 border-emerald-500/40'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-emerald-400 text-xs">
                            #{item.sampleId}
                          </span>
                          <span className="font-bold text-slate-200">
                            {item.patientName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({item.patientId})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[10px] font-mono pt-0.5">
                          {item.testCode && (
                            <span className="bg-indigo-950 text-indigo-300 border border-indigo-800/60 px-1.5 py-0.2 rounded">
                              OBR-4: {item.testCode}
                            </span>
                          )}
                          {item.sampleMode && (
                            <span className="bg-amber-950 text-amber-300 border border-amber-800/60 px-1.5 py-0.2 rounded">
                              OBR-15: {item.sampleMode}
                            </span>
                          )}
                          {item.orcCode && (
                            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                              ORC-1: {item.orcCode}
                            </span>
                          )}
                          {item.msgTypeResponse && (
                            <span className="bg-purple-950 text-purple-300 border border-purple-800/60 px-1.5 py-0.2 rounded">
                              MSH-9: {item.msgTypeResponse}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Cadastrado às {item.createdAt}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {item.status === 'COMPLETED' ? (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span>LAUDO RECEBIDO</span>
                          </span>
                        ) : (
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 animate-pulse">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>AGUARDANDO MINDRAY</span>
                          </span>
                        )}

                        {item.result && (
                          <button
                            type="button"
                            onClick={() => onSelectSample(item.result!)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg"
                          >
                            Ver Laudo
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Display Received Laudo from Mindray on LIS */}
            {lastResult?.parsedResult?.parameters ? (
              <div className="space-y-3">
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="font-bold text-xs text-emerald-300">
                        Laudo Recebido para Amostra #{lastResult.parsedResult.sampleId}
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        Paciente: <strong>{lastResult.parsedResult.patientName || 'Não Informado'}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onSelectSample(lastResult.parsedResult!)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-xs font-semibold"
                  >
                    Abrir Detalhes
                  </button>
                </div>

                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden text-xs">
                  <div className="bg-slate-900 px-3 py-1.5 border-b border-slate-800 flex justify-between items-center text-slate-300 font-bold">
                    <span>Valores no Banco do LIS</span>
                    <span className="text-[10px] text-slate-400 font-mono font-normal">
                      {Object.keys(lastResult.parsedResult.parameters).length} Parâmetros
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/60 font-mono">
                    {Object.entries(lastResult.parsedResult.parameters).map(([key, p]) => {
                      const param = p as MindrayParam;
                      return (
                        <div key={key} className="px-3 py-1.5 flex items-center justify-between hover:bg-slate-900/40 text-[11px]">
                          <span className="font-bold text-slate-200">{key} <span className="text-[10px] font-sans text-slate-400">({param.name})</span></span>
                          <span className={`font-bold ${param.flag === 'H' ? 'text-amber-400' : param.flag === 'L' ? 'text-cyan-400' : 'text-emerald-400'}`}>
                            {param.value} {param.unit} {param.flag && param.flag !== 'N' && `[${param.flag}]`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center space-y-2 text-slate-400 text-xs">
                <Database className="w-8 h-8 mx-auto text-slate-700" />
                <p>Nenhum laudo recebido para esta amostra ainda.</p>
                <p className="text-[10px] text-slate-500">
                  Defina os parâmetros do exame no lado do <strong>Servidor Mindray</strong> e clique no botão de disparo.
                </p>
              </div>
            )}

          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400">
            <strong>Função do LIS:</strong> Cria os registros de pedidos e escuta a porta MLLP (<code className="text-emerald-400 font-mono">TCP 5151</code>). Quando o Mindray envia o exame, o LIS salva o hemograma e responde com ACK.
          </div>
        </div>

        {/* ==================== 2. SERVIDOR MINDRAY (EQUIPAMENTO & EMISSOR) ==================== */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* Header Mindray */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">2. Servidor Mindray BC-5480</h3>
                  <p className="text-[11px] text-slate-400">Analisador Hematológico (Emissor HL7 MLLP)</p>
                </div>
              </div>
              <span className="bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase">
                Equipamento
              </span>
            </div>

            <form onSubmit={handleRunSimulation} className="space-y-4">
              
              {/* Target Mode Selector */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px]">Destino da Conexão TCP</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetMode('INTERNAL')}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      targetMode === 'INTERNAL'
                        ? 'bg-indigo-600/20 border-indigo-500 text-slate-100 font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>Simulação Web Direta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetMode('SOCKET_TCP')}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      targetMode === 'SOCKET_TCP'
                        ? 'bg-emerald-600/20 border-emerald-500 text-slate-100 font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>Socket TCP Real</span>
                  </button>
                </div>

                {targetMode === 'SOCKET_TCP' && (
                  <div className="pt-2 border-t border-slate-800 grid grid-cols-12 gap-2 text-xs">
                    <div className="col-span-8">
                      <label className="block text-slate-400 text-[10px] mb-0.5">Host / IP LIS</label>
                      <input
                        type="text"
                        value={targetHost}
                        onChange={(e) => setTargetHost(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-slate-400 text-[10px] mb-0.5">Porta TCP</label>
                      <input
                        type="number"
                        value={targetPort}
                        onChange={(e) => setTargetPort(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Mindray Result Customizer */}
              <div className="space-y-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5 text-[11px]">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Parâmetros de Medição (Mindray)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setUseCustomValues(!useCustomValues)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium"
                  >
                    {useCustomValues ? 'Perfil Pronto' : 'Editar Manualmente'}
                  </button>
                </div>

                {!useCustomValues ? (
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      { id: 'NORMAL', title: 'Normal Adulto', desc: 'WBC 7.2 | RBC 4.65 | HGB 13.8 | PLT 245' },
                      { id: 'ANEMIA', title: 'Anemia Microcítica', desc: 'RBC 3.12 (L) | HGB 8.5 (L) | VCM 74.5 (L)' },
                      { id: 'LEUKOCYTOSIS', title: 'Leucocitose', desc: 'WBC 18.5 (H) | Neutrófilos 82% (H)' },
                      { id: 'THROMBOCYTOPENIA', title: 'Trombocitopenia', desc: 'Plaquetas 42.000/uL (L)' }
                    ].map(item => (
                      <label
                        key={item.id}
                        className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                          profile === item.id
                            ? 'bg-indigo-600/15 border-indigo-500/80 text-slate-100'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="profile"
                            checked={profile === item.id}
                            onChange={() => setProfile(item.id as any)}
                            className="text-indigo-600 focus:ring-0"
                          />
                          <span className="font-semibold text-slate-200 text-xs">{item.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{item.desc}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-0.5">WBC (10^9/L)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={wbc}
                        onChange={(e) => setWbc(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-0.5">RBC (10^12/L)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={rbc}
                        onChange={(e) => setRbc(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-0.5">HGB (g/dL)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={hgb}
                        onChange={(e) => setHgb(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-0.5">HCT (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={hct}
                        onChange={(e) => setHct(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-slate-400 text-[10px] mb-0.5">PLT (10^9/L)</label>
                      <input
                        type="number"
                        step="1"
                        value={plt}
                        onChange={(e) => setPlt(parseInt(e.target.value, 10) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
              >
                {loading ? (
                  <Activity className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Disparar Fluxo Bidirecional LIS &hArr; Mindray</span>
              </button>
            </form>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400">
            <strong>Função do Mindray:</strong> Recebe os parâmetros de medição, encapsula no padrão MLLP (<code className="text-indigo-400 font-mono">\x0bMSH...\x1c\r</code>) e envia ao Servidor LIS.
          </div>
        </div>

      </div>

      {/* ==================== 3. TIMELINE INTERATIVA DA COMUNICAÇÃO ==================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-100">Timeline da Comunicação Bidirecional</h3>
            <span className="text-xs text-slate-400 font-normal">
              ({timeline.length} {timeline.length === 1 ? 'etapa registrada' : 'etapas registradas'})
            </span>
          </div>

          {timeline.length > 0 && (
            <button
              onClick={clearTimeline}
              className="flex items-center space-x-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/80 px-2.5 py-1 rounded-lg border border-rose-800/50 transition-colors font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Timeline</span>
            </button>
          )}
        </div>

        {timeline.length === 0 ? (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center space-y-2 text-slate-400 text-xs">
            <Send className="w-8 h-8 mx-auto text-slate-700" />
            <p className="font-semibold text-slate-300">Nenhum evento registrado na linha do tempo.</p>
            <p className="text-[11px] text-slate-500">
              Clique em <strong>&quot;Disparar Fluxo Bidirecional LIS &hArr; Mindray&quot;</strong> para simular a troca de mensagens em tempo real.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
            {timeline.map((item) => (
              <div key={item.id} className="relative group">
                
                {/* Timeline Dot Badge */}
                <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                  item.stage === 'LIS' ? 'bg-emerald-950 text-emerald-400 border-emerald-500' :
                  item.stage === 'MINDRAY' ? 'bg-indigo-950 text-indigo-400 border-indigo-500' :
                  item.stage === 'NETWORK' ? 'bg-cyan-950 text-cyan-400 border-cyan-500' :
                  'bg-purple-950 text-purple-400 border-purple-500'
                }`}>
                  {item.stage === 'LIS' ? <Server className="w-3 h-3" /> :
                   item.stage === 'MINDRAY' ? <Cpu className="w-3 h-3" /> :
                   item.stage === 'NETWORK' ? <Send className="w-3 h-3" /> :
                   <CheckCircle className="w-3 h-3" />}
                </div>

                {/* Timeline Card Content */}
                <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                  item.type === 'success' ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-200' :
                  item.type === 'error' ? 'bg-rose-950/30 border-rose-500/40 text-rose-200' :
                  'bg-slate-950 border-slate-800 text-slate-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 flex items-center space-x-2">
                      <span>{item.title}</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">{item.time}</span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {item.description}
                  </p>

                  {item.payload && (
                    <div className="mt-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 font-mono">
                        <span>Pacote MLLP Transmission Data:</span>
                        <button
                          onClick={copyRaw}
                          className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                        >
                          {copiedRaw ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedRaw ? 'Copiado' : 'Copiar Payload'}</span>
                        </button>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg font-mono text-[10px] text-emerald-400 whitespace-pre-wrap max-h-24 overflow-y-auto border border-slate-800">
                        {item.payload}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};



