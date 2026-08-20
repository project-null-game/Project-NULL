const MAP_SIZE = 6400; // 32(타일) 기준 200x200칸

class MarketScene extends Phaser.Scene {
  constructor() {
    super('MarketScene');
  }

  init(data) {
    this.saveData = data.save || SaveManager.load();
  }

  create() {
    this.cameras.main.setBackgroundColor('#2a2620');
    this.physics.world.setBounds(0, 0, MAP_SIZE, MAP_SIZE);
    this.cameras.main.setBounds(0, 0, MAP_SIZE, MAP_SIZE);

    this.drawGridFloor();

    // 플레이어는 맵 좌측에서 시작
    this.player = new Player(this, 200, MAP_SIZE / 2, 'player_cadaver', this.saveData.playerName);
    this.player.health = this.saveData.health;
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // 적 배치 (베타: 임시로 몇 마리씩 흩뿌림 - 나중에 웨이브/구역 디자인으로 교체)
    this.enemies = this.physics.add.group();
    this.spawnEnemies();

    // 도착 지점 (맵 우측 끝) - 밟으면 라자로 연구소 도착 화면으로
    this.arrivalZone = this.add.zone(MAP_SIZE - 100, MAP_SIZE / 2, 60, 300);
    this.physics.add.existing(this.arrivalZone, true);
    this.physics.add.overlap(this.player, this.arrivalZone, () => this.arriveAtLab());

    this.add.text(MAP_SIZE - 100, MAP_SIZE / 2 - 30, '라자로 연구소\n입구 →', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ddd', align: 'center'
    }).setOrigin(0.5);

    // 맵 경계 벽 (World bounds와 별개로 이중 안전장치) - 플레이어가 맵 밖으로 나가지 못하게 막음
    this.buildBoundaryWalls(MAP_SIZE, MAP_SIZE);

    this.scene.launch('UIScene', { player: this.player, saveData: this.saveData });

    // 체크포인트 저장
    this.saveData.currentScene = 'MarketScene';
    this.saveData.checkpoint = 'market_entry';
    SaveManager.save(this.saveData);
  }

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

  drawGridFloor() {
    const g = this.add.graphics();
    g.lineStyle(1, 0x3a352c, 0.4);
    for (let x = 0; x <= MAP_SIZE; x += TILE * 4) g.lineBetween(x, 0, x, MAP_SIZE);
    for (let y = 0; y <= MAP_SIZE; y += TILE * 4) g.lineBetween(0, y, MAP_SIZE, y);
  }

  spawnEnemies() {
    // 베타 임시 배치: 플레이어 진행 경로를 따라 stick/rock 번갈아 배치
    const count = 10;
    for (let i = 1; i <= count; i++) {
      const x = 200 + i * (MAP_SIZE - 400) / count;
      const y = MAP_SIZE / 2 + Phaser.Math.Between(-150, 150);
      const type = i % 2 === 0 ? 'rock' : 'stick';
      const texture = type === 'rock' ? 'enemy_rock' : 'enemy_stick';
      const enemy = new Enemy(this, x, y, texture, type);
      this.enemies.add(enemy);
    }
  }

  // 플레이어의 카다베르 공격이 타일 좌표(tiles)에 맞으면 해당 칸의 적에게 데미지
  resolveAttack(tiles, attacker) {
    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active) return;
      const etx = Math.floor(enemy.x / TILE);
      const ety = Math.floor(enemy.y / TILE);
      const hit = tiles.some(([tx, ty]) => tx === etx && ty === ety);
      if (hit) enemy.takeDamage(25);
    });
  }

  arriveAtLab() {
    this.scene.stop('UIScene');
    this.scene.start('ArrivalScene', { save: this.saveData, labName: '라자로' });
  }

  update() {
    if (this.player) this.player.update();
    this.enemies.getChildren().forEach((e) => e.update(this.player));
  }
}
