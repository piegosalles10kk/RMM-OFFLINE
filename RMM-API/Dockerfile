# Use a imagem oficial do Node.js como base
FROM node:20-alpine

# Defina o diretório de trabalho no container
WORKDIR /usr/src/app

# Copie os arquivos de configuração do projeto (package.json e package-lock.json)
COPY package*.json ./

# Instale as dependências da aplicação
RUN npm install

# Copie o restante do código da aplicação para o diretório de trabalho
COPY . .

# Exponha a porta que o container vai usar
EXPOSE 2500

# Defina o comando para rodar a aplicação
CMD ["npm", "start"]