const isTauri = () => typeof window !== "undefined" && window.__TAURI__;

async function tauriInvoke(cmd, args) {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke(cmd, args);
  } catch { return null; }
}

const steamCloud = {
  async get(k) {
    const v = await tauriInvoke("steam_load_file", { key: k });
    if (v !== null && v !== undefined) {
      try { return JSON.parse(v); } catch { return v; }
    }
    return null;
  },
  async set(k, v) {
    const str = typeof v === "string" ? v : JSON.stringify(v);
    await tauriInvoke("steam_save_file", { key: k, value: str });
    return true;
  }
};

if (isTauri()) {
  window.storage = steamCloud;
}

export { steamCloud, isTauri };
