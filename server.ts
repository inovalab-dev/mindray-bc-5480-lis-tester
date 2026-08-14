import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import net from 'net';
import os from 'os';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { 
  parseMindrayHL7, 
  generateSimulatedMindrayHL7, 
  stringToHex,
  wrapMLLP,
  unwrapMLLP
} from './src/lib/mindrayParser.js';
import {
  parseUritRawMessage,
  generateUritHL7Message,
  generateUritAstmMessage
} from './src/lib/uritParser.js';
import {
  parseMaxionRawMessage,
  generateMaxionMessage,
  stringToHexMaxion
} from './src/lib/maxionParser.js';
import {
  parseMaxcoagRawMessage,
  generateMaxcoagMessage,
  stringToHexMaxcoag
} from './src/lib/maxcoagParser.js';
import {
  parseWamaRawMessage,
  generateWamaMessage,
  stringToHexWama
} from './src/lib/wamaParser.js';
import {
  parseFinecareRawMessage,
  generateFinecareMessage,
  stringToHexFinecare
} from './src/lib/finecareParser.js';
import { generateNodeScript, generatePythonScript } from './src/lib/scriptsGenerator.js';
import { CommLogEntry, ServerStatus, SimulationConfig, WorklistItem, MindraySampleResult, CodeMapping, EquipmentItem } from './src/types.js';
import { INITIAL_DEFAULT_MAPPINGS, translateLisToEquipmentCode, translateEquipmentToLisCode } from './src/lib/deParaService.js';
import {
  initDatabase,
  getDbCodeMappings,
  insertDbCodeMapping,
  updateDbCodeMapping,
  deleteDbCodeMapping,
  resetDbCodeMappings,
  getDbWorklists,
  saveDbWorklistItem,
  deleteDbWorklistItem,
  saveDbLog,
  getDbLogs,
  clearDbLogs,
  saveDbProcessedSample,
  getDbProcessedSamples,
  getDbEquipments,
  insertDbEquipment,
  updateDbEquipment,
  deleteDbEquipment
} from './src/lib/db.js';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb' }));

// Memory store for Code Mappings (De/Para), synchronized directly with MySQL database
let codeMappingsStore: CodeMapping[] = [];

const PORT = Number(process.env.PORT || 3000);
const TCP_PORT = Number(process.env.TCP_PORT || process.env.LIS_MLLP_PORT || 5151);

// In-memory store for logs, worklists and received samples (persisted in MySQL)
const logsBuffer: CommLogEntry[] = [];
const worklistStore = new Map<string, WorklistItem>();
const processedSamples = new Map<string, MindraySampleResult>();

let totalReceivedCount = 0;
let lastReceivedTime: string | undefined = undefined;
let isTcpListening = false;

let customUritDsrTemplate = [
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
].join('\r') + '\r';

function addLogEntry(
  level: CommLogEntry['level'],
  source: CommLogEntry['source'],
  message: string,
  rawHex?: string,
  parsedResult?: CommLogEntry['parsedResult']
) {
  const entry: CommLogEntry = {
    id: `LOG_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
    level,
    source,
    message,
    rawHex,
    parsedResult
  };
  
  logsBuffer.unshift(entry);
  if (logsBuffer.length > 200) {
    logsBuffer.pop();
  }

  saveDbLog(entry).catch((err) => {
    console.error('Erro ao salvar log no MySQL:', err.message);
  });
}

// Helper to match incoming sample result with registered LIS Worklist
function processMatchedSample(res: MindraySampleResult): MindraySampleResult {
  const sid = res.sampleId || '';
  let worklist = worklistStore.get(sid);

  if (!worklist && sid) {
    const cleanSid = sid.replace(/^0+/, '');
    worklist = worklistStore.get(cleanSid);
  }

  if (!worklist && sid) {
    const cleanSid = sid.replace(/^0+/, '');
    for (const item of worklistStore.values()) {
      if (item.sampleId === sid || item.sampleId === cleanSid || item.sampleId.replace(/^0+/, '') === cleanSid) {
        worklist = item;
        break;
      }
    }
  }

  if (!worklist) {
    // If no direct key match, find any pending or partial worklist order
    for (const item of worklistStore.values()) {
      if (item.status === 'PENDING' || item.status === 'PARTIAL') {
        worklist = item;
        break;
      }
    }
  }

  if (worklist) {
    if (!res.patientName || res.patientName === 'Paciente Desconhecido' || res.patientName === 'N/I') {
      res.patientName = worklist.patientName;
    }
    if (!res.patientId) {
      res.patientId = worklist.patientId;
    }

    // Merge existing accumulated parameters with new incoming parameters
    const existingParams = worklist.result?.parameters || {};
    const mergedParams = { ...existingParams, ...(res.parameters || {}) };

    // Update combined analyzer model label
    const prevModel = worklist.result?.analyzerModel || worklist.analyzerModel || '';
    const newModel = res.analyzerModel || '';
    let combinedModel = prevModel;
    if (newModel && !prevModel.includes(newModel)) {
      combinedModel = prevModel ? `${prevModel}, ${newModel}` : newModel;
    }

    const consolidatedResult: MindraySampleResult = {
      ...res,
      patientName: worklist.patientName,
      patientId: worklist.patientId,
      analyzerModel: combinedModel || res.analyzerModel,
      parameters: mergedParams
    };

    // Determine status based on requested tests array
    const requestedTests = worklist.tests || [];
    let isFullyCompleted = true;

    if (requestedTests.length > 0) {
      const keysUpper = Object.keys(mergedParams).map(k => k.toUpperCase());

      for (const t of requestedTests) {
        const tu = t.toUpperCase();
        if (tu === 'HEMOGRAMA' || tu === 'CBC' || tu === '5DIFF') {
          const hasHemo = keysUpper.some(k => ['WBC', 'RBC', 'HGB', 'HCT', 'PLT'].includes(k));
          if (!hasHemo) isFullyCompleted = false;
        } else {
          const hasParam = keysUpper.some(k => k.includes(tu) || tu.includes(k));
          if (!hasParam) isFullyCompleted = false;
        }
      }
    }

    worklist.status = isFullyCompleted ? 'COMPLETED' : 'PARTIAL';
    worklist.completedAt = new Date().toLocaleTimeString('pt-BR');
    worklist.result = consolidatedResult;
    worklistStore.set(worklist.sampleId, worklist);
    saveDbWorklistItem(worklist).catch((err) => console.error('Erro ao salvar worklist no MySQL:', err.message));

    addLogEntry(
      'SUCCESS',
      'LIS Server',
      `Ordem #${worklist.sampleId} atualizada (${worklist.status === 'COMPLETED' ? 'Concluída' : 'Parcial'}): Paciente ${res.patientName} (${res.patientId}). Total exames lidos: ${Object.keys(mergedParams).length}`
    );

    // Auto-transmit results to external REST LIS endpoint
    sendResultToExternalLis(consolidatedResult).catch(err => {
      console.error('Error sending result to external LIS:', err);
    });

    saveDbProcessedSample(consolidatedResult).catch((err) => console.error('Erro ao salvar amostra processada no MySQL:', err.message));

    return consolidatedResult;
  }

  processedSamples.set(res.sampleId, res);
  saveDbProcessedSample(res).catch((err) => console.error('Erro ao salvar amostra processada no MySQL:', err.message));

  // Auto-transmit results to external REST LIS endpoint even if no worklist pre-registered
  sendResultToExternalLis(res).catch(err => {
    console.error('Error sending result to external LIS:', err);
  });

  return res;
}

// Helper function to resolve LIS Base URL from HOST_LIS or LIS_HOST environment variable
function getLisBaseUrl(): string {
  let host = process.env.HOST_LIS || process.env.LIS_HOST || '186.237.152.170:3000';
  host = host.trim();
  if (!host.startsWith('http://') && !host.startsWith('https://')) {
    host = `http://${host}`;
  }
  return host.replace(/\/+$/, '');
}

