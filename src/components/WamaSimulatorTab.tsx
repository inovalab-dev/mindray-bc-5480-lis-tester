import React, { useState } from 'react';
import { Play, Copy, Check, Terminal, TestTube, Send, RefreshCw, Activity, Cpu, Cable } from 'lucide-react';
import {
  WamaProfile,
  WamaProtocol,
  WamaSampleResult,
  getWamaProfileParameters,
  generateWamaMessage,
  stringToHexWama
} from '../lib/wamaParser';

interface WamaSimulatorTabProps {
  onSimulateWama: (config: any) => Promise<any>;
  onSelectSample: (sample: any) => void;
}

export const WamaSimulatorTab: React.FC<WamaSimulatorTabProps> = ({
  onSimulateWama,
  onSelectSample
}) => {
  const [sampleId, setSampleId] = useState<string>('URI-7011');
  const [patientId, setPatientId] = useState<string>('P-9011');
  const [patientName, setPatientName] = useState<string>('Mariana Santos');
  const [profile, setProfile] = useState<WamaProfile>('NORMAL');
  const [protocol, setProtocol] = useState<WamaProtocol>('RS232_ASCII');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedHex, setCopiedHex] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<WamaSampleResult | null>(null);

  const [customValues, setCustomValues] = useState<Record<string, string>>({
    LEU: 'Negativo',
    NIT: 'Negativo',
    URO: 'Normal',
    PRO: 'Negativo',
    PH: '6.0',
    BLD: 'Negativo',
    SG: '1.015',
    KET: 'Negativo',
    BIL: 'Negativo',
    GLU: 'Negativo',
    VC: 'Negativo'
  });

  const [selectedParameters, setSelectedParameters] = useState<string[]>([
    'LEU', 'NIT', 'URO', 'PRO', 'PH', 'BLD', 'SG', 'KET', 'BIL', 'GLU', 'VC'
  ]);

  const toggleParameter = (code: string) => {
    setSelectedParameters(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const setAllParameters = (all: boolean) => {
    if (all) setSelectedParameters(['LEU', 'NIT', 'URO', 'PRO', 'PH', 'BLD', 'SG', 'KET', 'BIL', 'GLU', 'VC']);
    else setSelectedParameters([]);
  };

  const wamaGen = generateWamaMessage({
    sampleId,
    patientId,
    patientName,
    profile,
    protocol,
    customValues: profile === 'CUSTOM' ? customValues : undefined,
    selectedParameters
  });

  const rawDisplay = wamaGen.raw;
  const hexDisplay = stringToHexWama(rawDisplay);
  const previewParams = getWamaProfileParameters(profile, profile === 'CUSTOM' ? customValues : undefined, selectedParameters);

  const handleSendSimulation = async () => {
    setSending(true);
    try {
      const config = {
        analyzerModel: 'Wama UriRead / Uroanálise',
        sampleId,
        patientId,
        patientName,
        profile,
        protocol,
        customValues: profile === 'CUSTOM' ? customValues : undefined,
        selectedParameters
      };

      const res = await onSimulateWama(config);
      if (res && res.parsedResult) {
        setLastResult(res.parsedResult);
        onSelectSample(res.parsedResult);
      }
    } catch (e) {
      console.error('Erro ao simular Wama:', e);
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = (text: string, isHex: boolean = false) => {
    navigator.clipboard.writeText(text);
    if (isHex) {
      setCopiedHex(true);
      setTimeout(() => setCopiedHex(false), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">

      {/* Equipment Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-slate-950 border border-amber-800/50 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <TestTube className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl font-bold tracking-tight text-white font-sans">
                  WAMA DIAGNÓSTICA (LEITOR DE UROANÁLISE)
                </h2>
                <span className="text-[10px] uppercase font-mono tracking-wider bg-amber-950/80 text-amber-300 border border-amber-700/60 px-2.5 py-0.5 rounded-full font-bold">
                  Leitor de Tiras Reativas de Urina (10/11 Parâmetros)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Interface de Comunicação RS-232 / Serial ASCII & Simulador de Transmissão LIS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendSimulation}
              disabled={sending}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
            >
              {sending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{sending ? 'Transmitindo...' : 'Transmitir Urina ao LIS'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Control Panel */}
        <div className="lg:col-span-5 space-y-5">

          {/* Sample & Patient Config Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>Dados da Amostra & Paciente</span>
              </h3>
              <span className="text-[10px] text-amber-400 font-mono bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                Porta COM / RS232
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Amostra ID *
                </label>
                <input
                  type="text"
                  value={sampleId}
                  onChange={(e) => setSampleId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-amber-300 font-mono text-xs focus:outline-none focus:border-amber-500 font-bold"
                  placeholder="Ex: URI-7011"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  ID Paciente / Prontuário
                </label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
                  placeholder="Ex: P-9011"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Nome do Paciente
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                  placeholder="Ex: Mariana Santos"
                />
              </div>
            </div>

            {/* Protocol Selection */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                Protocolo de Saída Wama
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setProtocol('RS232_ASCII')}
                  className={`px-2.5 py-2 rounded-xl font-mono text-[10px] font-semibold transition-all border ${
                    protocol === 'RS232_ASCII'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/80'
                  }`}
                >
                  📟 RS232 ASCII (Serial / Print)
                </button>
                <button
                  type="button"
                  onClick={() => setProtocol('HL7_MLLP')}
                  className={`px-2.5 py-2 rounded-xl font-mono text-[10px] font-semibold transition-all border ${
                    protocol === 'HL7_MLLP'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/80'
                  }`}
                >
                  📡 HL7 v2.3.1 (MLLP)
                </button>
                <button
                  type="button"
                  onClick={() => setProtocol('ASTM_1381')}
                  className={`px-2.5 py-2 rounded-xl font-mono text-[10px] font-semibold transition-all border ${
                    protocol === 'ASTM_1381'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/80'
                  }`}
                >
                  📋 ASTM 1381 / 1394
                </button>
              </div>
            </div>

            {/* Selective Exam Filter (Para não estragar amostra / economizar reagente) */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <TestTube className="w-3.5 h-3.5 text-amber-400" />
                  <span>Seleção Seletiva de Exames (Evita Reagente Desnecessário)</span>
                </label>
                <div className="flex items-center space-x-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setAllParameters(true)}
                    className="text-amber-400 hover:underline font-mono"
                  >
                    Marcar Todos
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedParameters(['LEU', 'NIT', 'PRO', 'GLU'])}
                    className="text-amber-400 hover:underline font-mono"
                  >
                    Rotina ITU
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => setAllParameters(false)}
                    className="text-slate-400 hover:underline font-mono"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                {[
                  { code: 'LEU', label: 'LEU (Leucócitos)' },
                  { code: 'NIT', label: 'NIT (Nitrito)' },
                  { code: 'URO', label: 'URO (Urobilinogênio)' },
                  { code: 'PRO', label: 'PRO (Proteínas)' },
                  { code: 'PH', label: 'pH Uro' },
                  { code: 'BLD', label: 'BLD (Sangue)' },
                  { code: 'SG', label: 'SG (Densidade)' },
                  { code: 'KET', label: 'KET (Cetonas)' },
                  { code: 'BIL', label: 'BIL (Bilirrubina)' },
                  { code: 'GLU', label: 'GLU (Glicose)' },
                  { code: 'VC', label: 'VC (Vit C)' }
                ].map(item => {
                  const isChecked = selectedParameters.includes(item.code);
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => toggleParameter(item.code)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                        isChecked
                          ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span className="text-[10px] font-semibold">{item.label}</span>
                      <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold shrink-0 ${
                        isChecked ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-600'
                      }`}>
                        {isChecked ? '✓' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Clinical Preset Selector */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Perfis de Uroanálise (Casos Clínicos)</span>
            </h3>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {[
                {
                  id: 'NORMAL',
                  title: '🟢 Normal (EaU Fisiológica)',
                  desc: 'Leucócitos: Neg | Nitrito: Neg | Proteínas: Neg | Glicose: Neg | pH: 6.0 | SG: 1.015'
                },
                {
                  id: 'UTI_INFECTION',
                  title: '🔴 Infecção do Trato Urinário (ITU / Cistite)',
                  desc: 'LEU: 3+ (500/uL) [ALTO] | NIT: Positivo [ALTO] | BLD: 2+ | pH: 7.5'
                },
                {
                  id: 'DIABETIC_KETOACIDOSIS',
                  title: '🟣 Cetoacidose Diabética / Glicosúria',
                  desc: 'Glicose: 3+ (55 mmol/L) [ALTO] | Cetonas: 3+ (8.0 mmol/L) [ALTO] | pH: 5.0'
                },
                {
                  id: 'PROTEINURIA_RENAL',
                  title: '🟠 Proteinúria / Lesão Glomerular',
                  desc: 'Proteína: 3+ (300 mg/dL) [ALTO] | Sangue: 1+ | Densidade: 1.008'
                },
                {
                  id: 'CUSTOM',
                  title: '⚙️ Ajuste Manual da Fita de Urina',
                  desc: 'Altere livremente os parâmetros de fita da Wama'
                }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProfile(p.id as WamaProfile)}
                  className={`text-left p-2.5 rounded-xl transition-all border ${
                    profile === p.id
                      ? 'bg-amber-950/70 border-amber-500 text-amber-200'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="font-semibold text-xs">{p.title}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>

            {/* Custom Inputs */}
            {profile === 'CUSTOM' && (
              <div className="bg-slate-950 p-3 rounded-xl border border-amber-800/50 space-y-2 mt-2">
                <span className="text-[11px] font-bold text-amber-300 block">Valores Personalizados da Fita:</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">LEU (Leucócitos)</label>
                    <input
                      type="text"
                      value={customValues.LEU ?? 'Negativo'}
                      onChange={(e) => setCustomValues({ ...customValues, LEU: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-amber-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">NIT (Nitrito)</label>
                    <input
                      type="text"
                      value={customValues.NIT ?? 'Negativo'}
                      onChange={(e) => setCustomValues({ ...customValues, NIT: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-amber-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">PRO (Proteína)</label>
                    <input
                      type="text"
                      value={customValues.PRO ?? 'Negativo'}
                      onChange={(e) => setCustomValues({ ...customValues, PRO: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-amber-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">GLU (Glicose)</label>
                    <input
                      type="text"
                      value={customValues.GLU ?? 'Negativo'}
                      onChange={(e) => setCustomValues({ ...customValues, GLU: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-amber-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">BLD (Sangue)</label>
                    <input
                      type="text"
                      value={customValues.BLD ?? 'Negativo'}
                      onChange={(e) => setCustomValues({ ...customValues, BLD: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-amber-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">KET (Cetonas)</label>
                    <input
                      type="text"
                      value={customValues.KET ?? 'Negativo'}
                      onChange={(e) => setCustomValues({ ...customValues, KET: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-amber-300 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Physical Hardware Setup Guide Box */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Cable className="w-4 h-4 text-amber-400" />
              <span>Conexão Física do Leitor Wama com o LIS</span>
            </h3>

            <div className="text-[11px] text-slate-300 space-y-2 leading-relaxed">
              <p>
                Os leitores de urina da Wama utilizam porta serial RS-232 com conector DB9:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 font-sans">
                <li>Conecte o cabo RS-232 do leitor Wama na porta COM ou adaptador USB-Serial do PC.</li>
                <li>No menu de configurações da Wama, garanta que a opção <strong>Autoprint / Send LIS</strong> esteja ativada.</li>
                <li>Velocidade recomendada: <strong>9600 Baud Rate, 8 Bits, Paridade Nenhuma, 1 Stop Bit</strong>.</li>
                <li>Assim que a tira é puxada e lida pelo refletômetro, a string de texto é enviada instantaneamente ao LIS.</li>
              </ol>
            </div>
          </div>

        </div>

        {/* Right Preview & Live Results Panel */}
        <div className="lg:col-span-7 space-y-5">

          {/* Raw Frame & Message Inspector */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>String de Saída Wama ({protocol})</span>
              </h3>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(rawDisplay, false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => copyToClipboard(hexDisplay, true)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-all"
                >
                  {copiedHex ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedHex ? 'Copiado!' : 'Copiar HEX'}</span>
                </button>
              </div>
            </div>

            {/* RAW String Box */}
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-[11px] leading-relaxed text-amber-300 overflow-x-auto max-h-60 select-all">
              <pre className="whitespace-pre-wrap">{rawDisplay}</pre>
            </div>

            {/* HEX Byte String Box */}
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-400 hover:text-slate-200 font-mono text-[11px] font-semibold">
                🔍 Ver visualização por Bytes (HEX)
              </summary>
              <div className="mt-2 bg-slate-950 rounded-xl p-3 border border-slate-800/80 font-mono text-[10px] text-slate-400 overflow-x-auto max-h-32 leading-relaxed">
                {hexDisplay}
              </div>
            </details>
          </div>

          {/* Visual Parameter Inspection Cards */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <TestTube className="w-4 h-4 text-amber-400" />
                <span>Resultados de Uroanálise ({Object.keys(previewParams).length} Parâmetros)</span>
              </h3>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/50">
                Caso: {profile}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              {Object.values(previewParams).map((p, idx) => {
                const isHigh = p.flag === 'H';
                const isLow = p.flag === 'L';
                return (
                  <div
                    key={`${p.code}-${idx}`}
                    className={`p-3 rounded-xl border transition-all ${
                      isHigh
                        ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                        : isLow
                        ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs">{p.code}</span>
                      {p.flag && p.flag !== 'N' && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            isHigh ? 'bg-rose-900 text-rose-100' : 'bg-amber-900 text-amber-100'
                          }`}
                        >
                          {p.flag === 'H' ? 'ALTERADO' : 'BAIXO'}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{p.name}</div>
                    <div className="text-sm font-mono font-extrabold mt-1">
                      {p.value}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
