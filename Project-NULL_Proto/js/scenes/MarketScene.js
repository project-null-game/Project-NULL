const MAP_SIZE = 6400; // 32(타일) 기준 200x200칸

class MarketScene extends Phaser.Scene {
  constructor() {
    super('MarketScene');
  }

  init(data) {
    this.saveData = data.save || SaveManager.load();
  }

  create() {
    this.cameras.main.setBackgroundColor('#5a8f5c');
    this.physics.world.setBounds(0, 0, MAP_SIZE, MAP_SIZE);
    this.cameras.main.setBounds(0, 0, MAP_SIZE, MAP_SIZE);

    this.drawParkFloor();

    // 구불구불한 길 생성 (오픈월드 대신 이 경로를 따라가도록 강제)
    this.buildPath();

    // 플레이어는 경로 시작점에서 출발
    const spawn = this.pathWaypoints[0];
    this.player = new Player(this, spawn.x, spawn.y, 'player_cadaver', this.saveData.playerName);
    this.player.health = this.saveData.health;
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.physics.add.collider(this.player, this.pathWalls);

    // 분수 장식 (경로 중간 지점에 랜드마크로 배치)
    if (this.textures.exists('park_fountain')) {
      const mid = this.getPointAlongPath(0.5);
      this.add.image(mid.x, mid.y, 'park_fountain').setDepth(2);
    }

    // 적 배치 (베타: 경로를 따라 흩뿌림 - 나중에 웨이브/구역 디자인으로 교체)
    this.enemies = this.physics.add.group();
    this.spawnEnemies();

    // 도착 지점 (경로 끝) - 밟으면 라자로 연구소 도착 화면으로
    const goal = this.pathWaypoints[this.pathWaypoints.length - 1];
    this.arrivalZone = this.add.zone(goal.x, goal.y, 60, 300);
    this.physics.add.existing(this.arrivalZone, true);
    this.physics.add.overlap(this.player, this.arrivalZone, () => this.arriveAtLab());

    this.add.text(goal.x - 50, goal.y - 30, '라자로 연구소\n입구 →', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ddd', align: 'center'
    }).setOrigin(0.5);

    // 맵 경계 벽 (World bounds와 별개로 이중 안전장치) - 플레이어/적 모두 밖으로 못 나가게 막음
    this.buildBoundaryWalls(MAP_SIZE, MAP_SIZE);
    this.physics.add.collider(this.enemies, this.walls);

    // 공원 소품 배치 (충돌 장애물) - 나무/벤치/가로등, 경로 바깥쪽을 따라 배치
    this.buildParkProps();

    this.scene.launch('UIScene', {
      player: this.player,
      saveData: this.saveData
    });

