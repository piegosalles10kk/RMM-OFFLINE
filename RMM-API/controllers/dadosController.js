const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const DadosMensal = require('../schema/dadosMensalSchema');
const mongoose = require('mongoose');

const configPath = path.join(__dirname, '..', '..', 'config.json');

let config = {};
try {
  if (fs.existsSync(configPath)) { // OK, usando fs
    config = JSON.parse(fs.readFileSync(configPath, 'utf8')); // OK, usando fs
    console.log("✅ Configuração carregada com sucesso.");
  } else {
    console.error("❌ Erro: arquivo config.json não encontrado na raiz do projeto.");
  }
} catch (error) {
  console.error("❌ Erro ao ler ou parsear config.json:", error);
}
const basePath  = path.resolve(path.dirname(configPath), config.SHARED_NETWORK_PATH);

if (!fs.existsSync(basePath )) { // OK, usando fs
  console.log(`Criando diretório de dados: ${basePath }`);
  fs.mkdirSync(basePath , { recursive: true }); // OK, usando fs
}

const relatoriosPath = path.join(basePath , 'relatórios');

// ---
// FUNÇÕES DE DADOS DAS MÁQUINAS (COM MONGODB E ARQUIVOS)
// ---
const getMachineData = async (req, res) => {
  try {
    const machine_alias = req.params.machine_alias;

    const now = new Date();
    const folderName = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const filePath = path.join(basePath, folderName, `${machine_alias}.json`);

    try {
      await fsp.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    const data = await fsp.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(data);

    const machineData = jsonData.filter(machine => machine.machine_alias === machine_alias);

    if (!machineData || machineData.length === 0) {
      return res.status(404).json({ error: 'Máquina não encontrada' });
    }

    const parseDate = (timestamp) => {
      const [datePart, timePart] = timestamp.split(" ");
      const [day, month, year] = datePart.split("/");
      return new Date(`${year}-${month}-${day}T${timePart}`);
    };

    let sortedData = machineData.sort((a, b) => parseDate(a.timestamp_coleta) - parseDate(b.timestamp_coleta));
    sortedData = sortedData.reverse();

    res.status(200).json(sortedData);
  } catch (error) {
    console.error("Erro ao buscar dados da máquina:", error);
    res.status(500).json({ error: 'Erro ao buscar informações da máquina' });
  }
};

const getAllMachineAliases = async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const folderName = `${year}-${month}`;
    const targetDirectoryPath = path.join(basePath, folderName);
    const excludeFileName = 'dados_gerais_mensal.json';

    console.log(`[${new Date().toISOString()}] Tentando ler diretório: ${targetDirectoryPath}`);

    let files;
    try {
      files = await fsp.readdir(targetDirectoryPath);
    } catch (dirError) {
      if (dirError.code === 'ENOENT') {
        console.warn(`[${new Date().toISOString()}] Diretório não encontrado: ${targetDirectoryPath}`);
        return res.status(404).json({ error: `Diretório '${folderName}' não encontrado.` });
      }
      throw new Error(`Erro ao ler o diretório: ${dirError.message}`);
    }

    const jsonFileDetails = [];
    for (const file of files) {
      const fullFilePath = path.join(targetDirectoryPath, file);
      let stats;
      try {
        stats = await fsp.stat(fullFilePath);
      } catch (statError) {
        console.warn(`[${new Date().toISOString()}] Não foi possível obter stats para ${fullFilePath}: ${statError.message}`);
        continue;
      }

      if (stats.isFile() && file.endsWith('.json') && file !== excludeFileName) {
        jsonFileDetails.push({
          name: path.parse(file).name,
          lastModified: stats.mtime.toISOString()
        });
      }
    }

    res.status(200).json({ machineAliases: jsonFileDetails });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao processar requisição:`, error);
    res.status(500).json({ error: 'Erro ao buscar os nomes e datas de arquivos JSON.', details: error.message });
  }
};

const getLogOcorrencia = async (req, res) => {
  try {
    const { machine_alias, dataOcorencia, tipoDeOcorrencia } = req.body;

    if (!machine_alias || !dataOcorencia || !tipoDeOcorrencia) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando na requisição.' });
    }

    // Usa a variável global `basePath`
    const [dia, mes, ano] = dataOcorencia.split('/');
    const folderName = `${ano}-${mes.padStart(2, '0')}`; // exemplo: "2025-07"
    const filePath = path.join(basePath, folderName, `${machine_alias}.json`);

    try {
      await fsp.access(filePath);
    } catch (e) {
      return res.status(404).json({ error: 'Arquivo da máquina não encontrado.' });
    }

    const rawData = await fsp.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(rawData);

    // ✅ Caso especial: se tipoDeOcorrencia for exatamente "timestamp_coleta"
    if (tipoDeOcorrencia === 'timestamp_coleta: ') {
      const registrosDoDia = jsonData.filter(entry =>
        entry.timestamp_coleta?.startsWith(dataOcorencia)
      );

      if (registrosDoDia.length === 0) {
        return res.status(404).json({ error: 'Nenhum registro encontrado para o dia informado.' });
      }

      const ultimoRegistro = registrosDoDia[registrosDoDia.length - 1];
      return res.status(200).json(ultimoRegistro);
    }

    // 🔍 Se for outra ocorrência: extrair chave e valor
    const [chave, valorBruto] = tipoDeOcorrencia.split(':').map(x => x.trim());
    const valorAlvo = isNaN(valorBruto) ? valorBruto : parseFloat(valorBruto);

    const encontrarOcorrencia = (entry) => {
      const stack = [entry.monitoramento];
      while (stack.length) {
        const atual = stack.pop();
        for (const key in atual) {
          const val = atual[key];
          if (typeof val === 'object' && val !== null) {
            stack.push(val);
          } else if (key === chave && val === valorAlvo) {
            return true;
          }
        }
      }
      return false;
    };

    const resultado = jsonData.find(entry =>
      entry.timestamp_coleta?.startsWith(dataOcorencia) &&
      entry.monitoramento &&
      encontrarOcorrencia(entry)
    );

    if (!resultado) {
      return res.status(404).json({ error: 'Ocorrência não encontrada com os critérios fornecidos.' });
    }

    res.status(200).json(resultado);

  } catch (erro) {
    console.error('Erro ao buscar log da máquina:', erro);
    res.status(500).json({ error: 'Erro ao processar a requisição.' });
  }
};

// ---
// FUNÇÕES DE RELATÓRIO
// ---
const getRelatorioCompleto = async (req, res) => {
  try {
    // Usa o novo caminho global para relatórios
    const historicoPath = path.join(relatoriosPath, 'historico-de-chamados.json');
    const data = await fsp.readFile(historicoPath, 'utf-8');
    const json = JSON.parse(data);
    res.status(200).json(json);
  } catch (error) {
    console.error("Erro ao carregar o relatório completo:", error.message);
    res.status(500).json({ error: 'Erro ao carregar o relatório.' });
  }
};

const getRelatorioPorMaquina = async (req, res) => {
  try {
    const maquina = req.params.maquina.toUpperCase();
    // Usa o novo caminho global para relatórios
    const historicoPath = path.join(relatoriosPath, 'historico-de-chamados.json');
    const data = await fsp.readFile(historicoPath, 'utf-8');
    const json = JSON.parse(data);
    const filtrado = json.filter(item => item.maquina.toUpperCase() === maquina);

    if (filtrado.length === 0) {
      return res.status(404).json({ error: `Nenhum relatório encontrado para a máquina ${maquina}` });
    }

    res.status(200).json(filtrado);
  } catch (error) {
    console.error("Erro ao buscar relatório da máquina:", error.message);
    res.status(500).json({ error: 'Erro ao buscar relatório da máquina.' });
  }
};


const getRelatorioPorMes = async (req, res) => {
  try {
    // Usa o novo caminho global para relatórios
    const historicoPath = path.join(relatoriosPath, 'historico-de-chamados.json');
    const { mesAno } = req.params; // Pode vir "06-2025" ou "28-06-2025"

    const data = await fsp.readFile(historicoPath, 'utf-8');
    const json = JSON.parse(data);

    let registrosDoMes = [];

    // 🎯 Se for "DD-MM-YYYY"
    if (/^\d{2}-\d{2}-\d{4}$/.test(mesAno)) {
      const [dia, mes, ano] = mesAno.split('-');

      registrosDoMes = json.filter(item => {
        const dataOcorrencia = new Date(item.horario);
        return (
          dataOcorrencia.getMonth() + 1 === parseInt(mes) &&
          dataOcorrencia.getFullYear() === parseInt(ano)
        );
      });

      // 📌 Agora filtra para retornar apenas os registros do dia informado
      const registrosDoDia = registrosDoMes.filter(item => {
        const dataOcorrencia = new Date(item.horario);
        return dataOcorrencia.getDate() === parseInt(dia);
      });

      if (registrosDoDia.length === 0) {
        return res.status(404).json({ message: `Nenhum chamado encontrado em ${mesAno}` });
      }

      return res.status(200).json(registrosDoDia);
    }

    // 🎯 Se for "MM-YYYY"
    if (/^\d{2}-\d{4}$/.test(mesAno)) {
      const [mes, ano] = mesAno.split('-');

      registrosDoMes = json.filter(item => {
        const dataOcorrencia = new Date(item.horario);
        return (
          dataOcorrencia.getMonth() + 1 === parseInt(mes) &&
          dataOcorrencia.getFullYear() === parseInt(ano)
        );
      });

      if (registrosDoMes.length === 0) {
        return res.status(404).json({ message: `Nenhum chamado encontrado em ${mesAno}` });
      }

      return res.status(200).json(registrosDoMes);
    }

    return res.status(400).json({
      error: 'Formato inválido. Use "MM-YYYY" ou "DD-MM-YYYY".',
    });

  } catch (error) {
    console.error('Erro ao buscar relatório por mês:', error.message);
    res.status(500).json({ error: 'Erro ao buscar registros do período informado.' });
  }
};


//MONGOOSE

// 🔄 Novo método para inserção via Mongo agrupado por mês e máquina
const registrarMonitoramentoMongo = async (req, res) => {
  const dados = req.body;

  if (!dados || !dados.timestamp_coleta || !dados.machine_alias) {
    return res.status(400).json({ erro: 'timestamp_coleta e machine_alias são obrigatórios.' });
  }

  const mes_referencia = dados.timestamp_coleta.slice(6, 10) + '-' + dados.timestamp_coleta.slice(3, 5);
  const machine_alias = dados.machine_alias;

  try {
    let documentoMes = await DadosMensal.findOne({ mes_referencia });

    if (!documentoMes) {
      documentoMes = new DadosMensal({ mes_referencia, maquinas: {} });
    }

    if (!documentoMes.maquinas.has(machine_alias)) {
      documentoMes.maquinas.set(machine_alias, []);
    }

    documentoMes.maquinas.get(machine_alias).push(dados);

    await documentoMes.save();
    res.status(201).json({ sucesso: true, mensagem: 'Dados monitorados inseridos com sucesso.' });

  } catch (error) {
    console.error('Erro ao inserir dados no Mongo:', error);
    res.status(500).json({ erro: 'Erro ao salvar os dados monitorados.' });
  }
};


const getMachineDataMongo = async (req, res) => {
  try {
    const machine_alias = req.params.machine_alias;
    const agora = new Date();
    const mesReferencia = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;

    // Acessa a coleção DadosMensal diretamente
    const resultado = await mongoose.connection
      .collection('dadosmensals') // nome da collection (plural padrão do model)
      .findOne({ mes_referencia: mesReferencia });

    if (!resultado || !resultado.maquinas || !resultado.maquinas[machine_alias]) {
      return res.status(404).json({ error: 'Máquina não encontrada ou sem dados no mês atual.' });
    }

    const registros = resultado.maquinas[machine_alias];

    const parseDate = (timestamp) => {
      const [datePart, timePart] = timestamp.split(" ");
      const [day, month, year] = datePart.split("/");
      return new Date(`${year}-${month}-${day}T${timePart}`);
    };

    const ordenado = [...registros].sort((a, b) =>
      parseDate(b.timestamp_coleta) - parseDate(a.timestamp_coleta)
    );

    res.status(200).json(ordenado);
  } catch (error) {
    console.error("Erro ao buscar dados da máquina:", error);
    res.status(500).json({ error: 'Erro ao buscar informações da máquina' });
  }
};

const getAllMachineAliasesMongo = async (req, res) => {
  try {
    const agora = new Date();
    const mesReferencia = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;

    console.log(`[${new Date().toISOString()}] Buscando aliases na base Mongo para o mês: ${mesReferencia}`);

    const resultado = await mongoose.connection
      .collection('dadosmensals')
      .findOne({ mes_referencia: mesReferencia });

    if (!resultado || !resultado.maquinas) {
      console.warn(`[${new Date().toISOString()}] Nenhum documento encontrado para '${mesReferencia}'`);
      return res.status(404).json({ error: `Nenhum dado encontrado para '${mesReferencia}'` });
    }

    const jsonFileDetails = [];

    for (const [alias, registros] of Object.entries(resultado.maquinas)) {
      if (!Array.isArray(registros) || registros.length === 0) continue;

      const ultimoRegistro = registros.reduce((maisRecente, atual) => {
        const parseDate = (timestamp) => {
          const [datePart, timePart] = timestamp.split(" ");
          const [day, month, year] = datePart.split("/");
          return new Date(`${year}-${month}-${day}T${timePart}`);
        };
        return parseDate(atual.timestamp_coleta) > parseDate(maisRecente.timestamp_coleta)
          ? atual
          : maisRecente;
      });

      jsonFileDetails.push({
        name: alias,
        lastModified: ultimoRegistro.timestamp_coleta
      });
    }

    res.status(200).json({ machineAliases: jsonFileDetails });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao processar requisição:`, error);
    res.status(500).json({
      error: 'Erro ao buscar os aliases da base Mongo.',
      details: error.message
    });
  }
};

