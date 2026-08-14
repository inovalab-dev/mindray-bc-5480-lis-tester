export function generateNodeScript(port: number = 5151): string {
  return `/**
 * Mindray BC-5480 LIS Communication Listener (Node.js Standalone)
 * 
 * Instruções de Uso no Laboratório:
 * 1. Instale o Node.js na sua máquina (https://nodejs.org)
 * 2. Salve este arquivo como 'mindray-bc5480-listener.js'
 * 3. No terminal/prompt de comando, execute:
 *      node mindray-bc5480-listener.js
 * 4. No equipamento Mindray BC-5480:
 *      - Menu -> Setup -> Comunicação (Communication) -> Setup LIS
 *      - Protocolo: HL7 v2.3.1 (ou MLLP/HL7)
 *      - IP do Servidor LIS: [IP do computador onde este script está rodando]
 *      - Porta: ${port}
 *      - Envio Automático: Ativado
 */

const net = require('net');
const fs = require('fs');
const path = require('path');

const PORT = process.env.MINDRAY_PORT || ${port};
const HOST = '0.0.0.0'; // ATENÇÃO: Mantenha '0.0.0.0' para escutar em todas as placas deste computador! NÃO coloque o IP do Mindray aqui.

// Caracteres Especiais MLLP (Minimal Lower Layer Protocol)
const VT = Buffer.from([0x0B]); // Start of Block
const FS_CR = Buffer.from([0x1C, 0x0D]); // End of Block

console.log('====================================================');
console.log('  Mindray BC-5480 - Servidor de Escuta LIS (HL7 v2)');
console.log('====================================================');
console.log(\`Escutando conexões na porta TCP: \${PORT}\`);
console.log('Aguardando mensagens do equipamento hematológico...\\n');

const server = net.createServer((socket) => {
  const remoteAddress = \`\${socket.remoteAddress}:\${socket.remotePort}\`;
  console.log(\`[\${new Date().toLocaleTimeString()}] Equipamento Conectado: \${remoteAddress}\`);

  let buffer = Buffer.alloc(0);

  socket.on('data', (data) => {
    buffer = Buffer.concat([buffer, data]);

    // Procura início (VT = 0x0B) e fim (FS CR = 0x1C 0x0D) do MLLP
    let vtIndex = buffer.indexOf(VT);
    let fsCrIndex = buffer.indexOf(FS_CR);

    while (vtIndex !== -1 && fsCrIndex !== -1 && fsCrIndex > vtIndex) {
      // Extrai a mensagem HL7 sem os bytes do envelope MLLP
      const hl7Buffer = buffer.slice(vtIndex + 1, fsCrIndex);
      const hl7Message = hl7Buffer.toString('utf8');

      processMindrayMessage(hl7Message, socket, remoteAddress);

      // Limpa a mensagem processada do buffer
      buffer = buffer.slice(fsCrIndex + 2);
      vtIndex = buffer.indexOf(VT);
      fsCrIndex = buffer.indexOf(FS_CR);
    }
  });

  socket.on('end', () => {
    console.log(\`[\${new Date().toLocaleTimeString()}] Conexão finalizada: \${remoteAddress}\`);
  });

  socket.on('error', (err) => {
    console.error(\`[\${new Date().toLocaleTimeString()}] Erro no socket (\${remoteAddress}):\`, err.message);
  });
});

function processMindrayMessage(hl7Text, socket, remoteAddress) {
  const nowStr = new Date().toISOString();
  console.log('\\n----------------------------------------------------');
  console.log(\`[\${nowStr}] Nova mensagem recebida de \${remoteAddress}:\`);
  console.log(hl7Text);

  const lines = hl7Text.split(/\\r\\n|\\r|\\n/);
  let msgControlId = '12345';
  let msgType = 'ORU^R01';
  let sendingApp = 'BC-5480';
  let sendingFacility = 'MINDRAY';
  let receivingApp = 'LIS';
  let receivingFacility = 'LAB';
  let incomingQrdLine = '';
  let incomingQrfLine = '';
  let queriedSampleId = '548001';

  for (const line of lines) {
    const fields = line.split('|');
    const seg = fields[0];

    if (seg === 'MSH') {
      msgControlId = fields[9] || msgControlId;
      msgType = fields[8] || msgType;
      sendingApp = fields[2] || sendingApp;
      sendingFacility = fields[3] || sendingFacility;
      receivingApp = fields[4] || receivingApp;
      receivingFacility = fields[5] || receivingFacility;
    } else if (seg === 'ORC') {
      for (let idx = 1; idx < fields.length; idx++) {
        const val = fields[idx].split('^')[0].trim();
        if (val && val !== 'RF' && val !== 'AF' && val !== 'IP' && val !== 'OK' && val !== '1' && !val.includes('^')) {
          queriedSampleId = val;
          break;
        }
      }
    } else if (seg === 'OBR') {
      for (let idx = 2; idx < fields.length; idx++) {
        const val = fields[idx].split('^')[0].trim();
        if (val && val !== '1' && val !== 'HM' && !val.includes('^')) {
          if (!queriedSampleId || queriedSampleId === '548001') queriedSampleId = val;
          break;
        }
      }
    } else if (seg === 'QRD') {
      incomingQrdLine = line;
      const rawSid = fields[8] || fields[9] || fields[7] || '';
      if (rawSid) queriedSampleId = rawSid.split('^')[0].trim();
    } else if (seg === 'QRF') {
      incomingQrfLine = line;
    }
  }

  const nowHL7 = formatHL7Date(new Date());

  const isOrmQuery = msgType.toUpperCase().includes('ORM') || msgType.toUpperCase().includes('O01') || rawHL7Message.includes('ORC|RF');
  const isQryQuery = msgType.toUpperCase().includes('QRY') || msgType.toUpperCase().includes('Q02') || rawHL7Message.includes('QRD|');

  // Trata Consulta de Worklist do Mindray (ORM^O01 ou QRY^Q02)
  if (isOrmQuery) {
    console.log(\`\\n>>> MINDRAY CONSULTA WORKLIST ORM^O01 PARA AMOSTRA ID = \${queriedSampleId}\`);
    const orrHL7 = [
      \`MSH|^~\\\\&|\${receivingApp}|\${receivingFacility}|\${sendingApp}|\${sendingFacility}|\${nowHL7}||ORR^O02|\${msgControlId}|P|2.3.1||||||UNICODE\`,
      \`MSA|AA|\${msgControlId}|Success|\`,
      \`PID|1||P-\${queriedSampleId}||Silva^Maria||19900101|F|\`,
      \`PV1|1|O|\`,
      \`ORC|AF|\${queriedSampleId}|\${queriedSampleId}||IP|\`,
      \`OBR|1|\${queriedSampleId}|\${queriedSampleId}|00002^CBC+DIFF^99MRC|R|\${nowHL7}|||||O|||\${nowHL7}|WB||||||||HM|O|\`
    ].join('\\r') + '\\r';

    const orrMLLP = Buffer.concat([VT, Buffer.from(orrHL7, 'utf8'), FS_CR]);
    socket.write(orrMLLP, () => {
      console.log(\`[ORR ENVIADO] Resposta de Ordem (ORR^O02) enviada ao Mindray para Amostra #\${queriedSampleId}\`);
    });
    return;
  }

  if (isQryQuery) {
    console.log(\`\\n>>> MINDRAY CONSULTA WORKLIST (QRY^Q02) PARA AMOSTRA ID = \${queriedSampleId}\`);
    
    if (!incomingQrdLine) {
      incomingQrdLine = \`QRD|\${nowHL7}|R|I|\${msgControlId}|||1^RD|\${queriedSampleId}|DEM|||\`;
    }
    if (!incomingQrfLine) {
      incomingQrfLine = \`QRF|\${sendingApp}|||||\`;
    }

    const dsrHL7 = [
      \`MSH|^~\\\\&|\${receivingApp}|\${receivingFacility}|\${sendingApp}|\${sendingFacility}|\${nowHL7}||DSR^Q03|\${msgControlId}|P|2.3.1|\`,
      \`MSA|AA|\${msgControlId}|Success|\`,
      \`QAK|\${msgControlId}|OK|\`,
      incomingQrdLine,
      incomingQrfLine,
      \`DSP|1||1|||\`,
      \`DSP|2||P-\${queriedSampleId}|||\`,
      \`DSP|3||Silva^Maria|||\`,
      \`DSP|4||19900101|||\`,
      \`DSP|5||F|||\`,
      \`DSP|6|||||\`,
      \`DSP|7||P-\${queriedSampleId}|||\`,
      \`DSP|8|||||\`,
      \`DSP|9|||||\`,
      \`DSP|10|||||\`,
      \`DSP|11||\${queriedSampleId}|||\`,
      \`DSP|12||WB|||\`,
      \`DSP|13||CBC+DIFF|||\`,
      \`DSP|14|||||\`,
      \`DSP|15||0|||\`,
      \`DSP|16|||||\`,
      \`DSP|17|||||\`,
      \`DSP|18|||||\`,
      \`DSP|19|||||\`,
      \`DSP|20|||||\`,
      \`DSP|21|||||\`,
      \`DSP|22|||||\`,
      \`DSP|23|||||\`,
      \`DSP|24|||||\`,
      \`DSP|25|||||\`,
      \`DSP|26|||||\`,
      \`DSP|27|||||\`,
      \`DSP|28|||||\`,
      \`DSP|29|||||\`
    ].join('\\r') + '\\r';

    const dsrMLLP = Buffer.concat([VT, Buffer.from(dsrHL7, 'utf8'), FS_CR]);
    socket.write(dsrMLLP, () => {
      console.log(\`[DSR ENVIADO] Resposta de Worklist enviada ao Mindray para Amostra #\${queriedSampleId}\`);
    });
    return;
  }

  // Trata Recebimento de Resultados do Mindray (ORU^R01)
  let sampleId = 'DESCONHECIDO';
  let patientName = '';
  const parameters = {};

  for (const line of lines) {
    const fields = line.split('|');
    const seg = fields[0];

    if (seg === 'MSH') {
      if (fields[13] && fields[13].trim()) {
        sampleId = fields[13].trim().split('^')[0];
      }
    } else if (seg === 'PID') {
      patientName = (fields[5] || '').replace('^', ' ');
    } else if (seg === 'ORC' || seg === 'OBR') {
      const extracted = (fields[2] || fields[3] || '').trim().split('^')[0];
      if (extracted) sampleId = extracted;
    } else if (seg === 'OBX') {
      const code = (fields[3] || '').split('^')[1] || fields[3];
      const val = fields[5];
      const unit = fields[6];
      const flag = fields[8];
      if (code && val !== undefined) {
        parameters[code] = { val, unit, flag };
      }
    }
  }

  console.log(\`\\n>>> AMOSTRA PARSADA: ID = \${sampleId} | Paciente = \${patientName || 'N/I'}\`);
  console.log('Resultados principais:');
  const mainKeys = ['WBC', 'RBC', 'HGB', 'HCT', 'PLT', 'NEU%', 'LYM%', 'MON%', 'EOS%', 'BAS%'];
  mainKeys.forEach(k => {
    if (parameters[k]) {
      console.log(\`   \${k.padEnd(8)}: \${parameters[k].val} \${parameters[k].unit} \${parameters[k].flag ? '['+parameters[k].flag+']' : ''}\`);
    }
  });

  // Salva resultado em arquivo JSON local
  const logObj = {
    timestamp: nowStr,
    sampleId,
    patientName,
    msgControlId,
    parameters,
    rawHL7: hl7Text
  };

  const logPath = path.join(__dirname, 'mindray_results.json');
  let existing = [];
  try {
    if (fs.existsSync(logPath)) {
      existing = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    }
  } catch (e) {}
  existing.push(logObj);
  fs.writeFileSync(logPath, JSON.stringify(existing, null, 2));
  console.log(\`[OK] Resultado salvo em \${logPath}\`);

  // Monta e Envia a Resposta de Confirmação (HL7 ACK) ao Mindray BC-5480
  const ackHL7 = [
    \`MSH|^~\\\\&|\${receivingApp}|\${receivingFacility}|\${sendingApp}|\${sendingFacility}|\${nowHL7}||ACK^R01|\${msgControlId}|P|2.3.1|\`,
    \`MSA|AA|\${msgControlId}|Mensagem recebida com sucesso por LIS|\`
  ].join('\\r') + '\\r';

  // Empacota em envelope MLLP (VT + HL7 + FS + CR)
  const ackMLLP = Buffer.concat([
    VT,
    Buffer.from(ackHL7, 'utf8'),
    FS_CR
  ]);

  socket.write(ackMLLP, () => {
    console.log(\`[ACK ENVIADO] Confirmação MSA|AA enviada ao equipamento para MSG \${msgControlId}\`);
  });
}

function formatHL7Date(d) {
  const pad = n => n.toString().padStart(2, '0');
  return \`\${d.getFullYear()}\${pad(d.getMonth()+1)}\${pad(d.getDate())}\${pad(d.getHours())}\${pad(d.getMinutes())}\${pad(d.getSeconds())}\`;
}

server.listen(PORT, HOST, () => {
  console.log(\`Servidor pronto! Aguarando conexão do Mindray BC-5480 na porta \${PORT}...\`);
});
`;
}

