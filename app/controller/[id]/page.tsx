"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import socket from '@/src/lib/socket';
import { motion, useAnimation } from 'motion/react';
import { Gamepad2, Maximize2, RotateCcw, Power } from 'lucide-react';

export default function ControllerPage() {
  const { id: roomId } = useParams();
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [playerName, setPlayerName] = useState('');
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleJoin = () => {
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('join-room', { roomId, name: playerName }, (response: any) => {
      if (response.success) {
        setIsJoined(true);
        setConnected(true);
      } else {
        alert(response.message);
      }
    });
  };

  const sendInput = useCallback((input: string, state: 'down' | 'up') => {
    if (connected) {
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
          onClick={handleJoin}
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
      {orientation === 'portrait' ? (
        <div className="h-full flex flex-col">
          {/* Top: Status */}
          <div className="p-6 flex items-center justify-between border-b border-zinc-900">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Connected</span>
            </div>
            <span className="text-xs font-black italic uppercase tracking-tighter">{playerName}</span>
            <button onClick={() => window.location.reload()} className="text-zinc-500"><Power className="w-4 h-4" /></button>
          </div>

          {/* Middle: D-Pad */}
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="relative w-48 h-48">
              <div className="absolute top-0 left-1/2 -translate-x-1/2">
                <Button label="↑" input="ArrowUp" />
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                <Button label="↓" input="ArrowDown" />
              </div>
              <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <Button label="←" input="ArrowLeft" />
              </div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2">
                <Button label="→" input="ArrowRight" />
              </div>
              <div className="absolute inset-0 m-auto w-16 h-16 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-zinc-700" />
              </div>
            </div>
          </div>

          {/* Bottom: Action Buttons */}
          <div className="p-12 pb-24 grid grid-cols-2 gap-8">
            <div className="grid grid-cols-2 gap-4">
              <Button label="A" input="KeyZ" color="bg-emerald-600" />
              <Button label="B" input="KeyX" color="bg-emerald-600" />
              <Button label="C" input="KeyC" color="bg-emerald-600" />
              <Button label="D" input="KeyV" color="bg-emerald-600" />
            </div>
            <div className="flex flex-col justify-end gap-4">
              <Button label="START" input="Enter" size="w-full h-16" />
              <Button label="COIN" input="Shift" size="w-full h-12" color="bg-zinc-900" />
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-between p-12">
          {/* Left: D-Pad */}
          <div className="relative w-48 h-48">
            <div className="absolute top-0 left-1/2 -translate-x-1/2">
              <Button label="↑" input="ArrowUp" />
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
              <Button label="↓" input="ArrowDown" />
            </div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2">
              <Button label="←" input="ArrowLeft" />
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <Button label="→" input="ArrowRight" />
            </div>
          </div>

          {/* Center: System Buttons */}
          <div className="flex flex-col gap-4">
            <Button label="START" input="Enter" size="w-32 h-12" />
            <Button label="COIN" input="Shift" size="w-32 h-12" color="bg-zinc-900" />
          </div>

          {/* Right: Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button label="A" input="KeyZ" color="bg-emerald-600" />
            <Button label="B" input="KeyX" color="bg-emerald-600" />
            <Button label="C" input="KeyC" color="bg-emerald-600" />
            <Button label="D" input="KeyV" color="bg-emerald-600" />
          </div>
        </div>
      )}
    </div>
  );
}