// REST LIS Integration: Send equipment results back to external LIS endpoint with De/Para mapping
async function sendResultToExternalLis(res: MindraySampleResult, equipmentFamily?: string): Promise<void> {
  const sid = res.sampleId;
  if (!sid) return;

  if (!res.parameters || Object.keys(res.parameters).length === 0) {
    return;
  }

  // Determine equipment family if not explicitly provided
  let family = equipmentFamily || 'ALL';
  if (family === 'ALL' && res.analyzerModel) {
    const model = res.analyzerModel.toUpperCase();
    if (model.includes('URIT')) family = 'URIT';
    else if (model.includes('MINDRAY') || model.includes('BC-')) family = 'MINDRAY';
    else if (model.includes('MAXION')) family = 'MAXION';
    else if (model.includes('MAXCOAG') || model.includes('COAG')) family = 'MAXCOAG';
    else if (model.includes('FINECARE')) family = 'FINECARE';
    else if (model.includes('WAMA')) family = 'WAMA';
  }

  interface ParamItem {
    originalKey: string;
    eqCode: string;
    groupExamCode: string;
    paramKeyInValores: string;
    value: any;
    unidade: string;
  }

  const examGroups = new Map<string, ParamItem[]>();

  for (const [paramKey, p] of Object.entries(res.parameters)) {
    if (!p) continue;
    const eqCode = (p.code || paramKey).trim();
    const translation = translateEquipmentToLisCode(eqCode, family, codeMappingsStore);
    const mapping = translation.mappingApplied;

    // Determine root 'exame' field (groupExamCode) and item key in 'valores' (paramKeyInValores)
    let groupExamCode = (mapping?.parentCode && mapping.parentCode.trim())
      ? mapping.parentCode.trim().toUpperCase()
      : (mapping?.lisCode ? mapping.lisCode.trim().toUpperCase() : (translation.translatedCode || eqCode));

    let paramKeyInValores = mapping?.lisCode
      ? mapping.lisCode.trim().toUpperCase()
      : (p.code || paramKey);

    let parsedVal: any = p.value;
    if (p.value !== undefined && p.value !== null) {
      const strVal = String(p.value).trim();
      if (strVal !== '' && !isNaN(Number(strVal))) {
        parsedVal = Number(strVal);
      }
    }

    const unitStr = p.unit || '';

    const item: ParamItem = {
      originalKey: paramKey,
      eqCode,
      groupExamCode,
      paramKeyInValores,
      value: parsedVal,
      unidade: unitStr
    };

    if (!examGroups.has(groupExamCode)) {
      examGroups.set(groupExamCode, []);
    }
    examGroups.get(groupExamCode)!.push(item);
  }

  const lisBaseHost = getLisBaseUrl();
  const primaryUrl = `${lisBaseHost}/api/amostra/resultado`;
  const secondaryUrl = `${lisBaseHost}/api/interfaceamento/amostra/resultado`;

  for (const [groupExamCode, items] of examGroups.entries()) {
    const valores = items.map(it => ({
      key: it.paramKeyInValores,
      value: it.value,
      unidade: it.unidade
    }));

    const payload = {
      idAmostra: sid,
      exame: groupExamCode,
      valores
    };

    addLogEntry(
      'INFO',
      'REST LIS Integration',
      `📤 Transmitindo resultado [Exame: ${groupExamCode}] da amostra #${sid} ao LIS REST: POST ${primaryUrl}`
    );

    try {
      let response = await fetch(primaryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        response = await fetch(secondaryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        addLogEntry(
          'SUCCESS',
          'REST LIS Integration',
          `✅ Resultado [Exame: ${groupExamCode}] da Amostra #${sid} enviado ao LIS REST com sucesso! Payload: ${JSON.stringify(payload)}`
        );
      } else {
        addLogEntry(
          'WARN',
          'REST LIS Integration',
          `⚠️ Falha ao enviar resultado [Exame: ${groupExamCode}] da Amostra #${sid} ao LIS REST: HTTP ${response.status}`
        );
      }
    } catch (err: any) {
      addLogEntry(
        'ERROR',
        'REST LIS Integration',
        `❌ Erro na chamada REST ao LIS (Resultado Amostra #${sid} / ${groupExamCode}): ${err.message}`
      );
    }
  }
}

// Initial boot log
addLogEntry('INFO', 'System', 'Servidor de Teste LIS Mindray BC-5480 inicializado.');

// Local IP addresses detection
function getLocalIpAddresses(): string[] {
  const ips: string[] = [];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips.length > 0 ? ips : ['127.0.0.1'];
}

// Helper to extract sample ID / barcode from raw HL7 or ASTM message
function extractSampleIdFromHl7(hl7Message: string): string | undefined {
  if (!hl7Message) return undefined;
  const lines = hl7Message.split(/[\r\n]+/);
  for (const line of lines) {
    if (line.startsWith('QRD|')) {
      const fields = line.split('|');
      if (fields[8]) {
        const cand = fields[8].split('^')[0].trim();
        if (cand && cand !== 'DEM' && cand !== 'OTH' && cand !== 'ALL' && cand !== '1') {
          return cand;
        }
      }
      for (let idx = 7; idx < fields.length; idx++) {
        const rawVal = fields[idx].trim();
        const val = rawVal.split('^')[0].trim();
        if (val && val !== 'DEM' && val !== 'OTH' && val !== 'ALL' && val !== '1' && val !== 'RD' && val !== '1^RD' && !rawVal.includes('^RD')) {
          return val;
        }
      }
    }
    if (line.startsWith('OBR|')) {
      const fields = line.split('|');
      const sid = (fields[2] || fields[3] || '').split('^')[0].trim();
      if (sid && sid !== '1') return sid;
    }
  }
  return undefined;
}

// Resolve equipment code registered in "Cadastro de Equipamentos" (MySQL)
async function resolveEquipmentCode(inputIdentifier?: string): Promise<{ equipmentCode: string; equipmentFamily: string }> {
  let equipmentCode = 'MINDRAY-BC5480';
  let equipmentFamily = 'ALL';

  try {
    const list = await getDbEquipments();
    if (inputIdentifier && inputIdentifier !== 'ALL') {
      const cleanInput = inputIdentifier.trim();
      const lowerInput = cleanInput.toLowerCase();

      // 1. Exact match with eq.code or eq.id or eq.description
      const directMatch = list.find(eq =>
        eq.code.toLowerCase() === lowerInput ||
        eq.id.toLowerCase() === lowerInput ||
        eq.description.toLowerCase() === lowerInput
      );

      if (directMatch) {
        equipmentCode = directMatch.code;
      } else {
        // 2. Partial match (e.g. "MINDRAY" matches "MINDRAY-BC5480")
        const partialMatch = list.find(eq =>
          eq.code.toLowerCase().includes(lowerInput) ||
          eq.description.toLowerCase().includes(lowerInput) ||
          lowerInput.includes(eq.code.toLowerCase()) ||
          lowerInput.includes(eq.description.toLowerCase())
        );

        if (partialMatch) {
          equipmentCode = partialMatch.code;
        } else {
          // If no match in DB, keep the provided input string
          equipmentCode = cleanInput;
        }
      }
    } else if (list && list.length > 0) {
      // Default to the first equipment code in DB
      equipmentCode = list[0].code;
    }
  } catch (err) {
    if (inputIdentifier && inputIdentifier !== 'ALL') {
      equipmentCode = inputIdentifier;
    }
  }

  // Determine equipment family for De/Para mapping
  const upperCode = equipmentCode.toUpperCase();
  if (upperCode.includes('URIT') || upperCode.includes('8021')) {
    equipmentFamily = 'URIT';
  } else if (upperCode.includes('MINDRAY') || upperCode.includes('BC')) {
    equipmentFamily = 'MINDRAY';
  } else if (upperCode.includes('MAXION') || upperCode.includes('ISE')) {
    equipmentFamily = 'MAXION';
  } else if (upperCode.includes('MAXCOAG')) {
    equipmentFamily = 'MAXCOAG';
  } else if (upperCode.includes('WAMA')) {
    equipmentFamily = 'WAMA';
  } else if (upperCode.includes('FINECARE')) {
    equipmentFamily = 'FINECARE';
  } else {
    equipmentFamily = inputIdentifier && inputIdentifier !== 'ALL' ? inputIdentifier : 'ALL';
  }

  return { equipmentCode, equipmentFamily };
}

// REST LIS Integration: Fetch sample data from external LIS API and auto-register order with De/Para mapping
async function fetchAndRegisterOrderFromExternalLis(sampleCode: string, equipmentHint: string = 'ALL'): Promise<WorklistItem | undefined> {
  if (!sampleCode) return undefined;
  const cleanCode = sampleCode.trim();
  if (!cleanCode || ['DEM', 'ALL', 'OTH', '1', 'Q101'].includes(cleanCode.toUpperCase())) {
    return undefined;
  }

  // Check if order already exists in local worklistStore
  let existing = worklistStore.get(cleanCode);
  if (!existing) {
    const withoutZero = cleanCode.replace(/^0+/, '');
    existing = worklistStore.get(withoutZero);
    if (!existing) {
      for (const item of worklistStore.values()) {
        if (item.sampleId === cleanCode || item.sampleId === withoutZero || item.sampleId.replace(/^0+/, '') === withoutZero) {
          existing = item;
          break;
        }
      }
    }
  }

  if (existing) {
    addLogEntry('INFO', 'REST LIS Integration', `Ordem #${cleanCode} já cadastrada localmente: Paciente ${existing.patientName} (ID: ${existing.patientId})`);
    return existing;
  }

  // Resolve equipment code registered in "Cadastro de Equipamentos"
  const { equipmentCode, equipmentFamily } = await resolveEquipmentCode(equipmentHint);

  // POST request to external LIS REST endpoint
  const url = `${getLisBaseUrl()}/api/amostra`;
  const payload = {
    codigoAmostra: cleanCode,
    equipamento: equipmentCode
  };

  addLogEntry('INFO', 'REST LIS Integration', `🔍 Consultando API REST do LIS para amostra #${cleanCode} [Equipamento: "${equipmentCode}"]: POST ${url}\nPayload enviado: ${JSON.stringify(payload)}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000)
    });

    if (!response.ok) {
      addLogEntry('WARN', 'REST LIS Integration', `⚠️ LIS REST API retornou HTTP ${response.status} para amostra #${cleanCode} (Equipamento: "${equipmentCode}"). Amostra não cadastrada no LIS.`);
      return undefined;
    }

    const data = await response.json() as any;

    if (data && (data.idAmostra || data.codigoAmostra || data.nome || data.nomePaciente || data.idPaciente || data.paciente || data.exames || data.tests)) {
      const sid = data.idAmostra || data.codigoAmostra || data.amostra || cleanCode;
      
      let pid = '4';
      let name = 'Paciente Desconhecido';
      let rawGender = 'M';
      let ageStr = '64a';
      let dob = '1962-06-18';

      if (typeof data.paciente === 'object' && data.paciente !== null) {
        pid = data.paciente.id || data.paciente.codigo || data.idPaciente || data.codigoPaciente || '4';
        name = data.paciente.nome || data.nome || data.nomePaciente || 'Paciente Desconhecido';
        rawGender = (data.paciente.genero || data.paciente.sexo || data.genero || data.sexo || 'M').toUpperCase();
        if (data.paciente.idade || data.idade) ageStr = `${data.paciente.idade || data.idade}a`;
        if (data.paciente.dataNascimento || data.dataNascimento) dob = data.paciente.dataNascimento || data.dataNascimento;
      } else {
        pid = data.idPaciente || data.codigoPaciente || data.pacienteId || (typeof data.paciente === 'string' ? data.paciente : '4');
        name = data.nome || data.nomePaciente || data.pacienteNome || 'Paciente Desconhecido';
        rawGender = (data.genero || data.sexo || 'M').toUpperCase();
        if (data.idade) ageStr = `${data.idade}a`;
        if (data.dataNascimento) dob = data.dataNascimento;
      }

      const gender = rawGender.startsWith('M') ? 'Male' : rawGender.startsWith('F') ? 'Female' : 'Male';

      // Parse list of exams returned by LIS
      let rawLisCodes: string[] = [];
      const examesList = data.exames || data.tests || data.listaExames;

      if (Array.isArray(examesList)) {
        rawLisCodes = examesList.map((item: any) => {
          if (typeof item === 'string') return item.trim();
          if (item && typeof item === 'object') {
            return (item.codigo || item.code || item.exame || item.nome || item.id || '').toString().trim();
          }
          return '';
        }).filter(Boolean);
      } else if (typeof examesList === 'string' && examesList.trim()) {
        rawLisCodes = [examesList.trim()];
      }

      // Apply De/Para code mapping to translate LIS codes -> Equipment codes
      const translatedExams: string[] = [];
      const mappingLogDetails: string[] = [];

      if (rawLisCodes.length > 0) {
        for (const lisCode of rawLisCodes) {
          const res = translateLisToEquipmentCode(lisCode, equipmentFamily, codeMappingsStore);
          translatedExams.push(res.translatedCode);
          if (res.mappingApplied) {
            mappingLogDetails.push(`   • LIS "${lisCode}" ➔ De/Para (${res.mappingApplied.equipmentFamily}): "${res.translatedCode}" (${res.mappingApplied.equipmentName || res.mappingApplied.lisName})`);
          } else {
            mappingLogDetails.push(`   • LIS "${lisCode}" ➔ Sem regra De/Para cadastrada (enviado "${res.translatedCode}" direto)`);
          }
        }
      } else {
        translatedExams.push('CBC+DIFF');
      }

      const testsList = translatedExams.length > 0 ? translatedExams : ['CBC+DIFF'];
      const formattedTestCode = testsList.length === 1 && testsList[0] === 'CBC+DIFF'
        ? '00002^CBC+DIFF^99MRC'
        : testsList.join('^');

      const newWorklistItem: WorklistItem = {
        sampleId: sid,
        patientId: pid,
        patientName: name,
        gender: gender === 'Male' ? 'M' as any : 'F' as any,
        age: ageStr,
        dob,
        tests: testsList,
        testCode: formattedTestCode,
        sampleMode: 'W',
        orcCode: 'AF',
        msgTypeResponse: 'ORR^O02',
        useBarcodeAsPatientId: true,
        includePv1: true,
        placerIdMode: 'SAME',
        includeDatesInObr: true,
        dobMode: 'YYYYMMDD',
        includeModeObx: true,
        takeMode: 'CT',
        bloodMode: 'W',
        testModeObx: testsList[0] || 'CBC+DIFF',
        status: 'PENDING',
        createdAt: new Date().toLocaleTimeString('pt-BR')
      };

      worklistStore.set(sid, newWorklistItem);
      if (cleanCode !== sid) {
        worklistStore.set(cleanCode, newWorklistItem);
      }
      await saveDbWorklistItem(newWorklistItem);

      const logMsg = `✅ Sucesso! Resposta REST LIS recebida e Ordem cadastrada/salva no MySQL:\n` +
        `Amostra #${sid}, Paciente: ${name} (ID: ${pid})\n` +
        `Equipamento Solicitante enviado no POST: "${equipmentCode}" (Família: ${equipmentFamily})\n` +
        `Exames Solicitados pelo LIS: [${rawLisCodes.join(', ')}]\n` +
        `Exames Traduzidos De/Para para Equipamento: [${testsList.join(', ')}]\n` +
        (mappingLogDetails.length > 0 ? `Detalhes De/Para:\n${mappingLogDetails.join('\n')}` : '');

      addLogEntry(
        'SUCCESS',
        'REST LIS Integration',
        logMsg
      );

      return newWorklistItem;
    }
  } catch (err: any) {
    addLogEntry('ERROR', 'REST LIS Integration', `❌ Erro ao consultar REST LIS para amostra #${cleanCode}: ${err.message}.`);
    return undefined;
  }

  return undefined;
}

