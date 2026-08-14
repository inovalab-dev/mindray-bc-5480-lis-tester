import React, { useState, useEffect } from 'react';
import { Play, Activity, Sparkles, ShieldCheck, FileCode, Copy, Check, Server, Sliders, AlertTriangle, ArrowRightLeft, User, FileText, CheckCircle, Clock, Trash2, Send, Database, Cpu, Plus, ListFilter, RefreshCw, Beaker, Zap, Droplet, TestTube, HeartPulse, Settings, Edit3, Save, RotateCcw, QrCode, Tag } from 'lucide-react';
import { MindraySampleResult, WorklistItem } from '../types';

const TEST_DEFAULT_MAP: Record<string, Record<string, string | number>> = {
  'HEMOGRAMA': { 'WBC': 7.20, 'RBC': 4.65, 'HGB': 13.8, 'HCT': 41.2, 'PLT': 245 },
  'CBC': { 'WBC': 7.20, 'RBC': 4.65, 'HGB': 13.8, 'HCT': 41.2, 'PLT': 245 },
  'AMIL': { 'AMIL': 97 },
  'AMILASE': { 'AMIL': 97 },
  'TGP/ALT': { 'TGP/ALT': 14 },
  'ALT': { 'TGP/ALT': 14 },
  'TGO/AST': { 'TGO/AST': 30 },
  'AST': { 'TGO/AST': 30 },
  'CREAT': { 'CREAT': 1.17 },
  'CREATININA': { 'CREAT': 1.17 },
  'UREIA': { 'UREIA': 13 },
  'GLI': { 'GLI': 95 },
  'GLICOSE': { 'GLI': 95 },
  'PTT': { 'PTT': 7.2 },
  'PROTEINAS TOTAIS': { 'PTT': 7.2 },
  'ALB': { 'ALB': 4.2 },
  'ALBUMINA': { 'ALB': 4.2 },
  'COL': { 'COL': 185 },
  'COLESTEROL': { 'COL': 185 },
  'TRI': { 'TRI': 120 },
  'TRIGLICERIDES': { 'TRI': 120 },
  'NA': { 'NA': 140.0 },
  'SODIO': { 'NA': 140.0 },
  'K': { 'K': 4.20 },
  'POTASSIO': { 'K': 4.20 },
  'CL': { 'CL': 102.0 },
  'CLORETO': { 'CL': 102.0 },
  'ICA': { 'ICA': 1.22 },
  'CALCIO': { 'ICA': 1.22 },
  'CRP': { 'CRP': 2.50 },
  'PCR': { 'CRP': 2.50 },
  'PCT': { 'PCT': 0.05 },
  'PROCALCITONINA': { 'PCT': 0.05 },
  'TROP': { 'TROP': 0.02 },
  'TROPONINA': { 'TROP': 0.02 },
  'D-DIMER': { 'D-DIMER': 0.25 },
  'DDIMERO': { 'D-DIMER': 0.25 },
  'HBA1C': { 'HBA1C': 5.4 },
  'TP': { 'TP': 12.5, 'INR': 1.05 },
  'TAP': { 'TP': 12.5, 'INR': 1.05 },
  'INR': { 'INR': 1.05 },
  'TTPA': { 'TTPA': 28.0 },
  'FIB': { 'FIB': 285 },
  'FIBRINOGENIO': { 'FIB': 285 },
  'LEU': { 'LEU': 'Negativo' },
  'NIT': { 'NIT': 'Negativo' },
  'PRO': { 'PRO': 'Negativo' },
  'GLU': { 'GLU': 'Normal' },
  'EAS': { 'LEU': 'Negativo', 'NIT': 'Negativo', 'PRO': 'Negativo', 'GLU': 'Normal' },
  'URINA I': { 'LEU': 'Negativo', 'NIT': 'Negativo', 'PRO': 'Negativo', 'GLU': 'Normal' }
};

interface UniversalSimulatorTabProps {
  onSelectSample: (sample: MindraySampleResult) => void;
}

type EquipmentType = 'URIT' | 'MINDRAY' | 'FINECARE' | 'MAXION' | 'MAXCOAG' | 'WAMA' | 'UNIVERSAL';

interface EquipmentOption {
  id: EquipmentType;
  name: string;
  category: string;
  badge: string;
  color: string;
  icon: any;
  defaultParams: Record<string, string | number>;
  defaultTestCode: string;
}

