const mongoose = require('mongoose');
const { Schema } = mongoose;
const DadosMonitor = require('./dadosMonitorSchema'); // Certifique-se que esse também existe

const dadosMensalSchema = new Schema({
  mes_referencia: { type: String, required: true }, // Ex: "2025-07"
  maquinas: {
    type: Map,
    of: [DadosMonitor.schema],
    default: {}
  }
}, { strict: false });

module.exports = mongoose.model('DadosMensal', dadosMensalSchema);