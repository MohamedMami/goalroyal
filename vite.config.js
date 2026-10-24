import { defineConfig, loadEnv } from 'vite';
import fs from 'fs';
import path from 'path';

const SPORT_API_TEAM_MAP = {
  'real-madrid': 114,
  'barcelona': 120,
  'manchester-united': 350,
  'bayern-munich': 16,
  'liverpool': 312,
  'arsenal': 311,
  'chelsea': 322,
  'manchester-city': 324,
  'psg': 196,
  'juventus': 23,
  'ac-milan': 26,
  'inter-milan': 135
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const SPORT_API_KEY = env.SPORT_API_KEY || process.env.SPORT_API_KEY || '';

  return {
    plugins: [
    {
      name: 'goalroyale-server-api',
      configureServer(server) {
        // 1. SportAPI Smart Player Stats Lookup
        server.middlewares.use('/api/sportapi-lookup', async (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const { playerName, clubId } = JSON.parse(body);
                if (!playerName || !clubId) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ success: false, error: 'Missing playerName or clubId' }));
                }

                const teamId = SPORT_API_TEAM_MAP[clubId];
                if (!teamId) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ success: false, error: `Club ${clubId} not mapped to SportAPI` }));
                }

                const cleanTerm = playerName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

                // Step 1: Direct stats query
                let statUrl = `https://sportapi.ai/api/players/stats?name=${encodeURIComponent(playerName)}&team_id=${teamId}`;
                let apiRes = await fetch(statUrl, { headers: { 'X-Api-Key': SPORT_API_KEY } });
                let apiJson = await apiRes.json();

                if (apiJson.success && apiJson.totals && apiJson.totals.appearances > 0) {
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({
                    success: true,
                    player: {
                      name: apiJson.player?.name || playerName,
                      shortName: playerName,
                      goals: apiJson.totals.goals || 0,
                      appearances: apiJson.totals.appearances || 0,
                      years: 'Official SportAPI Record'
                    }
                  }));
                }

                // Step 2: Squad lookup for partial/nickname match (e.g. "Mbappe" -> "Kylian Mbappé")
                const squadRes = await fetch(`https://sportapi.ai/api/teams/${teamId}/squad`, {
                  headers: { 'X-Api-Key': SPORT_API_KEY }
                });
                const squadJson = await squadRes.json();

                if (squadJson.squad) {
                  const matched = squadJson.squad.find((p) => {
                    const cleanName = p.full_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    return cleanName.includes(cleanTerm) || cleanTerm.includes(cleanName);
                  });

                  if (matched) {
                    const matchedStatRes = await fetch(
                      `https://sportapi.ai/api/players/stats?name=${encodeURIComponent(matched.full_name)}&team_id=${teamId}`,
                      { headers: { 'X-Api-Key': SPORT_API_KEY } }
                    );
                    const matchedStatJson = await matchedStatRes.json();

                    if (matchedStatJson.success && matchedStatJson.totals) {
                      res.setHeader('Content-Type', 'application/json');
                      return res.end(JSON.stringify({
                        success: true,
                        player: {
                          name: matched.full_name,
                          shortName: playerName,
                          goals: matchedStatJson.totals.goals || 0,
                          appearances: matchedStatJson.totals.appearances || 0,
                          years: 'Official SportAPI Record'
                        }
                      }));
                    }
                  }
                }

                // Step 3: Try player slug endpoint
                const slug = cleanTerm.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                const slugRes = await fetch(`https://sportapi.ai/api/players/${slug}`, {
                  headers: { 'X-Api-Key': SPORT_API_KEY }
                });
                const slugJson = await slugRes.json();

                if (slugJson.success && slugJson.player) {
                  const goals = slugJson.career?.goals || slugJson.season?.goals || 0;
                  const appearances = slugJson.career?.appearances || slugJson.season?.appearances || 0;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({
                    success: true,
                    player: {
                      name: slugJson.player.full_name,
                      shortName: playerName,
                      goals: goals,
                      appearances: appearances,
                      years: 'Official SportAPI Record'
                    }
                  }));
                }

                // Not found
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({
                  success: false,
                  error: `No official record found on SportAPI for "${playerName}" at this club.`
                }));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
          } else {
            res.statusCode = 405;
            res.end();
          }
        });

        // 2. Referee Add / Update Player Persistence
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
};
});