const EQUIPMENT_OPTIONS: EquipmentOption[] = [
  {
    id: 'URIT',
    name: 'URIT-8021A',
    category: 'Bioquímica Automação',
    badge: 'HL7 MLLP / ASTM',
    color: 'emerald',
    icon: Beaker,
    defaultParams: {
      'AMIL': 97,
      'TGP/ALT': 14,
      'TGO/AST': 30,
      'CREAT110': 1.17,
      'UREIA': 13,
      'GLI': 95,
      'PTT': 7.2
    },
    defaultTestCode: '1^AMIL^^^^+2^TGP/ALT^^^^+3^TGO/AST^^^^'
  },
  {
    id: 'MINDRAY',
    name: 'Mindray BC-5480',
    category: 'Hematologia (5-Diff)',
    badge: 'HL7 v2.3.1 MLLP',
    color: 'indigo',
    icon: Activity,
    defaultParams: {
      'WBC': 7.20,
      'RBC': 4.65,
      'HGB': 13.8,
      'HCT': 41.2,
      'PLT': 245
    },
    defaultTestCode: '00002^CBC+DIFF^99MRC'
  },
  {
    id: 'FINECARE',
    name: 'Finecare FIA (Wondfo)',
    category: 'Imunoensaio & POCT',
    badge: 'HL7 / ASTM',
    color: 'amber',
    icon: HeartPulse,
    defaultParams: {
      'CRP': 2.50,
      'PCT': 0.05,
      'TROP': 0.02,
      'D-DIMER': 0.25,
      'HBA1C': 5.4
    },
    defaultTestCode: 'CRP^Proteina C Reativa^L'
  },
  {
    id: 'MAXION',
    name: 'Maxion (Eletrólitos)',
    category: 'Eletrólitos & Gasometria',
    badge: 'HL7 / ASTM',
    color: 'sky',
    icon: Zap,
    defaultParams: {
      'NA': 140.0,
      'K': 4.20,
      'CL': 102.0,
      'ICA': 1.22,
      'PH': 7.41
    },
    defaultTestCode: 'ISE^Eletrolitos^L'
  },
  {
    id: 'MAXCOAG',
    name: 'Maxcoag (Coagulação)',
    category: 'Coagulação Automatizada',
    badge: 'HL7 / ASTM',
    color: 'rose',
    icon: Droplet,
    defaultParams: {
      'TP': 12.5,
      'INR': 1.05,
      'TTPA': 28.0,
      'FIB': 285
    },
    defaultTestCode: 'COAG^Tap Ttpa^L'
  },
  {
    id: 'WAMA',
    name: 'Wama (Uroanálise)',
    category: 'Uroanálise Tirageme',
    badge: 'HL7 / ASTM',
    color: 'purple',
    icon: TestTube,
    defaultParams: {
      'LEU': 'Negativo',
      'NIT': 'Negativo',
      'PRO': 'Negativo',
      'GLU': 'Normal',
      'BLD': 'Negativo'
    },
    defaultTestCode: 'EAS^Urina I^L'
  },
  {
    id: 'UNIVERSAL',
    name: 'Universal / Genérico',
    category: 'Qualquer Equipamento',
    badge: 'HL7 / ASTM Custom',
    color: 'teal',
    icon: Cpu,
    defaultParams: {
      'EXAME1': 'Normal',
      'VALOR1': 100
    },
    defaultTestCode: 'GEN^Exame Generico^L'
  }
];