// Create TCP Socket Server for direct Mindray BC-5480, URIT, and other analyzer TCP connections
let tcpServer: net.Server | null = null;
try {
  tcpServer = net.createServer((socket) => {
    const remote = `${socket.remoteAddress}:${socket.remotePort}`;
    addLogEntry('INFO', 'LIS Server (TCP:5151)', `🔌 Nova conexão TCP/Socket estabelecida com equipamento: ${remote}`);

    let rxBuffer = Buffer.alloc(0);

    socket.on('data', async (data) => {
      rxBuffer = Buffer.concat([rxBuffer, data]);
      const rawHex = stringToHex(data.toString('binary'));

      const VT = 0x0B;
      const FS = 0x1C;
      const CR = 0x0D;

      // Check for low-level ASTM Handshake ENQ (0x05)
      if (rxBuffer.length === 1 && rxBuffer[0] === 0x05) {
        addLogEntry('RAW_IN', 'Analyzer (ASTM TCP)', `[ENQ 0x05] Handshake de início de transmissão TCP recebido de ${remote}`, rawHex);
        socket.write(Buffer.from([0x06]), () => {
          addLogEntry('RAW_OUT', 'LIS Server (TCP:5151)', `[ACK 0x06] LIS confirmou prontidão TCP para receber dados ASTM para ${remote}`, stringToHex('\x06'));
        });
        rxBuffer = Buffer.alloc(0);
        return;
      }

      let vtIndex = rxBuffer.indexOf(VT);
      let fsIndex = rxBuffer.indexOf(FS);

      while (vtIndex !== -1 && fsIndex !== -1 && fsIndex > vtIndex) {
        const hl7Buffer = rxBuffer.subarray(vtIndex + 1, fsIndex);
        const hl7Message = hl7Buffer.toString('utf8');

        const hl7FormattedIn = hl7Message.replace(/\r/g, '\n').trim();
        const lowerMsg = hl7Message.toLowerCase();
        const isUritMsg = lowerMsg.includes('urit') || lowerMsg.includes('8021') || lowerMsg.includes('8030') || lowerMsg.includes('8031') || lowerMsg.includes('99urt') || lowerMsg.includes('bioq');
        const sourceLabel = isUritMsg ? 'Analyzer URIT (TCP)' : 'Analyzer Mindray (TCP)';

        addLogEntry('RAW_IN', sourceLabel, `📥 Pacote MLLP/TCP recebido de ${remote} (${hl7Message.length} bytes / ${data.length} bytes na porta 5151):\n${hl7FormattedIn}`, rawHex);

        // Auto-fetch and register order from REST LIS if sample code is queried in TCP message
        const queriedCode = extractSampleIdFromHl7(hl7Message);
        if (queriedCode) {
          const eqFamily = isUritMsg ? 'URIT' : 'MINDRAY';
          await fetchAndRegisterOrderFromExternalLis(queriedCode, eqFamily);
        }

        const findWorklist = (sid: string) => {
          if (worklistStore.has(sid)) return worklistStore.get(sid);
          const cleanSid = sid.replace(/^0+/, '');
          if (worklistStore.has(cleanSid)) return worklistStore.get(cleanSid);
          for (const item of worklistStore.values()) {
            if (item.status === 'PENDING') return item;
          }
          return undefined;
        };

        if (isUritMsg) {
          const parseOut = parseUritRawMessage(hl7Message, findWorklist, customUritDsrTemplate, codeMappingsStore);
          if (parseOut.result) {
            totalReceivedCount++;
            lastReceivedTime = new Date().toISOString();
            const finalResult = processMatchedSample(parseOut.result as any);
            addLogEntry(
              'SUCCESS',
              'Analyzer URIT (TCP)',
              `✓ Amostra URIT-8021A recebida via TCP OK: Barcode = #${finalResult.sampleId}, Paciente = ${finalResult.patientName || 'N/I'} (${Object.keys(finalResult.parameters).length} exames)`,
              undefined,
              finalResult
            );
          }
          if (parseOut.ackMessage) {
            socket.write(Buffer.from(parseOut.ackMessage, 'utf8'), () => {
              const ackUnwrapped = unwrapMLLP(parseOut.ackMessage!).payload;
              const ackFormattedOut = ackUnwrapped.replace(/\r/g, '\n').trim();
              let respType = 'ACK de confirmação enviado ao URIT-8021A';
              if (parseOut.msgType?.includes('DSR') || parseOut.msgType?.includes('Q03') || parseOut.msgType?.includes('ORR')) {
                respType = 'DSR^Q03 (Resposta de Worklist LIS -> URIT-8021A)';
              }
              addLogEntry('RAW_OUT', 'LIS Server (TCP:5151)', `📤 Resposta TCP ${respType} transmitida para ${remote}:\n${ackFormattedOut}`, stringToHex(parseOut.ackMessage!));
            });
          }
        } else {
          // Mindray parser
          const parseOut = parseMindrayHL7(hl7Message, findWorklist);
          if (parseOut.result) {
            totalReceivedCount++;
            lastReceivedTime = new Date().toISOString();
            const finalResult = processMatchedSample(parseOut.result);
            addLogEntry(
              'SUCCESS', 
              'Analyzer Mindray (TCP)', 
              `✓ Amostra Mindray BC-5480 recebida via TCP OK: Barcode = #${finalResult.sampleId}, Paciente = ${finalResult.patientName || 'N/I'} (${Object.keys(finalResult.parameters).length} exames)`,
              undefined,
              finalResult
            );
          }

          if (parseOut.ackMessage) {
            socket.write(Buffer.from(parseOut.ackMessage, 'utf8'), () => {
              let respType = 'ACK^R01';
              if (parseOut.msgType.includes('ORR') || parseOut.msgType.includes('O02')) {
                respType = 'ORR^O02 (Resposta de Ordem/Worklist LIS -> Mindray)';
              } else if (parseOut.msgType.includes('DSR') || parseOut.msgType.includes('Q03') || parseOut.msgType.includes('QRY')) {
                respType = 'DSR^Q03 (Resposta de Worklist LIS -> Mindray)';
              }

              const ackUnwrapped = unwrapMLLP(parseOut.ackMessage!).payload;
              const ackFormattedOut = ackUnwrapped.replace(/\r/g, '\n').trim();
              const ackHex = stringToHex(parseOut.ackMessage!);

              addLogEntry(
                'RAW_OUT', 
                'LIS Server (TCP:5151)', 
                `📤 Resposta TCP ${respType} transmitida para ${remote} (Control ID: ${parseOut.msgControlId}):\n${ackFormattedOut}`, 
                ackHex
              );
            });
          }
        }

        // Advance buffer safely past FS (0x1C) and optional CR (0x0D)
        let skip = 1;
        if (fsIndex + 1 < rxBuffer.length && rxBuffer[fsIndex + 1] === CR) {
          skip = 2;
        }
        rxBuffer = rxBuffer.subarray(fsIndex + skip);
        vtIndex = rxBuffer.indexOf(VT);
        fsIndex = rxBuffer.indexOf(FS);
      }

      // Fallback if equipment sends plain HL7 without MLLP VT (0x0B) wrapper
      if (vtIndex === -1 && rxBuffer.length > 15) {
        const str = rxBuffer.toString('utf8');
        if (str.includes('MSH|')) {
          const mshIdx = str.indexOf('MSH|');
          const hl7Message = str.substring(mshIdx).trim();
          if (hl7Message.length > 25) {
            const hl7FormattedIn = hl7Message.replace(/\r/g, '\n').trim();
            const lowerMsg = hl7Message.toLowerCase();
            const isUritMsg = lowerMsg.includes('urit') || lowerMsg.includes('8021') || lowerMsg.includes('8030') || lowerMsg.includes('8031') || lowerMsg.includes('99urt') || lowerMsg.includes('bioq');
            const sourceLabel = isUritMsg ? 'Analyzer URIT (TCP)' : 'Analyzer Mindray (TCP)';

            addLogEntry('RAW_IN', sourceLabel, `📥 Dados HL7 TCP sem envelope MLLP recebidos de ${remote} (${hl7Message.length} bytes):\n${hl7FormattedIn}`, rawHex);

            const queriedCodeFallback = extractSampleIdFromHl7(hl7Message);
            if (queriedCodeFallback) {
              const eqFamily = isUritMsg ? 'URIT' : 'MINDRAY';
              await fetchAndRegisterOrderFromExternalLis(queriedCodeFallback, eqFamily);
            }

            const findWorklist = (sid: string) => {
              if (worklistStore.has(sid)) return worklistStore.get(sid);
              const cleanSid = sid.replace(/^0+/, '');
              if (worklistStore.has(cleanSid)) return worklistStore.get(cleanSid);
              for (const item of worklistStore.values()) {
                if (item.status === 'PENDING') return item;
              }
              return undefined;
            };

            if (isUritMsg) {
              const parseOut = parseUritRawMessage(hl7Message, findWorklist, customUritDsrTemplate, codeMappingsStore);
              if (parseOut.result) {
                totalReceivedCount++;
                lastReceivedTime = new Date().toISOString();
                const finalResult = processMatchedSample(parseOut.result as any);
                addLogEntry('SUCCESS', 'Analyzer URIT (TCP)', `✓ Amostra URIT-8021A recebida via TCP OK: Barcode = #${finalResult.sampleId}`, undefined, finalResult);
              }
              if (parseOut.ackMessage) {
                socket.write(Buffer.from(parseOut.ackMessage, 'utf8'), () => {
                  const ackUnwrapped = unwrapMLLP(parseOut.ackMessage!).payload;
                  addLogEntry('RAW_OUT', 'LIS Server (TCP:5151)', `📤 Resposta DSR^Q03 enviada via TCP para ${remote}:\n${ackUnwrapped.replace(/\r/g, '\n').trim()}`, stringToHex(parseOut.ackMessage!));
                });
              }
            } else {
              const parseOut = parseMindrayHL7(hl7Message, findWorklist);
              if (parseOut.result) {
                totalReceivedCount++;
                lastReceivedTime = new Date().toISOString();
                const finalResult = processMatchedSample(parseOut.result);
                addLogEntry('SUCCESS', 'Analyzer Mindray (TCP)', `✓ Amostra Mindray BC-5480 recebida via TCP OK: Barcode = #${finalResult.sampleId}`, undefined, finalResult);
              }
              if (parseOut.ackMessage) {
                socket.write(Buffer.from(parseOut.ackMessage, 'utf8'), () => {
                  const ackUnwrapped = unwrapMLLP(parseOut.ackMessage!).payload;
                  addLogEntry('RAW_OUT', 'LIS Server (TCP:5151)', `📤 Resposta HL7/ACK enviada via TCP para ${remote}:\n${ackUnwrapped.replace(/\r/g, '\n').trim()}`, stringToHex(parseOut.ackMessage!));
                });
              }
            }
            rxBuffer = Buffer.alloc(0);
          }
        }
      }
    });

    socket.on('end', () => {
      addLogEntry('WARN', 'LIS Server (TCP:5151)', `🔌 Conexão TCP encerrada pelo equipamento remoto: ${remote}`);
    });

    socket.on('error', (err) => {
      addLogEntry('ERROR', 'LIS Server (TCP:5151)', `❌ Erro no Socket TCP (${remote}): ${err.message}`);
    });
  });

  tcpServer.listen(TCP_PORT, '0.0.0.0', () => {
    isTcpListening = true;
    addLogEntry('INFO', 'System', `Servidor TCP LIS escutando na porta ${TCP_PORT} (0.0.0.0)`);
  });

  tcpServer.on('error', (err) => {
    isTcpListening = false;
    addLogEntry('WARN', 'System', `Porta TCP ${TCP_PORT} não disponível diretamente (${err.message}). Use o simulador web ou o script local.`);
  });
} catch (e: any) {
  isTcpListening = false;
  addLogEntry('WARN', 'System', `Socket TCP desativado no ambiente cloud: ${e?.message}`);
}

