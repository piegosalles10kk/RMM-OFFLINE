const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 1. Caminho para o arquivo config.json na raiz do projeto
const configPath = path.join(__dirname, '..', 'config.json');

// 2. Lê e parseia o arquivo de configuração
let config = {};
try {
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log("✅ Configuração carregada com sucesso.");
  } else {
    console.error("❌ Erro: arquivo config.json não encontrado na raiz do projeto.");
  }
} catch (error) {
  console.error("❌ Erro ao ler ou parsear config.json:", error);
}

// 3. Usa o caminho da configuração para definir o caminho base dos dados
const baseDataPath = path.resolve(path.dirname(configPath), config.SHARED_NETWORK_PATH);

// 4. Garante que a pasta BancoDeDados existe antes de tentar acessá-la
if (!fs.existsSync(baseDataPath)) {
  console.log(`Criando diretório de dados: ${baseDataPath}`);
  fs.mkdirSync(baseDataPath, { recursive: true });
}

// O resto do seu código permanece o mesmo, usando a variável baseDataPath
const ignorarMaquinasPath = path.join(baseDataPath, 'ignorar_maquinas.json');
const excecoesAnomalias = fs.existsSync(ignorarMaquinasPath)
  ? JSON.parse(fs.readFileSync(ignorarMaquinasPath, "utf8"))
  : {};

const BASE_URL = 'http://localhost:2500';
const TOTAL_CICLOS = 1;
const UMA_HORA = 60 * 60 * 1000;

let maquinasComOcorrencias = {};

