import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [
    {
      name: 'referee-add-player-api',
      configureServer(server) {
        server.middlewares.use('/api/add-player', (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                const { clubId, player } = JSON.parse(body);
                const filePath = path.resolve(__dirname, 'src/data/clubs.json');
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const data = JSON.parse(fileContent);

                const club = data.clubs.find((c) => c.id === clubId);
                if (club) {
                  const existingIdx = club.players.findIndex(
                    (p) => p.name.toLowerCase() === player.name.toLowerCase()
                  );
                  if (existingIdx >= 0) {
                    club.players[existingIdx] = { ...club.players[existingIdx], ...player };
                  } else {
                    club.players.push(player);
                  }

                  // Sort by goals descending
                  club.players.sort((a, b) => b.goals - a.goals);

                  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
                  console.log(`[GoalRoyale API] Added/Updated ${player.name} (${player.goals} goals) to ${club.name} in clubs.json`);
                }

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: true, clubId, player }));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
          } else {
            res.statusCode = 405;
            res.end();
          }
        });
      }
    }
  ]
});
