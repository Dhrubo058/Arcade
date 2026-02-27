"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Play, Gamepad2, ImageOff } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

interface GameCardProps {
  game: {
    name: string;
    filename: string;
    slug: string;
  };
}

export default function GameCard({ game }: GameCardProps) {
  const [imageError, setImageError] = useState(false);
  
  // Extract ROM filename (e.g., mslug.zip -> mslug)
  const romFilename = game.filename.split('/').pop()?.replace('.zip', '') || game.slug;
  
  // Construct automatic image path (assuming images are named after ROMs)
  const imagePath = `/images/games/${romFilename}.png`;

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group hover:border-emerald-500/50 transition-all duration-300 shadow-xl flex flex-col"
    >
      <div className="aspect-[16/9] relative overflow-hidden bg-zinc-950 flex items-center justify-center border-b border-zinc-800">
        {!imageError ? (
          <Image
            src={imagePath}
            alt={game.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          <>
            <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500 via-transparent to-transparent" />
            <Gamepad2 className="w-12 h-12 text-zinc-800 group-hover:text-emerald-500/20 transition-colors duration-500" />
          </>
        )}
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-[2px]">
          <Link 
            href={`/play?rom=${game.filename}`}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-black p-4 rounded-full transform scale-75 group-hover:scale-100 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.4)] z-10"
          >
            <Play className="w-6 h-6 fill-current" />
          </Link>
        </div>

        {/* Badge for ROM name */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 border border-white/10 rounded text-[8px] font-mono text-zinc-500 uppercase tracking-tighter">
          {romFilename}
        </div>
      </div>
      
      <div className="p-5 flex-1 flex flex-col justify-between bg-gradient-to-b from-zinc-900 to-black">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-emerald-400 transition-colors truncate">{game.name}</h3>
          <p className="text-zinc-500 text-[10px] mt-1 uppercase tracking-[0.2em] font-black">Neo Geo MVS System</p>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[10px] font-mono text-zinc-600 uppercase">Cartridge Type</span>
          <div className="h-1 w-12 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-emerald-500 group-hover:w-full transition-all duration-700" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
