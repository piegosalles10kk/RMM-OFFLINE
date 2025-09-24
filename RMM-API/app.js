const express = require('express');
const cors = require('cors');
const connectMongo = require('./services/mongoService');
const dadosRoutes = require('./routes/dadosRoutes');

const app = express();
const PORT = process.env.PORT || 2500;

// 🔌 Conexão com MongoDB
//connectMongo();

// 🛡️ Middlewares essenciais
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// 🔍 Middleware de debug
app.use((req, res, next) => {
  console.log(`➡️  [${req.method}] ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// 🌐 Rotas
app.use('/', dadosRoutes);

// 🚀 Inicialização
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});