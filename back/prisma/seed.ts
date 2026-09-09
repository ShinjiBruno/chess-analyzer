import { PrismaClient } from "@prisma/client";
import { importFromPgnText } from "../src/services/games.js";

const prisma = new PrismaClient();

const SAMPLE_PGN = `
[Event "Casual Game"]
[Site "Local"]
[Date "2026.08.15"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]
[WhiteElo "1800"]
[BlackElo "1750"]
[TimeControl "600"]
[ECO "C50"]
[Opening "Italian Game"]
[Termination "Resignation"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. Re1 Bg4 8. h3 Bh5 9. Nbd2 1-0

[Event "Blitz Arena"]
[Site "Local"]
[Date "2026.09.01"]
[White "Bob"]
[Black "Charlie"]
[Result "0-1"]
[WhiteElo "1600"]
[BlackElo "1650"]
[TimeControl "300"]
[ECO "B90"]
[Opening "Sicilian Defense"]
[Termination "Checkmate"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6 8. h3 0-1
`;

async function main() {
  const { imported, skipped } = await importFromPgnText(SAMPLE_PGN);
  console.log(`Seed concluído: ${imported} partidas importadas, ${skipped} duplicadas ignoradas.`);

  await prisma.study.create({
    data: {
      name: "Estudo: Abertura Italiana",
      description: "Repertório principal de brancas com a Italiana",
      tags: JSON.stringify(["abertura", "italiana"]),
      chapters: {
        create: {
          name: "Linha principal",
          fen: "start",
          pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5",
          annotations: {
            create: [
              { type: "ARROW", from: "f1", to: "c4", color: "#ff0000" },
              { type: "TEXT", square: "c4", text: "Desenvolve o bispo para a casa ativa c4" },
            ],
          },
        },
      },
    },
  });

  console.log("Seed de estudo concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });