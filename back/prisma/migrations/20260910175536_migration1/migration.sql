-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "url" TEXT,
    "white" TEXT NOT NULL,
    "black" TEXT NOT NULL,
    "whiteElo" INTEGER,
    "blackElo" INTEGER,
    "result" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "resultBy" TEXT,
    "termination" TEXT,
    "timeControl" TEXT NOT NULL DEFAULT 'CUSTOM',
    "opening" TEXT,
    "eco" TEXT,
    "fen" TEXT NOT NULL,
    "turns" INTEGER NOT NULL DEFAULT 0,
    "playedAt" DATETIME,
    "pgn" TEXT,
    "fingerprint" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isWhiteWin" BOOLEAN NOT NULL DEFAULT false,
    "isBlackWin" BOOLEAN NOT NULL DEFAULT false,
    "isDraw" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Move" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "ply" INTEGER NOT NULL,
    "san" TEXT NOT NULL,
    "uci" TEXT,
    "before" TEXT,
    "after" TEXT,
    "comment" TEXT,
    "timeSpentSec" INTEGER,
    "eval" REAL,
    CONSTRAINT "Move_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Study" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "gameId" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Study_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fen" TEXT NOT NULL,
    "pgn" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Chapter_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Annotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chapterId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ply" INTEGER NOT NULL DEFAULT 0,
    "square" TEXT,
    "from" TEXT,
    "to" TEXT,
    "text" TEXT,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Annotation_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_externalId_key" ON "Game"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Game_fingerprint_key" ON "Game"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "Move_gameId_ply_key" ON "Move"("gameId", "ply");