export function generatePythonScript(port: number = 5151): string {
  return `# Mindray BC-5480 LIS Listener em Python 3
# 
# Requisitos: Apenas Python 3 standard library
# Execução: python mindray_listener.py

import socket
import datetime
import json
import os

HOST = '0.0.0.0'
PORT = ${port}

VT = b'\\x0b'      # MLLP Start
FS_CR = b'\\x1c\\r'  # MLLP End

def format_hl7_date(dt):
    return dt.strftime('%Y%m%d%H%M%S')

def process_hl7_message(hl7_text, client_socket, addr):
    print(f"\\n[{datetime.datetime.now()}] Nova Mensagem Recebida de {addr}:")
    print(hl7_text)

    lines = hl7_text.splitlines()
    msg_id = '12345'
    sample_id = 'DESCONHECIDO'
    params = {}

    for line in lines:
        fields = line.split('|')
        seg = fields[0]
        if seg == 'MSH':
            if len(fields) > 9 and fields[9]:
                msg_id = fields[9]
            if len(fields) > 13 and fields[13].strip():
                sample_id = fields[13].strip().split('^')[0]
        elif seg in ['ORC', 'OBR']:
            if len(fields) > 2 and fields[2].strip():
                sample_id = fields[2].strip().split('^')[0]
            elif len(fields) > 3 and fields[3].strip():
                sample_id = fields[3].strip().split('^')[0]
        elif seg == 'OBX':
            if len(fields) > 5:
                code = fields[3].split('^')[1] if '^' in fields[3] else fields[3]
                val = fields[5]
                unit = fields[6] if len(fields) > 6 else ''
                params[code] = {'val': val, 'unit': unit}

    print(f"\\n>>> AMOSTRA RECEBIDA: ID = {sample_id}")
    for k in ['WBC', 'RBC', 'HGB', 'HCT', 'PLT']:
        if k in params:
            print(f"   {k:8s}: {params[k]['val']} {params[k]['unit']}")

    # Resposta HL7 ACK
    now_hl7 = format_hl7_date(datetime.datetime.now())
    ack_hl7 = (
        f"MSH|^~\\\\&|LIS|LAB|BC-5480|MINDRAY|{now_hl7}||ACK^R01|{msg_id}|P|2.3.1|\\r"
        f"MSA|AA|{msg_id}|Mensagem Recebida com Sucesso|\\r"
    )
    ack_mllp = VT + ack_hl7.encode('utf-8') + FS_CR
    client_socket.sendall(ack_mllp)
    print(f"[ACK ENVIADO] MSA|AA enviado para {msg_id}")

def start_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((HOST, PORT))
    server.listen(5)
    print(f"==================================================")
    print(f" Servidor Python LIS para Mindray BC-5480")
    print(f" Escutando em {HOST}:{PORT}")
    print(f"==================================================")

    while True:
        client, addr = server.accept()
        print(f"\\nEquipamento conectado: {addr}")
        buffer = b''
        while True:
            data = client.recv(4096)
            if not data:
                break
            buffer += data
            while VT in buffer and FS_CR in buffer:
                vt_idx = buffer.find(VT)
                fscr_idx = buffer.find(FS_CR)
                if fscr_idx > vt_idx:
                    hl7_bytes = buffer[vt_idx+1:fscr_idx]
                    hl7_str = hl7_bytes.decode('utf-8', errors='ignore')
                    process_hl7_message(hl7_str, client, addr)
                    buffer = buffer[fscr_idx+2:]
                else:
                    break
        client.close()

if __name__ == '__main__':
    start_server()
`;
}