const getRelatorioCompletoMongo = async (req, res) => {
  try {
    const relatorios = await mongoose.connection
      .collection('relatorios') // nome da collection no MongoDB
      .find({})
      .toArray();

    res.status(200).json(relatorios);
  } catch (error) {
    console.error("Erro ao carregar o relatório completo:", error.message);
    res.status(500).json({ error: 'Erro ao carregar o relatório.', details: error.message });
  }
};

const getRelatorioPorMesMongo = async (req, res) => {
  try {
    const { mesAno } = req.params;

    let filtro;

    // 🕓 Formato completo com hora: DD-MM-YYYY HH:mm:ss
    if (/^\d{2}-\d{2}-\d{4}\s\d{2}:\d{2}:\d{2}$/.test(mesAno)) {
      const [dataParte, horaParte] = mesAno.split(' ');
      const [dia, mes, ano] = dataParte.split('-');

      const isoTimestamp = `${ano}-${mes}-${dia}T${horaParte}`;

      filtro = { horario: isoTimestamp };
    }

    // 📅 Formato "DD-MM-YYYY" (apenas dia)
    else if (/^\d{2}-\d{2}-\d{4}$/.test(mesAno)) {
      const [dia, mes, ano] = mesAno.split('-');
      filtro = {
        $expr: {
          $and: [
            { $eq: [{ $dayOfMonth: { $toDate: "$horario" } }, parseInt(dia)] },
            { $eq: [{ $month: { $toDate: "$horario" } }, parseInt(mes)] },
            { $eq: [{ $year: { $toDate: "$horario" } }, parseInt(ano)] }
          ]
        }
      };
    }

    // 📆 Formato "MM-YYYY" (mês inteiro)
    else if (/^\d{2}-\d{4}$/.test(mesAno)) {
      const [mes, ano] = mesAno.split('-');
      filtro = {
        $expr: {
          $and: [
            { $eq: [{ $month: { $toDate: "$horario" } }, parseInt(mes)] },
            { $eq: [{ $year: { $toDate: "$horario" } }, parseInt(ano)] }
          ]
        }
      };
    } else {
      return res.status(400).json({
        error: 'Formato inválido. Use "MM-YYYY", "DD-MM-YYYY" ou "DD-MM-YYYY HH:mm:ss".'
      });
    }

    const registros = await mongoose.connection
      .collection('relatorios')
      .find(filtro)
      .toArray();

    if (!registros || registros.length === 0) {
      return res.status(404).json({ message: `Nenhum chamado encontrado em ${mesAno}` });
    }

    res.status(200).json(registros);
  } catch (error) {
    console.error('Erro ao buscar relatório por período:', error.message);
    res.status(500).json({ error: 'Erro ao buscar registros do período informado.' });
  }
};

