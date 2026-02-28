"use client";

import Navbar from '@/src/components/Navbar';
import GameCard from '@/src/components/GameCard';
import fs from 'fs';
import path from 'path';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, User, Gamepad2, Play, Info } from 'lucide-react';
import Link from 'next/link';
import socket from '@/src/lib/socket';
import { useRouter } from 'next/navigation';

// This needs to be a server component or use a server action to scan ROMs
// But since I'm already in a 'use client' file for the UI, I'll need to fetch the games.
// I'll create a server action or an API route.

export default function Home() {
  const [games, setGames] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [booting, setBooting] = useState(true);
  const [socketStatus, setSocketStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const router = useRouter();
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateStatus = () => {
      if (socket.connected) setSocketStatus('connected');
      else if (socket.active) setSocketStatus('connecting');
      else setSocketStatus('disconnected');
    };

    socket.on('connect', updateStatus);
    socket.on('disconnect', updateStatus);
    socket.on('connect_error', updateStatus);

    return () => {
      socket.off('connect', updateStatus);
      socket.off('disconnect', updateStatus);
      socket.off('connect_error', updateStatus);
    };
  }, []);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await fetch('/api/games');
        if (!res.ok) throw new Error('Failed to fetch games');
        const data = await res.json();
        setGames(data);
      } catch (error) {
        console.error('Error fetching games:', error);
        setGames([]); // Fallback to empty list
      } finally {
        // Simulate boot sequence
        setTimeout(() => {
          setBooting(false);
          setTimeout(() => setLoading(false), 500);
        }, 2000);
      }
    };
    fetchGames();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) => (prev + 1) % games.length);
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev - 1 + games.length) % games.length);
      } else if (e.key === 'Enter') {
        const game = games[selectedIndex];
        if (game) {
          router.push(`/play?rom=${game.filename}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [games, selectedIndex, router]);

  useEffect(() => {
    if (carouselRef.current) {
      const selectedCard = carouselRef.current.children[selectedIndex] as HTMLElement;
      if (selectedCard) {
        selectedCard.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [selectedIndex]);

  const handleCreateRoom = () => {
    const createRoom = () => {
      socket.emit('create-room', ({ roomId }: { roomId: string }) => {
        router.push(`/room/${roomId}`);
      });
    };

    if (!socket.connected) {
      socket.connect();
      socket.once('connect', createRoom);
    } else {
      createRoom();
    }
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-24 h-24 bg-emerald-500 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.5)]"
          >
            <Gamepad2 className="w-12 h-12 text-black" />
          </motion.div>
          <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
            NEO<span className="text-emerald-500">GEO</span> ARCADE
          </h1>
          <div className="mt-4 h-1 w-48 bg-zinc-900 mx-auto rounded-full overflow-hidden">
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="h-full w-1/2 bg-emerald-500"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  if (loading) return null;

  const selectedGame = games[selectedIndex];

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-hidden flex flex-col">
      {/* Top Bar */}
      <nav className="p-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            <Gamepad2 className="w-6 h-6 text-black" />
          </div>
          <span className="text-2xl font-black tracking-tighter italic uppercase">Arcade<span className="text-emerald-500">OS</span></span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
            <div className={`w-2 h-2 rounded-full ${
              socketStatus === 'connected' ? 'bg-emerald-500' : 
              socketStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              {socketStatus}
            </span>
          </div>
          <button 
            onClick={() => router.push('/play?rom=' + selectedGame?.filename)}
            className="flex items-center gap-2 px-6 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full transition-all text-sm font-bold"
          >
            <User className="w-4 h-4 text-emerald-500" />
            SOLO MODE
          </button>
          <button 
            onClick={handleCreateRoom}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full transition-all text-sm font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            <Users className="w-4 h-4" />
            MULTIPLAYER
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center relative">
        {/* Background Glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px]" />
        </div>

        {/* Game Info */}
        <div className="px-12 mb-8 z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedGame?.slug}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-2xl"
            >
              <h1 className="text-7xl font-black italic tracking-tighter mb-4 uppercase leading-none">
                {selectedGame?.name}
              </h1>
              <div className="flex items-center gap-4 text-zinc-500 font-bold text-sm uppercase tracking-widest">
                <span className="px-2 py-0.5 border border-zinc-800 rounded">NEO GEO MVS</span>
                <span>•</span>
                <span>1990-2004 SNK CORP.</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel */}
        <div className="relative w-full overflow-hidden py-12">
          <div 
            ref={carouselRef}
            className="flex gap-8 px-[10%] transition-transform duration-500 ease-out"
          >
            {games.map((game, index) => (
              <motion.div
                key={game.filename}
                onClick={() => setSelectedIndex(index)}
                animate={{
                  scale: index === selectedIndex ? 1.1 : 0.9,
                  opacity: index === selectedIndex ? 1 : 0.4,
                  zIndex: index === selectedIndex ? 20 : 10,
                }}
                className={`flex-shrink-0 w-[400px] cursor-pointer transition-all duration-300 ${
                  index === selectedIndex ? 'ring-4 ring-emerald-500 ring-offset-8 ring-offset-zinc-950 rounded-2xl' : ''
                }`}
              >
                <GameCard game={game} isFocused={index === selectedIndex} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Controls Hint */}
        <div className="absolute bottom-12 left-12 flex items-center gap-8 text-zinc-500 text-xs font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded">←</span>
            <span className="w-8 h-8 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded">→</span>
            <span>NAVIGATE</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 h-8 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded">ENTER</span>
            <span>SELECT MISSION</span>
          </div>
        </div>
      </main>
    </div>
  );
}