// REST API Endpoints

app.get('/api/status', (req, res) => {
  const status: ServerStatus = {
    online: true,
    tcpPort: TCP_PORT,
    httpPort: PORT,
    protocol: 'HL7_MLLP',
    totalReceived: totalReceivedCount,
    lastReceivedAt: lastReceivedTime,
    ipAddresses: getLocalIpAddresses()
  };
  res.json(status);
});

app.get('/api/logs', async (req, res) => {
  const dbLogs = await getDbLogs();
  res.json({ logs: dbLogs.length > 0 ? dbLogs : logsBuffer });
});

app.post('/api/clear-logs', async (req, res) => {
  logsBuffer.length = 0;
  await clearDbLogs();
  addLogEntry('INFO', 'System', 'Histórico de logs limpo pelo usuário.');
  res.json({ ok: true });
});

// Worklist API Endpoints
app.get('/api/worklist', async (req, res) => {
  const dbList = await getDbWorklists();
  if (dbList.length > 0) {
    for (const item of dbList) {
      worklistStore.set(item.sampleId, item);
    }
  }
  const list = Array.from(worklistStore.values());
  res.json({ worklist: list });
});

app.post('/api/worklist', async (req, res) => {
  const {
    sampleId,
    patientId,
    patientName,
    gender,
    age,
    tests,
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
    testModeObx,
    analyzerModel
  } = req.body || {};
  
  if (!sampleId) {
    return res.status(400).json({ error: 'Código da amostra (Barcode) é obrigatório.' });
  }

  const sid = String(sampleId).trim();
  const existing = worklistStore.get(sid);

  const model = analyzerModel || (existing?.analyzerModel || (testModeObx === 'BIOQ' ? 'URIT-8021A' : 'Mindray BC-5480'));

  const item: WorklistItem = {
    sampleId: sid,
    patientId: patientId || (existing?.patientId || `P-${Math.floor(1000 + Math.random() * 9000)}`),
    patientName: patientName || (existing?.patientName || 'Paciente Desconhecido'),
    gender: gender || 'F',
    age: age || '30a',
    tests: tests || ['CBC', '5DIFF'],
    testCode: testCode || (existing?.testCode || '00002^CBC+DIFF^99MRC'),
    sampleMode: sampleMode !== undefined ? sampleMode : (existing?.sampleMode || ''),
    orcCode: orcCode || (existing?.orcCode || 'AF'),
    msgTypeResponse: msgTypeResponse || (existing?.msgTypeResponse || 'ORR^O02'),
    useBarcodeAsPatientId: useBarcodeAsPatientId !== undefined ? Boolean(useBarcodeAsPatientId) : (existing?.useBarcodeAsPatientId ?? true),
    includePv1: includePv1 !== undefined ? Boolean(includePv1) : (existing?.includePv1 ?? true),
    placerIdMode: placerIdMode || (existing?.placerIdMode || 'SAME'),
    includeDatesInObr: includeDatesInObr !== undefined ? Boolean(includeDatesInObr) : (existing?.includeDatesInObr ?? true),
    dobMode: dobMode || (existing?.dobMode || 'YYYYMMDD'),
    includeModeObx: includeModeObx !== undefined ? Boolean(includeModeObx) : (existing?.includeModeObx ?? true),
    takeMode: takeMode || (existing?.takeMode || 'CT'),
    bloodMode: bloodMode || (existing?.bloodMode || 'W'),
    testModeObx: testModeObx || (existing?.testModeObx || 'CBC+DIFF'),
    analyzerModel: model,
    createdAt: new Date().toLocaleTimeString('pt-BR'),
    status: existing?.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
    result: existing?.result
  };

  worklistStore.set(sid, item);
  await saveDbWorklistItem(item);

  addLogEntry(
    'INFO', 
    'LIS Server', 
    `Nova Ordem de Trabalho (Worklist) cadastrada no LIS e salva no MySQL: Amostra #${sid} - Paciente: ${item.patientName} (ID: ${item.patientId}). Aguardando leitura do tubo pelo equipamento ${model}.`
  );

  res.json({ success: true, item });
});

app.delete('/api/worklist/:sampleId', async (req, res) => {
  const sid = req.params.sampleId;
  const cleanSid = sid.replace(/^0+/, '');
  
  worklistStore.delete(sid);
  worklistStore.delete(cleanSid);

  for (const [key, item] of worklistStore.entries()) {
    if (item.sampleId === sid || item.sampleId === cleanSid) {
      worklistStore.delete(key);
    }
  }

  await deleteDbWorklistItem(sid);
  if (cleanSid !== sid) {
    await deleteDbWorklistItem(cleanSid);
  }

  addLogEntry('INFO', 'LIS Server', `Ordem de Trabalho Amostra #${sid} removida do MySQL.`);
  res.json({ success: true, removedSampleId: sid });
});