const DEFAULT_TEMPLATES: Record<EquipmentType, string> = {
  URIT: [
    'MSH|^~\\&|urit|8030|||{nowHL7}||DSR^Q03|{msgControlId}|P|2.3.1|{sampleId}||0||ASCII|||',
    'MSA|AA|{msgControlId}|Message accepted|||0|',
    'ERR|0|',
    'QAK|SR|OK|',
    'QRD|{queryTime}|R|D|-1|||RD|{sampleId}|OTH|||T|',
    'QRF|8030|{todayStart}|{todayEnd}|||RCT|COR|ALL||',
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
  ].join('\r') + '\r',

  MINDRAY: [
    'MSH|^~\\&|LIS|HOSPITAL|||{nowHL7}||ORR^O02|{msgControlId}|P|2.3.1||||0||ASCII|||',
    'MSA|AA|{msgControlId}|Message accepted|||0|',
    'ERR|0|',
    'QAK|SR|OK|',
    'QRD|{queryTime}|R|D|1|||RD|{sampleId}|OTH|||T|',
    'QRF|HOSPITAL|{todayStart}|{todayEnd}|||RCT|COR|ALL||',
    'PID|1||{patientId}||{patientNameSpace}||{dob}|{gender}|||||||||||||||||||||||',
    'PV1|1|O|||||||||||||||||||||||||||||||||||||||||||||||||',
    'ORC|AF|{sampleId}|{sampleId}||SC||||{nowHL7}||||||||',
    'OBR|1|{sampleId}|{sampleId}|{testCode}|N||{nowHL7}||||||||serum|||||||||||||||||||||||||||||||'
  ].join('\r') + '\r',

  FINECARE: [
    'MSH|^~\\&|FINECARE|LIS|||{nowHL7}||DSR^Q03|{msgControlId}|P|2.3.1||||0||ASCII|||',
    'MSA|AA|{msgControlId}|Message accepted|||0|',
    'ERR|0|',
    'QAK|SR|OK|',
    'QRD|{queryTime}|R|D|1|||RD|{sampleId}|OTH|||T|',
    'PID|1||{patientId}||{patientNameSpace}|||||||||||||||||||||||||',
    'OBR|1|{sampleId}|{sampleId}|{testCode}|N||{nowHL7}||||||||serum|||||||||||||||||||||||||||||||'
  ].join('\r') + '\r',

  MAXION: [
    'MSH|^~\\&|MAXION|LIS|||{nowHL7}||DSR^Q03|{msgControlId}|P|2.3.1||||0||ASCII|||',
    'MSA|AA|{msgControlId}|Message accepted|||0|',
    'QRD|{queryTime}|R|D|1|||RD|{sampleId}|OTH|||T|',
    'PID|1||{patientId}||{patientNameSpace}|||||||||||||||||||||||||',
    'OBR|1|{sampleId}|{sampleId}|{testCode}|N||{nowHL7}'
  ].join('\r') + '\r',

  MAXCOAG: [
    'MSH|^~\\&|MAXCOAG|LIS|||{nowHL7}||DSR^Q03|{msgControlId}|P|2.3.1||||0||ASCII|||',
    'MSA|AA|{msgControlId}|Message accepted|||0|',
    'QRD|{queryTime}|R|D|1|||RD|{sampleId}|OTH|||T|',
    'PID|1||{patientId}||{patientNameSpace}|||||||||||||||||||||||||',
    'OBR|1|{sampleId}|{sampleId}|{testCode}|N||{nowHL7}'
  ].join('\r') + '\r',

  WAMA: [
    'MSH|^~\\&|WAMA|LIS|||{nowHL7}||DSR^Q03|{msgControlId}|P|2.3.1||||0||ASCII|||',
    'MSA|AA|{msgControlId}|Message accepted|||0|',
    'QRD|{queryTime}|R|D|1|||RD|{sampleId}|OTH|||T|',
    'PID|1||{patientId}||{patientNameSpace}|||||||||||||||||||||||||',
    'OBR|1|{sampleId}|{sampleId}|{testCode}|N||{nowHL7}'
  ].join('\r') + '\r',

  UNIVERSAL: [
    'MSH|^~\\&|LIS_SERVER|UNIVERSAL|||{nowHL7}||DSR^Q03|{msgControlId}|P|2.3.1||||0||ASCII|||',
    'MSA|AA|{msgControlId}|Message accepted|||0|',
    'ERR|0|',
    'QAK|SR|OK|',
    'QRD|{queryTime}|R|D|1|||RD|{sampleId}|OTH|||T|',
    'PID|1||{patientId}||{patientNameSpace}||{dob}|{gender}|||||||||||||||||||||||',
    'OBR|1|{sampleId}|{sampleId}|{testCode}|N||{nowHL7}||||||||serum|||||||||||||||||||||||||||||||'
  ].join('\r') + '\r'
};

