import React, { useState, useEffect } from 'react';
import { Play, Copy, Check, Terminal, Beaker, Layers, Send, RefreshCw, Activity, ShieldCheck, AlertTriangle, Cpu } from 'lucide-react';
import { UritProfile, UritProtocol, UritSampleResult, getUritProfileParameters, generateUritHL7Message, generateUritAstmMessage, stringToHex } from '../lib/uritParser';

interface UritSimulatorTabProps {
  onSimulateUrit: (config: any) => Promise<any>;
  onSelectSample: (sample: any) => void;
}

export const UritSimulatorTab: React.FC<UritSimulatorTabProps> = ({
  onSimulateUrit,
  onSelectSample
}) => {
  // Sample & Patient State
  const [sampleId, setSampleId] = useState<string>('010003283001');
  const [patientId, setPatientId] = useState<string>('P-9921');
  const [patientName, setPatientName] = useState<string>('Jose Carlos Pereira');
  const [profile, setProfile] = useState<UritProfile>('CHECKUP_NORMAL');
  const [protocol, setProtocol] = useState<UritProtocol>('HL7_MLLP');
  const [sampleMode, setSampleMode] = useState<string>('AL-WB'); // 'AL-WB' (Rack) | 'CT-WB' (Manual)
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedHex, setCopiedHex] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [querying, setQuerying] = useState<boolean>(false);
  const [queryResultMsg, setQueryResultMsg] = useState<string>('');
  const [lastResult, setLastResult] = useState<UritSampleResult | null>(null);

  const [dsrTemplateText, setDsrTemplateText] = useState<string>(
    [
      'MSH|^~\\&|{sendingApp}|{sendingFacility}|||{nowHL7}||DSR^Q03|{msgControlId}|P|2.3.1|{sampleId}||0||ASCII|||',
      'MSA|AA|{msgControlId}|Message accepted|||0|',
      'ERR|0|',
      'QAK|SR|OK|',
      'QRD|{queryTime}|R|D|-1|||RD|{sampleId}|OTH|||T|',
      'QRF|{sendingFacility}|{todayStart}|{todayEnd}|||RCT|COR|ALL||',
      'DSP|1||{sampleId}|||',
      'DSP|2||{sampleId}|||',
      'DSP|3||serum|||',
      'DSP|4||{patientNameSpace}|||',
      'DSP|5||F|||',
      'DSP|6|||||',
      'DSP|7|||||',
      'DSP|8|||||',
      'DSP|9|||||',
      'DSP|10|||||',
      'DSP|11|||||',
      'DSP|12|||||',
      'DSP|13|||||',
      'DSP|14|||||',
      'DSP|15||{dateFormatted}|||',
      'DSP|16||N|||',
      'DSP|17||{numTests}|||',
      '{dspTestLines}',
      'DSC|-1|'
    ].join('\n')
  );
  const [templateSaveStatus, setTemplateSaveStatus] = useState<string>('');

  useEffect(() => {
    fetch('/api/urit/custom-template')
      .then(res => res.json())
      .then(data => {
        if (data.template) {
          setDsrTemplateText(data.template.replace(/\r/g, '\n'));
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveDsrTemplate = async (templateStr?: string) => {
    const textToSend = templateStr ?? dsrTemplateText;
    try {
      const res = await fetch('/api/urit/custom-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: textToSend.replace(/\n/g, '\r') })
      });
      if (res.ok) {
        setTemplateSaveStatus('✅ Template DSR^Q03 atualizado no LIS Server com sucesso!');
        setTimeout(() => setTemplateSaveStatus(''), 4000);
      } else {
        setTemplateSaveStatus('❌ Erro ao atualizar template.');
      }
    } catch (e) {
      setTemplateSaveStatus('❌ Erro de conexão ao salvar template.');
    }
  };

  const applyTemplatePreset = (presetText: string) => {
    setDsrTemplateText(presetText);
    handleSaveDsrTemplate(presetText);
  };

  const handleQueryWorklistFromEquipment = async () => {
    setQuerying(true);
    setQueryResultMsg('');
    try {
      const res = await fetch('/api/urit/query-worklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleId })
      });
      const data = await res.json();
      if (data.success) {
        if (data.foundItem) {
          setPatientName(data.foundItem.patientName || 'Paciente N/I');
          setPatientId(data.foundItem.patientId || `P-${sampleId}`);
          setQueryResultMsg(`✅ Resposta DSR^Q03 do LIS recebida! Paciente retornado: ${data.foundItem.patientName} (ID: ${data.foundItem.patientId})`);
        } else {
          setQueryResultMsg(`⚠️ Consulta QRY^Q02 enviada para Amostra #${sampleId}, porém nenhuma ordem correspondente foi registrada no LIS. Cadastre a ordem no gerador abaixo.`);
        }
      } else {
        setQueryResultMsg('❌ Falha na comunicação com o servidor LIS.');
      }
    } catch (e) {
      setQueryResultMsg('❌ Erro ao enviar consulta QRY^Q02 ao LIS.');
    } finally {
      setQuerying(false);
    }
  };

  // Exam Selection State - Sistema URIT-8021A Hypervisor (Bioquímica)
  const allBioqExams = [
    { code: 'AUR', label: 'AUR (Ácido Úrico)' },
    { code: 'ALB', label: 'ALB (Albumina)' },
    { code: 'TGP/ALT', label: 'TGP/ALT' },
    { code: 'AMIL', label: 'AMIL (Amilase)' },
    { code: 'FR', label: 'FR (Fator Reumatoide)' },
    { code: 'ASLO', label: 'ASLO (Antiestreptolisina O)' },
    { code: 'TGO/AST', label: 'TGO/AST' },
    { code: 'BD', label: 'BD (Bilirrubina Direta)' },
    { code: 'BT', label: 'BT (Bilirrubina Total)' },
    { code: 'CKNAC117', label: 'CKNAC117 (CK-NAC 1:17)' },
    { code: 'CKNAC', label: 'CKNAC (CK-NAC Total)' },
    { code: 'CKMB', label: 'CKMB (CK-MB)' },
    { code: 'CALC.ARS', label: 'CALC.ARS (Cálcio Arsenazo)' },
    { code: 'COL', label: 'COL (Colesterol Total)' },
    { code: 'CREAT110', label: 'CREAT110 (Creatinina 1:10)' },
    { code: 'GLI', label: 'GLI (Glicose)' },
    { code: 'FERRO', label: 'FERRO (Ferro Sérico)' },
    { code: 'FAL', label: 'FAL (Fosfatase Alcalina)' },
    { code: 'FIT', label: 'FIT (Fator Fit)' },
    { code: 'FOSF', label: 'FOSF (Fósforo)' },
    { code: 'GGT', label: 'GGT (Gama GT)' },
    { code: 'HDL', label: 'HDL (HDL Colesterol)' },
    { code: 'LDH', label: 'LDH (Desidrogenase Lática)' },
    { code: 'LIPASE', label: 'LIPASE (Lipase)' },
    { code: 'MAG', label: 'MAG (Magnésio)' },
    { code: 'PCR', label: 'PCR (Proteína C-Reativa)' },
    { code: 'PTT', label: 'PTT (Proteínas Totais)' },
    { code: 'TRI', label: 'TRI (Triglicérides)' },
    { code: 'UREIA', label: 'UREIA (Ureia)' },
    { code: 'NA', label: 'NA (Sódio)' },
    { code: 'K', label: 'K (Potássio)' },
    { code: 'CL', label: 'CL (Cloreto)' }
  ];

  const [selectedExams, setSelectedExams] = useState<string[]>([
    'GLI'
  ]);

  const toggleExam = (code: string) => {
    if (selectedExams.includes(code)) {
      setSelectedExams(selectedExams.filter(c => c !== code));
    } else {
      setSelectedExams([...selectedExams, code]);
    }
  };

  const selectAllExams = () => {
    setSelectedExams(allBioqExams.map(e => e.code));
  };

  const selectNoneExams = () => {
    setSelectedExams([]);
  };

  const selectGlucoseOnly = () => {
    setSelectedExams(['GLI']);
  };

  const selectLipidProfile = () => {
    setSelectedExams(['COL', 'TRI', 'HDL', 'GLI']);
  };

  const selectPfhProfile = () => {
    setSelectedExams(['ALB', 'TGP/ALT', 'TGO/AST', 'BD', 'BT', 'FAL', 'GGT', 'LDH']);
  };

  // Custom values state
  const [customValues, setCustomValues] = useState<Record<string, number>>({
    GLU: 88.5,
    UREA: 32.0,
    CREA: 0.92,
    ALT: 24.0,
    AST: 22.0,
    CHOL: 172.0,
    TRIG: 118.0,
    NA: 141.0,
    K: 4.25
  });

  // Worklist Bioq State
  const [wlSampleId, setWlSampleId] = useState<string>('8021002');
  const [wlPatientId, setWlPatientId] = useState<string>('P-9922');
  const [wlPatientName, setWlPatientName] = useState<string>('Ana Paula Souza');
  const [wlTestCode, setWlTestCode] = useState<string>('GLI^GLICOSE^L');
  const [wlStatusMsg, setWlStatusMsg] = useState<string>('');

  // Socket & Communication Mode
  const [commMode, setCommMode] = useState<'INTERNAL' | 'SOCKET_TCP'>('INTERNAL');
  const [targetHost, setTargetHost] = useState<string>('127.0.0.1');
  const [targetPort, setTargetPort] = useState<string>('5151');

  // Generated Raw Messages
  const hl7Gen = generateUritHL7Message({
    sampleId,
    patientId,
    patientName,
    profile,
    protocol,
    customValues: profile === 'CUSTOM' ? customValues : undefined,
    selectedParameters: selectedExams,
    sampleMode
  });

  const astmGen = generateUritAstmMessage({
    sampleId,
    patientId,
    patientName,
    profile,
    protocol,
    customValues: profile === 'CUSTOM' ? customValues : undefined,
    selectedParameters: selectedExams,
    sampleMode
  });

  const rawDisplay = protocol === 'HL7_MLLP' ? hl7Gen.mllpWrapped : astmGen.raw;
  const hexDisplay = stringToHex(rawDisplay);
  const previewParams = getUritProfileParameters(
    profile,
    profile === 'CUSTOM' ? customValues : undefined,
    selectedExams
  );

  const handleSendSimulation = async () => {
    setSending(true);
    try {
      const config = {
        analyzerModel: 'URIT-8021A',
        sampleId,
        patientId,
        patientName,
        profile,
        protocol,
        mode: commMode,
        targetHost,
        targetPort,
        customValues: profile === 'CUSTOM' ? customValues : undefined,
        selectedParameters: selectedExams,
        sampleMode
      };

      const res = await onSimulateUrit(config);
      if (res && res.parsedResult) {
        setLastResult(res.parsedResult);
        onSelectSample(res.parsedResult);
      }
    } catch (e) {
      console.error('Erro ao simular URIT:', e);
    } finally {
      setSending(false);
    }
  };

  const handleAddWorklistBioq = async () => {
    try {
      const testCodeToSend = selectedExams.length > 0 ? selectedExams.join('^') : wlTestCode;
      const res = await fetch('/api/worklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleId: wlSampleId,
          patientId: wlPatientId,
          patientName: wlPatientName,
          testCode: testCodeToSend,
          selectedParameters: selectedExams,
          sampleMode: 'W',
          orcCode: 'AF',
          includeModeObx: true,
          takeMode: 'CT',
          bloodMode: 'W',
          testModeObx: 'BIOQ',
          analyzerModel: 'URIT-8021A'
        })
      });
      if (res.ok) {
        const examListStr = selectedExams.length > 0 ? selectedExams.join(', ') : 'Exames Padrão Bioquímica';
        setWlStatusMsg(`✅ Ordem Bioquímica #${wlSampleId} para URIT-8021A cadastrada! Exames: [${examListStr}]`);
        setTimeout(() => setWlStatusMsg(''), 5000);
      }
    } catch (e) {
      setWlStatusMsg('❌ Erro ao salvar ordem no LIS.');
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
      <div className="bg-gradient-to-r from-teal-950/80 via-slate-900 to-slate-950 border border-teal-800/50 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20 shrink-0">
              <Beaker className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl font-bold tracking-tight text-white font-sans">
                  URIT-8021A
                </h2>
                <span className="text-[10px] uppercase font-mono tracking-wider bg-teal-950/80 text-teal-300 border border-teal-700/60 px-2.5 py-0.5 rounded-full font-bold">
                  Analisador Bioquímico Automático
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Simulador & Testador de Comunicação LIS (HL7 v2.3.1 MLLP / ASTM 1394-97 RS-232)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendSimulation}
              disabled={sending}
              className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center space-x-2 transition-all shadow-lg shadow-teal-600/20 active:scale-95 disabled:opacity-50"
            >
              {sending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{sending ? 'Transmitindo...' : 'Transmitir Exame Bioquímico ao LIS'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Control Panel */}
        <div className="lg:col-span-5 space-y-5">

          {/* Mode of Communication Card */}
          <div className="bg-slate-900/80 border border-teal-800/60 rounded-2xl p-4 space-y-3 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-teal-400" />
              <span>Modo de Comunicação URIT</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCommMode('INTERNAL')}
                className={`px-3 py-2 rounded-xl font-sans text-[11px] font-semibold transition-all border ${
                  commMode === 'INTERNAL'
                    ? 'bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-600/20'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/80'
                }`}
              >
                🌐 Interno (Navegador)
              </button>
              <button
                type="button"
                onClick={() => setCommMode('SOCKET_TCP')}
                className={`px-3 py-2 rounded-xl font-sans text-[11px] font-semibold transition-all border ${
                  commMode === 'SOCKET_TCP'
                    ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/20'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/80'
                }`}
              >
                🔌 Socket TCP (LIS Servidor)
              </button>
            </div>

            {commMode === 'SOCKET_TCP' && (
              <div className="bg-slate-950 p-3 rounded-xl border border-amber-500/30 space-y-2 text-xs">
                <div className="text-[11px] text-amber-300 font-medium">
                  Configuração do Servidor LIS de Destino (TCP MLLP):
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">IP do LIS:</label>
                    <input
                      type="text"
                      value={targetHost}
                      onChange={(e) => setTargetHost(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-xs"
                      placeholder="127.0.0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Porta TCP:</label>
                    <input
                      type="text"
                      value={targetPort}
                      onChange={(e) => setTargetPort(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-teal-300 font-mono text-xs font-bold"
                      placeholder="5151"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Ao clicar em transmitir, um socket TCP abrirá para <span className="text-amber-300 font-mono">{targetHost}:{targetPort}</span> e enviará a mensagem MLLP/ASTM do URIT-8021A, aguardando o ACK do LIS.
                </p>
              </div>
            )}
          </div>

          {/* Sample & Patient Config Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-teal-400" />
                <span>Identificação da Amostra & Paciente</span>
              </h3>
              <span className="text-[10px] text-teal-400 font-mono bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                Porta TCP :5151
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Código da Amostra (Barcode) *
                </label>
                <input
                  type="text"
                  value={sampleId}
                  onChange={(e) => setSampleId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-teal-300 font-mono text-xs focus:outline-none focus:border-teal-500 font-bold"
                  placeholder="Ex: 010003283001"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Modo de Análise (Rack / Manual)
                </label>
                <select
                  value={sampleMode}
                  onChange={(e) => setSampleMode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-teal-300 font-mono text-xs focus:outline-none focus:border-teal-500 font-bold"
                >
                  <option value="AL-WB">AL-WB (Rack / Auto Loader - WB)</option>
                  <option value="CT-WB">CT-WB (Manual / Tube - WB)</option>
                  <option value="AL-PD">AL-PD (Prediluted - Rack)</option>
                  <option value="CT-PD">CT-PD (Prediluted - Manual)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  ID Paciente (Prontuário)
                </label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-teal-500"
                  placeholder="Ex: P-9921"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Nome do Paciente
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
                  placeholder="Ex: Jose Carlos Pereira"
                />
              </div>
            </div>

            {/* Query Patient/Worklist Button */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-teal-800/40 space-y-2">
              <button
                type="button"
                onClick={handleQueryWorklistFromEquipment}
                disabled={querying}
                className="w-full bg-teal-950 hover:bg-teal-900 border border-teal-600/60 text-teal-200 py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {querying ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                ) : (
                  <Activity className="w-4 h-4 text-teal-400" />
                )}
                <span>
                  {querying ? 'Enviando QRY^Q02 ao LIS...' : '🔍 Puxar Informações do Paciente no LIS (QRY^Q02)'}
                </span>
              </button>

              {queryResultMsg && (
                <div className="text-[11px] font-mono text-teal-300 bg-teal-950/90 p-2 rounded-lg border border-teal-700/60 leading-relaxed">
                  {queryResultMsg}
                </div>
              )}
            </div>

            {/* Protocol Selection */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                Protocolo de Comunicação URIT-8021A
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setProtocol('HL7_MLLP')}
                  className={`px-3 py-2 rounded-xl font-mono text-[11px] font-semibold transition-all border ${
                    protocol === 'HL7_MLLP'
                      ? 'bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-600/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/80'
                  }`}
                >
                  📡 HL7 v2.3.1 (MLLP)
                </button>
                <button
                  type="button"
                  onClick={() => setProtocol('ASTM_1381')}
                  className={`px-3 py-2 rounded-xl font-mono text-[11px] font-semibold transition-all border ${
                    protocol === 'ASTM_1381'
                      ? 'bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-600/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/80'
                  }`}
                >
                  📟 ASTM 1394-97 (RS232)
                </button>
              </div>
            </div>
          </div>

          {/* Exam Selection Card (Checkbox Selector - URIT-8021A Hypervisor) */}
          <div className="bg-slate-900/80 border border-teal-800/60 rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center space-x-2">
                <Beaker className="w-4 h-4 text-teal-400" />
                <span>Exames Bioquímicos Cadastrados no URIT Hypervisor ({selectedExams.length} selecionados)</span>
              </h3>

              <div className="flex items-center flex-wrap gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={selectGlucoseOnly}
                  className="bg-teal-600 hover:bg-teal-500 text-white px-2 py-0.5 rounded font-semibold transition-all shadow-sm"
                >
                  Apenas GLI (Glicose)
                </button>
                <button
                  type="button"
                  onClick={selectAllExams}
                  className="bg-teal-950 hover:bg-teal-900 border border-teal-700/60 text-teal-200 px-2 py-0.5 rounded font-semibold transition-all"
                >
                  Marcar Todos
                </button>
                <button
                  type="button"
                  onClick={selectLipidProfile}
                  className="bg-slate-800 hover:bg-slate-700 text-teal-300 px-2 py-0.5 rounded font-semibold transition-all"
                >
                  LIPID
                </button>
                <button
                  type="button"
                  onClick={selectPfhProfile}
                  className="bg-slate-800 hover:bg-slate-700 text-teal-300 px-2 py-0.5 rounded font-semibold transition-all"
                >
                  PFH
                </button>
                <button
                  type="button"
                  onClick={selectNoneExams}
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-semibold transition-all"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Bioquímica URIT-8021A Checkboxes */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                🧪 Painel de Ensaios Automáticos URIT-8021A:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 text-[11px] max-h-52 overflow-y-auto pr-1">
                {allBioqExams.map((ex, idx) => {
                  const isChecked = selectedExams.includes(ex.code);
                  return (
                    <label
                      key={`${ex.code}-${idx}`}
                      className={`flex items-center space-x-1.5 p-1.5 rounded-lg border cursor-pointer select-none transition-all ${
                        isChecked
                          ? 'bg-teal-950/80 border-teal-500/80 text-teal-200 font-semibold'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleExam(ex.code)}
                        className="rounded border-slate-700 text-teal-600 focus:ring-teal-500 bg-slate-900 w-3 h-3"
                      />
                      <span className="truncate text-[10px]">{ex.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Clinical Profile Preset Selector */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-teal-400" />
              <span>Perfis Clínicos Bioquímicos (Presets)</span>
            </h3>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {[
                {
                  id: 'CHECKUP_NORMAL',
                  title: '🟢 Perfil 1: Check-up Normal (Saudável)',
                  desc: 'Glicose 88.5 | Ureia 32 | Creatinina 0.92 | TGO 22 | TGP 24 | Colesterol 172 | Na 141 | K 4.25'
                },
                {
                  id: 'DIABETES_LIPIDS',
                  title: '🟡 Perfil 2: Diabetes & Dislipidemia',
                  desc: 'Glicose 215.0 [H] | Triglicérides 345.0 [H] | Colesterol 248.0 [H] | HDL 31.0 [L]'
                },
                {
                  id: 'HEPATIC',
                  title: '🔴 Perfil 3: Perfil Hepático / Hepatopatia',
                  desc: 'TGP 285.0 [H] | TGO 310.0 [H] | Gama GT 245.0 [H] | Bilirrubina T 3.9 [H]'
                },
                {
                  id: 'RENAL',
                  title: '🟣 Perfil 4: Função Renal / Insuficiência',
                  desc: 'Creatinina 4.85 [H] | Ureia 148.0 [H] | Ácido Úrico 11.4 [H] | Potássio 5.85 [H]'
                },
                {
                  id: 'CARDIAC',
                  title: '🟠 Perfil 5: Marcadores Enzimáticos Cardíacos',
                  desc: 'CK Total 480.0 [H] | CK-MB 62.0 [H] | TGO 88.0 [H]'
                },
                {
                  id: 'CUSTOM',
                  title: '⚙️ Perfil Personalizado (Ajuste Manual)',
                  desc: 'Defina manualmente os valores de cada exame de bioquímica'
                }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProfile(p.id as UritProfile)}
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

            {/* Custom Inputs if profile === 'CUSTOM' */}
            {profile === 'CUSTOM' && (
              <div className="bg-slate-950 p-3 rounded-xl border border-teal-800/50 space-y-2 mt-2">
                <span className="text-[11px] font-bold text-teal-300 block">Valores Bioquímicos Personalizados:</span>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">GLU (mg/dL)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={customValues.GLU ?? 88.5}
                      onChange={(e) => setCustomValues({ ...customValues, GLU: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-teal-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">UREA (mg/dL)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={customValues.UREA ?? 32.0}
                      onChange={(e) => setCustomValues({ ...customValues, UREA: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-teal-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">CREA (mg/dL)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={customValues.CREA ?? 0.92}
                      onChange={(e) => setCustomValues({ ...customValues, CREA: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-teal-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">ALT (U/L)</label>
                    <input
                      type="number"
                      value={customValues.ALT ?? 24.0}
                      onChange={(e) => setCustomValues({ ...customValues, ALT: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-teal-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">AST (U/L)</label>
                    <input
                      type="number"
                      value={customValues.AST ?? 22.0}
                      onChange={(e) => setCustomValues({ ...customValues, AST: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-teal-300 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-mono text-[10px]">CHOL (mg/dL)</label>
                    <input
                      type="number"
                      value={customValues.CHOL ?? 172.0}
                      onChange={(e) => setCustomValues({ ...customValues, CHOL: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-teal-300 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick LIS Worklist Bioquímica Form */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Gerador de Pedido Bioquímico (LIS Worklist)</span>
              </span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] text-slate-400">Amostra / Barcode</label>
                <input
                  type="text"
                  value={wlSampleId}
                  onChange={(e) => setWlSampleId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-emerald-300 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400">ID Paciente</label>
                <input
                  type="text"
                  value={wlPatientId}
                  onChange={(e) => setWlPatientId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-xs"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] text-slate-400">Nome do Paciente</label>
                <input
                  type="text"
                  value={wlPatientName}
                  onChange={(e) => setWlPatientName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] text-slate-400">Código do Teste (OBR-4)</label>
                <input
                  type="text"
                  value={wlTestCode}
                  onChange={(e) => setWlTestCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-indigo-300 font-mono text-xs"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddWorklistBioq}
              className="w-full bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-200 py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Cadastrar Ordem Bioquímica no LIS</span>
            </button>

            {wlStatusMsg && (
              <div className="text-[11px] font-mono text-emerald-300 bg-emerald-950/60 p-2 rounded border border-emerald-800/40">
                {wlStatusMsg}
              </div>
            )}
          </div>

          {/* HL7 DSR^Q03 Template Configurator & Presets */}
          <div className="bg-slate-900/80 border border-teal-800/60 rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-teal-400" />
                <span>Formato de Resposta Worklist (DSR^Q03 / HL7)</span>
              </h3>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 block font-semibold">
                ⚡ Presets Prontos para Testar no Equipamento URIT-8021A:
              </span>

              <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => applyTemplatePreset([
                    'MSH|^~\\&|{sendingApp}|{sendingFacility}|||{nowHL7}||DSR^Q03|{msgControlId}|P|2.3.1|{sampleId}||0||ASCII|||',
                    'MSA|AA|{msgControlId}|Message accepted|||0|',
                    'ERR|0|',
                    'QAK|SR|OK|',
                    'QRD|{queryTime}|R|D|-1|||RD|{sampleId}|OTH|||T|',
                    'QRF|{sendingFacility}|{todayStart}|{todayEnd}|||RCT|COR|ALL||',
                    'DSP|1||{sampleId}|||',
                    'DSP|2||{sampleId}|||',
                    'DSP|3||serum|||',
                    'DSP|4||{patientNameSpace}|||',
                    'DSP|5||F|||',
                    'DSP|6|||||',
                    'DSP|7|||||',
                    'DSP|8|||||',
                    'DSP|9|||||',
                    'DSP|10|||||',
                    'DSP|11|||||',
                    'DSP|12|||||',
                    'DSP|13|||||',
                    'DSP|14|||||',
                    'DSP|15||{dateFormatted}|||',
                    'DSP|16||N|||',
                    'DSP|17||{numTests}|||',
                    '{dspTestLines}',
                    'DSC|-1|'
                  ].join('\n'))}
                  className="text-left bg-teal-950/80 border border-teal-500/80 text-teal-100 p-2.5 rounded-xl transition-all font-mono text-[10px] shadow"
                >
                  <div className="font-bold text-emerald-400 text-[11px]">⭐ 1. Oficial URIT-8021A (Log Real de Outro LIS)</div>
                  <div className="text-teal-200/80 text-[9px] mt-0.5">MSH + MSA + ERR + QAK(SR) + QRD(-1) + DSP(1..17) + DSP(18..N) + DSC(-1)</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyTemplatePreset([
                    'MSH|^~\\&|LIS|LAB|{sendingApp}|{sendingFacility}|{nowHL7}||DSR^Q03|{msgControlId}|P|2.3.1',
                    'MSA|AA|{msgControlId}|Query Successful',
                    'QAK|{queryTag}|OK|',
                    'QRD|{queryTime}|R|{qrdPriority}|{queryTag}|||{qrdQuantity}|{sampleId}|{qrdFilter}|||T|',
                    'QRF|{sendingFacility}|{todayStart}|{todayEnd}|||RCT|COR|ALL||',
                    'PID|1||{sampleId}||{patientName}||19900101|F',
                    'OBR|1|{sampleId}|{sampleId}|{shortTestCode}|||{nowHL7}|||||||||||||||||F'
                  ].join('\n'))}
                  className="text-left bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-slate-300 p-2 rounded-xl transition-all font-mono text-[10px]"
                >
                  <div className="font-bold text-slate-200">2. Padrão HL7 Generico (PID + OBR)</div>
                  <div className="text-slate-400 text-[9px] mt-0.5">MSH + MSA + QAK + QRD + QRF + PID + OBR</div>
                </button>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1 font-semibold">
                  Editor do Template HL7 DSR^Q03:
                </label>
                <textarea
                  value={dsrTemplateText}
                  onChange={(e) => setDsrTemplateText(e.target.value)}
                  rows={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-[11px] text-teal-300 focus:ring-1 focus:ring-teal-500 outline-none leading-relaxed"
                />
              </div>

              <button
                type="button"
                onClick={() => handleSaveDsrTemplate()}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white py-2 rounded-xl font-semibold text-xs transition-all shadow-md"
              >
                💾 Salvar Template HL7 no LIS Server
              </button>

              {templateSaveStatus && (
                <div className="text-[11px] font-mono text-teal-300 bg-teal-950/80 p-2 rounded border border-teal-800/40">
                  {templateSaveStatus}
                </div>
              )}
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
                <span>Mensagem Bruta URIT-8021A ({protocol === 'HL7_MLLP' ? 'HL7 MLLP' : 'ASTM 1394-97'})</span>
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
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-[11px] leading-relaxed text-teal-300 overflow-x-auto max-h-52 select-all">
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
                <Beaker className="w-4 h-4 text-teal-400" />
                <span>Resultados Bioquímicos Gerados ({Object.keys(previewParams).length} Parâmetros)</span>
              </h3>
              <span className="text-[10px] font-mono text-teal-300 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/50">
                Perfil: {profile}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {Object.values(previewParams).map((p, idx) => {
                const isHigh = p.flag === 'H';
                const isLow = p.flag === 'L';
                return (
                  <div
                    key={`${p.code}-${idx}`}
                    className={`p-2.5 rounded-xl border transition-all ${
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
                    <div className="text-[10px] text-slate-400 truncate">{p.name}</div>
                    <div className="text-sm font-mono font-extrabold mt-1">
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