app.post('/api/worklist/clear-fake', async (req, res) => {
  try {
    const [resDb] = await pool.query<any>('DELETE FROM worklist_items WHERE patient_name LIKE "Paciente Amostra%" OR patient_name LIKE "Paciente Desconhecido%"');
    const dbWorklists = await getDbWorklists();
    worklistStore.clear();
    for (const w of dbWorklists) {
      worklistStore.set(w.sampleId, w);
    }
    addLogEntry('INFO', 'LIS Server', `${resDb.affectedRows || 0} ordens fictícias/contingência foram removidas do MySQL.`);
    res.json({ success: true, removedCount: resDb.affectedRows || 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/worklist', async (req, res) => {
  try {
    worklistStore.clear();
    await pool.query('DELETE FROM worklist_items');
    addLogEntry('INFO', 'LIS Server', 'Todas as Ordens de Trabalho (Worklist) foram removidas do MySQL.');
    res.json({ success: true, message: 'Todas as ordens foram excluídas com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- CODE MAPPING (DE/PARA) API ENDPOINTS ---

// List all De/Para mappings directly from MySQL
app.get('/api/mappings', async (req, res) => {
  const family = (req.query.family as string || '').toUpperCase();
  const dbMappings = await getDbCodeMappings();
  if (dbMappings.length > 0) {
    codeMappingsStore = dbMappings;
  }
  if (family && family !== 'ALL') {
    const filtered = codeMappingsStore.filter(m => m.equipmentFamily === 'ALL' || m.equipmentFamily.toUpperCase() === family);
    return res.json({ mappings: filtered });
  }
  res.json({ mappings: codeMappingsStore });
});

// Create new De/Para mapping(s) in MySQL
app.post('/api/mappings', async (req, res) => {
  const body = req.body || {};

  const itemsToCreate = Array.isArray(body) ? body : Array.isArray(body.items) ? body.items : [body];

  if (itemsToCreate.length === 0 || !itemsToCreate[0].lisCode || !itemsToCreate[0].equipmentCode) {
    return res.status(400).json({ error: 'Os campos "lisCode" e "equipmentCode" são obrigatórios.' });
  }

  const createdMappings: CodeMapping[] = [];

  try {
    for (let i = 0; i < itemsToCreate.length; i++) {
      const item = itemsToCreate[i];
      const newMapping: CodeMapping = {
        id: 'MAP_' + Date.now() + '_' + Math.floor(Math.random() * 1000) + '_' + i,
        equipmentFamily: (item.equipmentFamily || 'ALL').toUpperCase(),
        lisCode: String(item.lisCode).trim(),
        lisName: item.lisName ? String(item.lisName).trim() : String(item.lisCode).trim(),
        equipmentCode: String(item.equipmentCode).trim(),
        equipmentName: item.equipmentName ? String(item.equipmentName).trim() : String(item.equipmentCode).trim(),
        direction: item.direction || 'BIDIRECTIONAL',
        unit: item.unit || '',
        referenceRange: item.referenceRange || '',
        enabled: item.enabled !== false,
        notes: item.notes || '',
        parentCode: item.parentCode ? String(item.parentCode).trim().toUpperCase() : undefined,
        updatedAt: new Date().toISOString()
      };

      await insertDbCodeMapping(newMapping);
      createdMappings.push(newMapping);
    }

    codeMappingsStore = await getDbCodeMappings();
    addLogEntry('INFO', 'De/Para Mapping', `${createdMappings.length} mapeamento(s) salvo(s) no MySQL. Ex: LIS[${createdMappings[0].lisCode}] <-> EQ[${createdMappings[0].equipmentCode}]`);
    res.json({ success: true, mappings: createdMappings, mapping: createdMappings[0] });
  } catch (err: any) {
    res.status(500).json({ error: `Erro ao salvar no MySQL: ${err.message}` });
  }
});

// Update De/Para mapping in MySQL
app.put('/api/mappings/:id', async (req, res) => {
  const id = req.params.id;
  const body = req.body || {};

  try {
    await updateDbCodeMapping(id, body);
    codeMappingsStore = await getDbCodeMappings();
    const updated = codeMappingsStore.find(m => m.id === id);
    if (!updated) {
      return res.status(404).json({ error: 'Mapeamento De/Para não encontrado.' });
    }
    addLogEntry('INFO', 'De/Para Mapping', `Mapeamento ${id} atualizado no MySQL: LIS[${updated.lisCode}] <-> EQ[${updated.equipmentCode}]`);
    res.json({ success: true, mapping: updated });
  } catch (err: any) {
    res.status(500).json({ error: `Erro ao atualizar no MySQL: ${err.message}` });
  }
});

// Delete De/Para mapping from MySQL
app.delete('/api/mappings/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await deleteDbCodeMapping(id);
    codeMappingsStore = await getDbCodeMappings();
    addLogEntry('INFO', 'De/Para Mapping', `Mapeamento ${id} removido do MySQL.`);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: `Erro ao remover no MySQL: ${err.message}` });
  }
});

// Reset De/Para mappings to standard defaults in MySQL
app.post('/api/mappings/reset', async (req, res) => {
  try {
    await resetDbCodeMappings(INITIAL_DEFAULT_MAPPINGS);
    codeMappingsStore = await getDbCodeMappings();
    addLogEntry('INFO', 'De/Para Mapping', `Tabela De/Para restaurada no MySQL para os padrões do sistema (${codeMappingsStore.length} regras).`);
    res.json({ success: true, mappings: codeMappingsStore });
  } catch (err: any) {
    res.status(500).json({ error: `Erro ao restaurar no MySQL: ${err.message}` });
  }
});

// --- ENDPOINTS DE CADASTRO DE EQUIPAMENTOS ---
app.get('/api/equipments', async (req, res) => {
  try {
    const list = await getDbEquipments();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: `Erro ao buscar equipamentos: ${err.message}` });
  }
});

app.post('/api/equipments', async (req, res) => {
  try {
    const { code, description } = req.body || {};
    if (!code || !description) {
      return res.status(400).json({ error: 'Os campos "code" (Código) e "description" (Descrição) são obrigatórios.' });
    }
    const item: EquipmentItem = {
      id: 'eq-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      code: String(code).trim().toUpperCase(),
      description: String(description).trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await insertDbEquipment(item);
    addLogEntry('INFO', 'Equipamentos', `Novo equipamento cadastrado: ${item.code} (${item.description})`);
    res.json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ error: `Erro ao cadastrar equipamento: ${err.message}` });
  }
});

app.put('/api/equipments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, description } = req.body || {};
    if (!code && !description) {
      return res.status(400).json({ error: 'Informe ao menos um campo para atualizar ("code" ou "description").' });
    }
    const updateData: Partial<EquipmentItem> = {};
    if (code) updateData.code = String(code).trim().toUpperCase();
    if (description) updateData.description = String(description).trim();

    await updateDbEquipment(id, updateData);
    addLogEntry('INFO', 'Equipamentos', `Equipamento ${id} atualizado.`);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: `Erro ao atualizar equipamento: ${err.message}` });
  }
});

app.delete('/api/equipments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteDbEquipment(id);
    addLogEntry('INFO', 'Equipamentos', `Equipamento ${id} removido.`);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: `Erro ao excluir equipamento: ${err.message}` });
  }
});

// Translate test/parameter code
app.post('/api/mappings/translate', (req, res) => {
  const { code, source = 'LIS', family = 'ALL' } = req.body || {};
  if (!code) {
    return res.status(400).json({ error: 'Campo "code" é obrigatório.' });
  }

  if (source === 'LIS') {
    const result = translateLisToEquipmentCode(code, family, codeMappingsStore);
    return res.json(result);
  } else {
    const result = translateEquipmentToLisCode(code, family, codeMappingsStore);
    return res.json(result);
  }
});

app.get('/api/worklist/sync-external/:sampleId', async (req, res) => {
  const sid = req.params.sampleId;
  const family = (req.query.family as string) || 'ALL';
  const item = await fetchAndRegisterOrderFromExternalLis(sid, family);
  if (item) {
    res.json({ success: true, item });
  } else {
    res.status(404).json({ error: `Amostra #${sid} não encontrada na API REST do LIS externo.` });
  }
});

app.post('/api/worklist/send-result-external/:sampleId', async (req, res) => {
  const sid = req.params.sampleId;
  const family = (req.query.family as string) || (req.body?.family as string) || 'ALL';

  const worklist = worklistStore.get(sid) || Array.from(worklistStore.values()).find(w => w.sampleId === sid || w.sampleId.replace(/^0+/, '') === sid.replace(/^0+/, ''));
  const processed = processedSamples.get(sid);

  const targetResult = worklist?.result || processed;

  if (!targetResult || !targetResult.parameters || Object.keys(targetResult.parameters).length === 0) {
    return res.status(404).json({ error: `Amostra #${sid} não possui resultados gravados para transmitir.` });
  }

  await sendResultToExternalLis(targetResult, family);
  res.json({ success: true, message: `Resultado da amostra #${sid} transmitido com sucesso ao LIS REST.` });
});

app.get('/api/worklist/:sampleId/hl7-preview', async (req, res) => {
  const sid = req.params.sampleId;

  // Sync from external REST LIS if not found in local store
  await fetchAndRegisterOrderFromExternalLis(sid);

  const findWorklist = (id: string) => {
    if (worklistStore.has(id)) return worklistStore.get(id);
    const clean = id.replace(/^0+/, '');
    if (worklistStore.has(clean)) return worklistStore.get(clean);
    for (const item of worklistStore.values()) {
      if (item.sampleId === id || item.sampleId === clean) return item;
    }
    return undefined;
  };

  const worklist = findWorklist(sid);
  if (!worklist) {
    return res.status(404).json({ error: 'Ordem não encontrada no LIS' });
  }

  // Generate Mindray HL7 Preview
  const dummyMindrayQuery = `MSH|^~\\&|BC-5480|MINDRAY|LIS|LAB|${new Date().toISOString().replace(/[-T:]/g, '').slice(0, 14)}||QRY^Q02|Q101|P|2.3.1\rQRD|${new Date().toISOString().replace(/[-T:]/g, '').slice(0, 14)}|R|I|Q101|||1^RD|${sid}|DEM|||\r`;
  const mindrayOut = parseMindrayHL7(wrapMLLP(dummyMindrayQuery), findWorklist);
  const mindrayHL7 = mindrayOut.ackMessage ? unwrapMLLP(mindrayOut.ackMessage).payload : '';

  // Generate URIT HL7 Preview
  const dummyUritQuery = `MSH|^~\\&|URIT-8021A|URIT|LIS|LAB|${new Date().toISOString().replace(/[-T:]/g, '').slice(0, 14)}||QRY^Q02|Q101|P|2.3.1\rQRD|${new Date().toISOString().replace(/[-T:]/g, '').slice(0, 14)}|R|I|Q101|||1^RD|${sid}|DEM|||\r`;
  const uritOut = parseUritRawMessage(wrapMLLP(dummyUritQuery), findWorklist, customUritDsrTemplate, codeMappingsStore);
  const uritHL7 = uritOut.ackMessage ? unwrapMLLP(uritOut.ackMessage).payload : '';

  // Get logs related to this sample
  const relatedLogs = logsBuffer.filter(l => 
    l.message.includes(sid) || 
    (l.parsedResult && l.parsedResult.sampleId === sid)
  );

  res.json({
    sampleId: sid,
    worklist,
    mindrayHL7,
    uritHL7,
    relatedLogs
  });
});

