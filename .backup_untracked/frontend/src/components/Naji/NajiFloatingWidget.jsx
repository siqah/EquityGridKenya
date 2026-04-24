import { useNaji } from '../../context/NajiContext';

export default function NajiFloatingWidget() {
  const { voiceState, expanded, setExpanded, startListening, log } = useNaji();

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-2 max-w-[min(100vw-2rem,360px)]">
      {expanded && (
        <div className="w-full rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[min(70vh,420px)]">
          <div className="px-3 py-2 border-b border-border bg-surface-muted/80 flex justify-between items-center">
            <span className="text-xs font-bold text-primary">NAJI</span>
            <button type="button" className="text-xs text-muted hover:text-body" onClick={() => setExpanded(false)}>
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {log.length === 0 && <p className="text-xs text-muted text-center py-6">Tap the mic and try &quot;NAJI look up account ACC 168669&quot;</p>}
            {log.map((row, i) => (
              <div key={`${row.ts}-${i}`} className="space-y-1">
                <div className="flex justify-end">
                  <div className="max-w-[92%] rounded-2xl rounded-br-sm bg-slate-100 text-slate-800 px-3 py-2 text-xs">
                    {row.user}
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-blue-50 text-primary border border-blue-100 px-3 py-2 text-xs leading-relaxed">
                    {row.naji}
                  </div>
                </div>
                <div className="text-[10px] text-muted text-center">{row.ts}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-full border border-border bg-surface/95 backdrop-blur shadow-card pl-2 pr-1 py-1">
        <div
          className={`relative w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow shrink-0 ${
            voiceState === 'listening' ? 'ring-4 ring-blue-400/50 animate-pulse' : ''
          } ${voiceState === 'thinking' ? 'ring-2 ring-amber-300' : ''} ${
            voiceState === 'speaking' ? 'ring-2 ring-emerald-400' : ''
          }`}
        >
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=NajiKenya&mouth=smile&eyes=happy"
            alt=""
            className="w-full h-full object-cover bg-sky-100"
          />
          {voiceState === 'speaking' && (
            <span className="absolute inset-x-0 bottom-0 h-1 bg-emerald-400/80 animate-pulse" aria-hidden />
          )}
        </div>
        <div className="flex flex-col min-w-0 pr-1">
          <span className="text-[11px] font-bold text-primary leading-tight">NAJI</span>
          <span className="text-[10px] text-muted truncate max-w-[100px]">
            {voiceState === 'listening' && 'Listening…'}
            {voiceState === 'thinking' && 'Thinking…'}
            {voiceState === 'speaking' && 'NAJI is speaking'}
            {voiceState === 'idle' && 'Energy ally'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setExpanded(true);
            startListening();
          }}
          className={`w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-lg shadow hover:opacity-95 transition-transform ${
            voiceState === 'idle' ? 'naji-mic-pulse' : ''
          }`}
          aria-label="Talk to NAJI"
        >
          🎙
        </button>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-semibold text-muted px-2 py-2 hover:text-body"
          aria-expanded={expanded}
        >
          {expanded ? '▼' : '▲'}
        </button>
      </div>
    </div>
  );
}
