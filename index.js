import config from './config/index.js';
import configureExpress from './config/express.js';

const startServer = async () => {
  try {
    await config.connectMongoDB();
    const app = configureExpress();

    const { server, httpServer } = await config.setupGraphQL(app);

    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, () => {
      config.logger.info(
        `🚀 Serwer działa na http://localhost:${PORT}${server.graphqlPath}`
      );
      config.logger.info(
        `🚀 Subskrypcje działają na ws://localhost:${PORT}${server.subscriptionsPath}`
      );
    });
  } catch (err) {
    config.logger.error('Błąd podczas uruchamiania serwera', err);
    process.exit(1);
  }
};

startServer();
