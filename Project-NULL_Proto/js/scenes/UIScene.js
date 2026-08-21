class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  init(data) {
    this.player = data.player;
    this.saveData = data.saveData;
    this.targetX = data.targetX;
    this.targetY = data.targetY;
  }

  create() {
    const { width, height } = this.scale;
    this.settingsOpen = false;

    this.buildProfileHUD();
    this.buildDPad(width, height);
    this.buildAttackButton(width, height);
    this.buildSettingsButton(width, height);
    this.buildKeyboard();
    this.buildInGameLogo(width);
    this.buildVersionLabel(height);
    this.buildExitArrow(width, height);

    // 플레이어 체력 변화 이벤트 구독
    const gameScene = this.scene.get(this.scene.manager.getScenes(true)
      .find(s => s.scene.key !== 'UIScene')?.scene.key || 'CadaverScene');
    if (gameScene) {
      gameScene.events.on('player-health-changed', (hp, maxHp) => {
        this.updateHealthBar(hp, maxHp);
      });
    }
  }

  // ---------- 가운데 위: 인게임 로고 ----------
  buildInGameLogo(width) {
    if (!this.textures.exists('logo')) return;
    const logo = this.add.image(width / 2, 24, 'logo').setScrollFactor(0).setDepth(200);
    const maxW = 160;
    if (logo.width > maxW) logo.setScale(maxW / logo.width);
    logo.setAlpha(0.9);
  }

  // ---------- 왼쪽 아래: 버전 표시 ----------
  buildVersionLabel(height) {
    this.add.text(10, height - 8, 'Prototype V1.0.4', {
      fontFamily: 'sans-serif', fontSize: '12px', color: '#666666'
    }).setOrigin(0, 1).setScrollFactor(0).setDepth(200);
  }

  // ---------- 출구/도착지를 가리키는 빨간 화살표 ----------
  buildExitArrow(width, height) {
    if (this.targetX === undefined) return;

    // 삼각형(위쪽을 향한 화살표)을 기준점(0,0)에 만들고, 매 프레임 회전/위치만 갱신
    this.exitArrow = this.add.triangle(0, 0, 0, -12, -9, 9, 9, 9, 0xff2222)
      .setScrollFactor(0).setDepth(210).setStrokeStyle(1, 0xffffff, 0.4);

    this.arrowCenter = { x: width / 2, y: height / 2 + 10 };
    this.arrowRadius = 100;
  }

  updateExitArrow() {
    if (!this.exitArrow || !this.player) return;
    const dx = this.targetX - this.player.x;
    const dy = this.targetY - this.player.y;
    const angle = Math.atan2(dy, dx);

    const ax = this.arrowCenter.x + Math.cos(angle) * this.arrowRadius;
    const ay = this.arrowCenter.y + Math.sin(angle) * this.arrowRadius;

    this.exitArrow.setPosition(ax, ay);
    this.exitArrow.setRotation(angle + Math.PI / 2); // 기본 도형이 위쪽을 향하므로 90도 보정
  }

  update() {
    this.updateExitArrow();
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

  // ---------- 왼쪽 아래: 조이스틱 방식 이동 ----------
  buildDPad(width, height) {
    const baseX = 110, baseY = height - 110;
    const baseRadius = 65;
    const knobRadius = 32;

    const base = this.add.circle(baseX, baseY, baseRadius, 0x444444, 0.35)
      .setScrollFactor(0).setDepth(200).setStrokeStyle(2, 0xffffff, 0.25);
    const knob = this.add.circle(baseX, baseY, knobRadius, 0x777777, 0.85)
      .setScrollFactor(0).setDepth(201).setStrokeStyle(2, 0xffffff, 0.5);

    // 실제 터치 인식 영역은 베이스보다 더 크게 잡아 손가락이 살짝 벗어나도 잘 잡히게 함
    const hitArea = this.add.circle(baseX, baseY, baseRadius + 30, 0x000000, 0.001)
      .setScrollFactor(0).setDepth(202).setInteractive();

    let dragging = false;

    const applyDirection = (dx, dy) => {
      // 이동은 좀비(플레이어)와 동일한 "한 칸씩" 규칙을 그대로 따름 - 조이스틱은 방향만 알려줌
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
        window.InputState.moveX = 0;
        window.InputState.moveY = 0;
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        window.InputState.moveX = dx > 0 ? 1 : -1;
        window.InputState.moveY = 0;
      } else {
        window.InputState.moveX = 0;
        window.InputState.moveY = dy > 0 ? 1 : -1;
      }
    };

    const updateKnob = (pointer) => {
      const dx = pointer.x - baseX;
      const dy = pointer.y - baseY;
      const dist = Math.min(baseRadius, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      knob.setPosition(baseX + Math.cos(angle) * dist, baseY + Math.sin(angle) * dist);
      applyDirection(dx, dy);
    };

    const resetKnob = () => {
      dragging = false;
      knob.setPosition(baseX, baseY);
      window.InputState.moveX = 0;
      window.InputState.moveY = 0;
    };

    hitArea.on('pointerdown', (pointer) => {
      dragging = true;
      updateKnob(pointer);
    });
    this.input.on('pointermove', (pointer) => {
      if (dragging) updateKnob(pointer);
    });
    this.input.on('pointerup', () => {
      if (dragging) resetKnob();
    });
    this.input.on('pointerupoutside', () => {
      if (dragging) resetKnob();
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
