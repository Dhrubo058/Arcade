import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const romsDir = path.join(process.cwd(), 'public', 'roms');
  let detectedGames: any[] = [];

  const scanRoms = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanRoms(fullPath);
      } else if (file.endsWith('.zip') && file !== 'neogeo.zip') {
        const relativePath = path.relative(path.join(process.cwd(), 'public', 'roms'), fullPath);
        const filename = file.replace('.zip', '');
        
        const name = filename
          .split(/[-_]/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        detectedGames.push({
          name: name,
          filename: relativePath,
          slug: filename
        });
      }
    }
  };

  try {
    scanRoms(romsDir);
  } catch (error) {
    console.error('Error scanning ROMs directory:', error);
  }

  return NextResponse.json(detectedGames);
}
