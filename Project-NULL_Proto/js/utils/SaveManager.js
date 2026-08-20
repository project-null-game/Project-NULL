// ============================================
// SaveManager
// 지금은 localStorage로 동작 (베타 테스트용).
// 추후 Firebase(Auth+Firestore) 연동 시,
// 아래 3개 함수(save/load/hasSave) 내부만
// Firestore 호출로 교체하면 나머지 코드는 그대로 사용 가능.
// ============================================

const SaveManager = {
  KEY: 'project_null_save',

  // 기본 세이브 구조
  defaultData() {
    return {
      playerName: '이름 없는 좀비',
      currentScene: 'CadaverScene',
      checkpoint: 'cadaver_start',
      health: 100,
      maxHealth: 100,
      zombieType: 'cadaver',
      settings: {
        bgmVolume: 0.5,
        sfxVolume: 0.5
      },
      updatedAt: Date.now()
    };
  },

  hasSave() {
    return localStorage.getItem(this.KEY) !== null;
  },

  save(data) {
    data.updatedAt = Date.now();
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  load() {
    const raw = localStorage.getItem(this.KEY);
    if (!raw) return this.defaultData();
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('세이브 파일 손상, 기본값으로 초기화', e);
      return this.defaultData();
    }
  },

  deleteSave() {
    localStorage.removeItem(this.KEY);
  }
};
