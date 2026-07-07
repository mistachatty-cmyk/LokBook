import ACH from "./achievements.json";
import steamworks from "./steamworks.jsx";

const ACH_MAP = ACH;

export function checkAchievements(state) {
  if (!steamworks.isAvailable) return;

  const checks = {
    "lok:first_flip":    state.posts >= 1,
    "lok:five_flips":    state.posts >= 5,
    "lok:ten_flips":     state.posts >= 10,
    "lok:series_start":  state.series >= 1,
    "lok:first_vote":    state.votes >= 1,
    "lok:ten_votes":     state.votes >= 10,
    "lok:fifty_votes":   state.votes >= 50,
    "lok:first_lok":     state.lokd >= 1,
    "lok:streak_3":      state.streak >= 3,
    "lok:streak_7":      state.streak >= 7,
    "lok:streak_30":     state.streak >= 30,
    "lok:streak_100":    state.streak >= 100,
    "lok:first_views":   state.views >= 100,
    "lok:top_voted":     state.receivedVotes >= 50,
    "lok:revivalist":    state.revivals >= 1,
    "lok:offline_rider": state.offlineBonuses >= 1,
    "lok:founder":       state.founder === true,
    "lok:veteran":       state.battleWins >= 10,
    "lok:collector":     state.mythicOwned >= 5,
    "lok:mythic_first":  state.mythicOwned >= 1,
    "lok:shopaholic":    state.totalSpent >= 1000,
    "lok:pet_unlock":    state.petsUnlocked >= 1,
    "lok:skin_collector": state.skinsUnlocked >= 4,
  };

  for (const [lokId, achieved] of Object.entries(checks)) {
    if (achieved) {
      const ach = ACH_MAP[lokId];
      if (ach) steamworks.unlockAchievement(ach.id);
    }
  }
}
