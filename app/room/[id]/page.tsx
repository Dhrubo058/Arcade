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
  const [games, setGames] = useState<any[]>([]);
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [gameSelected, setGameSelected] = useState<any>(null);
  const [appUrl, setAppUrl] = useState('');
  const [socketStatus, setSocketStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await fetch('/api/games');
        const data = await res.json();
        setGames(data);
      } catch (err) {
        console.error('Failed to fetch games:', err);
      }
    };
    fetchGames();
  }, []);

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

    return () => {
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('game-selected');
      socket.off('game-started');
      socket.off('room-closed');
    };
  }, [roomId, router]);

  const handleSelectGame = (game: any) => {
    socket.emit('select-game', { roomId, game });
    setShowGamePicker(false);
  };

  const handleStartGame = () => {
    if (gameSelected) {
      socket.emit('start-game', { roomId });
    } else {
      setShowGamePicker(true);
    }
  };

  const controllerUrl = `${appUrl}/controller/${roomId}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 flex flex-col">
      {/* Game Picker Modal */}
      <AnimatePresence>
        {showGamePicker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-8"
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]">
              <div className="p-8 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter">Select Mission</h2>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Choose a game to play with your squad</p>
                </div>
                <button 
                  onClick={() => setShowGamePicker(false)}
                  className="w-12 h-12 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {games.map((game) => (
                    <button
                      key={game.slug}
                      onClick={() => handleSelectGame(game)}
                      className="group flex flex-col text-left"
                    >
                      <div className="aspect-[3/4] bg-black rounded-2xl mb-3 overflow-hidden relative border-2 border-transparent group-hover:border-emerald-500 transition-all shadow-lg">
                        {game.image ? (
                          <img src={game.image} alt={game.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-zinc-700 font-black uppercase tracking-widest p-4 text-center">
                            {game.name}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs font-black italic uppercase tracking-tighter truncate group-hover:text-emerald-500 transition-colors">{game.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        <section className="flex flex-col items-center justify-center bg-zinc-900/50 border border-zinc-800 rounded-[40px] p-6 md:p-12 text-center relative overflow-hidden">
          {gameSelected && (
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              {gameSelected.image && <img src={gameSelected.image} alt="" className="w-full h-full object-cover blur-xl" />}
            </div>
          )}
          
          <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase mb-2 relative z-10">Join the Game</h2>
          <p className="text-zinc-500 mb-6 md:mb-8 text-[10px] md:text-sm font-bold uppercase tracking-widest relative z-10">Scan with your phone to use as a controller</p>
          
          <div className="p-4 md:p-6 bg-white rounded-[40px] mb-6 md:mb-8 shadow-[0_0_50px_rgba(255,255,255,0.1)] relative z-10">
            <QRCodeSVG value={controllerUrl} size={180} className="md:w-[256px] md:h-[256px]" level="H" />
          </div>

          <div className="bg-black/50 px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-zinc-800 mb-6 md:mb-8 relative z-10">
            <span className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-widest mr-2 md:mr-3">Room ID:</span>
            <span className="text-xl md:text-2xl font-black text-emerald-500 tracking-widest">{roomId}</span>
          </div>

          <p className="text-zinc-500 text-[10px] md:text-xs max-w-xs leading-relaxed relative z-10">
            Up to 4 players can join. The first player to join becomes the OP and can select games from their phone.
          </p>
        </section>

        {/* Right Side: Players & Actions */}
        <section className="flex flex-col">
          <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-[40px] p-6 md:p-8 mb-4 md:mb-6">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h3 className="text-lg md:text-xl font-black italic tracking-tighter uppercase flex items-center gap-3">
                <Users className="w-5 h-5 text-emerald-500" />
                Players ({players.length}/4)
              </h3>
              {gameSelected && (
                <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-2xl border border-zinc-800">
                  <div className="w-8 h-8 bg-zinc-800 rounded-lg overflow-hidden">
                    {gameSelected.image && <img src={gameSelected.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <span className="text-[10px] font-black italic uppercase tracking-tighter text-emerald-500">{gameSelected.name}</span>
                </div>
              )}
            </div>

            <div className="space-y-3 md:space-y-4">
              <AnimatePresence>
                {players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between p-3 md:p-4 bg-black/40 border border-zinc-800 rounded-2xl"
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-sm md:text-base ${
                        player.isOp ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm md:text-base font-black italic uppercase tracking-tighter flex items-center gap-2">
                          {player.name}
                          {player.isOp && (
                            <span className="text-[8px] font-black bg-emerald-500 text-black px-1.5 py-0.5 rounded uppercase tracking-widest">OP</span>
                          )}
                        </p>
                        <p className="text-[8px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                          Controller / Player {index + 1}
                        </p>
                      </div>
                    </div>
                    <span className="text-[8px] md:text-[10px] font-black text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded uppercase tracking-widest">Online</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {Array.from({ length: 4 - players.length }).map((_, i) => (
                <div key={`empty-${i}`} className="p-3 md:p-4 border border-dashed border-zinc-800 rounded-2xl flex items-center justify-center">
                  <span className="text-zinc-700 text-[8px] md:text-[10px] font-black uppercase tracking-widest">Waiting for player...</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <button 
              onClick={() => setShowGamePicker(true)}
              className="flex items-center justify-center gap-2 p-3 md:p-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl text-xs md:text-base font-black italic uppercase tracking-tighter transition-all"
            >
              <Gamepad2 className="w-4 h-4 md:w-5 md:h-5" />
              Select Game
            </button>
            <button 
              onClick={handleStartGame}
              disabled={players.length < 1}
              className="flex items-center justify-center gap-2 p-3 md:p-5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-2xl text-xs md:text-base font-black italic uppercase tracking-tighter transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)]"
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
