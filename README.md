# Monitor de Status de Sites e Sistemas Web

Este é um script js que verifica periodicamente o status de uma lista de sites e envia uma mensagem para um grupo do Telegram e também um e-mail para sistemas@gruponobre.net caso algum site esteja inacessível.

Este script usa as bibliotecas Axios e Nodemailer para fazer requisições HTTP/HTTPS aos sites e diante disso, enviar e-mails e também mensagens para o Telegram.

Este script também usa as bibliotecas CORS e Express, responsáveis por habilitar o recebimento das requisições do front-end (Hostgator) ao servidor e também por rodar o serviço, respectivamente.

---

**Funcionalidades**

Este script oferece as seguintes funcionalidades:

- Verifica o status de uma lista de sites definida no arquivo.
- Envia uma mensagem para um grupo do Telegram caso algum site esteja inacessível.
- Envia uma mensagem para o e-mail de sistemas caso algum site esteja inacessível.
- Pode ser configurado para verificar os sites em intervalos regulares.

---

**Requisitos**

- Node.js instalado na máquina. (Caso não saiba como instalar, pesquisa no youtube)

---

**Configuração**

1. Instale as dependências do projeto executando o seguinte comando no terminal, dentro da pasta backend: `npm install`

2. Configure os sites que deseja monitorar editando o arquivo index.js e adicionando/removendo URLs conforme necessário no array.

3. Execute o script usando o seguinte comando: `npm start` ou `npm run dev`

---

**Verificação Manual e Automática**

- A verificação automática está habilitada por padrão para rodar após executar `npm start` ou `npm run dev`, e também para rodar automaticamente a cada 5 minutos após iniciado.
---

**ATENÇÃO**

- Tome cuidado com os dados dentro do script, pois existe o token de bot do telegram e chat_id do telegram também, da mesma forma que existe o e-mail e a senha da TI. Ou seja, SE ALTERAR ALGUMA COISA, NÃO VAI FUNCIONAR.
