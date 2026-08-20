class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  init(data) {
    this.player = data.player;
    this.saveData = data.saveData;
  }

  create() {
    const { width, height } = this.scale;
    this.settingsOpen = false;

    this.buildProfileHUD();
    this.buildDPad(width, height);
    this.buildAttackButton(width, height);
    this.buildSettingsButton(width, height);
    this.buildKeyboard();

    // 플레이어 체력 변화 이벤트 구독
    const gameScene = this.scene.get(this.scene.manager.getScenes(true)
      .find(s => s.scene.key !== 'UIScene')?.scene.key || 'CadaverScene');
    if (gameScene) {
      gameScene.events.on('player-health-changed', (hp, maxHp) => {
        this.updateHealthBar(hp, maxHp);
      });
    }
  }

  // ---------- 왼쪽 위: 프로필 + 이름/체력 바 ----------
  buildProfileHUD() {
    const cx = 50, cy = 50;

    this.add.circle(cx, cy, 28, 0x333333).setScrollFactor(0).setDepth(200)
      .setStrokeStyle(2, 0xffffff, 0.6);
    // 임시 프로필 이미지 (플레이어 텍스처 축소 표시)
    this.add.image(cx, cy, 'player_cadaver').setScale(0.7).setScrollFactor(0).setDepth(201);

    const barX = cx + 40;

    this.add.text(barX, cy - 22, this.saveData.playerName, {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#ffffff'
    }).setScrollFactor(0).setDepth(200);

    // 이름 바 배경
    this.add.rectangle(barX + 60, cy - 22, 120, 14, 0x222222).setOrigin(0, 0.5)
      .setScrollFactor(0).setDepth(199).setAlpha(0); // 이름은 텍스트로 대체, 배경 숨김

    // 체력 바
    this.healthBarBg = this.add.rectangle(barX, cy - 2, 120, 12, 0x330000)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(200);
    this.healthBarFill = this.add.rectangle(barX, cy - 2, 120, 12, 0xcc3333)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(201);
    this.healthBarBg.setStrokeStyle(1, 0xffffff, 0.3);

    this.maxBarWidth = 120;
  }

  updateHealthBar(hp, maxHp) {
    const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    this.healthBarFill.width = this.maxBarWidth * ratio;
  }

  // ---------- 왼쪽 아래: 방향키 ----------
  buildDPad(width, height) {
    const baseX = 90, baseY = height - 90, r = 34, gap = 42;
    const dirs = [
      { key: 'up', dx: 0, dy: -gap, vx: 0, vy: -1 },
      { key: 'down', dx: 0, dy: gap, vx: 0, vy: 1 },
      { key: 'left', dx: -gap, dy: 0, vx: -1, vy: 0 },
      { key: 'right', dx: gap, dy: 0, vx: 1, vy: 0 }
    ];

    dirs.forEach(d => {
      const btn = this.add.circle(baseX + d.dx, baseY + d.dy, r * 0.5, 0x444444, 0.7)
        .setScrollFactor(0).setDepth(200).setInteractive();

      btn.on('pointerdown', () => {
        window.InputState.moveX = d.vx;
        window.InputState.moveY = d.vy;
      });
      btn.on('pointerup', () => {
        window.InputState.moveX = 0;
        window.InputState.moveY = 0;
      });
      btn.on('pointerout', () => {
        window.InputState.moveX = 0;
        window.InputState.moveY = 0;
      });
    });
  }

  // ---------- 오른쪽 아래: 공격 버튼 ----------
  buildAttackButton(width, height) {
    const btn = this.add.circle(width - 70, height - 90, 40, 0x883333, 0.8)
      .setScrollFactor(0).setDepth(200).setInteractive();
    this.add.text(width - 70, height - 90, '공격', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#fff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    btn.on('pointerdown', () => (window.InputState.attackPressed = true));
    btn.on('pointerup', () => (window.InputState.attackPressed = false));
    btn.on('pointerout', () => (window.InputState.attackPressed = false));
  }

  // ---------- 오른쪽 위: 설정 ----------
  buildSettingsButton(width, height) {
    const btn = this.add.rectangle(width - 40, 40, 50, 36, 0x222222, 0.8)
      .setScrollFactor(0).setDepth(200).setInteractive().setStrokeStyle(1, 0x555555);
    this.add.text(width - 40, 40, '설정', {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#ccc'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    btn.on('pointerdown', () => this.toggleSettingsMenu(width, height));
  }

  toggleSettingsMenu(width, height) {
    if (this.settingsOpen) {
      this.settingsMenuGroup?.destroy(true);
      this.settingsOpen = false;
      return;
    }
    this.settingsOpen = true;

    const group = this.add.container(0, 0).setScrollFactor(0).setDepth(300);
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
      .setInteractive();
    group.add(overlay);

    const items = ['계속하기', '조작키 설정', '음량 설정', '저장 후 메인으로'];
    items.forEach((label, i) => {
      const y = height / 2 - 80 + i * 55;
      const box = this.add.rectangle(width / 2, y, 220, 44, 0x2a2a2a)
        .setStrokeStyle(1, 0x555555).setInteractive({ useHandCursor: true });
      const txt = this.add.text(width / 2, y, label, {
        fontFamily: 'sans-serif', fontSize: '16px', color: '#eee'
      }).setOrigin(0.5);
      group.add(box);
      group.add(txt);

      box.on('pointerdown', () => this.handleSettingsAction(label, width, height));
    });

    this.settingsMenuGroup = group;
  }

  handleSettingsAction(label, width, height) {
    switch (label) {
      case '계속하기':
        this.toggleSettingsMenu(width, height);
        break;
      case '조작키 설정':
        // TODO: 조작키 리매핑 UI (베타 이후 구현)
        console.log('조작키 설정 - 추후 구현');
        break;
      case '음량 설정':
        // TODO: 슬라이더 UI 연결 (saveData.settings.bgmVolume / sfxVolume)
        console.log('음량 설정 - 추후 구현');
        break;
      case '저장 후 메인으로':
        this.saveData.health = this.player.health;
        SaveManager.save(this.saveData);
        this.scene.stop(this.player.scene.scene.key);
        this.scene.stop();
        this.scene.start('TitleScene');
        break;
    }
  }

  // ---------- 키보드 (PC 테스트용) ----------
  buildKeyboard() {
    const cursors = this.input.keyboard.createCursorKeys();
    const wasd = this.input.keyboard.addKeys('W,A,S,D');

    this.input.keyboard.on('keydown', () => this.updateKeyboardInput(cursors, wasd));
    this.input.keyboard.on('keyup', () => this.updateKeyboardInput(cursors, wasd));

    this.events.on('update', () => this.updateKeyboardInput(cursors, wasd));

    this.input.keyboard.on('keydown-SPACE', () => (window.InputState.attackPressed = true));
    this.input.keyboard.on('keyup-SPACE', () => (window.InputState.attackPressed = false));
  }

  updateKeyboardInput(cursors, wasd) {
    let vx = 0, vy = 0;
    if (cursors.left.isDown || wasd.A.isDown) vx = -1;
    else if (cursors.right.isDown || wasd.D.isDown) vx = 1;
    if (cursors.up.isDown || wasd.W.isDown) vy = -1;
    else if (cursors.down.isDown || wasd.S.isDown) vy = 1;

    // 터치 입력 중이면 키보드가 덮어쓰지 않도록(둘 다 안 눌렸을 때만 반영)
    if (vx !== 0 || vy !== 0) {
      window.InputState.moveX = vx;
      window.InputState.moveY = vy;
    } else if (!this.input.activePointer.isDown) {
      window.InputState.moveX = 0;
      window.InputState.moveY = 0;
    }
  }
}
