const express = require('express');
const router = express.Router();
const {
  getAllMachineAliases,
  getMachineData,
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
} = require('../controllers/dadosController');

// 📄 Rota para retornar todos os aliases de máquinas
router.get('/dados/maquinas', getAllMachineAliases);

// 🔄 Rota para retornar todos os registros do relatório histórico
router.get('/relatorio', getRelatorioCompleto);

// 🔍 Rota para retornar registros de uma máquina específica (relatório)
router.get('/relatorio/:maquina', getRelatorioPorMaquina);

// 📅 Rota para relatório mensal
router.get('/relatorio/mes/:mesAno', getRelatorioPorMes);

// 🔎 Rota para busca de log por data e tipo de ocorrência
router.post('/dados/log', getLogOcorrencia);

// 📁 Rota para retornar dados individuais de uma máquina monitorada
router.get('/:machine_alias', getMachineData);




//ROTAS PARA USAR O MONGO

// 📥 POST: insere novo dado de monitoramento agrupado por mês/máquina
router.post('/monitoramento/mongo/registro', registrarMonitoramentoMongo);

// 📄 Rota para retornar todos os aliases de máquinas
router.get('/monitoramento/mongo/aliases', getAllMachineAliasesMongo);

// 🔄 Rota para retornar todos os registros do relatório histórico
router.get('/monitoramento/mongo/relatorios', getRelatorioCompletoMongo);

// 📡 GET: Buscar dados da máquina via Mongo (mês atual)
router.get('/monitoramento/mongo/:machine_alias', getMachineDataMongo);

// 📅 Rota para relatório mensal
router.get('/monitoramento/mongo/relatorios/:mesAno', getRelatorioPorMesMongo);

// 🔎 Rota para busca de log por data e tipo de ocorrência
router.post('/monitoramento/mongo/log-ocorrencia', getLogOcorrenciaMongo);








module.exports = router;