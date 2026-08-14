import React, { useState } from 'react';
import { Play, Copy, Check, Terminal, Zap, Send, RefreshCw, Activity, Cpu, Cable, AlertCircle } from 'lucide-react';
import {
  MaxionProfile,
  MaxionProtocol,
  MaxionSampleResult,
  getMaxionProfileParameters,
  generateMaxionMessage,
  stringToHexMaxion
} from '../lib/maxionParser';

interface MaxionSimulatorTabProps {
  onSimulateMaxion: (config: any) => Promise<any>;
  onSelectSample: (sample: any) => void;
}

export const MaxionSimulatorTab: React.FC<MaxionSimulatorTabProps> = ({
  onSimulateMaxion,
  onSelectSample
}) => {
  const [sampleId, setSampleId] = useState<string>('MAX-8812');
  const [patientId, setPatientId] = useState<string>('P-3041');
  const [patientName, setPatientName] = useState<string>('Mariana Santos');
  const [profile, setProfile] = useState<MaxionProfile>('NORMAL');
  const [protocol, setProtocol] = useState<MaxionProtocol>('RS232_ASCII');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedHex, setCopiedHex] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<MaxionSampleResult | null>(null);

  const [customValues, setCustomValues] = useState<Record<string, number>>({
    NA: 140.0,
    K: 4.20,
    CL: 102.0,
    ICA: 1.22,
    TCA: 9.50,
    PH: 7.41
  });

  const [selectedParameters, setSelectedParameters] = useState<string[]>(['NA', 'K', 'CL', 'ICA', 'TCA', 'PH']);

  const toggleParameter = (code: string) => {
    setSelectedParameters(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const setAllParameters = (all: boolean) => {
    if (all) setSelectedParameters(['NA', 'K', 'CL', 'ICA', 'TCA', 'PH']);
    else setSelectedParameters([]);
  };

  const maxionGen = generateMaxionMessage({
    sampleId,
    patientId,
    patientName,
    profile,
    protocol,
    customValues: profile === 'CUSTOM' ? customValues : undefined,
    selectedParameters
  });

  const rawDisplay = maxionGen.raw;
  const hexDisplay = stringToHexMaxion(rawDisplay);
  const previewParams = getMaxionProfileParameters(profile, profile === 'CUSTOM' ? customValues : undefined, selectedParameters);

  const handleSendSimulation = async () => {
    setSending(true);
    try {
      const config = {
        analyzerModel: 'Maxion ISE',
        sampleId,
        patientId,
        patientName,
        profile,
        protocol,
        customValues: profile === 'CUSTOM' ? customValues : undefined,
        selectedParameters
      };

      const res = await onSimulateMaxion(config);
      if (res && res.parsedResult) {
        setLastResult(res.parsedResult);
        onSelectSample(res.parsedResult);
      }
    } catch (e) {
      console.error('Erro ao simular Maxion:', e);
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
      <div className="bg-gradient-to-r from-cyan-950/90 via-slate-900 to-slate-950 border border-cyan-800/50 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl font-bold tracking-tight text-white font-sans">
                  MAXION ELETRÓLITOS (ISE)
                </h2>
                <span className="text-[10px] uppercase font-mono tracking-wider bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 px-2.5 py-0.5 rounded-full font-bold">
                  Analisador de Eletrólitos Sanguíneos
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
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center space-x-2 transition-all shadow-lg shadow-cyan-600/20 active:scale-95 disabled:opacity-50"
            >
              {sending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{sending ? 'Transmitindo...' : 'Transmitir Exame de Eletrólitos ao LIS'}</span>
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
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Dados da Amostra & Paciente</span>
              </h3>
              <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500 font-bold"
                  placeholder="Ex: MAX-8812"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  placeholder="Ex: P-3041"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                  placeholder="Ex: Mariana Santos"
                />
              </div>
            </div>

            {/* Protocol Selection */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                Protocolo de Saída Maxion
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setProtocol('RS232_ASCII')}
                  className={`px-2.5 py-2 rounded-xl font-mono text-[10px] font-semibold transition-all border ${
                    protocol === 'RS232_ASCII'
                      ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/80'
                  }`}
                >
                  📟 RS232 ASCII (Impressora / Serial)
                </button>
                <button
                  type="button"
                  onClick={() => setProtocol('HL7_MLLP')}
                  className={`px-2.5 py-2 rounded-xl font-mono text-[10px] font-semibold transition-all border ${
                    protocol === 'HL7_MLLP'
                      ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/20'
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
                      ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/20'
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
                <label className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Seleção Seletiva de Exames (Evita Reagente Desnecessário)</span>
                </label>
                <div className="flex items-center space-x-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setAllParameters(true)}
                    className="text-cyan-400 hover:underline font-mono"
                  >
                    Marcar Todos
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedParameters(['NA', 'K'])}
                    className="text-cyan-400 hover:underline font-mono"
                  >
                    Apenas Na/K
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

              <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                {[
                  { code: 'NA', label: 'Na+ (Sódio)' },
                  { code: 'K', label: 'K+ (Potássio)' },
                  { code: 'CL', label: 'Cl- (Cloreto)' },
                  { code: 'ICA', label: 'iCa2+ (Cálcio Iônico)' },
                  { code: 'TCA', label: 'tCa (Cálcio Total)' },
                  { code: 'PH', label: 'pH Sanguíneo' }
                ].map(item => {
                  const isChecked = selectedParameters.includes(item.code);
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => toggleParameter(item.code)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                        isChecked
                          ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span className="text-[11px] font-semibold">{item.label}</span>
                      <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold ${
                        isChecked ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-600'
                      }`}>
                        {isChecked ? '✓' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Clinical Electrolyte Preset Selector */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Perfis de Eletrólitos (Casos Clínicos)</span>
            </h3>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {[
                {
                  id: 'NORMAL',
                  title: '🟢 Normal (Eulêmico / Saudável)',
                  desc: 'Na+ 140.0 | K+ 4.20 | Cl- 102.0 | iCa2+ 1.22 | tCa 9.50 | pH 7.41'
                },
                {
                  id: 'HYPONATREMIA',
                  title: '🟡 Hiponatremia (Sódio Baixo)',
                  desc: 'Na+ 122.0 [BAIXO] | K+ 4.10 | Cl- 90.0 [BAIXO]'
                },
                {
                  id: 'HYPERKALEMIA',
                  title: '🔴 Hipercalemia / Hiperpotassemia (Risco Arritmia)',
                  desc: 'K+ 6.40 [ALTO] | Na+ 138.0 | Cl- 104.0'
                },
                {
                  id: 'CRITICAL_ICU',
                  title: '🟣 Paciente Crítico CTI / Distúrbio Severo',
                  desc: 'Na+ 154.0 [ALTO] | K+ 2.90 [BAIXO] | iCa2+ 0.95 [BAIXO] | pH 7.18 [BAIXO]'
                },
                {
                  id: 'ACIDOSIS',
                  title: '🟠 Acidose Metabólica',
                  desc: 'pH 7.22 [BAIXO] | K+ 5.60 [ALTO] | iCa2+ 1.38 [ALTO]'
                },
                {
                  id: 'CUSTOM',
                  title: '⚙️ Ajuste Manual de Eletrólitos',
                  desc: 'Insira os valores exatos de Na+, K+, Cl-, Ca++, pH'
                }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProfile(p.id as MaxionProfile)}
                  className={`text-left p-2.5 rounded-xl transition-all border ${
                    profile === p.id
                      ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200'
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
              <div className="bg-slate-950 p-3 rounded-xl border border-cyan-800/50 space-y-2 mt-2">
                <span className="text-[11px] font-bold text-cyan-300 block">Valores Personalizados de Eletrólitos:</span>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">Na+ (mmol/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={customValues.NA ?? 140.0}
                      onChange={(e) => setCustomValues({ ...customValues, NA: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-cyan-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">K+ (mmol/L)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={customValues.K ?? 4.20}
                      onChange={(e) => setCustomValues({ ...customValues, K: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-cyan-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">Cl- (mmol/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={customValues.CL ?? 102.0}
                      onChange={(e) => setCustomValues({ ...customValues, CL: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-cyan-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">iCa2+ (mmol/L)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={customValues.ICA ?? 1.22}
                      onChange={(e) => setCustomValues({ ...customValues, ICA: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-cyan-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">tCa (mg/dL)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={customValues.TCA ?? 9.50}
                      onChange={(e) => setCustomValues({ ...customValues, TCA: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-cyan-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">pH</label>
                    <input
                      type="number"
                      step="0.01"
                      value={customValues.PH ?? 7.41}
                      onChange={(e) => setCustomValues({ ...customValues, PH: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-cyan-300 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Physical Hardware Setup Guide Box */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Cable className="w-4 h-4 text-cyan-400" />
              <span>Como Conectar o Maxion Físico no Computador?</span>
            </h3>

            <div className="text-[11px] text-slate-300 space-y-2 leading-relaxed">
              <p>
                Como o <strong>Maxion</strong> é um equipamento standalone que não possui computador embutido, a conexão é feita via cabo serial RS-232 atrás do equipamento:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 font-sans">
                <li>Adquira um cabo <strong>Conversor USB x Serial DB9 RS-232</strong> (preferencialmente com chip FTDI ou CH340).</li>
                <li>Conecte o DB9 na porta de saída de impressora/LIS do Maxion e o USB no PC onde roda o script do LIS.</li>
                <li>No software/painel do Maxion, habilite <strong>Auto Output / LIS Output = ON</strong> e Baud Rate <strong>9600 8N1</strong>.</li>
                <li>Execute nosso script de leitura de porta COM (disponível na aba <i>Instalação & Scripts</i>). O LIS capturará as leituras automaticamente assim que o teste for finalizado no Maxion!</li>
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
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>String de Saída Maxion ({protocol})</span>
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
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-[11px] leading-relaxed text-cyan-300 overflow-x-auto max-h-60 select-all">
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
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Resultados de Eletrólitos ({Object.keys(previewParams).length} Íons Medidos)</span>
              </h3>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/50">
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
                          {p.flag === 'H' ? 'ALTO (H)' : 'BAIXO (L)'}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{p.name}</div>
                    <div className="text-base font-mono font-extrabold mt-1">
                      {p.value} <span className="text-[10px] font-normal text-slate-400">{p.unit}</span>
                    </div>
                    {p.referenceRange && (
                      <div className="text-[9px] font-mono text-slate-500 mt-0.5">Ref: {p.referenceRange}</div>
                    )}
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
