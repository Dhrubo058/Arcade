"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import EmulatorPlayer from '@/src/components/EmulatorPlayer';
import Navbar from '@/src/components/Navbar';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import socket from '@/src/lib/socket';

function PlayContent() {
  const searchParams = useSearchParams();
  const rom = searchParams.get('rom');
  const roomId = searchParams.get('room');
  const router = useRouter();
  
  const [romExists, setRomExists] = useState<boolean | null>(null);
  const [biosExists, setBiosExists] = useState<boolean | null>(null);
  
  const game = rom ? {
    name: rom.split('/').pop()?.replace('.zip', '').split(/[-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Unknown Game',
    filename: rom,
    rom: `/roms/${rom}`
  } : null;

  useEffect(() => {
    if (rom) {
      const romPath = `/roms/${rom}`;
      fetch(romPath, { method: 'HEAD' })
        .then(res => setRomExists(res.ok))
        .catch(() => setRomExists(false));

      // Check for BIOS as well (try /roms/ then /bios/)
      fetch('/roms/neogeo.zip', { method: 'HEAD' })
        .then(res => {
          if (res.ok) {
            setBiosExists(true);
          } else {
            fetch('/bios/neogeo.zip', { method: 'HEAD' })
              .then(res2 => setBiosExists(res2.ok))
              .catch(() => setBiosExists(false));
          }
        })
        .catch(() => setBiosExists(false));
    }

    if (roomId) {
      if (!socket.connected) socket.connect();

      socket.on('player-input', ({ playerIndex, input, state }) => {
        console.log(`Player ${playerIndex} input: ${input} ${state}`);
        
        // Dispatch keyboard event to the emulator
        const eventType = state === 'down' ? 'keydown' : 'keyup';
        const event = new KeyboardEvent(eventType, {
          key: input,
          code: input,
          bubbles: true,
        });
        
        // Try to dispatch to both window and emulator frame
        window.dispatchEvent(event);
        const iframe = document.getElementById('emulator-frame') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.dispatchEvent(event);
        }
      });

      socket.on('room-closed', () => {
        router.push('/');
      });

      return () => {
        socket.off('player-input');
        socket.off('room-closed');
      };
    }
  }, [rom, roomId, router]);

  if (!rom || !game) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-20 h-20 text-red-500 mb-6" />
        <h1 className="text-4xl font-black text-white mb-4 italic tracking-tighter">GAME NOT FOUND</h1>
        <p className="text-zinc-400 mb-8 max-w-md">
          The requested game mission could not be located in the arcade database.
        </p>
        <Link 
          href="/"
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-8 py-4 rounded-2xl transition-all"
        >
          RETURN TO ARCADE
        </Link>
      </div>
    );
  }

  if (romExists === false) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-20 h-20 text-yellow-500 mb-6" />
        <h1 className="text-4xl font-black text-white mb-4 italic tracking-tighter">GAME ROM NOT FOUND</h1>
        <p className="text-zinc-400 mb-8 max-w-md">
          The ROM file for <span className="text-white font-bold">{game.name}</span> is missing from the server. 
          Please ensure <code className="bg-zinc-900 px-2 py-1 rounded text-emerald-400">/public/roms/{rom}</code> exists.
        </p>
        <Link 
          href="/"
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-8 py-4 rounded-2xl transition-all"
        >
          RETURN TO ARCADE
        </Link>
      </div>
    );
  }

  if (romExists === true && biosExists === false) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-20 h-20 text-yellow-500 mb-6" />
        <h1 className="text-4xl font-black text-white mb-4 italic tracking-tighter uppercase">BIOS MISSING</h1>
        <p className="text-zinc-400 mb-8 max-w-md">
          The Neo Geo BIOS file <span className="text-white font-bold">neogeo.zip</span> is missing from the server. 
          Please ensure <code className="bg-zinc-900 px-2 py-1 rounded text-emerald-400">/public/roms/neogeo.zip</code> exists.
        </p>
        <Link 
          href="/"
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-8 py-4 rounded-2xl transition-all"
        >
          RETURN TO ARCADE
        </Link>
      </div>
    );
  }

  if (romExists === null || biosExists === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-black italic">
        VERIFYING MISSION DATA...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden">
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white font-black italic tracking-tighter text-sm uppercase">
            Playing: {game.name}
          </span>
        </div>
        <div className="w-20" /> {/* Spacer */}
      </div>
      
      <div className="flex-1 relative">
        <EmulatorPlayer rom={rom} />
      </div>
    </div>
  );
}

export default function Play() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white font-black italic">LOADING ARCADE...</div>}>
      <PlayContent />
    </Suspense>
  );
}