app.post('/api/simulate', (req, res) => {
  const config: SimulationConfig = req.body || {
    sampleId: '548001',
    patientId: 'P-101',
    patientName: 'Maria Silva',
    profile: 'NORMAL',
    includeFlags: true,
    protocol: 'HL7_MLLP'
  };

  const simRawMllp = generateSimulatedMindrayHL7(
    config.sampleId || '548001',
    config.patientId || 'P-101',
    config.patientName || 'Maria^Silva',
    config.profile || 'NORMAL',
    config.customValues
  );

  const rawHex = stringToHex(simRawMllp);

  if (config.targetMode === 'SOCKET_TCP') {
    const host = config.targetHost || '127.0.0.1';
    const port = Number(config.targetPort) || 5151;

    addLogEntry('RAW_OUT', 'Simulator', `Disparando socket TCP MLLP para Servidor LIS (${host}:${port}) - Amostra #${config.sampleId}`, rawHex);

    const client = new net.Socket();
    let receivedData = Buffer.alloc(0);
    let ackReceived = false;
    let errorMsg = '';
    let responseHandled = false;

    const finish = (err?: string) => {
      if (responseHandled) return;
      responseHandled = true;
      try { client.destroy(); } catch (e) {}

      if (ackReceived) {
        const ackText = receivedData.toString('utf8');
        const parseOut = parseMindrayHL7(simRawMllp);
        addLogEntry(
          'SUCCESS',
          'Simulator',
          `Transmissão para LIS (${host}:${port}) efetuada com SUCESSO! Resposta ACK do LIS confirmada.`,
          stringToHex(ackText),
          parseOut.result
        );
        return res.json({
          success: true,
          mode: 'SOCKET_TCP',
          targetHost: host,
          targetPort: port,
          parsedResult: parseOut.result,
          ackMessage: ackText,
          rawHL7Message: simRawMllp
        });
      } else {
        const message = err || errorMsg || `Nenhuma resposta ACK recebida do LIS em ${host}:${port}.`;
        addLogEntry('ERROR', 'Simulator', `Falha ao transmitir para Servidor LIS (${host}:${port}): ${message}`);
        return res.status(500).json({
          success: false,
          mode: 'SOCKET_TCP',
          error: message,
          rawHL7Message: simRawMllp
        });
      }
    };

    client.setTimeout(4000);

    client.connect(port, host, () => {
      client.write(Buffer.from(simRawMllp, 'utf8'));
    });

    client.on('data', (data) => {
      receivedData = Buffer.concat([receivedData, data]);
      const str = receivedData.toString('utf8');
      if (str.includes('MSA|AA') || str.includes('MSA|AE') || str.includes('MSA|AR') || str.includes('ACK')) {
        ackReceived = true;
        finish();
      }
    });

    client.on('timeout', () => {
      errorMsg = `Timeout: O servidor LIS em ${host}:${port} não respondeu em 4 segundos. Verifique se o script 'mindray-bc5480-listener.js' está rodando nesse IP e porta.`;
      finish();
    });

    client.on('error', (err: any) => {
      if (err.code === 'ECONNREFUSED') {
        errorMsg = `Conexão recusada em ${host}:${port}. O script do LIS não está rodando nessa máquina/porta ou a porta ${port} está fechada.`;
      } else if (err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH') {
        errorMsg = `Sem rota até ${host}. Verifique o IP do seu computador na rede local.`;
      } else {
        errorMsg = `Erro no socket TCP (${host}:${port}): ${err.message}`;
      }
      finish();
    });

    client.on('close', () => {
      finish();
    });

    return;
  }

  // Fallback Internal Mode
  addLogEntry('RAW_IN', 'Simulator', `Simulação Interna Mindray BC-5480 [${config.profile}]: Sample ${config.sampleId}`, rawHex);
  const parseOut = parseMindrayHL7(simRawMllp, (sid) => worklistStore.get(sid));

  if (parseOut.result) {
    totalReceivedCount++;
    lastReceivedTime = new Date().toISOString();
    
    const matched = processMatchedSample(parseOut.result);

    addLogEntry(
      'SUCCESS',
      'Simulator',
      `Amostra simulada processada com sucesso: ID=${matched.sampleId} (${Object.keys(matched.parameters).length} parâmetros)`,
      undefined,
      matched
    );
  }

  if (parseOut.ackMessage) {
    addLogEntry('RAW_OUT', 'LIS Server', `ACK de resposta gerado com sucesso [MSA|AA|${parseOut.msgControlId}]`);
  }

  res.json({
    success: true,
    mode: 'INTERNAL',
    parsedResult: parseOut.result,
    ackMessage: parseOut.ackMessage,
    rawHL7Message: simRawMllp
  });
});

app.post('/api/simulate-urit', (req, res) => {
  const config = req.body || {};
  const sampleId = config.sampleId || '010003283001';
  const patientId = config.patientId || 'P-9921';
  const patientName = config.patientName || 'Jose Carlos Pereira';
  const profile = config.profile || 'CHECKUP_NORMAL';
  const protocol = config.protocol || 'HL7_MLLP';
  const selectedParameters = config.selectedParameters;
  const sampleMode = config.sampleMode || 'AL-WB';

  const hl7Out = generateUritHL7Message({ sampleId, patientId, patientName, profile, protocol, customValues: config.customValues, selectedParameters, sampleMode });
  const astmOut = generateUritAstmMessage({ sampleId, patientId, patientName, profile, protocol, customValues: config.customValues, selectedParameters, sampleMode });

  const rawMsg = protocol === 'HL7_MLLP' ? hl7Out.mllpWrapped : astmOut.raw;
  const rawHex = stringToHex(rawMsg);

  if (config.mode === 'SOCKET_TCP') {
    const host = config.targetHost || '127.0.0.1';
    const port = config.targetPort ? parseInt(config.targetPort) : 5151;

    addLogEntry('RAW_OUT', 'Simulator (URIT-8021A)', `Transmitindo via Socket TCP para LIS (${host}:${port}) - Amostra URIT #${sampleId} (${protocol})`, rawHex);

    const client = new net.Socket();
    let receivedData = Buffer.alloc(0);
    let ackReceived = false;
    let errorMsg = '';
    let responseHandled = false;

    const finish = (err?: string) => {
      if (responseHandled) return;
      responseHandled = true;
      try { client.destroy(); } catch (e) {}

      if (ackReceived) {
        const ackText = receivedData.toString('utf8');
        const parseOut = parseUritRawMessage(rawMsg);
        addLogEntry(
          'SUCCESS',
          'Simulator (URIT-8021A)',
          `Transmissão URIT-8021A para LIS (${host}:${port}) efetuada com SUCESSO! Resposta ACK confirmada.`,
          stringToHex(ackText),
          parseOut.result as any
        );
        return res.json({
          success: true,
          mode: 'SOCKET_TCP',
          targetHost: host,
          targetPort: port,
          parsedResult: parseOut.result,
          ackMessage: ackText,
          rawHL7Message: rawMsg
        });
      } else {
        const message = err || errorMsg || `Nenhuma resposta ACK recebida do LIS em ${host}:${port}.`;
        addLogEntry('ERROR', 'Simulator (URIT-8021A)', `Falha ao transmitir URIT-8021A para Servidor LIS (${host}:${port}): ${message}`);
        return res.status(500).json({
          success: false,
          mode: 'SOCKET_TCP',
          error: message,
          rawHL7Message: rawMsg
        });
      }
    };

    client.setTimeout(4000);

    client.connect(port, host, () => {
      client.write(Buffer.from(rawMsg, 'utf8'));
    });

    client.on('data', (data) => {
      receivedData = Buffer.concat([receivedData, data]);
      const str = receivedData.toString('utf8');
      if (str.includes('MSA|AA') || str.includes('MSA|AE') || str.includes('MSA|AR') || str.includes('ACK') || str.includes('\x06')) {
        ackReceived = true;
        finish();
      }
    });

    client.on('timeout', () => {
      errorMsg = `Timeout: O servidor LIS em ${host}:${port} não respondeu em 4 segundos. Verifique se o seu LIS está escutando no IP ${host} e porta ${port}.`;
      finish();
    });

    client.on('error', (err: any) => {
      if (err.code === 'ECONNREFUSED') {
        errorMsg = `Conexão recusada em ${host}:${port}. O servidor LIS não está ativo nessa porta ou a conexão foi bloqueada pelo Firewall.`;
      } else if (err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH') {
        errorMsg = `Sem rota de rede até ${host}. Verifique a configuração de IP na sua rede local.`;
      } else {
        errorMsg = `Erro no socket TCP (${host}:${port}): ${err.message}`;
      }
      finish();
    });

    client.on('close', () => {
      finish();
    });

    return;
  }

  // Internal Fallback Mode
  addLogEntry('RAW_IN', 'Simulator (URIT-8021A)', `Simulação Interna URIT-8021A [Perfil: ${profile} | Modo: ${sampleMode}]: Sample #${sampleId} (${protocol})`, rawHex);

  const parseOut = parseUritRawMessage(rawMsg);

  if (parseOut.result) {
    totalReceivedCount++;
    lastReceivedTime = new Date().toISOString();
    processMatchedSample(parseOut.result as any);

    addLogEntry(
      'SUCCESS',
      'Simulator (URIT-8021A)',
      `Exame de Bioquímica URIT-8021A simulado com sucesso: ID=${sampleId}, Paciente=${patientName} (${Object.keys(parseOut.result.parameters).length} exames)`,
      undefined,
      parseOut.result as any
    );
  }

  res.json({
    success: true,
    mode: 'INTERNAL',
    parsedResult: parseOut.result,
    ackMessage: parseOut.ackMessage,
    rawHL7Message: rawMsg
  });
});

