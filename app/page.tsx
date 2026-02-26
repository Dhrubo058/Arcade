import Link from 'next/link';

async function getGames() {
  // In a real Next.js app, we'd fetch this or import it.
  // Since it's in public, we can fetch it or just import the JSON if we were using a tool that supports it.
  // But for simplicity in this static-ish setup:
  return [
    { "name": "Metal Slug", "slug": "mslug" },
    { "name": "King of Fighters 98", "slug": "kof98" },
    { "name": "Samurai Shodown", "slug": "samsho" }
  ];
}

export default async function Home() {
  const games = await getGames();

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <header className="max-w-6xl mx-auto mb-12">
        <h1 className="text-4xl font-bold tracking-tighter italic text-emerald-500">NEOGEO WEB ARCADE</h1>
        <p className="text-zinc-400 mt-2">Select a game to start playing instantly.</p>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game) => (
          <div 
            key={game.slug}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-emerald-500/50 transition-colors group"
          >
            <h2 className="text-xl font-semibold mb-4">{game.name}</h2>
            <Link 
              href={`/play/${game.slug}`}
              className="inline-block w-full text-center bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all transform group-hover:scale-[1.02]"
            >
              PLAY NOW
            </Link>
          </div>
        ))}
      </div>

      <footer className="max-w-6xl mx-auto mt-20 pt-8 border-t border-zinc-800 text-zinc-500 text-sm">
        <p>Note: You must provide your own BIOS (neogeo.zip) in /public/bios/ and ROMs in /public/roms/neogeo/</p>
      </footer>
    </main>
  );
}
