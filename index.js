// index.js
const { createServer } = require('http');
const config = require('./config'); // Importuje wszystko z config/index.js
const configureExpress = require('./config/express'); // Importuje konfigurację Express

const startServer = async () => {
  try {
    // Połączenie z MongoDB
    await config.connectMongoDB();

    // Tworzenie instancji aplikacji Express z skonfigurowanymi middleware'ami
    const app = configureExpress();

    // Tworzenie serwera HTTP
    const httpServer = createServer(app);

    // Konfiguracja Apollo Server i WebSocket
    const server = await config.setupGraphQL(app, httpServer);

    // Uruchomienie serwera
    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, () => {
      config.logger.info(`🚀 Serwer działa na http://localhost:${PORT}${server.graphqlPath}`);
      config.logger.info(`🚀 Subskrypcje działają na ws://localhost:${PORT}${server.graphqlPath}`);
    });
  } catch (err) {
    config.logger.error('Błąd podczas uruchamiania serwera', err);
    process.exit(1);
  }
};

startServer();
