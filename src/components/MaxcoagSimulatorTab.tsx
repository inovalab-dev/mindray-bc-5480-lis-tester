import React, { useState } from 'react';
import { Play, Copy, Check, Terminal, Droplet, Send, RefreshCw, Activity, Cpu, Cable } from 'lucide-react';
import {
  MaxcoagProfile,
  MaxcoagProtocol,
  MaxcoagSampleResult,
  getMaxcoagProfileParameters,
  generateMaxcoagMessage,
  stringToHexMaxcoag
} from '../lib/maxcoagParser';

interface MaxcoagSimulatorTabProps {
  onSimulateMaxcoag: (config: any) => Promise<any>;
  onSelectSample: (sample: any) => void;
}

export const MaxcoagSimulatorTab: React.FC<MaxcoagSimulatorTabProps> = ({
  onSimulateMaxcoag,
  onSelectSample
}) => {
  const [sampleId, setSampleId] = useState<string>('COG-5011');
  const [patientId, setPatientId] = useState<string>('P-4011');
  const [patientName, setPatientName] = useState<string>('Francisca Lima');
  const [profile, setProfile] = useState<MaxcoagProfile>('NORMAL');
  const [protocol, setProtocol] = useState<MaxcoagProtocol>('RS232_ASCII');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedHex, setCopiedHex] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<MaxcoagSampleResult | null>(null);

  const [customValues, setCustomValues] = useState<Record<string, number>>({
    TP: 12.2,
    INR: 1.05,
    TTPA: 31.5,
    RATIO_TTPA: 0.98,
    FIB: 285.0,
    TT: 16.4
  });

  const [selectedParameters, setSelectedParameters] = useState<string[]>(['TP', 'INR', 'TTPA', 'RATIO_TTPA', 'FIB', 'TT']);

  const toggleParameter = (code: string) => {
    setSelectedParameters(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const setAllParameters = (all: boolean) => {
    if (all) setSelectedParameters(['TP', 'INR', 'TTPA', 'RATIO_TTPA', 'FIB', 'TT']);
    else setSelectedParameters([]);
  };

  const maxcoagGen = generateMaxcoagMessage({
    sampleId,
    patientId,
    patientName,
    profile,
    protocol,
    customValues: profile === 'CUSTOM' ? customValues : undefined,
    selectedParameters
  });

  const rawDisplay = maxcoagGen.raw;
  const hexDisplay = stringToHexMaxcoag(rawDisplay);
  const previewParams = getMaxcoagProfileParameters(profile, profile === 'CUSTOM' ? customValues : undefined, selectedParameters);

  const handleSendSimulation = async () => {
    setSending(true);
    try {
      const config = {
        analyzerModel: 'MaxCoag Coagulometer',
        sampleId,
        patientId,
        patientName,
        profile,
        protocol,
        customValues: profile === 'CUSTOM' ? customValues : undefined,
        selectedParameters
      };

      const res = await onSimulateMaxcoag(config);
      if (res && res.parsedResult) {
        setLastResult(res.parsedResult);
        onSelectSample(res.parsedResult);
      }
    } catch (e) {
      console.error('Erro ao simular MaxCoag:', e);
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
      <div className="bg-gradient-to-r from-red-950/90 via-slate-900 to-slate-950 border border-red-800/50 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 shrink-0">
              <Droplet className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl font-bold tracking-tight text-white font-sans">
                  MAXCOAG (COAGULOMETRO)
                </h2>
                <span className="text-[10px] uppercase font-mono tracking-wider bg-red-950/80 text-red-300 border border-red-700/60 px-2.5 py-0.5 rounded-full font-bold">
                  Analisador de Coagulação Sanguínea (TP, INR, TTPA, FIB)
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
              className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center space-x-2 transition-all shadow-lg shadow-red-600/20 active:scale-95 disabled:opacity-50"
            >
              {sending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{sending ? 'Transmitindo...' : 'Transmitir Coagulograma ao LIS'}</span>
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
                <Cpu className="w-4 h-4 text-red-400" />
                <span>Dados da Amostra & Paciente</span>
              </h3>
              <span className="text-[10px] text-red-400 font-mono bg-red-950/60 px-2 py-0.5 rounded border border-red-800/40">
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-red-300 font-mono text-xs focus:outline-none focus:border-red-500 font-bold"
                  placeholder="Ex: COG-5011"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-red-500"
                  placeholder="Ex: P-4011"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-red-500"
                  placeholder="Ex: Francisca Lima"
                />
              </div>
            </div>

            {/* Protocol Selection */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                Protocolo de Saída MaxCoag
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setProtocol('RS232_ASCII')}
                  className={`px-2.5 py-2 rounded-xl font-mono text-[10px] font-semibold transition-all border ${
                    protocol === 'RS232_ASCII'
                      ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/20'
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
                      ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/20'
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
                      ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/20'
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
                <label className="text-[11px] font-bold text-red-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Droplet className="w-3.5 h-3.5 text-red-400" />
                  <span>Seleção Seletiva de Exames (Evita Reagente Desnecessário)</span>
                </label>
                <div className="flex items-center space-x-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setAllParameters(true)}
                    className="text-red-400 hover:underline font-mono"
                  >
                    Marcar Todos
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedParameters(['TP', 'INR'])}
                    className="text-red-400 hover:underline font-mono"
                  >
                    Apenas TP/INR
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
                  { code: 'TP', label: 'TP (Tempo de Protrombina)' },
                  { code: 'INR', label: 'R.N.I. (INR)' },
                  { code: 'TTPA', label: 'TTPA (aPTT)' },
                  { code: 'RATIO_TTPA', label: 'Razão TTPA / R' },
                  { code: 'FIB', label: 'Fibrinogênio' },
                  { code: 'TT', label: 'TT (Tempo Trombina)' }
                ].map(item => {
                  const isChecked = selectedParameters.includes(item.code);
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => toggleParameter(item.code)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                        isChecked
                          ? 'bg-red-950/80 border-red-500 text-red-200'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span className="text-[11px] font-semibold">{item.label}</span>
                      <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold ${
                        isChecked ? 'bg-red-500 text-slate-950' : 'bg-slate-800 text-slate-600'
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
              <Activity className="w-4 h-4 text-red-400" />
              <span>Perfis de Coagulação (Casos Clínicos)</span>
            </h3>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {[
                {
                  id: 'NORMAL',
                  title: '🟢 Normal (Coagulograma Preservado)',
                  desc: 'TP: 12.2s | INR: 1.05 | TTPA: 31.5s | FIB: 285 mg/dL | TT: 16.4s'
                },
                {
                  id: 'WARFARIN_HIGH_INR',
                  title: '🔴 Anticoagulado com Marevan / Warfarina (INR Alto)',
                  desc: 'INR: 3.25 [ALTO] | TP: 32.8s [ALTO] | TTPA: 38.0s [ALTO]'
                },
                {
                  id: 'HEPARIN_HIGH_AETPA',
                  title: '🟣 Paciente em Heparinoterapia (TTPA Prolongado)',
                  desc: 'TTPA: 78.5s [ALTO] | R: 2.45 [ALTO] | TT: 28.2s [ALTO]'
                },
                {
                  id: 'HYPOFIBRINOGENEMIA',
                  title: '🟠 Hipofibrinogenemia / Risco de Sangramento',
                  desc: 'Fibrinogênio: 85 mg/dL [BAIXO] | TP: 18.5s [ALTO] | INR: 1.62'
                },
                {
                  id: 'CUSTOM',
                  title: '⚙️ Ajuste Manual de Parâmetros de Coagulação',
                  desc: 'Defina valores personalizados para TP, INR, TTPA e Fibrinogênio'
                }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProfile(p.id as MaxcoagProfile)}
                  className={`text-left p-2.5 rounded-xl transition-all border ${
                    profile === p.id
                      ? 'bg-red-950/70 border-red-500 text-red-200'
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
              <div className="bg-slate-950 p-3 rounded-xl border border-red-800/50 space-y-2 mt-2">
                <span className="text-[11px] font-bold text-red-300 block">Valores Personalizados do Coagulograma:</span>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">TP (seg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={customValues.TP ?? 12.2}
                      onChange={(e) => setCustomValues({ ...customValues, TP: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-red-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">INR</label>
                    <input
                      type="number"
                      step="0.01"
                      value={customValues.INR ?? 1.05}
                      onChange={(e) => setCustomValues({ ...customValues, INR: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-red-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">TTPA (seg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={customValues.TTPA ?? 31.5}
                      onChange={(e) => setCustomValues({ ...customValues, TTPA: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-red-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">R (TTPA)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={customValues.RATIO_TTPA ?? 0.98}
                      onChange={(e) => setCustomValues({ ...customValues, RATIO_TTPA: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-red-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">Fibrinogênio (mg/dL)</label>
                    <input
                      type="number"
                      step="1"
                      value={customValues.FIB ?? 285}
                      onChange={(e) => setCustomValues({ ...customValues, FIB: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-red-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">TT (seg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={customValues.TT ?? 16.4}
                      onChange={(e) => setCustomValues({ ...customValues, TT: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-red-300 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Physical Hardware Setup Guide Box */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Cable className="w-4 h-4 text-red-400" />
              <span>Conexão Física do MaxCoag com o LIS</span>
            </h3>

            <div className="text-[11px] text-slate-300 space-y-2 leading-relaxed">
              <p>
                Assim como o Maxion, o <strong>MaxCoag</strong> transmite via porta serial RS-232 (saída DB9):
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 font-sans">
                <li>Conecte o cabo de série RS-232 DB9 Fêmea-Fêmea com conversor USB no PC.</li>
                <li>Verifique se no menu do MaxCoag a opção <strong>Auto Print / Transmit LIS</strong> está ativada.</li>
                <li>Utilize a taxa de transmissão padrão de <strong>9600 Baud, 8 bits, Sem Paridade, 1 Stop Bit (9600 8N1)</strong>.</li>
                <li>O LIS escuta essa porta COM e salva o coagulograma do paciente assim que o fotômetro de coagulação encerra o tempo de reação!</li>
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
                <Terminal className="w-4 h-4 text-red-400" />
                <span>String de Saída MaxCoag ({protocol})</span>
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
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-[11px] leading-relaxed text-red-300 overflow-x-auto max-h-60 select-all">
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
                <Droplet className="w-4 h-4 text-red-400" />
                <span>Resultados da Coagulação ({Object.keys(previewParams).length} Parâmetros)</span>
              </h3>
              <span className="text-[10px] font-mono text-red-300 bg-red-950/80 px-2 py-0.5 rounded border border-red-800/50">
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
