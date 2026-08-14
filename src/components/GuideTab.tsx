import React, { useState } from 'react';
import { Download, Copy, Check, Terminal, Cpu, Settings, ShieldCheck, CheckCircle2, ChevronRight, BookOpen } from 'lucide-react';
import { generateNodeScript, generatePythonScript } from '../lib/scriptsGenerator';

export const GuideTab: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<'node' | 'python'>('node');
  const [copiedCode, setCopiedCode] = useState(false);

  const nodeCode = generateNodeScript(5151);
  const pythonCode = generatePythonScript(5151);
  const activeCode = selectedLanguage === 'node' ? nodeCode : pythonCode;

  const copyCode = () => {
    navigator.clipboard.writeText(activeCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownload = (type: 'node' | 'python') => {
    window.location.href = `/api/download-script/${type}`;
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
              <BookOpen className="w-5 h-5" />
              <span>Manual de Instalação e Execução Local no Laboratório</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              Como conectar seu Mindray BC-5480 ao Computador
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Como o equipamento do seu laboratório está na sua rede local (LAN), você pode rodar um pequeno script em qualquer computador conectado ao mesmo roteador/switch para escutar e salvar os resultados automaticamente.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => handleDownload('node')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center space-x-2 transition-colors shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Script Node.js</span>
            </button>

            <button
              onClick={() => handleDownload('python')}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center space-x-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Script Python</span>
            </button>
          </div>
        </div>
      </div>

      {/* Photo Configuration Summary Card */}
      <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-5 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-sans">
                Parâmetros Detectados da Sua Tela (Mindray BC-5480)
              </h3>
              <p className="text-[11px] text-slate-400">
                Confirmamos a foto da sua tela "Config interface". O sistema e os scripts locais já foram ajustados para esta porta e IP!
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md">
            Validado
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">IP do Servidor LIS (Seu PC)</span>
            <span className="font-mono font-bold text-emerald-400">192.168.68.120</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">IP do Mindray BC-5480</span>
            <span className="font-mono font-bold text-indigo-300">192.168.68.203</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Porta LIS TCP</span>
            <span className="font-mono font-bold text-indigo-400">5151</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">LIS Bidirecional</span>
            <span className="font-semibold text-slate-200">Lig. (Ativado)</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Confirmação (ACK)</span>
            <span className="font-semibold text-emerald-400">Lig. (Exige MSA|AA)</span>
          </div>
        </div>
      </div>

      {/* Step by Step Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Step 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 relative overflow-hidden">
          <div className="text-3xl font-black text-indigo-500/20 absolute right-4 top-2">01</div>
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <Settings className="w-4 h-4" />
            <span>Passo 1: No Aparelho Mindray (Verificado na Foto)</span>
          </div>
          <h3 className="font-bold text-sm text-slate-100">Configuração "Config interface" do BC-5480</h3>
          <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
            <li><strong>Ender IP:</strong> <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-400 font-mono font-bold">192.168.68.120</code> (IP do seu Computador / Servidor LIS)</li>
            <li><strong>Porta:</strong> <code className="bg-slate-950 px-1.5 py-0.5 rounded text-indigo-300 font-mono font-bold">5151</code></li>
            <li><strong>LIS/HIS bidirecional:</strong> <span className="text-emerald-400 font-semibold">Lig. (Marcado)</span></li>
            <li><strong>Confirmação de comunicação:</strong> <span className="text-emerald-400 font-semibold">Lig. (Exige resposta ACK do LIS)</span></li>
            <li><strong>Histograma / Dispersão:</strong> Não transmitido (Padrão)</li>
            <li><strong>Versão:</strong> <code className="bg-slate-950 px-1.5 py-0.5 rounded text-indigo-300 font-mono">1.0</code></li>
          </ul>
        </div>

        {/* Step 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 relative overflow-hidden">
          <div className="text-3xl font-black text-indigo-500/20 absolute right-4 top-2">02</div>
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <Terminal className="w-4 h-4" />
            <span>Passo 2: No Computador (192.168.68.120)</span>
          </div>
          <h3 className="font-bold text-sm text-slate-100">Rodar o Servidor no seu Linux</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Como o seu LIS está em um <strong>Servidor Linux</strong> (Ubuntu/Debian/CentOS), execute o Servidor Web e libere a porta no Firewall do Linux:
          </p>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5 text-xs font-mono text-emerald-400">
            <div className="text-[10px] text-slate-500 uppercase font-bold">1. Liberar a Porta 5151 no Firewall do Linux:</div>
            <div className="text-amber-300">sudo ufw allow 5151/tcp</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold pt-1">2. Na pasta do projeto no Linux:</div>
            <div className="text-indigo-300">npm install</div>
            <div className="text-indigo-300">npm run build</div>
            <div className="text-emerald-400 font-bold">npm start</div>
          </div>
          <p className="text-[11px] text-slate-400">
            Verifique o IP local do Linux rodando <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded font-mono">ip a</code> ou <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded font-mono">hostname -I</code>.
          </p>

          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1 text-xs">
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Como testar do Windows (Computador do Equipamento) para o Linux:</span>
            <p className="text-slate-300 text-[11px]">Abra o <strong>PowerShell</strong> no Windows e execute:</p>
            <code className="text-emerald-400 font-mono block bg-slate-900 p-1.5 rounded">Test-NetConnection -ComputerName 192.168.68.120 -Port 5151</code>
            <p className="text-slate-400 text-[10px]">Se retornar <strong className="text-emerald-400">TcpTestSucceeded : True</strong>, o Windows consegue conectar perfeitamente no seu servidor Linux!</p>
          </div>

          <div className="bg-amber-950/30 border border-amber-500/30 p-3 rounded-xl space-y-2 text-xs">
            <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider block flex items-center space-x-1">
              <span>⚠️ Por que a caixa "Executar por lista de trabalho" fica cinza/desabilitada?</span>
            </span>
            <ul className="text-slate-300 space-y-1.5 list-disc list-inside text-[11px] leading-relaxed">
              <li>
                <strong>Status do LIS:</strong> No topo direito da tela do Mindray, o indicador <strong className="text-emerald-400">[ LIS ]</strong> precisa estar <strong>verde/ativo</strong>. Se estiver cinza, na tela de Comunicação (Imagem 2) clique em <strong className="text-indigo-300">Aplicar / Ok</strong> para o equipamento fazer o handshaking inicial com o servidor Linux.
              </li>
              <li>
                <strong>Consulta Automática:</strong> Com a opção <strong className="text-slate-100">Comun. autom.: Lig.</strong> ativada (como está na sua configuração!), você <strong>NÃO precisa marcar a caixa manual</strong>! Basta digitar o ID da amostra (ex: <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded font-mono">548001</code>) no campo <em>ID amost.</em> e clicar em <strong>Ok</strong> ou iniciar a contagem: o Mindray vai disparar a consulta LIS no Linux sozinho!
              </li>
              <li>
                <strong>Para uso com Leitor de Código de Barras:</strong> Marque a caixa <strong className="text-slate-100">"Examinar automaticamente ID da amostra"</strong> na janela de contagem. Assim, ao passar o tubo no leitor, ele lê o código e busca os dados no LIS automaticamente.
              </li>
            </ul>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 relative overflow-hidden">
          <div className="text-3xl font-black text-indigo-500/20 absolute right-4 top-2">03</div>
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Passo 3: Testar e Validar</span>
          </div>
          <h3 className="font-bold text-sm text-slate-100">Realizar um Exame de Teste</h3>
          <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
            <li>Realize uma aspiração de amostra ou passe um controle de qualidade no Mindray.</li>
            <li>Assim que a análise de 5 partes terminar, o Mindray enviará o HL7 via TCP.</li>
            <li>O script no computador exibirá no terminal a confirmação e salvará os parâmetros em <code className="bg-slate-950 px-1.5 py-0.5 rounded text-indigo-300 font-mono">mindray_results.json</code>.</li>
            <li>O script responderá automaticamente o <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-400 font-mono">ACK (MSA|AA)</code> para o equipamento não dar alarme.</li>
          </ul>
        </div>

      </div>

      {/* Code Inspector / Script Code Viewer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-100">Código-Fonte do Script para Execução Local</h3>
            <p className="text-xs text-slate-400">
              Copie o código abaixo e salve direto no seu computador do laboratório.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex space-x-1 text-xs">
              <button
                onClick={() => setSelectedLanguage('node')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  selectedLanguage === 'node'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Node.js (.js)
              </button>

              <button
                onClick={() => setSelectedLanguage('python')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  selectedLanguage === 'python'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Python (.py)
              </button>
            </div>

            <button
              onClick={copyCode}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-2 rounded-xl border border-slate-700 flex items-center space-x-1.5 transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copiado!' : 'Copiar Código'}</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 max-h-[500px] overflow-y-auto selection:bg-indigo-500 leading-relaxed whitespace-pre">
          {activeCode}
        </div>

      </div>

    </div>
  );
};