const getLogOcorrenciaMongo = async (req, res) => {
  try {
    const { machine_alias, dataOcorencia, tipoDeOcorrencia } = req.body;

    if (!machine_alias || !dataOcorencia || !tipoDeOcorrencia) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando na requisição.' });
    }

    // 🗓️ Extrai mês/ano para buscar documento correto
    const [dia, mes, ano] = dataOcorencia.split('/');
    const mesReferencia = `${ano}-${mes.padStart(2, '0')}`;

    const docMes = await mongoose.connection
      .collection('dadosmensals')
      .findOne({ mes_referencia: mesReferencia });

    if (!docMes || !docMes.maquinas || !docMes.maquinas[machine_alias]) {
      return res.status(404).json({ error: 'Dados da máquina não encontrados no Mongo para esse mês.' });
    }

    const registros = docMes.maquinas[machine_alias];

    // ✅ Caso especial: procurar apenas por timestamp
    if (tipoDeOcorrencia === 'timestamp_coleta: ') {
      const registrosDoDia = registros.filter(entry =>
        entry.timestamp_coleta?.startsWith(dataOcorencia)
      );

      if (registrosDoDia.length === 0) {
        return res.status(404).json({ error: 'Nenhum registro encontrado para o dia informado.' });
      }

      const ultimoRegistro = registrosDoDia[registrosDoDia.length - 1];
      return res.status(200).json(ultimoRegistro);
    }

    // 🔍 Busca por ocorrência específica: chave e valor
    const [chave, valorBruto] = tipoDeOcorrencia.split(':').map(x => x.trim());
    const valorAlvo = isNaN(valorBruto) ? valorBruto : parseFloat(valorBruto);

    const encontrarOcorrencia = (entry) => {
      const stack = [entry.monitoramento];
      while (stack.length) {
        const atual = stack.pop();
        for (const key in atual) {
          const val = atual[key];
          if (typeof val === 'object' && val !== null) {
            stack.push(val);
          } else if (key === chave && val === valorAlvo) {
            return true;
          }
        }
      }
      return false;
    };

    const resultado = registros.find(entry =>
      entry.timestamp_coleta?.startsWith(dataOcorencia) &&
      entry.monitoramento &&
      encontrarOcorrencia(entry)
    );

    if (!resultado) {
      return res.status(404).json({ error: 'Ocorrência não encontrada com os critérios fornecidos.' });
    }

    res.status(200).json(resultado);

  } catch (erro) {
    console.error('Erro ao buscar log da máquina:', erro);
    res.status(500).json({ error: 'Erro ao processar a requisição.' });
  }
};


module.exports = {
  getMachineData,
  getAllMachineAliases,
  getRelatorioCompleto,
  getRelatorioPorMaquina,
  getRelatorioPorMes,
  getLogOcorrencia,
  registrarMonitoramentoMongo,
  getMachineDataMongo,
  getAllMachineAliasesMongo,
  getRelatorioCompletoMongo,
  getRelatorioPorMesMongo,
  getLogOcorrenciaMongo
};