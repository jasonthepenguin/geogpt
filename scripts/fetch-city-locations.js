const fs = require('fs');
const path = require('path');

// Load .env.local file
try {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
    console.log('Loaded .env.local file');
  }
} catch (e) {
  console.log('Could not load .env.local:', e.message);
}

const token = process.env.NEXT_PUBLIC_MAPILLARY_TOKEN;
if (!token) {
  console.error('Error: NEXT_PUBLIC_MAPILLARY_TOKEN not set');
  process.exit(1);
}

// Major cities with known good Mapillary coverage
const cities = [
  { name: "New York", bbox: [-74.25, 40.50, -73.70, 40.91] },
  { name: "Los Angeles", bbox: [-118.67, 33.70, -118.15, 34.34] },
  { name: "Chicago", bbox: [-87.94, 41.64, -87.52, 42.02] },
  { name: "London", bbox: [-0.51, 51.28, 0.33, 51.69] },
  { name: "Paris", bbox: [2.22, 48.81, 2.47, 48.90] },
  { name: "Berlin", bbox: [13.08, 52.34, 13.76, 52.68] },
  { name: "Amsterdam", bbox: [4.73, 52.28, 5.08, 52.43] },
  { name: "Barcelona", bbox: [2.05, 41.32, 2.23, 41.47] },
  { name: "Rome", bbox: [12.35, 41.80, 12.65, 42.01] },
  { name: "Tokyo", bbox: [139.56, 35.53, 139.92, 35.82] },
  { name: "Sydney", bbox: [151.00, -33.98, 151.31, -33.71] },
  { name: "San Francisco", bbox: [-122.52, 37.71, -122.35, 37.81] },
  { name: "Toronto", bbox: [-79.64, 43.58, -79.12, 43.86] },
  { name: "Singapore", bbox: [103.60, 1.21, 104.03, 1.47] },
  { name: "Dubai", bbox: [55.13, 25.07, 55.41, 25.35] },
  { name: "Moscow", bbox: [37.32, 55.57, 37.97, 55.92] },
  { name: "Stockholm", bbox: [17.91, 59.20, 18.19, 59.43] },
  { name: "Copenhagen", bbox: [12.45, 55.62, 12.65, 55.73] },
  { name: "Melbourne", bbox: [144.81, -37.93, 145.06, -37.70] },
  { name: "Seoul", bbox: [126.76, 37.43, 127.18, 37.71] },
  { name: "Bangkok", bbox: [100.32, 13.49, 100.93, 13.95] },
  { name: "Buenos Aires", bbox: [-58.53, -34.71, -58.34, -34.53] },
  { name: "Mexico City", bbox: [-99.36, 19.05, -98.94, 19.59] },
  { name: "Istanbul", bbox: [28.63, 40.80, 29.46, 41.32] },
  { name: "Vienna", bbox: [16.18, 48.12, 16.58, 48.32] }
];

