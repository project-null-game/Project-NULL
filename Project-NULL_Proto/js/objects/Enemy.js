class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, type) {
    // 플레이어와 같은 절대 격자 위상으로 스폰 (안 그러면 서로 다른 칸 기준으로 움직여서 판정이 안 맞음)
    const snapped = snapToTileGrid(x, y);
    super(scene, snapped.x, snapped.y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // 플레이어와 동일하게 하단 32x32만 히트박스로 사용
    this.body.setSize(TILE, TILE);
    this.body.setOffset(0, TILE);

    this.type = type; // 'stick' | 'rock'
    this.health = 30;
    this.maxHealth = 30;
    this.attackCooldown = false;
    this.facing = 'down';
    this.isStepping = false;
    this.stepDuration = type === 'stick' ? 320 : 450; // 이동속도 하향 (기존보다 느리게 추격)

    // stick: 앞줄 3칸 키패드 스윙(구 카다베르 방식) / rock: 원거리 5칸 직선 투척
    this.attackRange = type === 'stick' ? 1 : 5; // stick의 range는 "정면 거리 1칸" 기준
    this.attackDamage = type === 'stick' ? 8 : 5; // 공격력 하향

    // 체력바 (월드 좌표에 붙어서 항상 머리 위에 표시)
    this.hpBarWidth = 28;
    this.hpBarBg = scene.add.rectangle(this.x - this.hpBarWidth / 2, this.y - 10, this.hpBarWidth, 5, 0x330000)
      .setOrigin(0, 0.5).setDepth(150);
    this.hpBarFill = scene.add.rectangle(this.x - this.hpBarWidth / 2, this.y - 10, this.hpBarWidth, 5, 0xdd3333)
      .setOrigin(0, 0.5).setDepth(151);

    this.on('destroy', () => {
      this.hpBarBg.destroy();
      this.hpBarFill.destroy();
    });
  }

  updateHealthBar() {
    const barY = this.y - 10;
    this.hpBarBg.setPosition(this.x - this.hpBarWidth / 2, barY);
    this.hpBarFill.setPosition(this.x - this.hpBarWidth / 2, barY);
    const ratio = Math.max(0, this.health / this.maxHealth);
    this.hpBarFill.width = this.hpBarWidth * ratio;
  }

  update(player) {
    if (!this.active || this.health <= 0) return;

    this.updateHealthBar();

    const myTx = Math.floor(this.x / TILE);
    const myTy = Math.floor(this.y / TILE);
    const pTx = Math.floor(player.x / TILE);
    const pTy = Math.floor(player.y / TILE);
    const dx = pTx - myTx;
    const dy = pTy - myTy;

    // 플레이어 쪽을 바라보도록 방향 갱신
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
    else if (dy !== 0) this.facing = dy > 0 ? 'down' : 'up';

    let inRange = false;

    if (this.type === 'stick') {
      // 나무 막대기 청년: 바라보는 방향 앞줄 3칸(키패드 형태) 안에 들어오면 사거리 인정
      const tiles = this.getKeypadTiles(myTx, myTy);
      inRange = tiles.some(([tx, ty]) => tx === pTx && ty === pTy);
    } else {
      // 돌멩이 청년: 같은 행/열 + 사거리 5칸 이내
      const sameRow = myTy === pTy;
      const sameCol = myTx === pTx;
      const dist = sameRow ? Math.abs(dx) : sameCol ? Math.abs(dy) : Infinity;
      inRange = (sameRow || sameCol) && dist > 0 && dist <= this.attackRange;
    }

    if (inRange) {
      // 사거리 안에 들어오면 멈추고 공격 예고 시작 (쿨다운 중이 아닐 때만)
      if (!this.attackCooldown) {
        this.startWindup(player, myTx, myTy);
      }
    } else if (!this.isStepping) {
      // 사거리 밖이면 플레이어를 향해 한 칸씩 추격 (좀비와 동일한 이동 법칙)
      this.chaseTowards(player);
    }
  }

  // 플레이어 방향으로 한 칸(TILE)씩 이동 - 좀비(플레이어)와 동일한 그리드 이동 규칙
  chaseTowards(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;

    if (Math.abs(dx) < TILE / 2 && Math.abs(dy) < TILE / 2) return;

    let stepX = 0, stepY = 0;
    if (Math.abs(dx) > Math.abs(dy)) {
      stepX = dx > 0 ? 1 : -1;
      this.facing = dx > 0 ? 'right' : 'left';
    } else {
      stepY = dy > 0 ? 1 : -1;
      this.facing = dy > 0 ? 'down' : 'up';
    }

    const targetX = this.x + stepX * TILE;
    const targetY = this.y + stepY * TILE;

    const b = this.scene.physics.world.bounds;
    const halfW = TILE / 2;
    if (targetX - halfW < b.x || targetX + halfW > b.right) return;
    if (targetY < b.y || targetY + TILE > b.bottom) return;

    this.isStepping = true;
    this.scene.tweens.add({
      targets: this,
      x: targetX,
      y: targetY,
      duration: this.stepDuration,
      onComplete: () => {
        this.isStepping = false;
      }
    });
  }

  // 바라보는 방향 앞줄 3칸(키패드 형태) 좌표 - 구 카다베르 공격 로직 재사용
  getKeypadTiles(tx, ty) {
    switch (this.facing) {
      case 'up': return [[tx - 1, ty - 1], [tx, ty - 1], [tx + 1, ty - 1]];
      case 'down': return [[tx - 1, ty + 1], [tx, ty + 1], [tx + 1, ty + 1]];
      case 'left': return [[tx - 1, ty - 1], [tx - 1, ty], [tx - 1, ty + 1]];
      case 'right': return [[tx + 1, ty - 1], [tx + 1, ty], [tx + 1, ty + 1]];
    }
  }

  // 공격 예고(윈드업): 잠깐 기다렸다가 실제로 타격 판정. 나무 막대기는 맞을 칸을 빨간색으로 미리 표시.
  startWindup(player, myTx, myTy) {
    this.attackCooldown = true; // 윈드업 중 + 이후 쿨다운까지 통틀어 재발동 방지

    let telegraphTiles = [];
    const windup = this.type === 'stick' ? 450 : 350;

    if (this.type === 'stick') {
      telegraphTiles = this.getKeypadTiles(myTx, myTy);
      this.showTelegraph(telegraphTiles, windup);
    }

    this.scene.time.delayedCall(windup, () => {
      this.resolveWindupAttack(player, telegraphTiles, myTx, myTy);
    });

    const cd = this.type === 'stick' ? 1400 : 2000; // 공격속도 하향 (쿨다운 증가)
    this.scene.time.delayedCall(windup + cd, () => (this.attackCooldown = false));
  }

  // 윈드업이 끝난 시점에 실제로 맞았는지 재확인 (그 사이 플레이어가 피했을 수 있음)
  resolveWindupAttack(player, telegraphTiles, myTx, myTy) {
    if (!this.active || this.health <= 0) return;

    const pTx = Math.floor(player.x / TILE);
    const pTy = Math.floor(player.y / TILE);

    if (this.type === 'stick') {
      const hit = telegraphTiles.some(([tx, ty]) => tx === pTx && ty === pTy);
      if (hit) {
        player.takeDamage(this.attackDamage);
        this.flashAttack();
      }
    } else {
      const sameRow = myTy === pTy;
      const sameCol = myTx === pTx;
      const dist = sameRow ? Math.abs(myTx - pTx) : sameCol ? Math.abs(myTy - pTy) : Infinity;
      if ((sameRow || sameCol) && dist > 0 && dist <= this.attackRange) {
        this.throwRock(player, sameRow ? 'row' : 'col', myTx, myTy, pTx, pTy);
      }
    }
  }

  // 나무 막대기 청년 전용: 맞을 칸을 빨간색으로 미리 표시 (돌멩이 청년은 표시 안 함)
  showTelegraph(tiles, duration) {
    const g = this.scene.add.graphics();
    g.fillStyle(0xff2222, 0.35);
    g.lineStyle(2, 0xff2222, 0.9);
    tiles.forEach(([tx, ty]) => {
      g.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      g.strokeRect(tx * TILE, ty * TILE, TILE, TILE);
    });
    this.scene.time.delayedCall(duration, () => g.destroy());
  }

  flashAttack() {
    this.setTint(0xffaaaa);
    this.scene.time.delayedCall(150, () => this.clearTint());
  }

  throwRock(player, axis, myTx, myTy, pTx, pTy) {
    const startX = this.x;
    const startY = this.y;
    const targetX = axis === 'row' ? player.x : this.x;
    const targetY = axis === 'col' ? player.y : this.y;

    const rock = this.scene.add.circle(startX, startY - TILE / 2, 5, 0x888888);
    this.scene.tweens.add({
      targets: rock,
      x: targetX,
      y: targetY - TILE / 2,
      duration: 400,
      onComplete: () => {
        player.takeDamage(this.attackDamage);
        rock.destroy();
      }
    });
  }

  takeDamage(amount) {
    this.health -= amount;
    this.setTint(0xff6666);
    this.scene.time.delayedCall(100, () => this.clearTint());
    if (this.health <= 0) {
      this.destroy();
    }
  }
}
