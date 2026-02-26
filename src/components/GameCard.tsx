"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { motion } from 'motion/react';

interface GameCardProps {
  game: {
    name: string;
    slug: string;
    image: string;
  };
}

export default function GameCard({ game }: GameCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group hover:border-emerald-500/50 transition-all duration-300 shadow-xl"
    >
      <div className="aspect-[3/4] relative overflow-hidden">
        <Image 
          src={game.image} 
          alt={game.name}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Link 
            href={`/play?game=${game.slug}`}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-black p-4 rounded-full transform scale-75 group-hover:scale-100 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.4)] z-10"
          >
            <Play className="w-8 h-8 fill-current" />
          </Link>
        </div>
      </div>
      
      <div className="p-5">
        <h3 className="text-lg font-bold text-white tracking-tight truncate">{game.name}</h3>
        <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest font-semibold">Neo Geo MVS</p>
      </div>
    </motion.div>
  );
}