export const UniversalSimulatorTab: React.FC<UniversalSimulatorTabProps> = ({ onSelectSample }) => {
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType>('URIT');
  const [sampleId, setSampleId] = useState<string>('8021002');
  const [patientId, setPatientId] = useState<string>('P-8842');
  const [patientName, setPatientName] = useState<string>('Jose^Teste');
  const [gender, setGender] = useState<string>('F');
  const [age, setAge] = useState<string>('28a');

  // LIS Worklist Orders List
  const [worklistOrders, setWorklistOrders] = useState<WorklistItem[]>([]);
  const [selectedWorklistSid, setSelectedWorklistSid] = useState<string>('');
  const [transmitSuccessMsg, setTransmitSuccessMsg] = useState<string | null>(null);

  // Fetch Worklist Orders from LIS Server
  const fetchWorklist = async () => {
    try {
      const res = await fetch('/api/worklist');
      if (!res.ok) {
        console.error('Erro ao buscar ordens no LIS:', res.status, res.statusText);
        return;
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return;
      }
      const data = await res.json();
      if (data && data.worklist) {
        setWorklistOrders(data.worklist);
      }
    } catch (e) {
      console.error('Erro ao buscar ordens no LIS:', e);
    }
  };

  useEffect(() => {
    fetchWorklist();
    const interval = setInterval(fetchWorklist, 2000);
    return () => clearInterval(interval);
  }, []);

  // Filter worklist orders matching current selected equipment & tube type
  const filteredWorklistOrders = worklistOrders.filter(order => {
    if (selectedEquipment === 'UNIVERSAL') return true;

    const model = (order.analyzerModel || '').toLowerCase();
    const testsUpper = (order.tests || []).map(t => t.toUpperCase());

    if (selectedEquipment === 'MINDRAY') {
      // Must be Purple Tube / Hematologia / Mindray
      if (model.includes('roxo') || model.includes('hemato') || model.includes('mindray') || model.includes('edta')) return true;
      if (testsUpper.some(t => ['HEMOGRAMA', 'CBC', 'WBC', 'RBC', 'HGB', 'HCT', 'PLT', '5DIFF'].includes(t))) return true;
      return false;
    }

    if (selectedEquipment === 'URIT') {
      // Must be Yellow Tube / Bioquímica / URIT
      if (model.includes('amarelo') || model.includes('bioqu') || model.includes('urit')) return true;
      if (testsUpper.some(t => ['AMIL', 'AMILASE', 'TGP', 'ALT', 'TGO', 'AST', 'CREAT', 'CREATININA', 'UREIA', 'GLI', 'GLICOSE', 'PTT', 'ALB', 'COL', 'TRI'].includes(t))) return true;
      return false;
    }

    if (selectedEquipment === 'MAXION') {
      // Must be Yellow Tube / Eletrólitos / Maxion
      if (model.includes('amarelo') || model.includes('eletro') || model.includes('maxion') || model.includes('íons')) return true;
      if (testsUpper.some(t => ['NA', 'SODIO', 'K', 'POTASSIO', 'CL', 'CLORETO', 'ICA', 'CALCIO'].includes(t))) return true;
      return false;
    }

    if (selectedEquipment === 'FINECARE') {
      // Must be Red Tube / Imunoensaio / Finecare
      if (model.includes('vermelho') || model.includes('imuno') || model.includes('finecare') || model.includes('poct')) return true;
      if (testsUpper.some(t => ['CRP', 'PCR', 'PCT', 'PROCALCITONINA', 'TROP', 'TROPONINA', 'D-DIMER', 'DDIMERO', 'HBA1C'].includes(t))) return true;
      return false;
    }

    if (selectedEquipment === 'MAXCOAG') {
      // Must be Blue Tube / Coagulação / MaxCoag
      if (model.includes('azul') || model.includes('coagu') || model.includes('maxcoag') || model.includes('citrato')) return true;
      if (testsUpper.some(t => ['TP', 'TAP', 'INR', 'TTPA', 'FIB', 'FIBRINOGENIO'].includes(t))) return true;
      return false;
    }

    if (selectedEquipment === 'WAMA') {
      // Must be Urine Tube / Uroanálise / Wama
      if (model.includes('urina') || model.includes('coletor') || model.includes('uro') || model.includes('wama')) return true;
      if (testsUpper.some(t => ['EAS', 'URINA I', 'LEU', 'NIT', 'PRO', 'GLU'].includes(t))) return true;
      return false;
    }

    return true;
  });

  // Handle selecting an order/tube from LIS - Auto pulls patient info & tests
  const handleSelectWorklistOrder = (sid: string) => {
    const clean = sid.replace(/^0+/, '');
    const order = worklistOrders.find(o => o.sampleId === sid || o.sampleId === clean || o.sampleId.replace(/^0+/, '') === clean);
    if (!order) return;

    setSampleId(order.sampleId);
    if (order.patientId) setPatientId(order.patientId);
    if (order.patientName) setPatientName(order.patientName);
    if (order.gender) setGender(order.gender);
    if (order.age) setAge(order.age);

    // Auto-detect equipment if order specifies analyzerModel
    if (order.analyzerModel) {
      const modelLower = order.analyzerModel.toLowerCase();
      if (modelLower.includes('mindray') || modelLower.includes('hemato') || modelLower.includes('roxo')) {
        setSelectedEquipment('MINDRAY');
      } else if (modelLower.includes('urit') || modelLower.includes('bioqu') || modelLower.includes('amarelo')) {
        setSelectedEquipment('URIT');
      } else if (modelLower.includes('maxion') || modelLower.includes('eletro')) {
        setSelectedEquipment('MAXION');
      } else if (modelLower.includes('finecare') || modelLower.includes('imuno') || modelLower.includes('vermelho')) {
        setSelectedEquipment('FINECARE');
      } else if (modelLower.includes('maxcoag') || modelLower.includes('coagu') || modelLower.includes('azul')) {
        setSelectedEquipment('MAXCOAG');
      } else if (modelLower.includes('wama') || modelLower.includes('urina') || modelLower.includes('uro')) {
        setSelectedEquipment('WAMA');
      }
    }

    // Auto-populate custom parameters based on order tests
    if (order.tests && order.tests.length > 0) {
      const newParams: Record<string, string | number> = {};

      order.tests.forEach(testCode => {
        const codeUpper = testCode.toUpperCase();
        if (TEST_DEFAULT_MAP[codeUpper]) {
          Object.assign(newParams, TEST_DEFAULT_MAP[codeUpper]);
        } else {
          newParams[codeUpper] = 100;
        }
      });

      if (Object.keys(newParams).length > 0) {
        setCustomParams(newParams);
      }
    }

    setIsRawOverridden(false);
  };

  // Custom parameters dictionary
  const [customParams, setCustomParams] = useState<Record<string, string | number>>(
    EQUIPMENT_OPTIONS[0].defaultParams
  );
  const [newParamCode, setNewParamCode] = useState<string>('');
  const [newParamVal, setNewParamVal] = useState<string>('');

  // LIS Worklist Response Template (editable text)
  const [responseTemplate, setResponseTemplate] = useState<string>(
    DEFAULT_TEMPLATES['URIT']
  );
  const [isTemplateSaved, setIsTemplateSaved] = useState(false);

  // Raw Message generated or edited
  const [rawPayload, setRawPayload] = useState<string>('');
  const [isRawOverridden, setIsRawOverridden] = useState(false);

  // Target config
  const [targetMode, setTargetMode] = useState<'INTERNAL' | 'SOCKET_TCP'>('INTERNAL');
  const [targetHost, setTargetHost] = useState<string>('127.0.0.1');
  const [targetPort, setTargetPort] = useState<number>(5151);

  // Simulation state
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);

  const eqConfig = EQUIPMENT_OPTIONS.find(e => e.id === selectedEquipment) || EQUIPMENT_OPTIONS[0];

  // Handle Equipment Switch
  const handleSelectEquipment = (type: EquipmentType) => {
    setSelectedEquipment(type);
    const eq = EQUIPMENT_OPTIONS.find(e => e.id === type) || EQUIPMENT_OPTIONS[0];
    setCustomParams({ ...eq.defaultParams });
    setResponseTemplate(DEFAULT_TEMPLATES[type] || DEFAULT_TEMPLATES['UNIVERSAL']);
    setIsRawOverridden(false);
    if (type === 'URIT') {
      setSampleId('8021002');
    } else if (type === 'MINDRAY') {
      setSampleId('548001');
    } else if (type === 'FINECARE') {
      setSampleId('FINE8841');
    } else if (type === 'MAXION') {
      setSampleId('MAXI9912');
    } else if (type === 'MAXCOAG') {
      setSampleId('COAG7741');
    } else if (type === 'WAMA') {
      setSampleId('WAMA3321');
    } else {
      setSampleId('UNIV001');
    }
  };

  // Add custom parameter dynamically
  const handleAddCustomParam = () => {
    if (!newParamCode.trim()) return;
    const code = newParamCode.trim().toUpperCase();
    const val = newParamVal.trim();
    const parsedNum = parseFloat(val);
    const finalVal = !isNaN(parsedNum) && !val.includes(' ') && !val.includes('Neg') && !val.includes('Pos') ? parsedNum : val;

    setCustomParams(prev => ({
      ...prev,
      [code]: finalVal || 0
    }));
    setNewParamCode('');
    setNewParamVal('');
  };

  const handleRemoveParam = (code: string) => {
    setCustomParams(prev => {
      const copy = { ...prev };
      delete copy[code];
      return copy;
    });
  };

  const handleParamChange = (code: string, rawVal: string) => {
    const parsedNum = parseFloat(rawVal);
    const finalVal = !isNaN(parsedNum) && !rawVal.includes(' ') && !rawVal.includes('Neg') && !rawVal.includes('Pos') ? parsedNum : rawVal;
    setCustomParams(prev => ({
      ...prev,
      [code]: finalVal
    }));
  };

  // Generate Raw Payload preview automatically unless user manually typed over it
  useEffect(() => {
    if (isRawOverridden) return;

    const now = new Date();
    const nowHL7 = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const dateFormatted = now.toISOString().split('T')[0];

    // Build HL7 ORU result message or MLLP envelope for equipment
    let lines: string[] = [];
    lines.push(`MSH|^~\\&|${selectedEquipment.toLowerCase()}|${selectedEquipment.toUpperCase()}|||${nowHL7}||ORU^R01|${nowHL7}0001|P|2.3.1||||0||ASCII|||`);
    lines.push(`PID|1||${patientId}||${patientName}||${gender}||||0|||||||||||||||||||`);
    lines.push(`OBR|1|${sampleId}|${nowHL7}0001|${selectedEquipment.toUpperCase()}|N||${dateFormatted}||||||||serum|||||||||||||||||||||||||||||||`);

    let idx = 1;
    Object.entries(customParams).forEach(([code, val]) => {
      let unit = 'U/L';
      let ref = '0-100';
      if (['WBC', 'RBC', 'PLT'].includes(code)) unit = '10^9/L';
      if (['HGB', 'HCT', 'PTT', 'ALB', 'COL', 'TRI'].includes(code)) unit = 'g/dL';
      if (['NA', 'K', 'CL'].includes(code)) unit = 'mEq/L';
      if (['CREAT', 'CREAT110', 'UREIA', 'GLI', 'AUR', 'CRP'].includes(code)) unit = 'mg/dL';

      lines.push(`OBX|${idx}|NM|${code}^${code}^LN|${idx}|${val}|${unit}|${ref}|N|||F||0.0100|${dateFormatted}||Laboratório||`);
      idx++;
    });

    const generated = lines.join('\r') + '\r';
    setRawPayload(generated);
  }, [selectedEquipment, sampleId, patientId, patientName, gender, customParams, isRawOverridden]);

  // Save Response Template to Backend LIS
  const handleSaveTemplateToLis = async () => {
    try {
      if (selectedEquipment === 'URIT') {
        await fetch('/api/urit/custom-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template: responseTemplate })
        });
      }
      setIsTemplateSaved(true);
      setTimeout(() => setIsTemplateSaved(false), 2500);
    } catch (e) {
      console.error('Erro ao salvar template:', e);
    }
  };

  // Register Worklist Order in LIS
  const handleRegisterWorklist = async () => {
    try {
      const testCodes = Object.keys(customParams).join('+');
      const res = await fetch('/api/worklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleId,
          patientId,
          patientName,
          gender,
          age,
          tests: Object.keys(customParams),
          testCode: testCodes || eqConfig.defaultTestCode,
          analyzerModel: eqConfig.name
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Worklist #${sampleId} cadastrada com sucesso no LIS para o equipamento ${eqConfig.name}!`);
      }
    } catch (e) {
      alert('Erro ao cadastrar na worklist.');
    }
  };

  // Execute Worklist Query Simulation (QRY -> DSR/ORR)
  const handleSimulateWorklistQuery = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const nowHL7 = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);

      let qryText = [
        `MSH|^~\\&|${selectedEquipment.toLowerCase()}|${selectedEquipment.toUpperCase()}|||${nowHL7}||QRY^Q02|${nowHL7}|P|2.3.1||||0||ASCII|||`,
        `QRD|${nowHL7}|R|D|1|||RD|${sampleId}|OTH|||T|`,
        `QRF|${selectedEquipment.toUpperCase()}|${nowHL7.slice(0, 8)}000000|${nowHL7.slice(0, 8)}235959|||RCT|COR|ALL||`
      ].join('\r') + '\r';

      const res = await fetch('/api/parse-raw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: qryText })
      });
      const data = await res.json();
      setLastResult(data);
    } catch (e: any) {
      console.error('Erro na consulta de worklist:', e);
    } finally {
      setLoading(false);
    }
  };

  // Transmit Sample Results to LIS (ORU -> ACK)
  const handleTransmitResults = async () => {
    setLoading(true);
    setTransmitSuccessMsg(null);
    try {
      const res = await fetch('/api/parse-raw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: rawPayload })
      });
      const data = await res.json();
      setLastResult(data);

      const parsed = data.parsedResult || data.result;
      if (parsed) {
        onSelectSample(parsed);
      }

      await fetchWorklist(); // Refresh worklist orders

      setTransmitSuccessMsg(`✓ Resultado da amostra #${sampleId} transmitido via Socket/MLLP ao LIS com sucesso! Ordem atualizada na tela de Ordens.`);
      setTimeout(() => setTransmitSuccessMsg(null), 8000);
    } catch (e: any) {
      console.error('Erro ao enviar resultados:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Banner & Equipment Selector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white tracking-wide font-sans">
                  Simulador Universal de Resposta & Mensagem Manual LIS
                </h2>
                <span className="text-[10px] uppercase font-mono tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 font-bold border border-indigo-700">
                  Universal Multiparâmetro
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Configure manualmente exames, parâmetros e templates de resposta LIS para <strong className="text-slate-200">qualquer equipamento laboratorial</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRegisterWorklist}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all flex items-center space-x-1.5 shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Database className="w-4 h-4" />
              <span>1. Cadastrar Worklist LIS</span>
            </button>
            <button
              onClick={handleSimulateWorklistQuery}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>2. Simular Consulta Worklist (QRY)</span>
            </button>
          </div>
        </div>

        {/* Equipment Options Nav Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-5 pt-4 border-t border-slate-800/80">
          {EQUIPMENT_OPTIONS.map(eq => {
            const Icon = eq.icon;
            const isSelected = selectedEquipment === eq.id;
            return (
              <button
                key={eq.id}
                onClick={() => handleSelectEquipment(eq.id)}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    {eq.badge.split(' ')[0]}
                  </span>
                </div>
                <div className="mt-2">
                  <h4 className="font-bold text-xs font-sans text-slate-100 truncate">{eq.name}</h4>
                  <p className="text-[10px] text-slate-500 truncate">{eq.category}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Left Controls & Custom Parameters / Right Raw Frame & Response Template */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: Patient Info & Custom Parameters Manager */}
        <div className="lg:col-span-5 space-y-6">

          {/* SELECT PENDING TUBE / ORDER FROM LIS CARD */}
          <div className="bg-gradient-to-r from-indigo-950/90 via-slate-900 to-slate-900 border border-indigo-500/40 rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400 border border-indigo-500/30">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-white flex items-center space-x-2">
                    <span>Puxar Amostra / Tubo do LIS</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold border border-amber-500/30">
                      {filteredWorklistOrders.filter(o => o.status === 'PENDING').length} PENDENTES PARA {selectedEquipment}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedEquipment === 'MINDRAY' && '🟣 Filtrando apenas Tubos Roxos (EDTA / Hematologia)'}
                    {selectedEquipment === 'URIT' && '🟡 Filtrando apenas Tubos Amarelos (Bioquímica / Gel)'}
                    {selectedEquipment === 'MAXION' && '🟡 Filtrando apenas Tubos Amarelos (Eletrólitos / Íons)'}
                    {selectedEquipment === 'FINECARE' && '🔴 Filtrando apenas Tubos Vermelhos (Imunoensaio / Soro)'}
                    {selectedEquipment === 'MAXCOAG' && '🔵 Filtrando apenas Tubos Azuis (Coagulação / Citrato)'}
                    {selectedEquipment === 'WAMA' && '🧪 Filtrando apenas Colectores Urina (Uroanálise)'}
                    {selectedEquipment === 'UNIVERSAL' && '📋 Mostrando todos os tubos do LIS'}
                  </p>
                </div>
              </div>

              <button
                onClick={fetchWorklist}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center space-x-1 transition-colors"
                title="Atualizar lista de ordens do LIS"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              </button>
            </div>

            <div className="space-y-2">
              <select
                value={selectedWorklistSid}
                onChange={(e) => {
                  const sid = e.target.value;
                  setSelectedWorklistSid(sid);
                  if (sid) handleSelectWorklistOrder(sid);
                }}
                className="w-full bg-slate-950 border border-indigo-500/50 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-400"
              >
                <option value="">-- Selecione uma amostra / tubo cadastrado para {eqConfig.name} --</option>
                {filteredWorklistOrders.map((o, idx) => (
                  <option key={`${o.sampleId}-${idx}`} value={o.sampleId}>
                    Tubo #{o.sampleId} - {o.patientName} (ID: {o.patientId}) [{o.analyzerModel || 'Geral'}] {o.status === 'PENDING' ? '⌛ PENDENTE' : '✓ LIDO'}
                  </option>
                ))}
              </select>

              {filteredWorklistOrders.length === 0 && (
                <div className="text-[11px] text-amber-300 bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/30">
                  Nenhum tubo de exames para <strong>{eqConfig.name}</strong> encontrado. Cadastre uma nova ordem na aba <strong>Ordens (Worklist)</strong>.
                </div>
              )}

              {/* Quick Pills for Pending Tubes */}
              {filteredWorklistOrders.filter(o => o.status === 'PENDING').length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Atalhos Rápidos de Tubos Pendentes para {eqConfig.name}:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {filteredWorklistOrders.filter(o => o.status === 'PENDING').map((o, idx) => (
                      <button
                        key={`${o.sampleId}-${idx}`}
                        type="button"
                        onClick={() => {
                          setSelectedWorklistSid(o.sampleId);
                          handleSelectWorklistOrder(o.sampleId);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center space-x-1.5 border transition-all ${
                          selectedWorklistSid === o.sampleId
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                            : 'bg-slate-950 text-indigo-300 border-indigo-900/60 hover:bg-indigo-950/60 hover:border-indigo-500'
                        }`}
                      >
                        <QrCode className="w-3 h-3 text-amber-400" />
                        <span>#{o.sampleId}</span>
                        <span className="text-[10px] text-slate-300 font-sans">({o.patientName.split(' ')[0]})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedWorklistSid && (
                <div className="flex items-center justify-between text-[11px] text-emerald-400 bg-emerald-950/40 p-2 rounded-xl border border-emerald-500/30">
                  <span className="flex items-center space-x-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Dados do Tubo <strong>#{selectedWorklistSid}</strong> aplicados no simulador!</span>
                  </span>
                  <button
                    onClick={() => setSelectedWorklistSid('')}
                    className="text-[10px] text-slate-400 hover:text-white underline ml-2"
                  >
                    Limpar
                  </button>
                </div>
              )}

              {transmitSuccessMsg && (
                <div className="flex items-center justify-between text-[11px] text-emerald-300 bg-emerald-950/90 p-3 rounded-xl border border-emerald-500/60 shadow-lg animate-fade-in">
                  <span className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="font-semibold">{transmitSuccessMsg}</span>
                  </span>
                  <button
                    onClick={() => setTransmitSuccessMsg(null)}
                    className="text-[10px] text-slate-400 hover:text-white underline ml-2"
                  >
                    OK
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Patient & Sample Identifiers Form */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-indigo-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Identificação da Amostra & Paciente</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">{eqConfig.name}</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Código do Tubo (Barcode / ID):</label>
                <input
                  type="text"
                  value={sampleId}
                  onChange={(e) => setSampleId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Ex: 8021002"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">ID do Paciente:</label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Ex: P-8842"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 mb-1 font-semibold">Nome Completo do Paciente:</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-sans text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Ex: Jose^Teste"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Gênero:</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-sans text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="F">Feminino (F)</option>
                  <option value="M">Masculino (M)</option>
                  <option value="O">Outro (O)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Idade:</label>
                <input
                  type="text"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  placeholder="Ex: 28a"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Custom Parameters Manager */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-teal-400 uppercase tracking-wider flex items-center space-x-2">
                <Beaker className="w-4 h-4" />
                <span>Parâmetros Manuais do Exame</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500">{Object.keys(customParams).length} ensaios</span>
            </div>

            {/* List of Current Custom Parameters */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {Object.entries(customParams).map(([code, val]) => (
                <div key={code} className="flex items-center justify-between bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-teal-300 w-20">{code}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={val.toString()}
                      onChange={(e) => handleParamChange(code, e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-white font-mono text-xs w-28 text-center focus:outline-none focus:border-teal-500"
                    />
                    <button
                      onClick={() => handleRemoveParam(code)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-slate-900 transition-colors"
                      title="Remover parâmetro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Form to Add New Parameter Manually */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 block">Adicionar Qualquer Exame / Código de Parâmetro:</span>
              <div className="flex items-center space-x-2 text-xs">
                <input
                  type="text"
                  placeholder="Código (ex: AMIL, ALT, TROP, CRP)"
                  value={newParamCode}
                  onChange={(e) => setNewParamCode(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs flex-1 focus:outline-none focus:border-indigo-500 uppercase"
                />
                <input
                  type="text"
                  placeholder="Valor (ex: 97, 1.17, Negativo)"
                  value={newParamVal}
                  onChange={(e) => setNewParamVal(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs w-32 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleAddCustomParam}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Incluir</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Response Template Editor & Raw Frame Generator */}
        <div className="lg:col-span-7 space-y-6">

          {/* LIS Response / Worklist Query Template Editor */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-amber-400 uppercase tracking-wider">
                  Template da Resposta LIS (Worklist DSR^Q03 / ORR^O02)
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setResponseTemplate(DEFAULT_TEMPLATES[selectedEquipment] || DEFAULT_TEMPLATES['UNIVERSAL'])}
                  className="bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[11px] px-2.5 py-1 rounded-lg border border-slate-800 flex items-center space-x-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restaurar Padrão</span>
                </button>

                <button
                  onClick={handleSaveTemplateToLis}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold px-3 py-1 rounded-lg flex items-center space-x-1 shadow-md transition-all"
                >
                  {isTemplateSaved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                  <span>{isTemplateSaved ? 'Salvo no LIS!' : 'Salvar no LIS'}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Personalize o texto exato da mensagem HL7/ASTM transmitida pelo LIS quando o equipamento consulta a Worklist (<code className="text-amber-300">QRY^Q02</code>):
            </p>

            <textarea
              rows={8}
              value={responseTemplate}
              onChange={(e) => setResponseTemplate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-amber-300 focus:outline-none focus:border-amber-500 leading-relaxed whitespace-pre"
            />

            <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-400 font-mono">
              <span className="text-slate-500">Variáveis Suportadas:</span>
              <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">&#123;sampleId&#125;</span>
              <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">&#123;patientId&#125;</span>
              <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">&#123;patientNameSpace&#125;</span>
              <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">&#123;testCode&#125;</span>
              <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">&#123;nowHL7&#125;</span>
              <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">&#123;dateFormatted&#125;</span>
            </div>
          </div>

          {/* Raw Generated Result Payload & Direct Transmission */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm text-indigo-400 uppercase tracking-wider">
                  Mensagem Bruta de Resultados (ORU^R01 / MLLP)
                </h3>
              </div>

              {isRawOverridden && (
                <button
                  onClick={() => setIsRawOverridden(false)}
                  className="text-[10px] text-indigo-400 hover:underline"
                >
                  Recalcular a partir dos formulários
                </button>
              )}
            </div>

            <textarea
              rows={7}
              value={rawPayload}
              onChange={(e) => {
                setRawPayload(e.target.value);
                setIsRawOverridden(true);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed whitespace-pre"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleTransmitResults}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center space-x-2 shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>3. Transmitir Resultado ao LIS (ORU ➔ ACK)</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400 font-mono">
                Porta TCP Ativa: <span className="text-emerald-400 font-bold">:5151</span>
              </div>
            </div>
          </div>

          {/* Result Output Preview */}
          {lastResult && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-xs text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>Resposta do Servidor LIS Registrada</span>
                </span>
                {lastResult.parsedResult && (
                  <button
                    onClick={() => onSelectSample(lastResult.parsedResult)}
                    className="bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-semibold px-3 py-1 rounded-lg flex items-center space-x-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Visualizar Laudo Completo</span>
                  </button>
                )}
              </div>

              {lastResult.responseMessage || lastResult.ackMessage ? (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 whitespace-pre-wrap">
                  {lastResult.responseMessage || lastResult.ackMessage}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Mensagem processada no LIS com sucesso!</p>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
