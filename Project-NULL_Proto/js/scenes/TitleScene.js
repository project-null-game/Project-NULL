class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0a0a0a');

    if (this.textures.exists('logo')) {
      const logo = this.add.image(width / 2, height * 0.28, 'logo');
      const maxW = width * 0.7;
      if (logo.width > maxW) logo.setScale(maxW / logo.width);
    } else {
      this.add.text(width / 2, height * 0.3, 'Project: NULL', {
        fontFamily: 'sans-serif',
        fontSize: '48px',
        color: '#e0e0e0'
      }).setOrigin(0.5);
    }

    this.add.text(width / 2, height * 0.44, '치료제는...', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#888888'
    }).setOrigin(0.5);

    // 왼쪽 아래 버전 표시
    this.add.text(16, height - 16, 'Prototype V1.0.2', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#666666'
    }).setOrigin(0, 1);

    const hasSave = SaveManager.hasSave();

    this.makeButton(width / 2, height * 0.55, '새로 시작하기', () => {
      SaveManager.deleteSave();
      const data = SaveManager.defaultData();
      SaveManager.save(data);
      this.scene.start('CadaverScene', { save: data });
    });

    this.makeButton(width / 2, height * 0.65, '계속하기', () => {
      if (!hasSave) return;
      const data = SaveManager.load();
      this.scene.start(data.currentScene || 'CadaverScene', { save: data });
    }, hasSave);
  }

  makeButton(x, y, label, onClick, enabled = true) {
    const color = enabled ? '#2a2a2a' : '#151515';
    const textColor = enabled ? '#ffffff' : '#555555';

    const bg = this.add.rectangle(x, y, 260, 50, Phaser.Display.Color.HexStringToColor(color).color)
      .setStrokeStyle(1, 0x444444)
      .setInteractive({ useHandCursor: enabled });

    const txt = this.add.text(x, y, label, {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: textColor
    }).setOrigin(0.5);

    if (enabled) {
      bg.on('pointerdown', onClick);
      bg.on('pointerover', () => bg.setFillStyle(0x3a3a3a));
      bg.on('pointerout', () => bg.setFillStyle(0x2a2a2a));
    }
  }
}