const obterAliasesMaquinas = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/dados/maquinas`);
    console.log("✅ Obtidos machineAliases:", response.data.machineAliases);
    return response.data.machineAliases;
  } catch (error) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return obterAliasesMaquinas();
  }
};

const obterDadosMaquina = async (machine_alias) => {
  let tentativas = 0;
  const MAX_TENTATIVAS = 5;

  while (tentativas < MAX_TENTATIVAS) {
    try {
      const response = await axios.get(`${BASE_URL}/${machine_alias}`);
      if (!response.data || response.data.length === 0)
        throw new Error(`Dados vazios para ${machine_alias}`);

      console.log(`✅ Dados obtidos para máquina: ${machine_alias} (${response.data.length} registros disponíveis)`);
      console.log(`✅ Primeiro timestamp: ${response.data[0]?.timestamp_coleta}`);
      return response.data.length > 360 ? response.data.slice(0, 360) : response.data;
    } catch (error) {
      tentativas++;
      console.error(`Erro ao buscar dados para ${machine_alias} (Tentativa ${tentativas}/${MAX_TENTATIVAS}):`, error.message);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.warn(`⚠️ Pulando máquina ${machine_alias} após ${MAX_TENTATIVAS} tentativas.`);
  return [];
};

const calcularMediaExcedente = (machineData, machine_alias) => {
  const valoresCriticos = {
    cpuTemp: [],
    cpuUso: [],
    ramUso: [],
    discoPrincipalUso: [],
    gpuUso: [],
    gpuTemp: [],
    offlineDesde: null
  };

  const agora = new Date();
  const TEMPO_OFFLINE = machine_alias === "AGILENT" ? 3 * UMA_HORA : UMA_HORA;
  const dadoMaisRecente = machineData[0];

  if (dadoMaisRecente) {
    const [dia, mes, ano, hora, minuto, segundo] = dadoMaisRecente.timestamp_coleta.split(/[\s/:]/);
    const timestamp = new Date(`${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}`);

    if (agora - timestamp > TEMPO_OFFLINE) {
      valoresCriticos.offlineDesde = dadoMaisRecente.timestamp_coleta;
    }

    const cpu = dadoMaisRecente.monitoramento.cpu;
    const ram = dadoMaisRecente.monitoramento.memoria_ram;
    const disco = dadoMaisRecente.monitoramento.disco_principal;
    const gpu = dadoMaisRecente.monitoramento.gpu;

    if (cpu.temperatura_package_celsius > 70) valoresCriticos.cpuTemp.push(cpu.temperatura_package_celsius);
    if (cpu.percentual_uso > 80) valoresCriticos.cpuUso.push(cpu.percentual_uso);
    if (ram.percentual_uso > 80) valoresCriticos.ramUso.push(ram.percentual_uso);
    if (disco.percentual_uso > 90) valoresCriticos.discoPrincipalUso.push(disco.percentual_uso);
    if (gpu.uso_percentual > 80) valoresCriticos.gpuUso.push(gpu.uso_percentual);
    if (gpu.temperatura_core_celsius > 80) valoresCriticos.gpuTemp.push(gpu.temperatura_core_celsius);
  }

  const calcularMedia = (valores) =>
    valores.length > 0 ? (valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(2) : null;

  const logCritico = [];
  if (calcularMedia(valoresCriticos.cpuTemp)) logCritico.push({ "CPU Temp": `${calcularMedia(valoresCriticos.cpuTemp)}°C` });
  if (calcularMedia(valoresCriticos.cpuUso)) logCritico.push({ "CPU Uso": `${calcularMedia(valoresCriticos.cpuUso)}%` });
  if (calcularMedia(valoresCriticos.ramUso)) logCritico.push({ "RAM Uso": `${calcularMedia(valoresCriticos.ramUso)}%` });
  if (calcularMedia(valoresCriticos.discoPrincipalUso)) logCritico.push({ "Disco Principal Uso": `${calcularMedia(valoresCriticos.discoPrincipalUso)}%` });
  if (calcularMedia(valoresCriticos.gpuUso)) logCritico.push({ "GPU Uso": `${calcularMedia(valoresCriticos.gpuUso)}%` });
  if (calcularMedia(valoresCriticos.gpuTemp)) logCritico.push({ "GPU Temp": `${calcularMedia(valoresCriticos.gpuTemp)}°C` });
  if (valoresCriticos.offlineDesde) logCritico.push({ "Offline desde": valoresCriticos.offlineDesde });

  if (logCritico.length) {
    maquinasComOcorrencias[machine_alias] = logCritico.map(obj => Object.entries(obj)[0].join(": "));

    const pastaRelatorios = path.join(baseDataPath, "relatórios");
    const historicoPath = path.join(pastaRelatorios, "historico-de-chamados.json");

    if (!fs.existsSync(pastaRelatorios)) {
      fs.mkdirSync(pastaRelatorios, { recursive: true });
    }

    let historico = [];
    if (fs.existsSync(historicoPath)) {
      historico = JSON.parse(fs.readFileSync(historicoPath, "utf8"));
    }

    const ocorrenciaAgrupada = logCritico.reduce((acc, obj) => Object.assign(acc, obj), {});
    const timestampAtual = new Date().toISOString();

    const novoChamado = {
      maquina: machine_alias,
      ocorrencia: ocorrenciaAgrupada,
      horario: timestampAtual
    };

    historico.push(novoChamado);
    fs.writeFileSync(historicoPath, JSON.stringify(historico, null, 2));
    console.log(`📝 Histórico atualizado em ${historicoPath}`);
  }
};

const verificarDiferencas = (novoJson) => {
  const arquivoAnterior = path.join(baseDataPath, "ocorrencias.json");
  const arquivoNovo = path.join(baseDataPath, "novas_ocorrencias.json");

  let jsonAnterior = {};
  if (fs.existsSync(arquivoAnterior)) {
    jsonAnterior = JSON.parse(fs.readFileSync(arquivoAnterior, "utf8"));
  }

  const diferencas = {};

  for (const maquina in novoJson) {
    const ocorrenciasAtuais = novoJson[maquina];

    const novasOcorrencias = ocorrenciasAtuais.filter(ocorrencia => {
      const tipo = ocorrencia.split(":")[0].trim();

      const ignorarLista = excecoesAnomalias[maquina.toUpperCase()];
      const ignorada = Array.isArray(ignorarLista)
        ? ignorarLista.includes(tipo)
        : ignorarLista === tipo;

      const jaReportada = jsonAnterior[maquina]?.some(anterior => anterior.split(":")[0].trim() === tipo);

      return !ignorada && !jaReportada;
    });

    if (novasOcorrencias.length) {
      diferencas[maquina] = novasOcorrencias;
    }
  }

  if (Object.keys(diferencas).length > 0) {
    fs.writeFileSync(arquivoNovo, JSON.stringify(diferencas, null, 2));
    console.log("✅ Novas ocorrências salvas em novas_ocorrencias.json");
  } else {
    console.log("✅ Nenhuma nova ocorrência detectada.");
  }
};

const monitorMachines = async () => {
  const machineAliases = await obterAliasesMaquinas();
  const machineNames = machineAliases.map(machine => machine.name);

  for (let ciclo = 1; ciclo <= TOTAL_CICLOS; ciclo++) {
    console.log(`\n🔄 Ciclo ${ciclo}/${TOTAL_CICLOS} iniciado...`);
    for (const alias of machineNames) {
      const machineData = await obterDadosMaquina(alias);
      if (machineData.length === 0) continue;
      calcularMediaExcedente(machineData, alias);
    }
  }

  verificarDiferencas(maquinasComOcorrencias);
  
  fs.writeFileSync(path.join(baseDataPath, "ocorrencias.json"), JSON.stringify(maquinasComOcorrencias, null, 2));
  console.log("📄 JSON consolidado salvo em ocorrencias.json");
};

monitorMachines().then(() => {
  module.exports = { maquinasComOcorrencias };
});