    // 체크포인트 저장
    this.saveData.currentScene = 'MarketScene';
    this.saveData.checkpoint = 'market_entry';
    SaveManager.save(this.saveData);
  }

  // 구불구불한 길: 시작점 -> 위로 꺾임 -> 아래로 꺾임 -> 도착점 형태의 경로를 만들고,
  // 그 경로 양옆에 보이지 않는 벽을 세워 플레이어/적이 경로를 벗어나지 못하게 함
  buildPath() {
    const centerY = MAP_SIZE / 2;
    const startX = 200; // 플레이어 스폰과 일치
    const endX = MAP_SIZE - 100; // 도착 지점과 일치
    const segX = (endX - startX) / 3;
    const amp = 700; // 위아래로 꺾이는 폭
    const halfW = 110; // 경로 폭의 절반

    this.pathWaypoints = [
      { x: startX, y: centerY },
      { x: startX + segX, y: centerY },
      { x: startX + segX, y: centerY + amp },
      { x: startX + segX * 2, y: centerY + amp },
      { x: startX + segX * 2, y: centerY - amp },
      { x: endX, y: centerY - amp },
      { x: endX, y: centerY }
    ];
    this.pathHalfWidth = halfW;

    this.pathWalls = this.physics.add.staticGroup();
    for (let i = 0; i < this.pathWaypoints.length - 1; i++) {
      this.buildCorridorSegment(this.pathWaypoints[i], this.pathWaypoints[i + 1], halfW);
    }
  }

  // 구간(직선 하나) 하나를 시각적 경로 바닥 + 양옆 충돌 벽으로 생성
  buildCorridorSegment(a, b, halfW) {
    const thickness = 40;
    const overlap = halfW; // 코너에서 벽이 서로 이어지도록 여유를 둠

    if (a.x === b.x) {
      // 수직 구간
      const y1 = Math.min(a.y, b.y) - overlap;
      const y2 = Math.max(a.y, b.y) + overlap;
      const midY = (y1 + y2) / 2;
      const len = y2 - y1;
      this.add.rectangle(a.x, midY, halfW * 2, len, 0x8f9a7a, 0.45).setDepth(0.5);
      this.addPathWall(a.x - halfW, midY, thickness, len);
      this.addPathWall(a.x + halfW, midY, thickness, len);
    } else {
      // 수평 구간
      const x1 = Math.min(a.x, b.x) - overlap;
      const x2 = Math.max(a.x, b.x) + overlap;
      const midX = (x1 + x2) / 2;
      const len = x2 - x1;
      this.add.rectangle(midX, a.y, len, halfW * 2, 0x8f9a7a, 0.45).setDepth(0.5);
      this.addPathWall(midX, a.y - halfW, len, thickness);
      this.addPathWall(midX, a.y + halfW, len, thickness);
    }
  }

  addPathWall(x, y, w, h) {
    const rect = this.add.rectangle(x, y, w, h, 0x000000, 0);
    this.physics.add.existing(rect, true);
    this.pathWalls.add(rect);
  }

  // 경로 진행도 t(0~1)에 대응하는 좌표 + 그 구간이 가로/세로 방향인지 반환
  getPointAlongPath(t) {
    const wp = this.pathWaypoints;
    const segLens = [];
    let total = 0;
    for (let i = 0; i < wp.length - 1; i++) {
      const d = Phaser.Math.Distance.Between(wp[i].x, wp[i].y, wp[i + 1].x, wp[i + 1].y);
      segLens.push(d);
      total += d;
    }
    let target = total * Phaser.Math.Clamp(t, 0, 1);
    for (let i = 0; i < segLens.length; i++) {
      if (target <= segLens[i] || i === segLens.length - 1) {
        const ratio = segLens[i] === 0 ? 0 : target / segLens[i];
        const a = wp[i], b = wp[i + 1];
        return {
          x: a.x + (b.x - a.x) * ratio,
          y: a.y + (b.y - a.y) * ratio,
          horizontal: a.y === b.y
        };
      }
      target -= segLens[i];
    }
    const last = wp[wp.length - 1];
    return { x: last.x, y: last.y, horizontal: true };
  }


  // 공원 소품(나무/벤치/가로등)을 충돌 가능한 장애물로 경로 바깥쪽을 따라 배치
  buildParkProps() {
    const propKeys = ['prop_park_tree', 'prop_park_bench', 'prop_park_lamp'];
    if (!propKeys.some((k) => this.textures.exists(k))) return;

    this.props = this.physics.add.staticGroup();
    const propOffset = this.pathHalfWidth + 55; // 경로 벽 바로 바깥쪽
    const propCount = 24;

    for (let i = 1; i < propCount; i++) {
      const t = i / propCount;
      const p = this.getPointAlongPath(t);
      const side = i % 2 === 0 ? 1 : -1;
      let px = p.x;
      let py = p.y;
      if (p.horizontal) py += side * propOffset;
      else px += side * propOffset;

      const pick = i % 3;
      const key = pick === 0 ? 'prop_park_tree' : pick === 1 ? 'prop_park_bench' : 'prop_park_lamp';
      this.addPropObstacle(key, px, py);
    }

    this.physics.add.collider(this.player, this.props);
    this.physics.add.collider(this.enemies, this.props);
  }

  addPropObstacle(key, x, y) {
    if (!this.textures.exists(key)) return;
    const img = this.add.image(x, y, key).setDepth(3);
    this.physics.add.existing(img, true);
    this.props.add(img);
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

  drawParkFloor() {
    if (!this.textures.exists('park_floor')) {
      this.drawGridFloor();
      return;
    }
    this.add.tileSprite(MAP_SIZE / 2, MAP_SIZE / 2, MAP_SIZE, MAP_SIZE, 'park_floor').setDepth(0);
  }

  drawGridFloor() {
    const g = this.add.graphics();
    g.lineStyle(1, 0x3a352c, 0.4);
    for (let x = 0; x <= MAP_SIZE; x += TILE * 4) g.lineBetween(x, 0, x, MAP_SIZE);
    for (let y = 0; y <= MAP_SIZE; y += TILE * 4) g.lineBetween(0, y, MAP_SIZE, y);
  }

  spawnEnemies() {
    // 베타 임시 배치: 경로를 따라 stick/rock 번갈아 배치
    const count = 10;
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      const p = this.getPointAlongPath(t);
      const jitter = Phaser.Math.Between(-50, 50);
      const x = p.horizontal ? p.x : p.x + jitter;
      const y = p.horizontal ? p.y + jitter : p.y;
      const type = i % 2 === 0 ? 'rock' : 'stick';
      const texture = type === 'rock' ? 'enemy_rock' : 'enemy_stick';
      const enemy = new Enemy(this, x, y, texture, type);
      this.enemies.add(enemy);
    }
    this.physics.add.collider(this.enemies, this.pathWalls);
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
