import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AnnotationType } from "@prisma/client";
import {
  addAnnotation,
  createChapter,
  createStudy,
  deleteAnnotation,
  deleteChapter,
  deleteStudy,
  getStudyById,
  listStudies,
} from "../services/studies.js";

const createStudySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  gameId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const createChapterSchema = z.object({
  name: z.string().min(1),
  fen: z.string().min(1),
  pgn: z.string().optional(),
});

const annotationSchema = z.object({
  type: z.nativeEnum(AnnotationType),
  square: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  text: z.string().optional(),
  color: z.string().optional(),
});

export async function studyRoutes(app: FastifyInstance) {
  app.get("/studies", async () => listStudies());

  app.post("/studies", async (req, reply) => {
    const data = createStudySchema.parse(req.body);
    const study = await createStudy(data);
    return reply.code(201).send(study);
  });

  app.get("/studies/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const study = await getStudyById(id);
    if (!study) return reply.code(404).send({ error: "Estudo não encontrado" });
    return study;
  });

  app.delete("/studies/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await deleteStudy(id);
    return reply.code(204).send();
  });

  app.post("/studies/:id/chapters", async (req, reply) => {
    const { id } = req.params as { id: string };
    const data = createChapterSchema.parse(req.body);
    const chapter = await createChapter(id, data);
    return reply.code(201).send(chapter);
  });

  app.delete("/chapters/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await deleteChapter(id);
    return reply.code(204).send();
  });

  app.post("/chapters/:id/annotations", async (req, reply) => {
    const { id } = req.params as { id: string };
    const data = annotationSchema.parse(req.body);
    const annotation = await addAnnotation(id, data);
    return reply.code(201).send(annotation);
  });

  app.delete("/annotations/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await deleteAnnotation(id);
    return reply.code(204).send();
  });
}