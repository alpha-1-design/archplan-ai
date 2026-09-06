import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../stores/appStore';
import type { Material } from '../../types';
import { chatWithAI, isGeminiConfigured } from '../../lib/gemini';

const materials: { id: Material; label: string; color: string }[] = [
  { id: 'concrete', label: 'Concrete', color: '#6b7280' },
  { id: 'brick', label: 'Brick', color: '#b91c1c' },
  { id: 'wood', label: 'Wood', color: '#92400e' },
  { id: 'glass', label: 'Glass', color: '#0ea5e9' },
  { id: 'steel', label: 'Steel', color: '#475569' },
];

export function RightSidebar() {
  const {
    viewMode,
    modelSettings,
    setWallHeight,
    setWallThickness,
    setDefaultMaterial,
    plan,
    selectedElementId,
    chatHistory,
    addChatMessage,
  } = useAppStore();

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'properties' | 'chat'>('properties');

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    addChatMessage({ role: 'user', content: userMessage });
    setIsTyping(true);

    try {
      const response = await chatWithAI(userMessage, JSON.stringify(plan));
      addChatMessage({ role: 'assistant', content: response });
    } catch {
      addChatMessage({ role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' });
    } finally {
      setIsTyping(false);
    }
  };

  const selectedWall = selectedElementId
    ? plan.walls.find((w) => w.id === selectedElementId)
    : null;
  const selectedDoor = selectedElementId
    ? plan.doors.find((d) => d.id === selectedElementId)
    : null;
  const selectedWindow = selectedElementId
    ? plan.windows.find((w) => w.id === selectedElementId)
    : null;

  return (
    <motion.aside
      className="w-80 glass-strong flex flex-col z-40"
      initial={{ x: 320 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
    >
      {/* Tab header */}
      <div className="flex border-b border-glass-border">
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-3 text-xs font-medium transition-colors ${
            activeTab === 'properties' ? 'text-cyan border-b-2 border-cyan' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Properties
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-xs font-medium transition-colors relative ${
            activeTab === 'chat' ? 'text-cyan border-b-2 border-cyan' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          AI Assistant
          {!isGeminiConfigured() && (
            <span className="absolute top-2 right-6 w-2 h-2 bg-amber rounded-full" />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'properties' ? (
          <motion.div
            key="properties"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex-1 overflow-y-auto p-4 space-y-6"
          >
            {/* Project Stats */}
            <section>
              <h3 className="text-[10px] font-mono text-cyan/70 uppercase tracking-wider mb-3">
                Project Overview
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blueprint/50 rounded-lg p-3 border border-glass-border">
                  <p className="text-[10px] text-gray-400">Walls</p>
                  <p className="text-lg font-semibold text-white">{plan.walls.length}</p>
                </div>
                <div className="bg-blueprint/50 rounded-lg p-3 border border-glass-border">
                  <p className="text-[10px] text-gray-400">Rooms</p>
                  <p className="text-lg font-semibold text-white">{plan.rooms.length}</p>
                </div>
                <div className="bg-blueprint/50 rounded-lg p-3 border border-glass-border">
                  <p className="text-[10px] text-gray-400">Doors</p>
                  <p className="text-lg font-semibold text-white">{plan.doors.length}</p>
                </div>
                <div className="bg-blueprint/50 rounded-lg p-3 border border-glass-border">
                  <p className="text-[10px] text-gray-400">Windows</p>
                  <p className="text-lg font-semibold text-white">{plan.windows.length}</p>
                </div>
              </div>
            </section>

            {/* Selected element properties */}
            {selectedElementId && (selectedWall || selectedDoor || selectedWindow) && (
              <section>
                <h3 className="text-[10px] font-mono text-cyan/70 uppercase tracking-wider mb-3">
                  Selected Element
                </h3>
                <div className="bg-blueprint/50 rounded-lg p-3 border border-glass-border space-y-3">
                  {selectedWall && (
                    <>
                      <div>
                        <label className="text-[10px] text-gray-400">Type</label>
                        <p className="text-sm text-white">Wall</p>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400">Height (m)</label>
                        <input
                          type="number"
                          value={selectedWall.height}
                          onChange={() => {
                            // Would update wall height
                          }}
                          className="w-full bg-blueprint border border-glass-border rounded px-2 py-1 text-sm text-white mt-1"
                        />
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}

            {/* 3D Model Settings */}
            {viewMode === '3d' && (
              <section>
                <h3 className="text-[10px] font-mono text-cyan/70 uppercase tracking-wider mb-3">
                  Model Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-gray-400">Wall Height (m)</label>
                    <input
                      type="range"
                      min="2"
                      max="5"
                      step="0.1"
                      value={modelSettings.wallHeight}
                      onChange={(e) => setWallHeight(parseFloat(e.target.value))}
                      className="w-full mt-2 accent-cyan"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                      <span>2m</span>
                      <span className="text-cyan font-mono">{modelSettings.wallHeight}m</span>
                      <span>5m</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400">Wall Thickness (m)</label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.5"
                      step="0.01"
                      value={modelSettings.wallThickness}
                      onChange={(e) => setWallThickness(parseFloat(e.target.value))}
                      className="w-full mt-2 accent-cyan"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                      <span>0.1m</span>
                      <span className="text-cyan font-mono">{modelSettings.wallThickness}m</span>
                      <span>0.5m</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400">Material</label>
                    <div className="grid grid-cols-5 gap-2 mt-2">
                      {materials.map((mat) => (
                        <button
                          key={mat.id}
                          onClick={() => setDefaultMaterial(mat.id)}
                          className={`
                            h-10 rounded-lg border-2 transition-all flex flex-col items-center justify-center
                            ${modelSettings.defaultMaterial === mat.id
                              ? 'border-cyan scale-105'
                              : 'border-transparent hover:border-gray-600'
                            }
                          `}
                          style={{ backgroundColor: mat.color + '33' }}
                        >
                          <div
                            className="w-4 h-4 rounded-full mb-0.5"
                            style={{ backgroundColor: mat.color }}
                          />
                          <span className="text-[8px] text-gray-300">{mat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex-1 flex flex-col"
          >
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto rounded-full bg-cyan/10 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-cyan/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400">Arch AI Assistant</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {isGeminiConfigured()
                      ? 'Ask me anything about building design'
                      : 'Add GOOGLE_API_KEY for AI features'}
                  </p>
                </div>
              )}

              {chatHistory.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[85%] rounded-2xl px-4 py-2.5 text-sm
                      ${msg.role === 'user'
                        ? 'bg-cyan/20 text-white border border-cyan/30'
                        : 'bg-blueprint-light text-gray-200 border border-glass-border'
                      }
                    `}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-blueprint-light rounded-2xl px-4 py-3 border border-glass-border">
                    <div className="flex gap-1">
                      <motion.div
                        className="w-2 h-2 bg-cyan/50 rounded-full"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-cyan/50 rounded-full"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-cyan/50 rounded-full"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Chat input */}
            <div className="p-4 border-t border-glass-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask Arch AI..."
                  className="flex-1 bg-blueprint border border-glass-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan/50 transition-colors"
                />
                <motion.button
                  onClick={handleSendMessage}
                  className="w-10 h-10 rounded-xl bg-cyan/20 border border-cyan/40 flex items-center justify-center text-cyan hover:bg-cyan/30 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </motion.button>
              </div>
              {!isGeminiConfigured() && (
                <p className="text-[10px] text-amber mt-2 flex items-center gap-1">
                  <span>⚠</span> Using demo responses. Add GOOGLE_API_KEY for full AI capabilities.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
