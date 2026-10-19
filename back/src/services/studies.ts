import { prisma } from "../lib/prisma.js";

export async function listStudies() {
  return prisma.study.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { chapters: true } } },
  });
}

export async function createStudy(data: { name: string; description?: string; gameId?: string; tags?: string[] }) {
  return prisma.study.create({
    data: {
      name: data.name,
      description: data.description,
      gameId: data.gameId,
      tags: JSON.stringify(data.tags ?? []),
    },
  });
}

export async function getStudyById(id: string) {
  return prisma.study.findUnique({
    where: { id },
    include: {
      game: true,
      chapters: { include: { annotations: true } },
    },
  });
}

export async function renameStudy(id: string, newName:string){
  return prisma.study.update({
    where: {id},
    data: {name: newName}
  })
}

export async function deleteStudy(id: string) {
  return prisma.study.delete({ where: { id } });
}

export async function createChapter(studyId: string, data: { name: string; fen: string; pgn?: string }) {
  return prisma.chapter.create({
    data: { studyId, ...data },
  });
}

export async function deleteChapter(id: string) {
  return prisma.chapter.delete({ where: { id } });
}

export async function addAnnotation(
  chapterId: string,
  data: {
    type: "ARROW" | "CIRCLE" | "HIGHLIGHT" | "TEXT";
    ply?: number;
    square?: string;
    from?: string;
    to?: string;
    text?: string;
    color?: string;
  },
) {
  return prisma.annotation.create({ data: { chapterId, ply: data.ply ?? 0, ...data } });
}

export async function deleteAnnotation(id: string) {
  return prisma.annotation.delete({ where: { id } });
}