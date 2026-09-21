import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { BotPluginsConfig, LocateSettings, PvpSettings, AutoEatSettings, FarmerSettings, AutoMiningSettings, ChatAiSettings, PathfindingSettings } from '../types';
import { Search, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MINECRAFT_BLOCKS = [
  'diamond_ore', 'emerald_ore', 'gold_ore', 'iron_ore', 'coal_ore', 'lapis_ore', 'redstone_ore',
  'ancient_debris', 'nether_quartz_ore', 'nether_gold_ore',
  'obsidian', 'bedrock', 'diamond_block', 'gold_block', 'iron_block',
  'oak_log', 'birch_log', 'spruce_log', 'jungle_log', 'acacia_log', 'dark_oak_log',
  'stone', 'cobblestone', 'dirt', 'grass_block', 'sand', 'gravel'
];

interface PluginAdvancedSettingsProps {
  pluginId: keyof BotPluginsConfig;
  plugins: BotPluginsConfig;
  onUpdateConfig: (updated: Partial<BotPluginsConfig>) => Promise<void>;
  isModal?: boolean;
}

export const PluginAdvancedSettings: React.FC<PluginAdvancedSettingsProps> = ({ pluginId, plugins, onUpdateConfig, isModal }) => {
  const { isDark } = useTheme();

  const handleUpdate = (key: string, value: any) => {
    onUpdateConfig({ [key]: value });
  };

  const blockClasses = `${!isModal ? 'mt-3 ' : ''}p-3 rounded-lg border text-xs space-y-3 transition-colors ${
    isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-slate-100 border-slate-200'
  }`;
  
  const labelClasses = `block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
    isDark ? 'text-zinc-500' : 'text-slate-500'
  }`;
  
  const inputClasses = `w-full px-2.5 py-1.5 rounded-md border text-xs focus:outline-none transition-colors ${
    isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-200 focus:border-zinc-500' : 'bg-white border-slate-300 text-slate-800 focus:border-slate-500'
  }`;
  
  const selectClasses = inputClasses;

  const checkboxLabelClasses = `flex items-center gap-2 text-xs font-medium cursor-pointer ${
    isDark ? 'text-zinc-300' : 'text-slate-700'
  }`;

  if (pluginId === 'locate') {
    const locateSettings: LocateSettings = plugins.locateSettings || { targetBlock: '', searchRadius: 64, autoMine: false };
    
    return (
      <div className={blockClasses}>
        <div>
          <label className={labelClasses}>Target Block ID (Search)</label>
          <div className="relative">
            <div className={`absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={locateSettings.targetBlock}
              onChange={(e) => handleUpdate('locateSettings', { ...locateSettings, targetBlock: e.target.value })}
              placeholder="e.g. diamond_ore"
              className={`${inputClasses} pl-8`}
            />
          </div>
          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {MINECRAFT_BLOCKS.filter(b => b.includes(locateSettings.targetBlock.toLowerCase())).slice(0, 8).map(block => (
              <button
                key={block}
                type="button"
                onClick={() => handleUpdate('locateSettings', { ...locateSettings, targetBlock: block })}
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                  locateSettings.targetBlock === block
                    ? (isDark ? 'bg-zinc-700 border-zinc-600 text-zinc-100' : 'bg-slate-300 border-slate-400 text-slate-900')
                    : (isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50')
                }`}
              >
                {block}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClasses}>Radius</label>
            <input
              type="number"
              min={1} max={256}
              value={locateSettings.searchRadius}
              onChange={(e) => handleUpdate('locateSettings', { ...locateSettings, searchRadius: parseInt(e.target.value) || 64 })}
              className={inputClasses}
            />
          </div>
          <div className="flex items-center pt-5">
            <label className={checkboxLabelClasses}>
              <input
                type="checkbox"
                checked={locateSettings.autoMine}
                onChange={(e) => handleUpdate('locateSettings', { ...locateSettings, autoMine: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-900"
              />
              Auto-Mine Block
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (pluginId === 'pvpMode') {
    const pvpSettings: PvpSettings = plugins.pvpSettings || { detectionRange: 16, weapon: 'auto', targetPriority: 'closest', attackIntervalMs: 600, dodgeProjectiles: true, useShield: true };
    return (
      <div className={blockClasses}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClasses}>Weapon</label>
            <select
              value={pvpSettings.weapon}
              onChange={(e) => handleUpdate('pvpSettings', { ...pvpSettings, weapon: e.target.value })}
              className={selectClasses}
            >
              <option value="auto">Auto-Equip Best</option>
              <option value="sword">Sword Only</option>
              <option value="axe">Axe Only</option>
              <option value="bow">Bow Only</option>
            </select>
          </div>
          <div>
            <label className={labelClasses}>Target Priority</label>
            <select
              value={pvpSettings.targetPriority}
              onChange={(e) => handleUpdate('pvpSettings', { ...pvpSettings, targetPriority: e.target.value })}
              className={selectClasses}
            >
              <option value="closest">Closest Distance</option>
              <option value="lowestHealth">Lowest Health</option>
              <option value="highestHealth">Highest Health</option>
            </select>
          </div>
          <div>
            <label className={labelClasses}>Range (blocks)</label>
            <input
              type="number" min={1} max={64}
              value={pvpSettings.detectionRange}
              onChange={(e) => handleUpdate('pvpSettings', { ...pvpSettings, detectionRange: parseInt(e.target.value) || 16 })}
              className={inputClasses}
            />
          </div>
          <div>
            <label className={labelClasses}>Interval (ms)</label>
            <input
              type="number" min={100} max={2000} step={50}
              value={pvpSettings.attackIntervalMs}
              onChange={(e) => handleUpdate('pvpSettings', { ...pvpSettings, attackIntervalMs: parseInt(e.target.value) || 600 })}
              className={inputClasses}
            />
          </div>
        </div>
        <div className="flex gap-4 pt-1">
          <label className={checkboxLabelClasses}>
            <input type="checkbox" checked={pvpSettings.dodgeProjectiles} onChange={(e) => handleUpdate('pvpSettings', { ...pvpSettings, dodgeProjectiles: e.target.checked })} />
            Dodge Projectiles
          </label>
          <label className={checkboxLabelClasses}>
            <input type="checkbox" checked={pvpSettings.useShield} onChange={(e) => handleUpdate('pvpSettings', { ...pvpSettings, useShield: e.target.checked })} />
            Auto-Shield
          </label>
        </div>
      </div>
    );
  }

  if (pluginId === 'autoEat') {
    const autoEatSettings: AutoEatSettings = plugins.autoEatSettings || { threshold: 14, priority: 'saturation', bannedFoods: ['rotten_flesh', 'spider_eye', 'pufferfish', 'poisonous_potato'] };
    return (
      <div className={blockClasses}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClasses}>Hunger Threshold (0-20)</label>
            <input
              type="number" min={1} max={20}
              value={autoEatSettings.threshold}
              onChange={(e) => handleUpdate('autoEatSettings', { ...autoEatSettings, threshold: parseInt(e.target.value) || 14 })}
              className={inputClasses}
            />
          </div>
          <div>
            <label className={labelClasses}>Food Priority</label>
            <select
              value={autoEatSettings.priority}
              onChange={(e) => handleUpdate('autoEatSettings', { ...autoEatSettings, priority: e.target.value })}
              className={selectClasses}
            >
              <option value="saturation">Highest Saturation</option>
              <option value="foodPoints">Highest Food Points</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelClasses}>Banned Foods</label>
          <input
            type="text"
            value={autoEatSettings.bannedFoods.join(', ')}
            onChange={(e) => handleUpdate('autoEatSettings', { ...autoEatSettings, bannedFoods: e.target.value.split(',').map(s => s.trim()) })}
            placeholder="e.g. rotten_flesh, spider_eye"
            className={inputClasses}
          />
        </div>
      </div>
    );
  }

  if (pluginId === 'farmer') {
    const farmerSettings: FarmerSettings = plugins.farmerSettings || { harvestCrops: true, replant: true, depositInChest: true };
    return (
      <div className={blockClasses}>
        <div className="flex flex-col gap-2">
          <label className={checkboxLabelClasses}>
            <input type="checkbox" checked={farmerSettings.harvestCrops} onChange={(e) => handleUpdate('farmerSettings', { ...farmerSettings, harvestCrops: e.target.checked })} />
            Harvest fully grown crops automatically
          </label>
          <label className={checkboxLabelClasses}>
            <input type="checkbox" checked={farmerSettings.replant} onChange={(e) => handleUpdate('farmerSettings', { ...farmerSettings, replant: e.target.checked })} />
            Replant seeds immediately after harvest
          </label>
          <label className={checkboxLabelClasses}>
            <input type="checkbox" checked={farmerSettings.depositInChest} onChange={(e) => handleUpdate('farmerSettings', { ...farmerSettings, depositInChest: e.target.checked })} />
            Deposit surplus into nearby chests
          </label>
        </div>
      </div>
    );
  }

  if (pluginId === 'autoMining') {
    const autoMiningSettings: AutoMiningSettings = plugins.autoMiningSettings || { targetOres: ['diamond_ore', 'emerald_ore', 'gold_ore', 'iron_ore'], tunnelType: 'branch', placeTorches: true };
    return (
      <div className={blockClasses}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClasses}>Tunnel Strategy</label>
            <select
              value={autoMiningSettings.tunnelType}
              onChange={(e) => handleUpdate('autoMiningSettings', { ...autoMiningSettings, tunnelType: e.target.value })}
              className={selectClasses}
            >
              <option value="branch">Branch Mining</option>
              <option value="strip">Strip Mining</option>
              <option value="staircase">Staircase to Bedrock</option>
            </select>
          </div>
          <div className="flex items-center pt-5">
            <label className={checkboxLabelClasses}>
              <input type="checkbox" checked={autoMiningSettings.placeTorches} onChange={(e) => handleUpdate('autoMiningSettings', { ...autoMiningSettings, placeTorches: e.target.checked })} />
              Auto-Place Torches
            </label>
          </div>
        </div>
        <div>
          <label className={labelClasses}>Target Ores</label>
          <input
            type="text"
            value={autoMiningSettings.targetOres.join(', ')}
            onChange={(e) => handleUpdate('autoMiningSettings', { ...autoMiningSettings, targetOres: e.target.value.split(',').map(s => s.trim()) })}
            placeholder="e.g. diamond_ore, iron_ore"
            className={inputClasses}
          />
        </div>
      </div>
    );
  }

  if (pluginId === 'chatAi') {
    const chatAiSettings: ChatAiSettings = plugins.chatAiSettings || { personality: 'helpful', respondToMentionsOnly: true, memoryLimit: 10 };
    return (
      <div className={blockClasses}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClasses}>AI Personality</label>
            <select
              value={chatAiSettings.personality}
              onChange={(e) => handleUpdate('chatAiSettings', { ...chatAiSettings, personality: e.target.value })}
              className={selectClasses}
            >
              <option value="friendly">Friendly & Casual</option>
              <option value="helpful">Helpful Assistant</option>
              <option value="sarcastic">Sarcastic & Witty</option>
              <option value="professional">Professional</option>
            </select>
          </div>
          <div>
            <label className={labelClasses}>Memory Limit (msgs)</label>
            <input
              type="number" min={0} max={50}
              value={chatAiSettings.memoryLimit}
              onChange={(e) => handleUpdate('chatAiSettings', { ...chatAiSettings, memoryLimit: parseInt(e.target.value) || 10 })}
              className={inputClasses}
            />
          </div>
        </div>
        <div className="pt-2">
          <label className={checkboxLabelClasses}>
            <input type="checkbox" checked={chatAiSettings.respondToMentionsOnly} onChange={(e) => handleUpdate('chatAiSettings', { ...chatAiSettings, respondToMentionsOnly: e.target.checked })} />
            Only respond when directly mentioned (e.g. "hey bot")
          </label>
        </div>
      </div>
    );
  }
  
  if (pluginId === 'pathfinding') {
    const pathfindingSettings: PathfindingSettings = plugins.pathfindingSettings || { allowDiagonal: true, avoidWater: true, sprint: true };
    return (
      <div className={blockClasses}>
        <div className="flex flex-col gap-2">
          <label className={checkboxLabelClasses}>
            <input type="checkbox" checked={pathfindingSettings.allowDiagonal} onChange={(e) => handleUpdate('pathfindingSettings', { ...pathfindingSettings, allowDiagonal: e.target.checked })} />
            Allow Diagonal Movement (A*)
          </label>
          <label className={checkboxLabelClasses}>
            <input type="checkbox" checked={pathfindingSettings.avoidWater} onChange={(e) => handleUpdate('pathfindingSettings', { ...pathfindingSettings, avoidWater: e.target.checked })} />
            Avoid Water & Lava automatically
          </label>
          <label className={checkboxLabelClasses}>
            <input type="checkbox" checked={pathfindingSettings.sprint} onChange={(e) => handleUpdate('pathfindingSettings', { ...pathfindingSettings, sprint: e.target.checked })} />
            Sprint when path is clear (consumes hunger)
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className={blockClasses}>
      <div className="flex flex-col p-2 space-y-4">
        <div>
          <label className={labelClasses}>Module Execution Priority</label>
          <select className={selectClasses} defaultValue="normal">
            <option value="low">Low (Background Task)</option>
            <option value="normal">Normal (Standard Tick)</option>
            <option value="high">High (Priority Tick)</option>
          </select>
        </div>
        
        <div className="pt-2 border-t border-black/5 dark:border-white/5">
          <label className={checkboxLabelClasses}>
            <input type="checkbox" defaultChecked={true} className="rounded" />
            Enable Detailed Console Logging
          </label>
          <p className={`mt-1 text-[10px] pl-6 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
            Outputs detailed execution logs for this specific module to the developer console.
          </p>
        </div>
      </div>
    </div>
  );
};
