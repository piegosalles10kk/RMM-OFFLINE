# Sistema RMM - Remote Monitoring and Management

## 📋 Índice
- [Visão Geral](#visão-geral)
- [Arquitetura do Sistema](#arquitetura-do-sistema)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Configuração](#instalação-e-configuração)
- [Configuração do MongoDB](#configuração-do-mongodb)
- [Uso da Aplicação](#uso-da-aplicação)
- [Funcionalidades](#funcionalidades)
- [Configurações Avançadas](#configurações-avançadas)
- [Troubleshooting](#troubleshooting)
- [API Endpoints](#api-endpoints)

## 🎯 Visão Geral

O Sistema RMM é uma solução completa de monitoramento remoto que permite:
- Monitoramento em tempo real de máquinas da rede
- Coleta de métricas de hardware (CPU, RAM, GPU, Disco)
- Detecção automática de anomalias
- Interface web responsiva para visualização
- Sistema de relatórios e alertas
- Histórico de ocorrências

## 🏗️ Arquitetura do Sistema

```
├── RMM-API/              # Backend Node.js
├── RMM-FRONTEND/         # Frontend React Native/Expo
├── RMM-MONITOR/          # Serviço de monitoramento
├── config.json           # Configuração global
└── docker-compose.yml    # Orquestração dos containers
```

### Componentes:
- **RMM-API**: API REST que gerencia dados e relatórios
- **RMM-FRONTEND**: Interface web para visualização
- **RMM-MONITOR**: Agente de monitoramento automático
- **MongoDB**: Banco de dados (opcional, usando arquivos JSON por padrão)

## 🔧 Pré-requisitos

### Software Necessário:
- **Node.js** >= 20.x
- **Docker** e **Docker Compose**
- **MongoDB** (opcional)
- **Git**

### Sistemas Operacionais Suportados:
- Windows 10/11
- Linux (Ubuntu, Debian, CentOS)
- macOS

## 🚀 Instalação e Configuração

### 1. Clone o Repositório
```bash
git clone https://github.com/piegosalles10kk/RMM-OFFLINE
cd RMM-OFFLINE
```

### 2. Configuração Inicial

#### Edite o arquivo `config.json`:
```json
{
  "SHARED_NETWORK_PATH": "./BancoDeDados",
  "COLLECTION_INTERVAL_SECONDS": 10,
  "MACHINE_ALIAS": "TI",
  "LOCAL": true,
  "API": false,
  "APIURL": ""
}
```

**Parâmetros:**
- `SHARED_NETWORK_PATH`: Caminho onde os dados serão armazenados
- `COLLECTION_INTERVAL_SECONDS`: Intervalo de coleta em segundos
- `MACHINE_ALIAS`: Alias da máquina atual
- `LOCAL`: true para armazenamento local, false para usar API
- `API`: true para utilizar o mongo
- `APIURL`: URL da api node http://localhost:2500

### 3. Usando Docker (Recomendado)

```bash
# Construir e executar os containers
docker-compose up --build

# Executar em segundo plano
docker-compose up -d
```

**Portas:**
- Frontend: http://localhost:8081
- API: http://localhost:2500

### 4. Instalação Manual

#### Backend (RMM-API):
```bash
cd RMM-API
npm install
npm start
```

#### Frontend (RMM-FRONTEND):
```bash
cd RMM-FRONTEND
npm install
npx expo start --web
```

#### Monitor:
```bash
cd RMM-MONITOR
npm install
```

## 🍃 Configuração do MongoDB

### 1. Instalação do MongoDB

#### Windows:
```bash
# Download do MongoDB Community Server
# https://www.mongodb.com/try/download/community
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Docker:
```bash
docker run -d --name mongodb -p 27017:27017 mongo:latest
```

### 2. Configuração da Conexão

O arquivo `RMM-API/services/mongoService.js` já está configurado para conectar em:
```javascript
mongodb://localhost:27017/MonitorAgente
```

### 3. Habilitando o MongoDB na API

Para usar as rotas que utilizam MongoDB, acesse os endpoints com prefixo `/monitoramento/mongo/`:

```javascript
// Exemplos de endpoints MongoDB
GET    /monitoramento/mongo/aliases
POST   /monitoramento/mongo/registro
GET    /monitoramento/mongo/:machine_alias
GET    /monitoramento/mongo/relatorios
GET    /monitoramento/mongo/relatorios/:mesAno
POST   /monitoramento/mongo/log-ocorrencia
```

### 4. Estrutura das Collections

#### `dadosmensals` - Dados de monitoramento agrupados por mês:
```json
{
  "_id": "ObjectId",
  "mes_referencia": "2025-01",
  "maquinas": {
    "MACHINE_NAME": [
      {
        "timestamp_coleta": "24/01/2025 14:30:00",
        "machine_alias": "MACHINE_NAME",
        "monitoramento": {
          "cpu": {...},
          "memoria_ram": {...},
          "gpu": {...}
        }
      }
    ]
  }
}
```

#### `relatorios` - Histórico de chamados/ocorrências:
```json
{
  "_id": "ObjectId",
  "maquina": "MACHINE_NAME",
  "ocorrencia": {
    "CPU Temp": "85°C",
    "RAM Uso": "90%"
  },
  "horario": "2025-01-24T14:30:00.000Z"
}
```

## 💻 Uso da Aplicação

### 1. Acesso ao Frontend
Acesse `http://localhost:8081` no navegador

### 2. Interface Principal

#### Dashboard (Home)
- Visualiza gráficos de ocorrências por mês, tipo e máquina
- Filtros por período
- Geração de relatórios mensais

#### Visualização de Máquinas (View)
- Cards em tempo real das máquinas monitoradas
- Métricas de CPU, RAM, GPU, Disco
- Gráficos históricos
- Status de conectividade (Online/Offline)

#### Log de Ocorrências
- Busca por ocorrências específicas
- Filtros por máquina, data e tipo
- Visualização detalhada do JSON de dados
- Histórico de processos

#### Sistema de Chamados
- Abertura de chamados via email
- Formulário integrado
- Categorização automática

### 3. Monitoramento Automático

Execute o monitoramento manual:
```bash
# Windows
verificarMaquinas.bat

# Linux/Mac
cd RMM-MONITOR
node monitoramento.js
```

## 🔥 Funcionalidades

### Monitoramento em Tempo Real
- **CPU**: Temperatura e uso percentual
- **RAM**: Uso e capacidade total
- **GPU**: Temperatura e uso
- **Disco**: Espaço utilizado
- **Uptime**: Tempo de atividade da máquina

### Detecção de Anomalias
- **CPU Temp** > 70°C
- **CPU Uso** > 80%
- **RAM Uso** > 80%
- **Disco Uso** > 90%
- **GPU Uso** > 80%
- **GPU Temp** > 80°C
- **Offline**: Máquina sem resposta

### Sistema de Relatórios
- Relatórios mensais em PDF
- Gráficos interativos
- Histórico de ocorrências
- Filtros avançados

### Alertas e Notificações
- Detecção automática de novas anomalias
- Sistema de exceções configurável
- Histórico persistente

## ⚙️ Configurações Avançadas

### 1. Configuração de Timeout Offline

Para ajustar o tempo que uma máquina é considerada offline, edite o arquivo `RMM-MONITOR/monitoramento.js`:

```javascript
// Linha ~90
const TEMPO_OFFLINE = machine_alias === "AGILENT" ? 3 * UMA_HORA : UMA_HORA;
```

**Opções de configuração:**
```javascript
// 30 minutos
const TEMPO_OFFLINE = 30 * 60 * 1000;

// 2 horas
const TEMPO_OFFLINE = 2 * 60 * 60 * 1000;

// Por máquina específica
const temposPorMaquina = {
  "SERVIDOR": 2 * UMA_HORA,
  "DESKTOP01": 30 * 60 * 1000,
  "AGILENT": 3 * UMA_HORA
};
const TEMPO_OFFLINE = temposPorMaquina[machine_alias] || UMA_HORA;
```

### 2. Configuração de Exceções

Crie o arquivo `BancoDeDados/ignorar_maquinas.json`:
```json
{
  "MACHINE_NAME": ["CPU Temp", "GPU Uso"],
  "SERVIDOR": "RAM Uso",
  "DESKTOP01": ["Offline desde"]
}
```

### 3. Configuração de Limites de Anomalia

Edite `RMM-MONITOR/monitoramento.js` nas linhas ~60-70:
```javascript
if (cpu.temperatura_package_celsius > 75) // Era 70
if (cpu.percentual_uso > 85) // Era 80
if (ram.percentual_uso > 85) // Era 80
if (disco.percentual_uso > 95) // Era 90
if (gpu.uso_percentual > 85) // Era 80
if (gpu.temperatura_core_celsius > 85) // Era 80
```

### 4. Configuração do Frontend

#### Mudança de URL da API
Edite `RMM-FRONTEND/servicos/api.ts`:
```typescript
const link = 'http://SEU_SERVIDOR:2500'
```

#### Configuração do Sistema de Chamados
Edite `RMM-FRONTEND/tabs/Chamados.tsx`:
```javascript
const api = "http://SEU_SERVIDOR:1000";
//const data = { ...formData, to: "diegosalles@live.com" };
const data = { ...formData, to: "seuemail@empresa.com" };
```

## 🔍 API Endpoints

### Endpoints de Arquivo (Padrão)
```
GET    /dados/maquinas              # Lista todas as máquinas
GET    /:machine_alias              # Dados de uma máquina
GET    /relatorio                   # Relatório completo
GET    /relatorio/:maquina          # Relatório por máquina
GET    /relatorio/mes/:mesAno       # Relatório por período
POST   /dados/log                   # Busca log específico
```

### Endpoints MongoDB
```
POST   /monitoramento/mongo/registro           # Registra dados
GET    /monitoramento/mongo/aliases            # Lista máquinas
GET    /monitoramento/mongo/:machine_alias     # Dados por máquina
GET    /monitoramento/mongo/relatorios         # Todos os relatórios
GET    /monitoramento/mongo/relatorios/:mesAno # Relatório por período
POST   /monitoramento/mongo/log-ocorrencia     # Busca log específico
```

### Exemplos de Uso da API

#### Buscar dados de uma máquina:
```bash
curl http://localhost:2500/MACHINE_NAME
```

#### Buscar log específico:
```bash
curl -X POST http://localhost:2500/dados/log \
  -H "Content-Type: application/json" \
  -d '{
    "machine_alias": "DESKTOP01",
    "dataOcorencia": "24/01/2025",
    "tipoDeOcorrencia": "temperatura_package_celsius: 75"
  }'
```

#### Registrar dados no MongoDB:
```bash
curl -X POST http://localhost:2500/monitoramento/mongo/registro \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp_coleta": "24/01/2025 14:30:00",
    "machine_alias": "DESKTOP01",
    "monitoramento": {
      "cpu": {
        "temperatura_package_celsius": 65,
        "percentual_uso": 45
      }
    }
  }'
```

## 🛠️ Troubleshooting

### Problemas Comuns

#### 1. Frontend não conecta com API
```bash
# Verificar se a API está rodando
curl http://localhost:2500/dados/maquinas

# Verificar logs do container
docker logs rmm-api
```

#### 2. MongoDB não conecta
```bash
# Verificar se MongoDB está rodando
sudo systemctl status mongod

# Testar conexão
mongo --host localhost --port 27017
```

#### 3. Máquinas não aparecem
- Verificar se os agentes estão enviando dados
- Conferir o arquivo `config.json`
- Verificar permissões da pasta `BancoDeDados`

#### 4. Dados não atualizando
- Executar o monitoramento manualmente: `node monitoramento.js`
- Verificar logs no console
- Conferir conectividade de rede

### Logs e Debug

#### Habilitar logs detalhados:
```bash
# API
DEBUG=* npm start

# Monitor
node monitoramento.js > monitor.log 2>&1
```

#### Verificar estrutura de dados:
```bash
# Listar arquivos de dados
ls -la BancoDeDados/

# Verificar formato JSON
cat BancoDeDados/2025-01/MACHINE_NAME.json | jq .
```

## 📁 Estrutura de Arquivos de Dados

### Armazenamento por Arquivo (Padrão)
```
BancoDeDados/
├── 2025-01/
│   ├── MACHINE1.json
│   ├── MACHINE2.json
│   └── dados_gerais_mensal.json
├── relatórios/
│   └── historico-de-chamados.json
├── ocorrencias.json
├── novas_ocorrencias.json
└── ignorar_maquinas.json
```

### Exemplo de arquivo de máquina:
```json
[
  {
    "timestamp_coleta": "24/01/2025 14:30:00",
    "machine_alias": "DESKTOP01",
    "hostname": "DESKTOP01-PC",
    "monitoramento": {
      "cpu": {
        "nome": "Intel Core i7-9700K",
        "temperatura_package_celsius": 65,
        "percentual_uso": 45
      },
      "memoria_ram": {
        "total_gb": 16,
        "usado_gb": 8.5,
        "percentual_uso": 53
      },
      "gpu": {
        "nome": "NVIDIA GTX 1660",
        "temperatura_core_celsius": 55,
        "uso_percentual": 25
      },
      "disco_principal": {
        "total_gb": 500,
        "usado_gb": 250,
        "percentual_uso": 50
      },
      "uptime_horas": 48,
      "top_processos": {
        "top_cpu_processes": [...],
        "top_ram_processes": [...]
      }
    }
  }
]
```

## 🔄 Automação e Agendamento

### Windows - Task Scheduler
```batch
# Criar tarefa que executa a cada 5 minutos
schtasks /create /tn "RMM Monitor" /tr "C:\path\to\verificarMaquinas.bat" /sc minute /mo 5
```

### Linux - Cron
```bash
# Adicionar ao crontab
crontab -e

# Executar a cada 5 minutos
*/5 * * * * cd /path/to/RMM-MONITOR && node monitoramento.js
```

### Systemd Service (Linux)
```ini
# /etc/systemd/system/rmm-monitor.service
[Unit]
Description=RMM Monitor Service
After=network.target

[Service]
Type=simple
User=rmm
WorkingDirectory=/path/to/RMM-MONITOR
ExecStart=/usr/bin/node monitoramento.js
Restart=always
RestartSec=300

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable rmm-monitor.service
sudo systemctl start rmm-monitor.service
```

## 📊 Monitoramento de Performance

### Métricas do Sistema
- Monitore o uso de CPU/RAM da aplicação
- Verifique o crescimento dos arquivos de dados
- Acompanhe os logs de erro

### Otimizações Recomendadas
- Limpar dados antigos periodicamente
- Usar MongoDB para grandes volumes
- Configurar rotação de logs
- Implementar backup automático

## 🔐 Segurança

### Recomendações
- Execute a aplicação com usuário não-root
- Configure firewall para as portas utilizadas
- Implemente autenticação se necessário
- Monitore acessos não autorizados

### Backup
```bash
# Backup dos dados
tar -czf backup-rmm-$(date +%Y%m%d).tar.gz BancoDeDados/

# Backup do MongoDB
mongodump --db MonitorAgente --out backup-mongo-$(date +%Y%m%d)
```

---

**Versão**: 1.0  
**Última Atualização**: Setembro  2025  
