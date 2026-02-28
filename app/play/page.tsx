"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import EmulatorPlayer from '@/src/components/EmulatorPlayer';
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

      // Inject virtual gamepad script into the iframe
      const injectVirtualGamepad = () => {
        const iframe = document.getElementById('emulator-frame') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          try {
            // We use a script tag to inject into the iframe's context
            const script = iframe.contentWindow.document.createElement('script');
            script.textContent = `
              (function() {
                const virtualGamepads = [null, null, null, null];
                
                function createGamepad(index) {
                  return {
                    id: 'Virtual Gamepad ' + (index + 1),
                    index: index,
                    connected: true,
                    timestamp: performance.now(),
                    mapping: 'standard',
                    axes: [0, 0, 0, 0],
                    buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
                  };
                }

                // Override getGamepads
                const originalGetGamepads = navigator.getGamepads.bind(navigator);
                navigator.getGamepads = function() {
                  const realGamepads = originalGetGamepads();
                  const result = Array.from(realGamepads || [null, null, null, null]);
                  for (let i = 0; i < 4; i++) {
                    if (virtualGamepads[i]) {
                      result[i] = virtualGamepads[i];
                    }
                  }
                  return result;
                };

                // Listen for updates from parent
                window.addEventListener('message', (event) => {
                  if (event.data.type === 'VIRTUAL_GAMEPAD_UPDATE') {
                    const { playerIndex, buttonIndex, state } = event.data;
                    if (!virtualGamepads[playerIndex]) {
                      virtualGamepads[playerIndex] = createGamepad(playerIndex);
                      
                      // Dispatch connected event
                      const connectEvent = new Event('gamepadconnected');
                      Object.defineProperty(connectEvent, 'gamepad', { value: virtualGamepads[playerIndex] });
                      window.dispatchEvent(connectEvent);
                    }
                    
                    const gamepad = virtualGamepads[playerIndex];
                    gamepad.timestamp = performance.now();
                    gamepad.buttons[buttonIndex].pressed = (state === 'down');
                    gamepad.buttons[buttonIndex].value = (state === 'down' ? 1 : 0);
                  }
                });

                console.log('Virtual Gamepad System Initialized');
              })();
            `;
            iframe.contentWindow.document.head.appendChild(script);
          } catch (e) {
            console.error('Failed to inject virtual gamepad script:', e);
          }
        }
      };

      // Map controller input to gamepad button index
      const inputToButtonIndex: Record<string, number> = {
        'ArrowUp': 12,
        'ArrowDown': 13,
        'ArrowLeft': 14,
        'ArrowRight': 15,
        'KeyZ': 0, // A
        'KeyX': 1, // B
        'KeyC': 2, // C
        'KeyV': 3, // D
        'Enter': 9, // Start
        'Shift': 8, // Select/Coin
      };

      socket.on('player-input', ({ playerIndex, input, state }) => {
        console.log(`Player ${playerIndex} input: ${input} ${state}`);
        
        const buttonIndex = inputToButtonIndex[input];
        if (buttonIndex !== undefined) {
          const iframe = document.getElementById('emulator-frame') as HTMLIFrameElement;
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'VIRTUAL_GAMEPAD_UPDATE',
              playerIndex,
              buttonIndex,
              state
            }, '*');
          }
        }

        // Fallback: Also dispatch keyboard event for Player 1
        if (playerIndex === 0) {
          const eventType = state === 'down' ? 'keydown' : 'keyup';
          const event = new KeyboardEvent(eventType, {
            key: input,
            code: input,
            bubbles: true,
          });
          window.dispatchEvent(event);
          const iframe = document.getElementById('emulator-frame') as HTMLIFrameElement;
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.dispatchEvent(event);
          }
        }
      });

      // Try to inject script when iframe loads
      const iframe = document.getElementById('emulator-frame');
      if (iframe) {
        iframe.addEventListener('load', injectVirtualGamepad);
        // Also try immediately in case it's already loaded
        injectVirtualGamepad();
      }

      socket.on('room-closed', () => {
        router.push('/');
      });

      return () => {
        socket.off('player-input');
        socket.off('room-closed');
        if (iframe) {
          iframe.removeEventListener('load', injectVirtualGamepad);
        }
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
        <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-[10px] md:text-sm font-bold uppercase tracking-widest">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="flex items-center gap-2 md:gap-3">
          <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white font-black italic tracking-tighter text-[10px] md:text-sm uppercase truncate max-w-[150px] md:max-w-none">
            Playing: {game.name}
          </span>
        </div>
        <div className="w-12 md:w-20" /> {/* Spacer */}
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
