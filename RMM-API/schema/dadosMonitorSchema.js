const mongoose = require('mongoose');
const { Schema } = mongoose;

const dadosMonitorSchema = new Schema({
  hostname: String,
  machine_alias: String,
  timestamp_coleta: String,
  monitoramento: {
    cpu: {
      percentual_uso: Number,
      nucleos_fisicos: Number,
      nucleos_logicos: Number,
      frequencia_mhz: Number,
      nome: String,
      temperatura_package_celsius: Number,
      temperaturas_cores_celsius: {
        cpu_core_1: Number,
        cpu_core_2: Number,
        cpu_core_3: Number,
        cpu_core_4: Number
      },
      uso_total_percent: Number,
      energia_watts: {
        cpu_package: Number,
        cpu_cores: Number,
        cpu_dram: Number
      },
      clocks_mhz: {
        cpu_core_1: Number,
        cpu_core_2: Number,
        cpu_core_3: Number,
        cpu_core_4: Number,
        bus_speed: Number
      }
    },
    memoria_ram: {
      total_gb: Number,
      usado_gb: Number,
      percentual_uso: Number
    },
    disco_principal: {
      particao: String,
      nome: String,
      total_gb: Number,
      usado_gb: Number,
      livre_gb: Number,
      percentual_uso: Number,
      uso_espaco_percent: Number,
      temperatura_celsius: Number,
      vida_util_restante_percent: Number,
      dados_gravados_tb: Number,
      tipo: String
    },
    discos_adicionais: [{
      particao: String,
      nome: String,
      total_gb: Number,
      usado_gb: Number,
      livre_gb: Number,
      percentual_uso: Number,
      uso_espaco_percent: Number,
      temperatura_celsius: Number,
      vida_util_restante_percent: Number,
      dados_gravados_tb: Number,
      tipo: String
    }],
    gpu: {
      nome: String,
      tipo: String,
      temperatura_core_celsius: Number,
      uso_percentual: Number,
      memoria_gpu: {
        usada_mb: Number,
        livre_mb: Number,
        total_mb: Number
      },
      clocks_mhz: {
        gpu_core: Number,
        gpu_memory: Number,
        gpu_shader: Number
      }
    },
    rede: {
      ips: { type: Map, of: String },
      bytes_enviados_mb: Number,
      bytes_recebidos_mb: Number,
      velocidade_atual_mbps: Number
    },
    placa_mae: {
      nome: String
    },
    uptime_horas: Number,
    top_processos: {
      top_cpu_processes: [{
        pid: Number,
        name: String,
        cpu_percent: Number
      }],
      top_ram_processes: [{
        pid: Number,
        name: String,
        memory_percent: Number
      }],
      top_gpu_processes: [{
        pid: Number,
        name: String,
        gpu_id: Number,
        gpu_name: String,
        gpu_memory_mb: Number
      }]
    }
  }
}, { strict: false });

module.exports = mongoose.model('DadosMonitor', dadosMonitorSchema);