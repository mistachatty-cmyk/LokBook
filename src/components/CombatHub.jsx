import { useState } from "react";
import Battle from "../pages/Battle.jsx";
import OpenFront from "../pages/OpenFront.jsx";

export function CombatHub({
  mode = "battle",
  T,
  modules,
  paper,
  cursorPack,
  ownedTiers,
  ccTier,
  wins,
  bigBattleOwned,
  kids,
  phase,
  lillok,
  customLilLok,
  say,
  blip,
  hap,
  animFx,
  authorName,
  onLine,
  onUnlockBig,
  onResult,
  onPublish,
  loks,
  dailyPrompt,
  hinted,
  onHinted,
  onWager,
  onEarn,
  battleRoyaleCount,
  setBattleRoyaleCount,
  addLoks,
  gainXp,
  questTick,
  setLillok,
  feedLilLok,
  pushNotif,
  setWins,
  setPosts,
  nudgeGuestSave,
}) {
  const [combatMode, setCombatMode] = useState(mode);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", marginBottom: 8 }}>
        <button
          onClick={() => setCombatMode("battle")}
          className="lok-btn text-xs font-bold px-3 py-1.5"
          style={{
            background: combatMode === "battle" ? T.accent : T.card,
            color: combatMode === "battle" ? T.onAccent : T.ink,
            border: `1.5px solid ${combatMode === "battle" ? T.accent : T.shadow}`,
            transition: "all 0.2s ease",
          }}
        >
          ⚔️ Battle
        </button>
        <button
          onClick={() => setCombatMode("rush")}
          className="lok-btn text-xs font-bold px-3 py-1.5"
          style={{
            background: combatMode === "rush" ? T.accent : T.card,
            color: combatMode === "rush" ? T.onAccent : T.ink,
            border: `1.5px solid ${combatMode === "rush" ? T.accent : T.shadow}`,
            transition: "all 0.2s ease",
          }}
        >
          🚀 Rush
        </button>
      </div>

      {combatMode === "battle" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
            <span className="lok-display font-extrabold text-sm" style={{ color: battleRoyaleCount >= 5 ? T.accent : T.ink }}>
              🔥 Battle Royale
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setBattleRoyaleCount(c => c + 1);
                    if (i === 4) {
                      addLoks(30);
                      say("Battle Royale hype! +30 Loks", "success");
                    }
                  }}
                  className="lok-btn w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{
                    border: `2px solid ${i < battleRoyaleCount ? T.accent : T.shadow}`,
                    background: i < battleRoyaleCount ? T.accent : "transparent",
                    color: i < battleRoyaleCount ? T.onAccent : T.ink,
                  }}
                  aria-label={i < battleRoyaleCount ? "Hype unlocked" : "Add hype"}
                >
                  {i < battleRoyaleCount ? "🔥" : "+"}
                </button>
              ))}
            </div>
            {battleRoyaleCount >= 5 && (
              <span className="text-xs font-bold" style={{ color: T.accent }}>
                READY!
              </span>
            )}
          </div>
          <Battle
            modules={modules}
            paper={paper}
            cursorPack={cursorPack}
            ownedTiers={ownedTiers}
            ccTier={ccTier}
            wins={wins}
            bigBattleOwned={bigBattleOwned}
            kids={kids}
            phase={phase}
            lillok={lillok}
            customLilLok={customLilLok}
            say={say}
            blip={blip}
            hap={hap}
            animFx={animFx}
            authorName={authorName}
            onLine={onLine}
            onUnlockBig={onUnlockBig}
            onResult={onResult}
            onPublish={onPublish}
          />
        </>
      )}

      {combatMode === "rush" && (
        <OpenFront
          kids={kids}
          loks={loks}
          dailyPrompt={dailyPrompt}
          hinted={hinted}
          onHinted={onHinted}
          onWager={onWager}
          onEarn={onEarn}
          blip={blip}
          say={say}
        />
      )}
    </div>
  );
}
