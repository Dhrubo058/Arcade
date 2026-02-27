"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import socket from '@/src/lib/socket';
import { Gamepad2, Users, Play, ChevronLeft, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function RoomPage() {
  const { id: roomId } = useParams();
  const router = useRouter();
  const [players, setPlayers] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [gameSelected, setGameSelected] = useState<any>(null);
  const [appUrl, setAppUrl] = useState('');

  useEffect(() => {
    setAppUrl(window.location.origin);
    
    if (!socket.connected) {
      socket.connect();
    }

    socket.on('player-joined', (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    socket.on('player-left', (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    socket.on('game-selected', (game) => {
      setGameSelected(game);
    });

    socket.on('game-started', () => {
      router.push(`/play?rom=${gameSelected.filename}&room=${roomId}`);
    });

    socket.on('room-closed', () => {
      alert('Room closed by host');
      router.push('/');
    });

    // Initial state check would be good here if we had it
    // For now we assume we just created it or joined it

    return () => {
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('game-selected');
      socket.off('game-started');
      socket.off('room-closed');
    };
  }, [roomId, router, gameSelected]);

  const handleStartGame = () => {
    if (gameSelected) {
      socket.emit('start-game', { roomId });
    } else {
      alert('Please select a game on the main screen first (Host only)');
      router.push('/');
    }
  };

  const controllerUrl = `${appUrl}/controller/${roomId}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 flex flex-col">
      <header className="flex items-center justify-between mb-12">
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors font-bold uppercase tracking-widest text-xs"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center">
            <Users className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-xl font-black italic tracking-tighter uppercase">Multiplayer Lobby</h1>
        </div>
        <div className="w-24" />
      </header>

      <main className="flex-1 grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto w-full">
        {/* Left Side: QR & Info */}
        <section className="flex flex-col items-center justify-center bg-zinc-900/50 border border-zinc-800 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2">Join the Game</h2>
          <p className="text-zinc-500 mb-8 text-sm font-bold uppercase tracking-widest">Scan with your phone to use as a controller</p>
          
          <div className="p-6 bg-white rounded-3xl mb-8 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
            <QRCodeSVG value={controllerUrl} size={256} level="H" />
          </div>

          <div className="bg-black/50 px-6 py-3 rounded-2xl border border-zinc-800 mb-8">
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest mr-3">Room ID:</span>
            <span className="text-2xl font-black text-emerald-500 tracking-widest">{roomId}</span>
          </div>

          <p className="text-zinc-500 text-xs max-w-xs leading-relaxed">
            Up to 4 players can join. The host controls the game selection from the main dashboard.
          </p>
        </section>

        {/* Right Side: Players & Actions */}
        <section className="flex flex-col">
          <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 mb-6">
            <h3 className="text-xl font-black italic tracking-tighter uppercase mb-6 flex items-center gap-3">
              <Users className="w-5 h-5 text-emerald-500" />
              Players ({players.length}/4)
            </h3>

            <div className="space-y-4">
              <AnimatePresence>
                {players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between p-4 bg-black/40 border border-zinc-800 rounded-2xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${
                        index === 0 ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-black italic uppercase tracking-tighter">{player.name}</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                          {index === 0 ? 'Host / Player 1' : `Controller / Player ${index + 1}`}
                        </p>
                      </div>
                    </div>
                    {index === 0 && <span className="text-[10px] font-black text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded uppercase tracking-widest">Online</span>}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {Array.from({ length: 4 - players.length }).map((_, i) => (
                <div key={`empty-${i}`} className="p-4 border border-dashed border-zinc-800 rounded-2xl flex items-center justify-center">
                  <span className="text-zinc-700 text-[10px] font-black uppercase tracking-widest">Waiting for player...</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => router.push('/')}
              className="flex items-center justify-center gap-2 p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl font-black italic uppercase tracking-tighter transition-all"
            >
              <Gamepad2 className="w-5 h-5" />
              Select Game
            </button>
            <button 
              onClick={handleStartGame}
              disabled={players.length < 1}
              className="flex items-center justify-center gap-2 p-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-2xl font-black italic uppercase tracking-tighter transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)]"
            >
              <Play className="w-5 h-5 fill-current" />
              Start Mission
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
