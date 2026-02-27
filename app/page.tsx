import Navbar from '@/src/components/Navbar';
import GameCard from '@/src/components/GameCard';
import gamesData from '@/src/data/games.json';
import fs from 'fs';
import path from 'path';

export default async function Home() {
  // Automatic ROM detection
  const romsDir = path.join(process.cwd(), 'public', 'roms', 'neogeo');
  let detectedGames = [];

  try {
    if (fs.existsSync(romsDir)) {
      const files = fs.readdirSync(romsDir);
      const romFiles = files.filter(file => file.endsWith('.zip') && file !== 'neogeo.zip');

      detectedGames = romFiles.map(file => {
        const slug = file.replace('.zip', '');
        // Check if we have metadata for this ROM in our games.json
        const metadata = gamesData.find(g => g.slug === slug || g.rom.endsWith(file));
        
        return {
          name: metadata?.name || slug.split(/[-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          slug: slug,
          rom: `/roms/neogeo/${file}`
        };
      });
    }
  } catch (error) {
    console.error('Error scanning ROMs directory:', error);
  }

  // Fallback to gamesData if no ROMs detected (for demo/initial state)
  const finalGames = detectedGames.length > 0 ? detectedGames : gamesData;

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-12 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
            <div>
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter italic text-white">
                SELECT YOUR <span className="text-emerald-500">MISSION</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                {finalGames.length} ROMs Detected
              </span>
            </div>
          </div>
          <p className="text-zinc-400 text-lg max-w-2xl">
            The ultimate browser-based Neo Geo experience. High performance, zero configuration, pure arcade nostalgia.
          </p>
        </header>

        {finalGames.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {finalGames.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-zinc-800 rounded-3xl">
            <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">No ROMs detected in /public/roms/neogeo/</p>
            <p className="text-zinc-600 text-xs mt-2">Add .zip files to start playing</p>
          </div>
        )}

        <section className="mt-24 p-8 rounded-3xl bg-zinc-900 border border-zinc-800">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">System Requirements</h2>
              <ul className="space-y-3 text-zinc-400">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Modern browser (Chrome, Firefox, Safari)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Neo Geo BIOS (neogeo.zip) in /public/bios/
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Game ROMs in /public/roms/neogeo/
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Gamepad recommended for best experience
                </li>
              </ul>
            </div>
            <div className="bg-black/50 p-6 rounded-2xl border border-zinc-800 font-mono text-xs text-zinc-500">
              <p className="mb-2">{"// Emulator Configuration"}</p>
              <p className="text-emerald-500/70">CORE: FBNeo (Arcade)</p>
              <p className="text-emerald-500/70">SYSTEM: Neo Geo MVS</p>
              <p className="text-emerald-500/70">RENDERER: WebGL 2.0</p>
              <p className="mt-4">{"// Controls"}</p>
              <p>Arrows: Movement</p>
              <p>Z, X, C, V: A, B, C, D</p>
              <p>Enter: Start</p>
              <p>Shift: Select/Coin</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
