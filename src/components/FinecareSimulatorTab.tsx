import React, { useState } from 'react';
import { Play, Copy, Check, Terminal, Activity, Send, RefreshCw, Cpu, Cable, HeartPulse } from 'lucide-react';
import {
  FinecareProfile,
  FinecareProtocol,
  FinecareSampleResult,
  getFinecareProfileParameters,
  generateFinecareMessage,
  stringToHexFinecare
} from '../lib/finecareParser';

interface FinecareSimulatorTabProps {
  onSimulateFinecare: (config: any) => Promise<any>;
  onSelectSample: (sample: any) => void;
}

export const FinecareSimulatorTab: React.FC<FinecareSimulatorTabProps> = ({
  onSimulateFinecare,
  onSelectSample
}) => {
  const [sampleId, setSampleId] = useState<string>('FIN-8011');
  const [patientId, setPatientId] = useState<string>('P-1092');
  const [patientName, setPatientName] = useState<string>('Carlos Eduardo');
  const [profile, setProfile] = useState<FinecareProfile>('CARDIAC_EMERGENCY');
  const [protocol, setProtocol] = useState<FinecareProtocol>('HL7_MLLP');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedHex, setCopiedHex] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<FinecareSampleResult | null>(null);

  const [customValues, setCustomValues] = useState<Record<string, number | string>>({
    BHCG: 12450.0,
    DDIMER: 1.45,
    CTNI: 2.85,
    PCT: 4.80,
    CRP: 85.5,
    HBA1C: 8.4
  });

  const [selectedParameters, setSelectedParameters] = useState<string[]>([
    'BHCG', 'DDIMER'
  ]);

  const toggleParameter = (code: string) => {
    setSelectedParameters(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const setAllParameters = (all: boolean) => {
    if (all) setSelectedParameters(['BHCG', 'DDIMER', 'CTNI', 'PCT', 'CRP', 'HBA1C']);
    else setSelectedParameters([]);
  };

  const finecareGen = generateFinecareMessage({
    sampleId,
    patientId,
    patientName,
    profile,
    protocol,
    customValues: profile === 'CUSTOM' ? customValues : undefined,
    selectedParameters
  });

  const rawDisplay = finecareGen.raw;
  const hexDisplay = stringToHexFinecare(rawDisplay);
  const previewParams = getFinecareProfileParameters(profile, profile === 'CUSTOM' ? customValues : undefined, selectedParameters);

  const handleSendSimulation = async () => {
    setSending(true);
    try {
      const config = {
        analyzerModel: 'Wondfo Finecare FIA Meter (POCT)',
        sampleId,
        patientId,
        patientName,
        profile,
        protocol,
        customValues: profile === 'CUSTOM' ? customValues : undefined,
        selectedParameters
      };

      const res = await onSimulateFinecare(config);
      if (res && res.parsedResult) {
        setLastResult(res.parsedResult);
        onSelectSample(res.parsedResult);
      }
    } catch (e) {
      console.error('Erro ao simular Finecare:', e);
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
      <div className="bg-gradient-to-r from-teal-950/90 via-slate-900 to-slate-950 border border-teal-800/50 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20 shrink-0">
              <HeartPulse className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl font-bold tracking-tight text-white font-sans">
                  WONDFO FINECARE (POCT IMUNOENSAIO)
                </h2>
                <span className="text-[10px] uppercase font-mono tracking-wider bg-teal-950/80 text-teal-300 border border-teal-700/60 px-2.5 py-0.5 rounded-full font-bold">
                  Analisador Quantitativo de Imunofluorescência (Troponina, PCR, PCT, HbA1c)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Interface de Rede Ethernet TCP/IP (HL7 v2.3.1 MLLP / ASTM) & Comunicação Serial RS-232
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendSimulation}
              disabled={sending}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-lg shadow-teal-500/20 active:scale-95 disabled:opacity-50"
            >
              {sending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{sending ? 'Transmitindo...' : 'Transmitir Exame POCT ao LIS'}</span>
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
                <Cpu className="w-4 h-4 text-teal-400" />
                <span>Dados da Amostra & Paciente</span>
              </h3>
              <span className="text-[10px] text-teal-400 font-mono bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                Rede RJ45 / Serial
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-teal-300 font-mono text-xs focus:outline-none focus:border-teal-500 font-bold"
                  placeholder="Ex: FIN-8011"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-teal-500"
                  placeholder="Ex: P-1092"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
                  placeholder="Ex: Carlos Eduardo"
                />
              </div>
            </div>

            {/* Protocol Selection */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                Protocolo de Saída Finecare (Wondfo)
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setProtocol('HL7_MLLP')}
                  className={`px-2.5 py-2 rounded-xl font-mono text-[10px] font-semibold transition-all border ${
                    protocol === 'HL7_MLLP'
                      ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/80'
                  }`}
                >
                  📡 HL7 v2.3.1 (Ethernet)
                </button>
                <button
                  type="button"
                  onClick={() => setProtocol('ASTM_1381')}
                  className={`px-2.5 py-2 rounded-xl font-mono text-[10px] font-semibold transition-all border ${
                    protocol === 'ASTM_1381'
                      ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/80'
                  }`}
                >
                  📋 ASTM 1381 / 1394
                </button>
                <button
                  type="button"
                  onClick={() => setProtocol('RS232_ASCII')}
                  className={`px-2.5 py-2 rounded-xl font-mono text-[10px] font-semibold transition-all border ${
                    protocol === 'RS232_ASCII'
                      ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/80'
                  }`}
                >
                  📟 RS232 Serial (ASCII)
                </button>
              </div>
            </div>

            {/* Selective Exam Filter (Para não estragar amostra / economizar reagente) */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-teal-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-teal-400" />
                  <span>Seleção Seletiva de Exames POCT (Economia de Cassetes)</span>
                </label>
                <div className="flex items-center space-x-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setAllParameters(true)}
                    className="text-teal-400 hover:underline font-mono"
                  >
                    Marcar Todos
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedParameters(['BHCG', 'DDIMER'])}
                    className="text-teal-300 font-bold hover:underline font-mono"
                  >
                    Beta-hCG + D-Dímero
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
                  { code: 'BHCG', label: 'Beta-hCG (Quantitativo)' },
                  { code: 'DDIMER', label: 'D-Dímero (Quantitativo)' },
                  { code: 'CTNI', label: 'cTnI (Troponina I)' },
                  { code: 'PCT', label: 'PCT (Procalcitonina)' },
                  { code: 'CRP', label: 'PCR (Proteína C Reativa)' },
                  { code: 'HBA1C', label: 'HbA1c (Hemoglobina Glicada)' }
                ].map(item => {
                  const isChecked = selectedParameters.includes(item.code);
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => toggleParameter(item.code)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                        isChecked
                          ? 'bg-teal-950/80 border-teal-500 text-teal-200'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span className="text-[11px] font-semibold">{item.label}</span>
                      <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold ${
                        isChecked ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-600'
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
              <Activity className="w-4 h-4 text-teal-400" />
              <span>Perfis de Painéis POCT (Casos Clínicos)</span>
            </h3>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {[
                {
                  id: 'CARDIAC_EMERGENCY',
                  title: '❤️ Emergência Cardíaca (IAM / TEP)',
                  desc: 'Troponina I (cTnI): 2.85 ng/mL [ALTO] | D-Dímero: 1.45 mg/L FEU [ALTO] | CK-MB | Mioglobina'
                },
                {
                  id: 'SEPSIS_PCT_CRP',
                  title: '🔴 Sepse & Infecção Grave (PCT + PCR)',
                  desc: 'Procalcitonina (PCT): 4.80 ng/mL [ALTO] | PCR us: 85.5 mg/L [ALTO] | SAA: 120 mg/L'
                },
                {
                  id: 'DIABETES_HBA1C',
                  title: '🩸 Monitoramento do Diabetes (HbA1c / Renal)',
                  desc: 'Hemoglobina Glicada: 8.4% [ALTO] | eAG: 194 mg/dL | Microalbumina: 45 mg/L'
                },
                {
                  id: 'THYROID_TSH',
                  title: '🦋 Painel de Tireoide (TSH / T4 Livre)',
                  desc: 'TSH: 6.85 uIU/mL [ALTO] | T4 Livre: 0.72 ng/dL [BAIXO] | T3 Total: 1.10 ng/mL'
                },
                {
                  id: 'PREGNANCY_HCG',
                  title: '🤰 Gestação / Hormônios (Beta-hCG / Progesterona)',
                  desc: 'Beta-hCG Quantitativo: 12.450 mIU/mL [POSITIVO] | Progesterona: 28.4 ng/mL'
                },
                {
                  id: 'CUSTOM',
                  title: '⚙️ Ajuste Manual de Marcadores POCT',
                  desc: 'Defina valores personalizados para Troponina, PCT, PCR e HbA1c'
                }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProfile(p.id as FinecareProfile)}
                  className={`text-left p-2.5 rounded-xl transition-all border ${
                    profile === p.id
                      ? 'bg-teal-950/70 border-teal-500 text-teal-200'
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
              <div className="bg-slate-950 p-3 rounded-xl border border-teal-800/50 space-y-2 mt-2">
                <span className="text-[11px] font-bold text-teal-300 block">Valores Personalizados POCT:</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">Beta-hCG (mIU/mL)</label>
                    <input
                      type="number"
                      step="1"
                      value={customValues.BHCG ?? 12450}
                      onChange={(e) => setCustomValues({ ...customValues, BHCG: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-teal-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">D-Dímero (mg/L FEU)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={customValues.DDIMER ?? 1.45}
                      onChange={(e) => setCustomValues({ ...customValues, DDIMER: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-teal-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">Troponina I (ng/mL)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={customValues.CTNI ?? 2.85}
                      onChange={(e) => setCustomValues({ ...customValues, CTNI: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-teal-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">Procalcitonina PCT (ng/mL)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={customValues.PCT ?? 4.80}
                      onChange={(e) => setCustomValues({ ...customValues, PCT: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-teal-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">PCR (mg/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={customValues.CRP ?? 85.5}
                      onChange={(e) => setCustomValues({ ...customValues, CRP: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-teal-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">HbA1c (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={customValues.HBA1C ?? 8.4}
                      onChange={(e) => setCustomValues({ ...customValues, HBA1C: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-teal-300 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Physical Hardware Setup Guide Box */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Cable className="w-4 h-4 text-teal-400" />
              <span>Conexão Física do Wondfo Finecare com o LIS</span>
            </h3>

            <div className="text-[11px] text-slate-300 space-y-2 leading-relaxed">
              <p>
                Os leitores Finecare II / Finecare III / FS-205 possuem duas opções de comunicação:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 font-sans">
                <li><strong>Rede Direta Ethernet RJ45 (Sem PC de bancada):</strong> Conecte o cabo de rede RJ45 do Finecare no Switch do laboratório. No menu <em>System Settings -&gt; LIS Settings</em>, informe o IP do servidor LIS e selecione o protocolo HL7 v2.3.1 MLLP.</li>
                <li><strong>Conversor Serial / Wi-Fi (NPort / HF2211):</strong> Se usar a saída serial DB9 do Finecare, ligue no conversor serial-IP para transmitir sem fio diretamente para o servidor central!</li>
                <li>Os exames quantitativos de Troponina, D-Dímero, PCR e HbA1c caem direto no prontuário do LIS assim que o teste de imunofluorescência finaliza no leitor.</li>
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
                <Terminal className="w-4 h-4 text-teal-400" />
                <span>String de Saída Finecare Wondfo ({protocol})</span>
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
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-[11px] leading-relaxed text-teal-300 overflow-x-auto max-h-60 select-all">
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
                <HeartPulse className="w-4 h-4 text-teal-400" />
                <span>Resultados de Imunofluorescência POCT ({Object.keys(previewParams).length} Parâmetros)</span>
              </h3>
              <span className="text-[10px] font-mono text-teal-300 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/50">
                Painel: {profile}
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
                          {p.flag === 'H' ? 'ELEVADO' : 'BAIXO'}
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