app.post('/api/urit/query-worklist', async (req, res) => {
  const { sampleId = '1234' } = req.body || {};

  await fetchAndRegisterOrderFromExternalLis(sampleId);

  const findWorklist = (sid: string) => {
    if (worklistStore.has(sid)) return worklistStore.get(sid);
    const cleanSid = sid.replace(/^0+/, '');
    if (worklistStore.has(cleanSid)) return worklistStore.get(cleanSid);
    for (const item of worklistStore.values()) {
      if (item.status === 'PENDING') return item;
    }
    return undefined;
  };

  const queryMsgRaw = `MSH|^~\\&|URIT-8021A|URIT|LIS|LAB|${new Date().toISOString().replace(/[-T:]/g, '').slice(0, 14)}||QRY^Q02|Q101|P|2.3.1\rQRD|${new Date().toISOString().replace(/[-T:]/g, '').slice(0, 14)}|R|I|Q101|||1^RD|${sampleId}|DEM|||\r`;
  const mllpMsg = wrapMLLP(queryMsgRaw);

  addLogEntry('RAW_IN', 'Analyzer (URIT-8021A)', `Consulta de Paciente/Worklist (QRY^Q02) recebida do URIT-8021A para Amostra #${sampleId}:\n${queryMsgRaw.trim()}`, stringToHex(mllpMsg));

  const parseOut = parseUritRawMessage(mllpMsg, findWorklist, customUritDsrTemplate, codeMappingsStore);

  if (parseOut.qckMessage) {
    const qckUnwrapped = unwrapMLLP(parseOut.qckMessage).payload;
    addLogEntry('RAW_OUT', 'LIS Server', `1º QCK^Q02 (Resposta Imediata de Confirmação):\n${qckUnwrapped.trim()}`, stringToHex(parseOut.qckMessage));
  }

  if (parseOut.ackMessage) {
    const ackUnwrapped = unwrapMLLP(parseOut.ackMessage).payload;
    addLogEntry('RAW_OUT', 'LIS Server', `2º DSR^Q03 (Resposta de Worklist LIS -> URIT-8021A):\n${ackUnwrapped.trim()}`, stringToHex(parseOut.ackMessage));
  }

  const foundItem = findWorklist(sampleId);

  res.json({
    success: true,
    sampleId,
    foundItem,
    queryMessage: queryMsgRaw,
    qckMessage: parseOut.qckMessage,
    responseMessage: parseOut.ackMessage
  });
});

app.get('/api/urit/custom-template', (req, res) => {
  res.json({ template: customUritDsrTemplate });
});

app.post('/api/urit/custom-template', (req, res) => {
  const { template } = req.body || {};
  if (typeof template === 'string') {
    customUritDsrTemplate = template;
    addLogEntry('INFO', 'System', 'Template de resposta HL7 DSR^Q03 para URIT atualizado no servidor.');
    res.json({ success: true, template: customUritDsrTemplate });
  } else {
    res.status(400).json({ error: 'Template inválido fornecido.' });
  }
});

app.post('/api/parse-urit-raw', (req, res) => {
  const { rawText } = req.body || {};
  if (!rawText || typeof rawText !== 'string') {
    return res.status(400).json({ error: 'Payload de texto ausente.' });
  }

  const rawHex = stringToHex(rawText);
  addLogEntry('RAW_IN', 'System', `Decodificação URIT-8021A recebida (${rawText.length} caracteres)`, rawHex);

  const parseOut = parseUritRawMessage(rawText, undefined, customUritDsrTemplate, codeMappingsStore);

  if (parseOut.error) {
    addLogEntry('ERROR', 'System', `Falha ao decodificar URIT-8021A: ${parseOut.error}`);
    return res.status(400).json({ error: parseOut.error });
  }

  if (parseOut.result) {
    addLogEntry(
      'SUCCESS',
      'System',
      `Decodificação URIT-8021A com sucesso! Amostra #${parseOut.result.sampleId}`,
      undefined,
      parseOut.result as any
    );
  }

  res.json({
    success: true,
    parsedResult: parseOut.result,
    ackMessage: parseOut.ackMessage
  });
});

app.post('/api/simulate-maxion', (req, res) => {
  const config = req.body || {};
  const sampleId = config.sampleId || 'MAX-8812';
  const patientId = config.patientId || 'P-3041';
  const patientName = config.patientName || 'Mariana Santos';
  const profile = config.profile || 'NORMAL';
  const protocol = config.protocol || 'RS232_ASCII';

  const maxionOut = generateMaxionMessage({ sampleId, patientId, patientName, profile, protocol, customValues: config.customValues });
  const rawMsg = maxionOut.raw;
  const rawHex = stringToHexMaxion(rawMsg);

  addLogEntry('RAW_IN', 'Simulator', `Simulação Maxion Eletrólitos [${profile}]: Amostra #${sampleId} (${protocol})`, rawHex);

  const parseOut = parseMaxionRawMessage(rawMsg);

  if (parseOut.result) {
    totalReceivedCount++;
    lastReceivedTime = new Date().toISOString();
    processMatchedSample(parseOut.result as any);

    addLogEntry(
      'SUCCESS',
      'Simulator',
      `Exame de Eletrólitos Maxion simulado com sucesso: ID=${sampleId}, Paciente=${patientName} (${Object.keys(parseOut.result.parameters).length} íons)`,
      undefined,
      parseOut.result as any
    );
  }

  res.json({
    success: true,
    mode: 'INTERNAL',
    parsedResult: parseOut.result,
    rawMessage: rawMsg
  });
});

app.post('/api/parse-maxion-raw', (req, res) => {
  const { rawText } = req.body || {};
  if (!rawText || typeof rawText !== 'string') {
    return res.status(400).json({ error: 'Payload de texto ausente.' });
  }

  const rawHex = stringToHexMaxion(rawText);
  addLogEntry('RAW_IN', 'System', `Decodificação Maxion recebida (${rawText.length} caracteres)`, rawHex);

  const parseOut = parseMaxionRawMessage(rawText);

  if (parseOut.error) {
    addLogEntry('ERROR', 'System', `Falha ao decodificar Maxion: ${parseOut.error}`);
    return res.status(400).json({ error: parseOut.error });
  }

  if (parseOut.result) {
    addLogEntry(
      'SUCCESS',
      'System',
      `Decodificação Maxion com sucesso! Amostra #${parseOut.result.sampleId}`,
      undefined,
      parseOut.result as any
    );
  }

  res.json({
    success: true,
    parsedResult: parseOut.result
  });
});

app.post('/api/simulate-maxcoag', (req, res) => {
  const config = req.body || {};
  const sampleId = config.sampleId || 'COG-5011';
  const patientId = config.patientId || 'P-4011';
  const patientName = config.patientName || 'Francisca Lima';
  const profile = config.profile || 'NORMAL';
  const protocol = config.protocol || 'RS232_ASCII';

  const maxcoagOut = generateMaxcoagMessage({ sampleId, patientId, patientName, profile, protocol, customValues: config.customValues });
  const rawMsg = maxcoagOut.raw;
  const rawHex = stringToHexMaxcoag(rawMsg);

  addLogEntry('RAW_IN', 'Simulator', `Simulação MaxCoag Coagulação [${profile}]: Amostra #${sampleId} (${protocol})`, rawHex);

  const parseOut = parseMaxcoagRawMessage(rawMsg);

  if (parseOut.result) {
    totalReceivedCount++;
    lastReceivedTime = new Date().toISOString();
    processMatchedSample(parseOut.result as any);

    addLogEntry(
      'SUCCESS',
      'Simulator',
      `Coagulograma MaxCoag simulado com sucesso: ID=${sampleId}, Paciente=${patientName} (${Object.keys(parseOut.result.parameters).length} exames)`,
      undefined,
      parseOut.result as any
    );
  }

  res.json({
    success: true,
    mode: 'INTERNAL',
    parsedResult: parseOut.result,
    rawMessage: rawMsg
  });
});

app.post('/api/parse-maxcoag-raw', (req, res) => {
  const { rawText } = req.body || {};
  if (!rawText || typeof rawText !== 'string') {
    return res.status(400).json({ error: 'Payload de texto ausente.' });
  }

  const rawHex = stringToHexMaxcoag(rawText);
  addLogEntry('RAW_IN', 'System', `Decodificação MaxCoag recebida (${rawText.length} caracteres)`, rawHex);

  const parseOut = parseMaxcoagRawMessage(rawText);

  if (parseOut.error) {
    addLogEntry('ERROR', 'System', `Falha ao decodificar MaxCoag: ${parseOut.error}`);
    return res.status(400).json({ error: parseOut.error });
  }

  if (parseOut.result) {
    addLogEntry(
      'SUCCESS',
      'System',
      `Decodificação MaxCoag com sucesso! Amostra #${parseOut.result.sampleId}`,
      undefined,
      parseOut.result as any
    );
  }

  res.json({
    success: true,
    parsedResult: parseOut.result
  });
});

app.post('/api/simulate-wama', (req, res) => {
  const config = req.body || {};
  const sampleId = config.sampleId || 'URI-7011';
  const patientId = config.patientId || 'P-9011';
  const patientName = config.patientName || 'Mariana Santos';
  const profile = config.profile || 'NORMAL';
  const protocol = config.protocol || 'RS232_ASCII';

  const wamaOut = generateWamaMessage({ sampleId, patientId, patientName, profile, protocol, customValues: config.customValues });
  const rawMsg = wamaOut.raw;
  const rawHex = stringToHexWama(rawMsg);

  addLogEntry('RAW_IN', 'Simulator', `Simulação Wama Uroanálise [${profile}]: Amostra #${sampleId} (${protocol})`, rawHex);

  const parseOut = parseWamaRawMessage(rawMsg);

  if (parseOut.result) {
    totalReceivedCount++;
    lastReceivedTime = new Date().toISOString();
    processMatchedSample(parseOut.result as any);

    addLogEntry(
      'SUCCESS',
      'Simulator',
      `Exame de Uroanálise Wama simulado com sucesso: ID=${sampleId}, Paciente=${patientName} (${Object.keys(parseOut.result.parameters).length} exames)`,
      undefined,
      parseOut.result as any
    );
  }

  res.json({
    success: true,
    mode: 'INTERNAL',
    parsedResult: parseOut.result,
    rawMessage: rawMsg
  });
});

