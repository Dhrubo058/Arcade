import Navbar from '@/src/components/Navbar';
import GameCard from '@/src/components/GameCard';
import gamesData from '@/src/data/games.json';

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-12 text-center md:text-left">
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter italic text-white mb-4">
            SELECT YOUR <span className="text-emerald-500">MISSION</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl">
            The ultimate browser-based Neo Geo experience. High performance, zero configuration, pure arcade nostalgia.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {gamesData.map((game) => (
            <GameCard key={game.slug} game={game} />
          ))}
        </div>

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
