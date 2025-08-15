const fs = require('fs');
const path = require('path');

function parseMapillaryUrl(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const withoutAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  let url;
  try {
    url = new URL(withoutAt);
  } catch {
    return null;
  }

  // Primary: pKey in query params
  const pKey = url.searchParams.get('pKey') || url.searchParams.get('photoId') || url.searchParams.get('image_id');

  // Fallbacks: try to infer id from pathname variants Mapillary sometimes uses
  // Examples that we try to support:
  // - /app/?pKey=123
  // - /app/?focus=photo&pKey=123
  // - /app/?image_id=123
  // - /app/im/123 (older style)
  // - /map/im/123
  let pathId = null;
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length >= 2) {
    // look for trailing numeric-ish token
    const last = parts[parts.length - 1];
    if (/^[0-9A-Za-z_-]+$/.test(last)) pathId = last;
  }

  const imageId = pKey || pathId || null;
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');

  const latNum = lat != null ? Number(lat) : null;
  const lngNum = lng != null ? Number(lng) : null;

  return {
    imageId,
    lat: Number.isFinite(latNum) ? latNum : null,
    lng: Number.isFinite(lngNum) ? lngNum : null,
  };
}

function makeLocation(idx, parsed) {
  const id = `custom_${idx + 1}`;
  const answer = parsed.lat != null && parsed.lng != null
    ? { lat: parsed.lat, lng: parsed.lng }
    : { lat: 0, lng: 0 };
  return {
    id,
    title: '',
    mapillaryImageId: parsed.imageId || '',
    answer,
    // Placeholder GPT guess; you can edit later
    gpt: { lat: answer.lat, lng: answer.lng },
  };
}

function main() {
  const inputPath = process.argv[2] || 'urls.txt';
  const absInput = path.isAbsolute(inputPath) ? inputPath : path.join(process.cwd(), inputPath);
  if (!fs.existsSync(absInput)) {
    console.error(`Input file not found: ${absInput}`);
    process.exit(1);
  }

  const lines = fs.readFileSync(absInput, 'utf8').split(/\r?\n/);
  const parsed = lines
    .map(parseMapillaryUrl)
    .filter(Boolean);

  const invalid = parsed.filter(p => !p.imageId);
  if (invalid.length) {
    console.warn(`Warning: ${invalid.length} URL(s) did not contain a recognizable image id (pKey). They will be included with empty ids.`);
  }

  const locations = parsed.map((p, i) => makeLocation(i, p));
  if (locations.length === 0) {
    console.error('No valid URLs found.');
    process.exit(1);
  }

  const output = { locations };
  const outPath = path.join(process.cwd(), 'public', 'data', 'locations.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Wrote ${locations.length} location(s) to ${outPath}`);
  console.log('Reminder: edit each entry\'s title and GPT guess (gpt.lat/lng) as needed.');
}

main();