// Fetch images from a bounding box
async function fetchImagesInBbox(bbox, limit = 10) {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const params = new URLSearchParams({
    fields: 'id,computed_geometry',
    limit: limit.toString(),
    access_token: token,
    bbox: `${minLng},${minLat},${maxLng},${maxLat}`
  });

  const url = `https://graph.mapillary.com/images?${params.toString()}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Fetch error:', error);
    return [];
  }
}

// Generate a random GPT guess
function generateGPTGuess(actualLat, actualLng) {
  const distance = 100 + Math.random() * 1900; // 100-2000km away
  const bearing = Math.random() * 360;
  
  const distRad = distance / 6371;
  const bearingRad = bearing * Math.PI / 180;
  const lat1Rad = actualLat * Math.PI / 180;
  const lng1Rad = actualLng * Math.PI / 180;
  
  const lat2Rad = Math.asin(
    Math.sin(lat1Rad) * Math.cos(distRad) +
    Math.cos(lat1Rad) * Math.sin(distRad) * Math.cos(bearingRad)
  );
  
  const lng2Rad = lng1Rad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distRad) * Math.cos(lat1Rad),
    Math.cos(distRad) - Math.sin(lat1Rad) * Math.sin(lat2Rad)
  );
  
  return {
    lat: lat2Rad * 180 / Math.PI,
    lng: lng2Rad * 180 / Math.PI
  };
}

// Main function
async function fetchRandomLocations() {
  const locations = [];
  const usedImageIds = new Set();
  
  console.log('Fetching random locations from major cities...\n');
  
  // Try to get 2 images from each city
  for (const city of cities) {
    console.log(`Searching in ${city.name}...`);
    
    // Get random offset within the bbox for variety
    const bboxWidth = city.bbox[2] - city.bbox[0];
    const bboxHeight = city.bbox[3] - city.bbox[1];
    
    // Create a smaller search box at random position within city
    const searchSize = 0.05; // ~5km box
    const offsetX = Math.random() * (bboxWidth - searchSize);
    const offsetY = Math.random() * (bboxHeight - searchSize);
    
    const searchBbox = [
      city.bbox[0] + offsetX,
      city.bbox[1] + offsetY,
      city.bbox[0] + offsetX + searchSize,
      city.bbox[1] + offsetY + searchSize
    ];
    
    const images = await fetchImagesInBbox(searchBbox, 5);
    
    // Add up to 2 unique images from this city
    let added = 0;
    for (const image of images) {
      if (!usedImageIds.has(image.id) && added < 2) {
        const actualLat = image.computed_geometry.coordinates[1];
        const actualLng = image.computed_geometry.coordinates[0];
        
        locations.push({
          id: `${city.name.toLowerCase().replace(' ', '_')}_${locations.length + 1}`,
          title: city.name,
          mapillaryImageId: image.id,
          answer: { lat: actualLat, lng: actualLng },
          gpt: generateGPTGuess(actualLat, actualLng)
        });
        
        usedImageIds.add(image.id);
        added++;
        console.log(`  Found image ${locations.length}/50`);
      }
    }
    
    if (locations.length >= 50) break;
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // If we need more, search again in the most populated cities
  if (locations.length < 50) {
    console.log(`\nNeed ${50 - locations.length} more locations, searching again...`);
    
    for (const city of cities.slice(0, 10)) {
      if (locations.length >= 50) break;
      
      console.log(`Re-searching in ${city.name}...`);
      
      // Try multiple random positions
      for (let attempt = 0; attempt < 3 && locations.length < 50; attempt++) {
        const bboxWidth = city.bbox[2] - city.bbox[0];
        const bboxHeight = city.bbox[3] - city.bbox[1];
        
        const searchSize = 0.03;
        const offsetX = Math.random() * (bboxWidth - searchSize);
        const offsetY = Math.random() * (bboxHeight - searchSize);
        
        const searchBbox = [
          city.bbox[0] + offsetX,
          city.bbox[1] + offsetY,
          city.bbox[0] + offsetX + searchSize,
          city.bbox[1] + offsetY + searchSize
        ];
        
        const images = await fetchImagesInBbox(searchBbox, 10);
        
        for (const image of images) {
          if (!usedImageIds.has(image.id) && locations.length < 50) {
            const actualLat = image.computed_geometry.coordinates[1];
            const actualLng = image.computed_geometry.coordinates[0];
            
            locations.push({
              id: `${city.name.toLowerCase().replace(' ', '_')}_${locations.length + 1}`,
              title: city.name,
              mapillaryImageId: image.id,
              answer: { lat: actualLat, lng: actualLng },
              gpt: generateGPTGuess(actualLat, actualLng)
            });
            
            usedImageIds.add(image.id);
            console.log(`  Found image ${locations.length}/50`);
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }
  
  // Save to file
  const output = {
    locations: locations
  };
  
  fs.writeFileSync('public/data/locations.json', JSON.stringify(output, null, 2));
  console.log(`\nSaved ${locations.length} locations to public/data/locations.json`);
}

// Run the script
fetchRandomLocations().catch(console.error);
