import React from "react";
import { 
  Youtube, 
  Sparkles, 
  Users, 
  MessageSquare, 
  CheckCircle, 
  TrendingUp, 
  AlertCircle,
  PlusCircle,
  BrainCircuit
} from "lucide-react";
import { YTChannel, YTComment } from "../types";

interface HeaderProps {
  channels: YTChannel[];
  activeChannel: YTChannel | null;
  onSelectChannel: (channelId: string) => void;
  comments: YTComment[];
  aiStatus: { hasApiKey: boolean; loading: boolean };
  onOpenSyncModal: () => void;
}

export default function Header({
  channels,
  activeChannel,
  onSelectChannel,
  comments,
  aiStatus,
  onOpenSyncModal
}: HeaderProps) {
  // Calculate statistics
  const totalComments = comments.length;
  const pendingCount = comments.filter(c => !c.isReplied).length;
  const repliedCount = comments.filter(c => c.isReplied).length;
  
  // Calculate general sentiment score
  const positiveCount = comments.filter(c => c.sentiment === "positive").length;
  const questionCount = comments.filter(c => c.sentiment === "question").length;
  const sentimentPct = totalComments > 0 
    ? Math.round(((positiveCount + questionCount * 0.5) / totalComments) * 100) 
    : 100;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100" id="studio-header">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-red-600 text-white p-2 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/30">
            <Youtube size={24} className="animate-pulse" />
          </div>
          <div>
            <span className="font-sans text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-red-500 bg-clip-text text-transparent">
              YouTube Comment Studio
            </span>
            <span className="ml-2 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded bg-red-500/10 text-red-400 border border-red-500/20">
              AI Powered
            </span>
          </div>
        </div>

        {/* Channel Selector & AI Badge */}
        <div className="flex items-center space-x-4">
          {/* AI Connection Status */}
          <div 
            className={`hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-300 ${
              aiStatus.hasApiKey 
                ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/10" 
                : "bg-amber-950/40 text-amber-400 border-amber-500/30 shadow-sm shadow-amber-500/10"
            }`}
            title={aiStatus.hasApiKey ? "Gemini API Connectée" : "Mode Simulation (Pas de Clé API Gemini)"}
          >
            {aiStatus.hasApiKey ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <BrainCircuit size={14} className="text-emerald-400" />
                <span>Gemini Pro Actif</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <Sparkles size={14} className="text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                <span>IA Mode Démo (Clé absente)</span>
              </>
            )}
          </div>

          {/* Sync Button */}
          <button 
            onClick={onOpenSyncModal}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-medium cursor-pointer transition-all"
            id="sync-channel-btn"
          >
            <PlusCircle size={14} />
            <span className="hidden sm:inline">Importer Chaîne</span>
          </button>

          {/* Selector */}
          {activeChannel && (
            <div className="flex items-center space-x-2 bg-slate-800/90 border border-slate-700/80 px-2 py-1 rounded-xl">
              <img 
                src={activeChannel.avatar} 
                alt={activeChannel.name} 
                className="w-7 h-7 rounded-full object-cover ring-2 ring-red-600/30"
              />
              <select
                value={activeChannel.id}
                onChange={(e) => onSelectChannel(e.target.value)}
                className="bg-transparent text-slate-100 text-xs font-semibold focus:outline-none pr-6 cursor-pointer border-none"
                id="channel-select"
              >
                {channels.map((chan) => (
                  <option key={chan.id} value={chan.id} className="bg-slate-800 text-slate-100">
                    {chan.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="bg-slate-950/60 border-t border-slate-800/50 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Channel Info */}
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/40 flex items-center space-x-3 shadow-inner" id="stat-subscribers">
            <div className="p-2 bg-red-950/30 text-red-400 rounded-lg">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Abonnés</p>
              <p className="text-sm font-bold text-slate-100">
                {activeChannel ? activeChannel.subscriberCount.toLocaleString('fr-FR') : "0"}
              </p>
            </div>
          </div>

          {/* Card 2: Total comments */}
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/40 flex items-center space-x-3 shadow-inner" id="stat-comments">
            <div className="p-2 bg-slate-800 text-slate-400 rounded-lg">
              <MessageSquare size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Total Commentaires</p>
              <p className="text-sm font-bold text-slate-100">{totalComments}</p>
            </div>
          </div>

          {/* Card 3: Pending reply */}
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/40 flex items-center space-x-3 shadow-inner" id="stat-pending">
            <div className={`p-2 rounded-lg ${pendingCount > 0 ? "bg-amber-950/30 text-amber-400" : "bg-emerald-950/30 text-emerald-400"}`}>
              {pendingCount > 0 ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">À Répondre</p>
              <p className={`text-sm font-bold ${pendingCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                {pendingCount} {pendingCount === 0 && "🎉"}
              </p>
            </div>
          </div>

          {/* Card 4: Sentiment */}
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/40 flex items-center space-x-3 shadow-inner" id="stat-sentiment">
            <div className="p-2 bg-indigo-950/30 text-indigo-400 rounded-lg">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Index de Satisfaction</p>
              <p className="text-sm font-bold text-slate-100">{sentimentPct}% positif</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