app.post('/api/parse-wama-raw', (req, res) => {
  const { rawText } = req.body || {};
  if (!rawText || typeof rawText !== 'string') {
    return res.status(400).json({ error: 'Payload de texto ausente.' });
  }

  const rawHex = stringToHexWama(rawText);
  addLogEntry('RAW_IN', 'System', `Decodificação Wama recebida (${rawText.length} caracteres)`, rawHex);

  const parseOut = parseWamaRawMessage(rawText);

  if (parseOut.error) {
    addLogEntry('ERROR', 'System', `Falha ao decodificar Wama: ${parseOut.error}`);
    return res.status(400).json({ error: parseOut.error });
  }

  if (parseOut.result) {
    addLogEntry(
      'SUCCESS',
      'System',
      `Decodificação Wama com sucesso! Amostra #${parseOut.result.sampleId}`,
      undefined,
      parseOut.result as any
    );
  }

  res.json({
    success: true,
    parsedResult: parseOut.result
  });
});

app.post('/api/simulate-finecare', (req, res) => {
  const config = req.body || {};
  const sampleId = config.sampleId || 'FIN-8011';
  const patientId = config.patientId || 'P-1092';
  const patientName = config.patientName || 'Carlos Eduardo';
  const profile = config.profile || 'CARDIAC_EMERGENCY';
  const protocol = config.protocol || 'HL7_MLLP';

  const finecareOut = generateFinecareMessage({
    sampleId,
    patientId,
    patientName,
    profile,
    protocol,
    customValues: config.customValues,
    selectedParameters: config.selectedParameters
  });
  const rawMsg = finecareOut.raw;
  const rawHex = stringToHexFinecare(rawMsg);

  addLogEntry('RAW_IN', 'Simulator', `Simulação Wondfo Finecare POCT [${profile}]: Amostra #${sampleId} (${protocol})`, rawHex);

  const parseOut = parseFinecareRawMessage(rawMsg);

  if (parseOut.result) {
    totalReceivedCount++;
    lastReceivedTime = new Date().toISOString();
    processMatchedSample(parseOut.result as any);

    addLogEntry(
      'SUCCESS',
      'Simulator',
      `Exame POCT Finecare simulado com sucesso: ID=${sampleId}, Paciente=${patientName} (${Object.keys(parseOut.result.parameters).length} exames)`,
      undefined,
      parseOut.result as any
    );
  }

  res.json({
    success: true,
    mode: 'INTERNAL',
    parsedResult: parseOut.result,
    rawMessage: rawMsg
  });
});

app.post('/api/parse-finecare-raw', (req, res) => {
  const { rawText } = req.body || {};
  if (!rawText || typeof rawText !== 'string') {
    return res.status(400).json({ error: 'Payload de texto ausente.' });
  }

  const rawHex = stringToHexFinecare(rawText);
  addLogEntry('RAW_IN', 'System', `Decodificação Finecare recebida (${rawText.length} caracteres)`, rawHex);

  const parseOut = parseFinecareRawMessage(rawText);

  if (parseOut.error) {
    addLogEntry('ERROR', 'System', `Falha ao decodificar Finecare: ${parseOut.error}`);
    return res.status(400).json({ error: parseOut.error });
  }

  if (parseOut.result) {
    addLogEntry(
      'SUCCESS',
      'System',
      `Decodificação Finecare com sucesso! Amostra #${parseOut.result.sampleId}`,
      undefined,
      parseOut.result as any
    );
  }

  res.json({
    success: true,
    parsedResult: parseOut.result
  });
});

app.post('/api/parse-raw', (req, res) => {
  const { rawText } = req.body || {};
  if (!rawText || typeof rawText !== 'string') {
    return res.status(400).json({ error: 'Payload de texto ausente.' });
  }

  const rawHex = stringToHex(rawText);
  addLogEntry('RAW_IN', 'System', `Decodificação manual de mensagem bruta recebida (${rawText.length} caracteres)`, rawHex);

  if (rawText.includes('FINECARE') || rawText.includes('WONDFO') || rawText.includes('CTNI') || rawText.includes('NTPROBNP')) {
    const parseFin = parseFinecareRawMessage(rawText);
    if (!parseFin.error && parseFin.result) {
      const matched = processMatchedSample(parseFin.result as any);
      addLogEntry('SUCCESS', 'System', `Decodificação Finecare realizada com sucesso! Amostra #${matched.sampleId}`, undefined, matched as any);
      return res.json({
        success: true,
        parsedResult: matched
      });
    }
  }

  if (rawText.includes('WAMA') || rawText.includes('UROANÁLISE') || rawText.includes('LEU     :')) {
    const parseWam = parseWamaRawMessage(rawText);
    if (!parseWam.error && parseWam.result) {
      const matched = processMatchedSample(parseWam.result as any);
      addLogEntry('SUCCESS', 'System', `Decodificação Wama realizada com sucesso! Amostra #${matched.sampleId}`, undefined, matched as any);
      return res.json({
        success: true,
        parsedResult: matched
      });
    }
  }

  if (rawText.includes('MAXCOAG') || rawText.includes('COAGULAÇÃO') || rawText.includes('TP (PT)')) {
    const parseCog = parseMaxcoagRawMessage(rawText);
    if (!parseCog.error && parseCog.result) {
      const matched = processMatchedSample(parseCog.result as any);
      addLogEntry('SUCCESS', 'System', `Decodificação MaxCoag realizada com sucesso! Amostra #${matched.sampleId}`, undefined, matched as any);
      return res.json({
        success: true,
        parsedResult: matched
      });
    }
  }

  if (rawText.includes('MAXION') || rawText.includes('ELETRÓLITOS') || rawText.includes('Na+')) {
    const parseMax = parseMaxionRawMessage(rawText);
    if (!parseMax.error && parseMax.result) {
      const matched = processMatchedSample(parseMax.result as any);
      addLogEntry('SUCCESS', 'System', `Decodificação Maxion realizada com sucesso! Amostra #${matched.sampleId}`, undefined, matched as any);
      return res.json({
        success: true,
        parsedResult: matched
      });
    }
  }

  if (rawText.includes('URIT') || rawText.includes('URIT-8021A')) {
    const parseUrit = parseUritRawMessage(rawText);
    if (!parseUrit.error && parseUrit.result) {
      const matched = processMatchedSample(parseUrit.result as any);
      addLogEntry('SUCCESS', 'System', `Decodificação URIT realizada com sucesso! Amostra #${matched.sampleId}`, undefined, matched as any);
      return res.json({
        success: true,
        parsedResult: matched,
        ackMessage: parseUrit.ackMessage
      });
    }
  }

  const parseOut = parseMindrayHL7(rawText);

  if (parseOut.error) {
    // Try Maxion and URIT as fallback
    const tryMax = parseMaxionRawMessage(rawText);
    if (!tryMax.error && tryMax.result) {
      const matched = processMatchedSample(tryMax.result as any);
      addLogEntry('SUCCESS', 'System', `Decodificação Maxion realizada com sucesso! Amostra #${matched.sampleId}`, undefined, matched as any);
      return res.json({ success: true, parsedResult: matched });
    }

    const tryUrit = parseUritRawMessage(rawText);
    if (!tryUrit.error && tryUrit.result) {
      const matched = processMatchedSample(tryUrit.result as any);
      addLogEntry('SUCCESS', 'System', `Decodificação URIT realizada com sucesso! Amostra #${matched.sampleId}`, undefined, matched as any);
      return res.json({ success: true, parsedResult: matched, ackMessage: tryUrit.ackMessage });
    }

    addLogEntry('ERROR', 'System', `Falha ao decodificar HL7/ASTM/RS232: ${parseOut.error}`);
    return res.status(400).json({ error: parseOut.error });
  }

  let finalMatched = parseOut.result;
  if (parseOut.result) {
    finalMatched = processMatchedSample(parseOut.result);
    addLogEntry(
      'SUCCESS',
      'System',
      `Decodificação realizada com sucesso! Amostra #${finalMatched.sampleId}`,
      undefined,
      finalMatched
    );
  }

  res.json({
    success: true,
    parsedResult: finalMatched,
    ackMessage: parseOut.ackMessage,
    msgControlId: parseOut.msgControlId
  });
});

app.get('/api/download-script/:type', (req, res) => {
  const type = req.params.type;
  if (type === 'node') {
    const code = generateNodeScript(5151);
    res.setHeader('Content-Type', 'text/javascript');
    res.setHeader('Content-Disposition', 'attachment; filename="mindray-bc5480-listener.js"');
    return res.send(code);
  } else if (type === 'python') {
    const code = generatePythonScript(5151);
    res.setHeader('Content-Type', 'text/x-python');
    res.setHeader('Content-Disposition', 'attachment; filename="mindray_listener.py"');
    return res.send(code);
  } else {
    res.status(400).send('Tipo de script inválido. Use "node" ou "python".');
  }
});

// Vite or Static file serving
async function startServer() {
  console.log('[Boot] Conectando ao MySQL e carregando dados mantidos no banco...');
  const dbOk = await initDatabase();
  if (dbOk) {
    codeMappingsStore = await getDbCodeMappings();
    console.log(`[Boot] ${codeMappingsStore.length} Mapeamentos De/Para carregados do MySQL.`);

    const dbWorklists = await getDbWorklists();
    for (const w of dbWorklists) {
      worklistStore.set(w.sampleId, w);
    }
    console.log(`[Boot] ${dbWorklists.length} Ordens de Trabalho (Worklist) carregadas do MySQL.`);

    const dbSamples = await getDbProcessedSamples();
    for (const [sid, s] of dbSamples.entries()) {
      processedSamples.set(sid, s);
    }
    console.log(`[Boot] ${dbSamples.size} Amostras Processadas carregadas do MySQL.`);

    const dbLogs = await getDbLogs();
    logsBuffer.push(...dbLogs);
    console.log(`[Boot] ${dbLogs.length} Logs de Comunicação carregados do MySQL.`);
  } else {
    console.warn('[Boot] Não foi possível conectar ao MySQL na inicialização. Usando mapeamentos padrão em memória.');
    codeMappingsStore = [...INITIAL_DEFAULT_MAPPINGS];
  }
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server web rodando na porta ${PORT}`);
  });
}

startServer();
