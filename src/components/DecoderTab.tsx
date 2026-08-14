import React, { useState } from 'react';
import { Code, FileText, CheckCircle2, AlertTriangle, Eye, ShieldCheck, Copy, Check } from 'lucide-react';
import { MindraySampleResult } from '../types';

interface DecoderTabProps {
  onParseRaw: (rawText: string) => Promise<{
    parsedResult?: MindraySampleResult;
    ackMessage?: string;
    error?: string;
  }>;
  onSelectSample: (sample: MindraySampleResult) => void;
}

export const DecoderTab: React.FC<DecoderTabProps> = ({ onParseRaw, onSelectSample }) => {
  const [rawText, setRawText] = useState<string>(
    `MSH|^~\\&|BC-5480|MINDRAY|LIS|LAB|20260723143000||ORU^R01|MSG98765|P|2.3.1|\rPID|1||P-1002||SILVA^JOAO||19900101|M|||||||||||\rOBR|1|548002|548002|00001^Hemograma Completo 5-Diff^MINDRAY|||20260723143000|||||||||||||||20260723143000|||F||||||\rOBX|1|NM|6690-2^WBC^LN|1|8.4|10^9/L|4.00-10.00|N|||F|||20260723143000|\rOBX|2|NM|789-8^RBC^LN|2|4.85|10^12/L|3.80-5.80|N|||F|||20260723143000|\rOBX|3|NM|718-7^HGB^LN|3|14.2|g/dL|11.5-17.5|N|||F|||20260723143000|\rOBX|4|NM|4544-3^HCT^LN|4|42.8|%|35.0-50.0|N|||F|||20260723143000|\rOBX|5|NM|777-3^PLT^LN|5|280|10^9/L|150-450|N|||F|||20260723143000|`
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedSample, setParsedSample] = useState<MindraySampleResult | null>(null);
  const [ackReply, setAckReply] = useState<string | null>(null);
  const [copiedAck, setCopiedAck] = useState(false);

  const handleDecode = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setParsedSample(null);
    setAckReply(null);

    try {
      const res = await onParseRaw(rawText);
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.parsedResult) {
        setParsedSample(res.parsedResult);
        setAckReply(res.ackMessage || null);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao decodificar a mensagem.');
    } finally {
      setLoading(false);
    }
  };

  const copyAck = () => {
    if (ackReply) {
      navigator.clipboard.writeText(ackReply);
      setCopiedAck(true);
      setTimeout(() => setCopiedAck(false), 2000);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Input Panel */}
      <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 font-semibold mb-1">
            <Code className="w-5 h-5" />
            <h2 className="text-base text-slate-100">Decodificador Multi-Equipamento (HL7 / ASTM / RS232)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Cole aqui qualquer pacote bruto transmitido pelo <strong>Mindray BC-5480</strong>, <strong>URIT-8021A</strong> ou <strong>Maxion Eletrólitos</strong> para decodificar e analisar os parâmetros.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Conteúdo HL7 (MSH, PID, OBR, OBX):
          </label>
          <textarea
            rows={12}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed selection:bg-indigo-500"
            placeholder="Cole aqui a mensagem HL7 enviada pelo aparelho..."
          />
        </div>

        <button
          onClick={handleDecode}
          disabled={loading || !rawText.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-semibold py-3 rounded-xl flex items-center justify-center space-x-2 transition-colors shadow-md"
        >
          <FileText className="w-4 h-4" />
          <span>Decodificar e Processar MLLP</span>
        </button>
      </div>

      {/* Result Panel */}
      <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg flex flex-col justify-between">
        
        <div>
          <h2 className="text-base font-bold text-slate-100 mb-1">Análise Sintática &amp; Parâmetros Extraídos</h2>
          <p className="text-xs text-slate-400">
            Relatório de validação de protocolo e visualização detalhada do hemograma.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 text-xs text-rose-300 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold mb-1">Falha na Decodificação HL7:</strong>
              {errorMsg}
            </div>
          </div>
        )}

        {!parsedSample && !errorMsg && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500 space-y-2 my-auto">
            <Code className="w-8 h-8 mx-auto text-slate-700" />
            <p>Clique em &quot;Decodificar e Processar MLLP&quot; para validar o texto.</p>
          </div>
        )}

        {parsedSample && (
          <div className="space-y-4">
            
            {/* Summary card */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Amostra</span>
                  <span className="font-bold text-sm text-slate-100 font-mono">#{parsedSample.sampleId}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Paciente</span>
                  <span className="font-semibold text-xs text-slate-200">{parsedSample.patientName || 'N/I'}</span>
                </div>

                <button
                  onClick={() => onSelectSample(parsedSample)}
                  className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver Exame Completo</span>
                </button>
              </div>

              {/* Sample Parameters Quick Table */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono pt-1">
                {['WBC', 'RBC', 'HGB', 'HCT', 'PLT'].map(code => {
                  const param = parsedSample.parameters[code];
                  if (!param) return null;
                  return (
                    <div key={code} className="bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                      <span className="text-slate-400 text-[10px] block">{code}</span>
                      <span className="font-bold text-slate-100 text-xs">{param.value} {param.unit}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Generated ACK */}
            {ackReply && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium">Resposta ACK Válida Gerada para esta Mensagem:</span>
                  <button
                    onClick={copyAck}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                  >
                    {copiedAck ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAck ? 'Copiado' : 'Copiar ACK'}</span>
                  </button>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 whitespace-pre-wrap">
                  {ackReply}
                </div>
              </div>
            )}

          </div>
        )}

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400">
          <strong>Dica de Validação:</strong> No padrão HL7 v2.3.1 da Mindray, as linhas devem terminar com caractere de retorno de carro (<code className="text-indigo-400">\r</code>) e o envelope MLLP deve conter o byte de início <code className="text-indigo-400">0x0B</code> e fim <code className="text-indigo-400">0x1C 0x0D</code>.
        </div>
      </div>

    </div>
  );
};
