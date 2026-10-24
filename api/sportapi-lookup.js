const SPORT_API_KEY = process.env.SPORT_API_KEY || '';

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

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { playerName, clubId } = req.body || {};
    if (!playerName || !clubId) {
      return res.status(400).json({ success: false, error: 'Missing playerName or clubId' });
    }

    const teamId = SPORT_API_TEAM_MAP[clubId];
    if (!teamId) {
      return res.status(400).json({ success: false, error: `Club ${clubId} not mapped to SportAPI` });
    }

    const cleanTerm = playerName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // Step 1: Direct stats query
    const statUrl = `https://sportapi.ai/api/players/stats?name=${encodeURIComponent(playerName)}&team_id=${teamId}`;
    const apiRes = await fetch(statUrl, { headers: { 'X-Api-Key': SPORT_API_KEY } });
    const apiJson = await apiRes.json();

    if (apiJson.success && apiJson.totals && apiJson.totals.appearances > 0) {
      return res.status(200).json({
        success: true,
        player: {
          name: apiJson.player?.name || playerName,
          shortName: playerName,
          goals: apiJson.totals.goals || 0,
          appearances: apiJson.totals.appearances || 0,
          years: 'Official SportAPI Record'
        }
      });
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
          return res.status(200).json({
            success: true,
            player: {
              name: matched.full_name,
              shortName: playerName,
              goals: matchedStatJson.totals.goals || 0,
              appearances: matchedStatJson.totals.appearances || 0,
              years: 'Official SportAPI Record'
            }
          });
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
      return res.status(200).json({
        success: true,
        player: {
          name: slugJson.player.full_name,
          shortName: playerName,
          goals,
          appearances,
          years: 'Official SportAPI Record'
        }
      });
    }

    return res.status(200).json({
      success: false,
      error: `No official record found on SportAPI for "${playerName}" at this club.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
