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
  const [socketStatus, setSocketStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  useEffect(() => {
    setAppUrl(window.location.origin);
    
    const updateStatus = () => {
      if (socket.connected) setSocketStatus('connected');
      else if (socket.active) setSocketStatus('connecting');
      else setSocketStatus('disconnected');
    };

    const fetchRoomInfo = () => {
      socket.emit('get-room-info', roomId, (response: any) => {
        if (response.success) {
          setPlayers(response.players);
          setGameSelected(response.game);
        } else {
          router.push('/');
        }
      });
    };

    socket.on('connect', () => {
      updateStatus();
      fetchRoomInfo();
    });
    socket.on('disconnect', updateStatus);
    socket.on('connect_error', updateStatus);

    if (!socket.connected) {
      socket.connect();
    } else {
      updateStatus();
      fetchRoomInfo();
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

    socket.on('game-started', (game) => {
      router.push(`/play?rom=${game.filename}&room=${roomId}`);
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
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 flex flex-col">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 md:mb-12">
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors font-bold uppercase tracking-widest text-[10px] md:text-xs"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <div className="flex items-center gap-3">
          <div className="hidden xs:flex items-center gap-2 px-3 py-1 bg-black/40 border border-zinc-800 rounded-full mr-2 md:mr-4">
            <div className={`w-2 h-2 rounded-full ${
              socketStatus === 'connected' ? 'bg-emerald-500' : 
              socketStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              {socketStatus}
            </span>
          </div>
          <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center">
            <Users className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-lg md:text-xl font-black italic tracking-tighter uppercase">Multiplayer Lobby</h1>
        </div>
        <div className="hidden sm:block w-24" />
      </header>

      <main className="flex-1 grid lg:grid-cols-2 gap-6 md:gap-12 max-w-6xl mx-auto w-full">
        {/* Left Side: QR & Info */}
        <section className="flex flex-col items-center justify-center bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase mb-2">Join the Game</h2>
          <p className="text-zinc-500 mb-6 md:mb-8 text-[10px] md:text-sm font-bold uppercase tracking-widest">Scan with your phone to use as a controller</p>
          
          <div className="p-4 md:p-6 bg-white rounded-2xl md:rounded-3xl mb-6 md:mb-8 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
            <QRCodeSVG value={controllerUrl} size={180} className="md:w-[256px] md:h-[256px]" level="H" />
          </div>

          <div className="bg-black/50 px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-zinc-800 mb-6 md:mb-8">
            <span className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-widest mr-2 md:mr-3">Room ID:</span>
            <span className="text-xl md:text-2xl font-black text-emerald-500 tracking-widest">{roomId}</span>
          </div>

          <p className="text-zinc-500 text-[10px] md:text-xs max-w-xs leading-relaxed">
            Up to 4 players can join. The host controls the game selection from the main dashboard.
          </p>
        </section>

        {/* Right Side: Players & Actions */}
        <section className="flex flex-col">
          <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 md:p-8 mb-4 md:mb-6">
            <h3 className="text-lg md:text-xl font-black italic tracking-tighter uppercase mb-4 md:mb-6 flex items-center gap-3">
              <Users className="w-5 h-5 text-emerald-500" />
              Players ({players.length}/4)
            </h3>

            <div className="space-y-3 md:space-y-4">
              <AnimatePresence>
                {players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between p-3 md:p-4 bg-black/40 border border-zinc-800 rounded-xl md:rounded-2xl"
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-sm md:text-base ${
                        index === 0 ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm md:text-base font-black italic uppercase tracking-tighter">{player.name}</p>
                        <p className="text-[8px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                          {index === 0 ? 'Host / Player 1' : `Controller / Player ${index + 1}`}
                        </p>
                      </div>
                    </div>
                    {index === 0 && <span className="text-[8px] md:text-[10px] font-black text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded uppercase tracking-widest">Online</span>}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {Array.from({ length: 4 - players.length }).map((_, i) => (
                <div key={`empty-${i}`} className="p-3 md:p-4 border border-dashed border-zinc-800 rounded-xl md:rounded-2xl flex items-center justify-center">
                  <span className="text-zinc-700 text-[8px] md:text-[10px] font-black uppercase tracking-widest">Waiting for player...</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <button 
              onClick={() => router.push('/')}
              className="flex items-center justify-center gap-2 p-3 md:p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl md:rounded-2xl text-xs md:text-base font-black italic uppercase tracking-tighter transition-all"
            >
              <Gamepad2 className="w-4 h-4 md:w-5 md:h-5" />
              Select Game
            </button>
            <button 
              onClick={handleStartGame}
              disabled={players.length < 1}
              className="flex items-center justify-center gap-2 p-3 md:p-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-xl md:rounded-2xl text-xs md:text-base font-black italic uppercase tracking-tighter transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)]"
            >
              <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
              Start Mission
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
