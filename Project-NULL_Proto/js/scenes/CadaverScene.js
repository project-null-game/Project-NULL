class CadaverScene extends Phaser.Scene {
  constructor() {
    super('CadaverScene');
  }

  init(data) {
    this.saveData = data.save || SaveManager.load();
  }

  create() {
    const roomW = 800;
    const roomH = 600;

    this.cameras.main.setBackgroundColor('#1a1d1a');
    this.physics.world.setBounds(0, 0, roomW, roomH);
    this.cameras.main.setBounds(0, 0, roomW, roomH);

    // 바닥/벽 타일 렌더링 (없으면 기존 그리드로 대체)
    this.drawLabRoom(roomW, roomH);

    // 플레이어 생성
    this.player = new Player(this, roomW / 2, roomH / 2, 'player_cadaver', this.saveData.playerName);
    this.player.health = this.saveData.health;
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // 스폰 지점에 캡슐(포드) 장식 - "여기서 깨어났다"는 느낌
    if (this.textures.exists('lab_pod')) {
      this.add.image(roomW / 2, roomH / 2 - TILE, 'lab_pod').setDepth(5);
    }

    // 출구 (화면 오른쪽 끝) - 밟으면 공원 씬으로 이동
    this.exitZone = this.add.zone(roomW - 20, roomH / 2, 40, 200);
    this.physics.add.existing(this.exitZone, true);
    this.physics.add.overlap(this.player, this.exitZone, () => this.goToMarket());

    this.add.text(roomW - 70, roomH / 2, '출구 →\n(모르스 구역)', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#888', align: 'center'
    }).setOrigin(0.5);

    // 맵 경계 벽 (World bounds와 별개로 이중 안전장치) - 플레이어가 맵 밖으로 나가지 못하게 막음
    this.buildBoundaryWalls(roomW, roomH);

    // 연구소 소품 배치 (충돌 장애물)
    this.buildLabProps();

    // UI 오버레이 씬 실행
    this.scene.launch('UIScene', {
      player: this.player,
      saveData: this.saveData,
      targetX: this.exitZone.x,
      targetY: this.exitZone.y
    });

    // 오프닝 방송
    this.showOpeningBroadcast();

    // 체크포인트 저장
    this.saveData.currentScene = 'CadaverScene';
    this.saveData.checkpoint = 'cadaver_start';
    SaveManager.save(this.saveData);
  }

  drawLabRoom(w, h) {
    if (!this.textures.exists('lab_floor')) {
      // 타일셋이 아직 없을 때의 폴백
      this.drawGridFloor(w, h);
      return;
    }

    // 바닥 타일 반복
    this.add.tileSprite(w / 2, h / 2, w, h, 'lab_floor').setDepth(0);

    // 테두리에 벽 패널 타일 (좌/우는 회전하지 않고 세로로 그대로 반복 - 회전 시 위치가 깨지는 버그가 있었음)
    if (this.textures.exists('lab_wall')) {
      const top = this.add.tileSprite(w / 2, TILE / 2, w, TILE, 'lab_wall').setDepth(1);
      const bottom = this.add.tileSprite(w / 2, h - TILE / 2, w, TILE, 'lab_wall').setDepth(1);
      bottom.setFlipY(true);
      const left = this.add.tileSprite(TILE / 2, h / 2, TILE, h, 'lab_wall').setDepth(1);
      const right = this.add.tileSprite(w - TILE / 2, h / 2, TILE, h, 'lab_wall').setDepth(1);
      right.setFlipX(true);
    }
  }

  // 연구소 소품을 충돌 가능한 장애물로 배치 (플레이어가 통과 못 함)
  buildLabProps() {
    const propKeys = [
      'prop_lab_extinguisher',
      'prop_lab_monitor',
      'prop_lab_crate',
      'prop_lab_vent',
      'prop_lab_terminal'
    ];
    if (!propKeys.some((k) => this.textures.exists(k))) return;

    this.props = this.physics.add.staticGroup();

    // 스폰(포드)/출구 통로를 피해서 방 안 곳곳에 배치
    const placements = [
      ['prop_lab_extinguisher', 100, 100],
      ['prop_lab_monitor', 700, 110],
      ['prop_lab_crate', 110, 500],
      ['prop_lab_vent', 700, 500],
      ['prop_lab_terminal', 140, 300]
    ];

    placements.forEach(([key, x, y]) => {
      if (!this.textures.exists(key)) return;
      const img = this.add.image(x, y, key).setDepth(3);
      this.physics.add.existing(img, true);
      this.props.add(img);
    });

    this.physics.add.collider(this.player, this.props);
  }

  drawGridFloor(w, h) {
    const g = this.add.graphics();
    g.lineStyle(1, 0x2a2f2a, 0.6);
    for (let x = 0; x <= w; x += TILE) g.lineBetween(x, 0, x, h);
    for (let y = 0; y <= h; y += TILE) g.lineBetween(0, y, w, y);
  }

  // World bounds만으로는 body offset 등의 이유로 예외가 생길 수 있어,
  // 맵 4면에 얇은 정적 벽을 깔아 이중으로 막아줌
  buildBoundaryWalls(w, h) {
    const thickness = 20;
    this.walls = this.physics.add.staticGroup();

    const top = this.add.rectangle(w / 2, -thickness / 2, w + thickness * 2, thickness, 0x000000, 0);
    const bottom = this.add.rectangle(w / 2, h + thickness / 2, w + thickness * 2, thickness, 0x000000, 0);
    const left = this.add.rectangle(-thickness / 2, h / 2, thickness, h + thickness * 2, 0x000000, 0);
    const right = this.add.rectangle(w + thickness / 2, h / 2, thickness, h + thickness * 2, 0x000000, 0);

    [top, bottom, left, right].forEach((wall) => {
      this.physics.add.existing(wall, true);
      this.walls.add(wall);
    });

    this.physics.add.collider(this.player, this.walls);
  }

  showOpeningBroadcast() {
    const cam = this.cameras.main;
    const box = this.add.rectangle(0, 0, this.scale.width, 140, 0x000000, 0.75)
      .setScrollFactor(0).setOrigin(0, 0).setDepth(100);
    const txt = this.add.text(this.scale.width / 2, 70,
      '"현재 총 7개의 섹터에서 감염자가 집단 사망하는 사건이 발생하였습니다.\n' +
      '현재 진행중인 Project: NULL은 즉시 중단해주시기 바랍니다.\n치료제는..."',
      {
        fontFamily: 'sans-serif', fontSize: '15px', color: '#cccccc',
        align: 'center', wordWrap: { width: this.scale.width - 80 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    this.time.delayedCall(4500, () => {
      this.tweens.add({
        targets: [box, txt],
        alpha: 0,
        duration: 800,
        onComplete: () => { box.destroy(); txt.destroy(); }
      });
    });
  }

  resolveAttack(tiles, attacker) {
    // 카다베르 연구소 베타 구간엔 적이 없음 (탈출 연출 전용)
  }

  goToMarket() {
    this.scene.stop('UIScene');
    this.scene.start('MarketScene', { save: this.saveData });
  }

  update() {
    if (this.player) this.player.update();
  }
}
