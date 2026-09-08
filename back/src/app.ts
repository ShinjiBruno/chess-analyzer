import Fastify from "fastify";
import cors from "@fastify/cors";
import { gameRoutes } from "./routes/games.js";
import { studyRoutes } from "./routes/studies.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  app.get("/health", async () => ({ status: "ok", service: "chess-analyzer" }));

  await app.register(gameRoutes);
  await app.register(studyRoutes);

  app.setErrorHandler((error: unknown, _req, reply) => {
    const err = error as { statusCode?: number; message?: string };
    app.log.error(err);
    const status = typeof err.statusCode === "number" ? err.statusCode : 500;
    reply.status(status).send({ error: err.message ?? "Erro interno" });
  });

  return app;
}