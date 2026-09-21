import React, { useState, useEffect, useRef } from 'react';
import { BotState } from '../types';
import { useTheme } from '../context/ThemeContext';
import { MonitorPlay, Keyboard as KeyboardIcon, Crosshair, Box, Layers, Play, MousePointer2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Pickaxe, Hand, Shield } from 'lucide-react';
import { ChatConsole } from './ChatConsole';
import { HeartsAndHunger } from './HeartsAndHunger';
import { PlayersWidget } from './PlayersWidget';

interface BotViewportProps {
  bot: BotState;
  onSendChat: (msg: string) => Promise<boolean>;
  onClearChat: () => Promise<void>;
}

export const BotViewport: React.FC<BotViewportProps> = ({ bot, onSendChat, onClearChat }) => {
  const { theme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'viewport' | 'inventory'>('viewport');
  const [keyboardCapture, setKeyboardCapture] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const touchState = useRef({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    isDragging: false
  });

  const isOnline = bot.status === 'online';

  useEffect(() => {
    // Auto-enable mobile controls if touch device
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setShowMobileControls(true);
    }
  }, []);

  useEffect(() => {
    if (!isOnline || activeTab !== 'viewport') return;
    
    // The prismarine-viewer is served on the same origin via proxy,
    // so we can directly access its contentDocument to fix the canvas dimensions.
    const interval = setInterval(() => {
      try {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          const doc = iframeRef.current.contentWindow.document;
          const canvas = doc.querySelector('canvas') || doc.getElementById('viewer-canvas');
          if (canvas) {
            // Apply explicit CSS dimensions as requested
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
            canvas.style.position = 'absolute';
            canvas.style.zIndex = '1';
            canvas.style.top = '0';
            canvas.style.left = '0';
            
            // Force redraw/resize in the viewer
            iframeRef.current.contentWindow.dispatchEvent(new Event('resize'));
          }
        }
      } catch (e) {
        // Ignore CORS/load errors during initialization
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isOnline, activeTab]);

  const sendControl = (command: string, state: any) => {
    fetch(`/api/bots/${bot.id}/control`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ command, state })
    }).catch(console.error);
  };

  useEffect(() => {
    if (!keyboardCapture || activeTab !== 'viewport' || !isOnline) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        setKeyboardCapture(false);
        return;
      }
      const keyMap: Record<string, string> = {
        'w': 'forward', 'a': 'left', 's': 'back', 'd': 'right',
        ' ': 'jump', 'shift': 'sneak', 'control': 'sprint'
      };
      const cmd = keyMap[e.key.toLowerCase()];
      if (cmd) {
        sendControl(cmd, true);
        e.preventDefault();
      }
      
      // Hotbar keys
      if (/^[1-9]$/.test(e.key)) {
        sendControl('setHotbar', parseInt(e.key) - 1);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      const keyMap: Record<string, string> = {
        'w': 'forward', 'a': 'left', 's': 'back', 'd': 'right',
        ' ': 'jump', 'shift': 'sneak', 'control': 'sprint'
      };
      const cmd = keyMap[e.key.toLowerCase()];
      if (cmd) {
        sendControl(cmd, false);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [keyboardCapture, activeTab, isOnline]);

  // Touch Camera Control
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchState.current.isDragging = true;
      touchState.current.startX = e.touches[0].clientX;
      touchState.current.startY = e.touches[0].clientY;
      touchState.current.lastX = e.touches[0].clientX;
      touchState.current.lastY = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchState.current.isDragging || !bot.position) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    const dx = currentX - touchState.current.lastX;
    const dy = currentY - touchState.current.lastY;
    
    const sensitivity = 0.01;
    const newYaw = bot.position.yaw - dx * sensitivity;
    const newPitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, bot.position.pitch - dy * sensitivity));
    
    sendControl('look', { yaw: newYaw, pitch: newPitch });
    
    touchState.current.lastX = currentX;
    touchState.current.lastY = currentY;
  };

  const handleTouchEnd = () => {
    touchState.current.isDragging = false;
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Viewport Top Bar */}
      <div className={`flex flex-wrap items-center gap-2 p-2 shrink-0 border-b ${
        isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-white/80 border-zinc-200'
      }`}>
        <div className={`flex items-center rounded-lg p-1 ${isDark ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
          <button 
            onClick={() => setActiveTab('viewport')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors ${
              activeTab === 'viewport' 
                ? (isDark ? 'bg-zinc-800 text-white shadow-sm' : 'bg-white text-zinc-900 shadow-sm') 
                : (isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700')
            }`}
          >
            <MonitorPlay className="w-3.5 h-3.5" /> <span className="hidden sm:inline">3D Viewport</span>
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors ${
              activeTab === 'inventory' 
                ? (isDark ? 'bg-zinc-800 text-white shadow-sm' : 'bg-white text-zinc-900 shadow-sm') 
                : (isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700')
            }`}
          >
            <Box className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Inventory</span>
          </button>
        </div>

        <div className="flex-1"></div>

        {activeTab === 'viewport' && isOnline && (
          <>
            <button
              onClick={() => setShowMobileControls(!showMobileControls)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1.5 mr-2 ${
                showMobileControls
                  ? isDark ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-zinc-200 text-black border-zinc-300'
                  : isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <MousePointer2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Touch Controls</span>
            </button>
            <button
              onClick={() => setKeyboardCapture(!keyboardCapture)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1.5 ${
                keyboardCapture
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                  : isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <KeyboardIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{keyboardCapture ? 'Capture: ON (ESC to exit)' : 'Keyboard Capture Mode'}</span>
              <span className="sm:hidden">{keyboardCapture ? 'ON' : 'Capture'}</span>
            </button>
          </>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex">
        
        {/* Left Side: 3D View or Inventory */}
        <div className="flex-1 relative bg-black flex flex-col items-center justify-center overflow-hidden">
          {activeTab === 'viewport' ? (
            isOnline ? (
              <>
                <iframe 
                  ref={iframeRef}
                  src={`/viewer/${bot.id}/`} 
                  title="Minecraft 3D Viewport"
                  className={`absolute inset-0 w-full h-full border-0 z-0 ${keyboardCapture ? 'pointer-events-auto' : 'pointer-events-none'}`}
                />
                
                {/* Full screen touch capture overlay */}
                {showMobileControls && !keyboardCapture && (
                  <div 
                    className="absolute inset-0 z-10 touch-none pointer-events-auto cursor-move"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={(e) => { e.preventDefault(); /* fallback if using mouse on touch overlay */ }}
                  />
                )}
                
                {/* HUD Overlay layer (pointer events none so it doesn't block camera) */}
                <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4">
                  {/* Top HUD */}
                  <div className="flex justify-between items-start w-full">
                    <div className="w-64 pointer-events-auto">
                      <HeartsAndHunger health={bot.health} maxHealth={bot.maxHealth} food={bot.food} saturation={bot.saturation} />
                    </div>
                    {/* Coordinates Overlay */}
                    <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white font-mono text-[10px] flex items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-1 text-red-400"><span className="opacity-60">X:</span> {bot.position?.x?.toFixed(1) || 0}</div>
                      <div className="flex items-center gap-1 text-green-400"><span className="opacity-60">Y:</span> {bot.position?.y?.toFixed(1) || 0}</div>
                      <div className="flex items-center gap-1 text-blue-400"><span className="opacity-60">Z:</span> {bot.position?.z?.toFixed(1) || 0}</div>
                    </div>
                  </div>
                  
                  {/* Bottom Hotbar */}
                  <div className="w-full flex justify-center pb-[80px] md:pb-4 pointer-events-auto">
                    <div className="flex bg-black/80 p-1 rounded border border-zinc-700/50">
                      {Array.from({ length: 9 }).map((_, i) => {
                        const item = bot.inventory?.[i];
                        const isActive = bot.quickBarSlot === i;
                        return (
                          <button
                            key={i}
                            onClick={() => sendControl('setHotbar', i)}
                            className={`w-10 h-10 md:w-12 md:h-12 border-2 flex items-center justify-center relative text-white ${
                              isActive ? 'border-white bg-white/10' : 'border-zinc-600/50 hover:bg-white/5'
                            }`}
                          >
                            <span className="absolute top-0.5 left-1 text-[8px] opacity-50 font-bold">{i + 1}</span>
                            {item ? (
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] truncate max-w-full px-1">{item.displayName || item.name}</span>
                                {item.count > 1 && <span className="absolute bottom-0 right-1 text-[10px] font-bold">{item.count}</span>}
                              </div>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Mobile Controls Overlay */}
                {showMobileControls && (
                  <div className="absolute inset-0 z-30 pointer-events-none flex items-end justify-between p-4 pb-8 md:pb-16">
                    {/* D-Pad (Left side) */}
                    <div className="relative w-40 h-40 pointer-events-auto opacity-70 hover:opacity-100 transition-opacity">
                      <div className="absolute inset-0 bg-black/40 rounded-full border border-white/20"></div>
                      
                      {/* Up */}
                      <button 
                        className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-14 bg-white/20 rounded-lg flex items-center justify-center active:bg-white/40 touch-none"
                        onTouchStart={() => sendControl('forward', true)}
                        onTouchEnd={() => sendControl('forward', false)}
                        onMouseDown={() => sendControl('forward', true)}
                        onMouseUp={() => sendControl('forward', false)}
                        onMouseLeave={() => sendControl('forward', false)}
                      ><ArrowUp className="w-6 h-6 text-white" /></button>
                      
                      {/* Down */}
                      <button 
                        className="absolute bottom-2 left-1/2 -translate-x-1/2 w-12 h-14 bg-white/20 rounded-lg flex items-center justify-center active:bg-white/40 touch-none"
                        onTouchStart={() => sendControl('back', true)}
                        onTouchEnd={() => sendControl('back', false)}
                        onMouseDown={() => sendControl('back', true)}
                        onMouseUp={() => sendControl('back', false)}
                        onMouseLeave={() => sendControl('back', false)}
                      ><ArrowDown className="w-6 h-6 text-white" /></button>
                      
                      {/* Left */}
                      <button 
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-14 h-12 bg-white/20 rounded-lg flex items-center justify-center active:bg-white/40 touch-none"
                        onTouchStart={() => sendControl('left', true)}
                        onTouchEnd={() => sendControl('left', false)}
                        onMouseDown={() => sendControl('left', true)}
                        onMouseUp={() => sendControl('left', false)}
                        onMouseLeave={() => sendControl('left', false)}
                      ><ArrowLeft className="w-6 h-6 text-white" /></button>
                      
                      {/* Right */}
                      <button 
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-14 h-12 bg-white/20 rounded-lg flex items-center justify-center active:bg-white/40 touch-none"
                        onTouchStart={() => sendControl('right', true)}
                        onTouchEnd={() => sendControl('right', false)}
                        onMouseDown={() => sendControl('right', true)}
                        onMouseUp={() => sendControl('right', false)}
                        onMouseLeave={() => sendControl('right', false)}
                      ><ArrowRight className="w-6 h-6 text-white" /></button>
                      
                      {/* Center / Sneak */}
                      <button 
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white/30 rounded-full flex items-center justify-center active:bg-white/60 touch-none shadow-inner"
                        onTouchStart={() => sendControl('sneak', true)}
                        onTouchEnd={() => sendControl('sneak', false)}
                        onMouseDown={() => sendControl('sneak', true)}
                        onMouseUp={() => sendControl('sneak', false)}
                        onMouseLeave={() => sendControl('sneak', false)}
                      />
                    </div>
                    
                    {/* Action Buttons (Right side) */}
                    <div className="flex gap-4 pointer-events-auto opacity-70 hover:opacity-100 transition-opacity">
                      {/* Action Grid */}
                      <div className="grid grid-cols-2 gap-3 h-32 w-32">
                        {/* Break / Attack */}
                        <button 
                          className="bg-black/50 border border-white/20 rounded-full flex items-center justify-center text-white active:bg-red-500/50 touch-none"
                          onClick={() => sendControl('attack', true)}
                        ><Pickaxe className="w-6 h-6" /></button>
                        
                        {/* Jump */}
                        <button 
                          className="bg-white/20 border border-white/40 rounded-full flex items-center justify-center text-white active:bg-white/50 touch-none"
                          onTouchStart={() => sendControl('jump', true)}
                          onTouchEnd={() => sendControl('jump', false)}
                          onMouseDown={() => sendControl('jump', true)}
                          onMouseUp={() => sendControl('jump', false)}
                          onMouseLeave={() => sendControl('jump', false)}
                        ><ArrowUp className="w-7 h-7" /></button>
                        
                        {/* Use / Place */}
                        <button 
                          className="bg-black/50 border border-white/20 rounded-full flex items-center justify-center text-white active:bg-blue-500/50 touch-none"
                          onClick={() => sendControl('use', true)}
                        ><Hand className="w-6 h-6" /></button>
                        
                        {/* Sprint */}
                        <button 
                          className="bg-black/50 border border-white/20 rounded-full flex items-center justify-center text-white active:bg-green-500/50 touch-none"
                          onTouchStart={() => sendControl('sprint', true)}
                          onTouchEnd={() => sendControl('sprint', false)}
                          onMouseDown={() => sendControl('sprint', true)}
                          onMouseUp={() => sendControl('sprint', false)}
                          onMouseLeave={() => sendControl('sprint', false)}
                        ><Play className="w-5 h-5" /></button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-500 space-y-3 z-10">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <MonitorPlay className="w-8 h-8 text-zinc-600" />
                </div>
                <p className="text-sm font-medium">Viewport Offline</p>
                <p className="text-xs text-zinc-600">Start the bot to view the 3D world stream.</p>
              </div>
            )
          ) : (
            <div className={`w-full h-full p-6 flex flex-col items-center justify-center ${isDark ? 'bg-zinc-950' : 'bg-zinc-100'}`}>
               <div className={`p-8 rounded-3xl border border-dashed flex flex-col items-center gap-4 ${
                 isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-300 bg-white'
               }`}>
                  <Layers className={`w-8 h-8 ${isDark ? 'text-zinc-700' : 'text-zinc-300'}`} />
                  <div className="text-center">
                    <p className={`text-sm font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Inventory Synchronization</p>
                    <p className={`text-xs mt-1 max-w-xs ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      Turn on the "Sync Inventory" plugin in the sidebar to view real-time hotbar and backpack contents here.
                    </p>
                  </div>
               </div>
            </div>
          )}
          
          {/* Keyboard capture overlay hint */}
          {activeTab === 'viewport' && isOnline && !keyboardCapture && !showMobileControls && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
               <div className="px-4 py-2 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white/90 text-xs font-bold flex items-center gap-2 shadow-lg">
                 <Crosshair className="w-4 h-4" /> Click 'Keyboard Capture Mode' to interact with the 3D view
               </div>
            </div>
          )}
        </div>

        {/* Right Side: Chat & Players Widget */}
        <div className={`w-80 shrink-0 border-l flex flex-col hidden lg:flex ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
        }`}>
          <div className="p-3 shrink-0">
             <PlayersWidget 
                players={bot.playersNearby} 
                botUsername={bot.config.username}
             />
          </div>
          <div className="flex-1 relative min-h-0 border-t border-zinc-200 dark:border-zinc-800">
             <ChatConsole 
                chatHistory={bot.chatHistory}
                onSendChat={onSendChat}
                onClearChat={onClearChat}
                botUsername={bot.config.username}
                isOnline={isOnline}
                botStatus={bot.status}
                embedded={true}
             />
          </div>
        </div>
      </div>
    </div>
  );
};
