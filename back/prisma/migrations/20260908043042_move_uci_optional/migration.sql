-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Move" (
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
INSERT INTO "new_Move" ("after", "before", "comment", "eval", "gameId", "id", "ply", "san", "timeSpentSec", "uci") SELECT "after", "before", "comment", "eval", "gameId", "id", "ply", "san", "timeSpentSec", "uci" FROM "Move";
DROP TABLE "Move";
ALTER TABLE "new_Move" RENAME TO "Move";
CREATE UNIQUE INDEX "Move_gameId_ply_key" ON "Move"("gameId", "ply");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
