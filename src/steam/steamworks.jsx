const isTauri = () => typeof window !== "undefined" && window.__TAURI__;

async function invoke(cmd, args) {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke(cmd, args);
  } catch { return null; }
}

const api = {
  isAvailable: false,

  async init() {
    if (!isTauri()) return;
    this.isAvailable = await invoke("steam_is_available") || false;
    if (this.isAvailable) {
      this.userName = await invoke("steam_user_name");
    }
  },

  async unlockAchievement(id) {
    if (!this.isAvailable) return;
    await invoke("steam_unlock_achievement", { id });
  },

  async setRichPresence(key, value) {
    if (!this.isAvailable) return;
    await invoke("steam_set_presence", { key, value });
  },

  async setInStudio() { this.setRichPresence("status", "In Studio"); },
  async setInBattle() { this.setRichPresence("status", "In Battle"); },
  async setBrowsing() { this.setRichPresence("status", "Browsing Feed"); },
  async setIdle()     { this.setRichPresence("status", "Idle"); },
};

if (isTauri()) {
  window.steamworks = api;
  setTimeout(() => api.init(), 1000);
}

export default api;
