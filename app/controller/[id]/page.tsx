"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import socket from '@/src/lib/socket';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { Gamepad2, Maximize2, RotateCcw, Power } from 'lucide-react';

export default function ControllerPage() {
  const { id: roomId } = useParams();
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [playerName, setPlayerName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [isOp, setIsOp] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [adminTab, setAdminTab] = useState<'games' | 'players'>('games');
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
    const updateStatus = () => {
      if (socket.connected) setSocketStatus('connected');
      else if (socket.active) setSocketStatus('connecting');
      else setSocketStatus('disconnected');
    };

    socket.on('connect', updateStatus);
    socket.on('disconnect', updateStatus);
    socket.on('connect_error', updateStatus);

    socket.on('player-joined', (updatedPlayers) => {
      setPlayers(updatedPlayers);
      const me = updatedPlayers.find((p: any) => p.id === socket.id);
      if (me) setIsOp(me.isOp);
    });

    socket.on('player-left', (updatedPlayers) => {
      setPlayers(updatedPlayers);
      const me = updatedPlayers.find((p: any) => p.id === socket.id);
      if (me) setIsOp(me.isOp);
    });

    socket.on('kicked', () => {
      alert('You have been kicked from the room');
      localStorage.removeItem(`arcade_joined_${roomId}`);
      window.location.href = '/';
    });

    if (!socket.connected) {
      socket.connect();
    } else {
      updateStatus();
    }

    return () => {
      socket.off('connect', updateStatus);
      socket.off('disconnect', updateStatus);
      socket.off('connect_error', updateStatus);
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('kicked');
    };
  }, [roomId]);

  useEffect(() => {
    const handleResize = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load state from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem(`arcade_name_${roomId}`);
    if (savedName) setPlayerName(savedName);
    
    const savedJoined = localStorage.getItem(`arcade_joined_${roomId}`);
    if (savedJoined === 'true' && socket.connected) {
      handleJoin(savedName || '');
    }
  }, [roomId, socketStatus]);

  const handleJoin = (nameToUse?: string) => {
    const finalName = nameToUse !== undefined ? nameToUse : playerName;
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('join-room', { roomId, name: finalName }, (response: any) => {
      if (response.success) {
        setIsJoined(true);
        setConnected(true);
        setIsOp(response.isOp);
        setPlayers(response.players);
        localStorage.setItem(`arcade_name_${roomId}`, finalName);
        localStorage.setItem(`arcade_joined_${roomId}`, 'true');
      } else {
        alert(response.message);
        localStorage.removeItem(`arcade_joined_${roomId}`);
      }
    });
  };

  const handleSelectGame = (game: any) => {
    socket.emit('select-game', { roomId, game });
    setShowAdminMenu(false);
  };

  const handleKick = (playerId: string) => {
    socket.emit('kick-player', { roomId, playerId });
  };

  const handleTransferOp = (playerId: string) => {
    socket.emit('transfer-op', { roomId, playerId });
  };

  const handleStartGame = () => {
    socket.emit('start-game', { roomId });
  };

  const sendInput = useCallback((input: string, state: 'down' | 'up') => {
    if (connected) {
      if (state === 'down' && window.navigator.vibrate) {
        window.navigator.vibrate(10);
      }
      socket.emit('controller-input', { roomId, input, state });
    }
  }, [connected, roomId]);

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-8 text-white">
        <Gamepad2 className="w-16 h-16 text-emerald-500 mb-6" />
        <h1 className="text-3xl font-black italic tracking-tighter uppercase mb-2">Join Room</h1>
        <p className="text-zinc-500 mb-8 text-sm font-bold uppercase tracking-widest">{roomId}</p>
        
        <input 
          type="text" 
          placeholder="ENTER YOUR NAME"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4 text-center font-black italic uppercase tracking-tighter focus:border-emerald-500 outline-none transition-all"
        />
        
        <button 
          onClick={() => handleJoin()}
          className="w-full max-w-xs bg-emerald-500 hover:bg-emerald-400 text-black font-black italic uppercase tracking-tighter p-4 rounded-2xl transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)]"
        >
          CONNECT CONTROLLER
        </button>
      </div>
    );
  }

  const Button = ({ label, input, color = 'bg-zinc-800', size = 'w-16 h-16' }: any) => (
    <motion.button
      whileTap={{ scale: 0.9, backgroundColor: '#10b981' }}
      onPointerDown={() => sendInput(input, 'down')}
      onPointerUp={() => sendInput(input, 'up')}
      onPointerLeave={() => sendInput(input, 'up')}
      className={`${size} ${color} rounded-full flex items-center justify-center font-black italic text-xl shadow-xl select-none touch-none`}
    >
      {label}
    </motion.button>
  );

  return (
    <div className="fixed inset-0 bg-zinc-950 text-white select-none touch-none overflow-hidden">
      {/* Admin Menu Overlay */}
      <AnimatePresence>
        {showAdminMenu && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="fixed inset-0 z-50 bg-zinc-950 flex flex-col p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">Admin Panel</h2>
              <button 
                onClick={() => setShowAdminMenu(false)}
                className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center font-black"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 mb-6">
              <button 
                onClick={() => setAdminTab('games')}
                className={`flex-1 py-3 rounded-xl font-black italic uppercase tracking-tighter text-sm ${adminTab === 'games' ? 'bg-emerald-500 text-black' : 'bg-zinc-900 text-zinc-500'}`}
              >
                Games
              </button>
              <button 
                onClick={() => setAdminTab('players')}
                className={`flex-1 py-3 rounded-xl font-black italic uppercase tracking-tighter text-sm ${adminTab === 'players' ? 'bg-emerald-500 text-black' : 'bg-zinc-900 text-zinc-500'}`}
              >
                Players
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {adminTab === 'games' ? (
                <div className="grid grid-cols-2 gap-4">
                  {games.map((game) => (
                    <button
                      key={game.slug}
                      onClick={() => handleSelectGame(game)}
                      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-left"
                    >
                      <div className="aspect-video bg-black rounded-lg mb-2 overflow-hidden relative">
                        {game.image ? (
                          <img src={game.image} alt={game.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-700 font-black uppercase tracking-widest">No Cover</div>
                        )}
                      </div>
                      <p className="text-[10px] font-black italic uppercase tracking-tighter truncate">{game.name}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {players.map((p) => (
                    <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${p.isOp ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black italic uppercase tracking-tighter text-sm">{p.name} {p.id === socket.id && '(You)'}</p>
                          <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">{p.isOp ? 'Operator' : 'Player'}</p>
                        </div>
                      </div>
                      {p.id !== socket.id && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleTransferOp(p.id)}
                            className="bg-zinc-800 text-[8px] font-black uppercase tracking-widest px-3 py-2 rounded-lg"
                          >
                            Make OP
                          </button>
                          <button 
                            onClick={() => handleKick(p.id)}
                            className="bg-red-500/20 text-red-500 text-[8px] font-black uppercase tracking-widest px-3 py-2 rounded-lg"
                          >
                            Kick
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {adminTab === 'games' && (
              <button 
                onClick={handleStartGame}
                className="mt-6 w-full bg-emerald-500 text-black font-black italic uppercase tracking-tighter p-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.2)]"
              >
                START MISSION
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {orientation === 'portrait' ? (
        <div className="h-full flex flex-col">
          {/* Top: Status */}
          <div className="p-6 flex items-center justify-between border-b border-zinc-900">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                socketStatus === 'connected' ? 'bg-emerald-500' : 
                socketStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
              }`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                socketStatus === 'connected' ? 'text-emerald-500' : 'text-zinc-500'
              }`}>{socketStatus}</span>
            </div>
            <div className="flex items-center gap-4">
              {isOp && (
                <button 
                  onClick={() => setShowAdminMenu(true)}
                  className="bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full animate-pulse"
                >
                  Admin
                </button>
              )}
              <span className="text-xs font-black italic uppercase tracking-tighter">{playerName}</span>
              <button onClick={() => window.location.reload()} className="text-zinc-500"><Power className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <RotateCcw className="w-12 h-12 text-emerald-500 mb-4 animate-spin-slow" />
            <h2 className="text-xl font-black italic uppercase tracking-tighter mb-2">Rotate your phone</h2>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Landscape mode is required for the best handheld experience</p>
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-between px-12 py-6 relative">
          {/* Left Side: D-Pad */}
          <div className="relative w-48 h-48 flex items-center justify-center">
            <div className="absolute inset-0 bg-zinc-900/50 rounded-full border border-zinc-800/50" />
            <div className="relative z-10 grid grid-cols-3 grid-rows-3 gap-1">
              <div />
              <Button label="↑" input="ArrowUp" size="w-14 h-14" />
              <div />
              <Button label="←" input="ArrowLeft" size="w-14 h-14" />
              <div className="w-14 h-14 bg-zinc-900 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-zinc-800 rounded-full shadow-inner" />
              </div>
              <Button label="→" input="ArrowRight" size="w-14 h-14" />
              <div />
              <Button label="↓" input="ArrowDown" size="w-14 h-14" />
              <div />
            </div>
          </div>

          {/* Center: System Buttons & Info */}
          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-col items-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">NeoGeo Arcade</div>
              <div className="h-1 w-12 bg-emerald-500 rounded-full mb-4" />
              
              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-1">
                  <Button label="SEL" input="Shift" size="w-14 h-8" color="bg-zinc-900" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Select</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Button label="START" input="Enter" size="w-14 h-8" color="bg-zinc-900" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Start</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isOp && (
                <button 
                  onClick={() => setShowAdminMenu(true)}
                  className="bg-emerald-500 text-black text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                >
                  Admin
                </button>
              )}
              <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-zinc-800">
                <div className={`w-1.5 h-1.5 rounded-full ${socketStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{playerName}</span>
              </div>
            </div>
          </div>

          {/* Right Side: Action Buttons */}
          <div className="relative w-56 h-56 flex items-center justify-center">
            <div className="absolute inset-0 bg-zinc-900/50 rounded-full border border-zinc-800/50" />
            <div className="relative z-10 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-4 translate-y-4">
                <Button label="C" input="KeyC" color="bg-yellow-500/80" size="w-16 h-16" />
                <Button label="A" input="KeyZ" color="bg-red-500/80" size="w-16 h-16" />
              </div>
              <div className="flex flex-col gap-4 -translate-y-4">
                <Button label="D" input="KeyV" color="bg-emerald-500/80" size="w-16 h-16" />
                <Button label="B" input="KeyX" color="bg-blue-500/80" size="w-16 h-16" />
              </div>
            </div>
          </div>

          {/* Shoulder Buttons (Simulated areas at top corners) */}
          <div className="absolute top-0 left-0 w-32 h-12 bg-zinc-900/20 rounded-br-3xl border-b border-r border-zinc-800/30 flex items-center justify-center">
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-700">L-Shoulder</span>
          </div>
          <div className="absolute top-0 right-0 w-32 h-12 bg-zinc-900/20 rounded-bl-3xl border-b border-l border-zinc-800/30 flex items-center justify-center">
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-700">R-Shoulder</span>
          </div>
        </div>
      )}
    </div>
  );
}
