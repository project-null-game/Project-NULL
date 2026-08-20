class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, type) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setSize(TILE, TILE);
    this.body.setOffset(0, TILE);

    this.type = type; // 'stick' | 'rock'
    this.health = 30;
    this.maxHealth = 30;
    this.attackCooldown = false;
    this.facing = 'down';
    this.chaseSpeed = type === 'stick' ? 95 : 70; // 나무 막대기 청년이 좀 더 공격적으로 추격

    // stick: 앞줄 3칸 키패드 스윙(구 카다베르 방식) / rock: 원거리 5칸 직선 투척
    this.attackRange = type === 'stick' ? 1 : 5; // stick의 range는 "정면 거리 1칸" 기준
    this.attackDamage = type === 'stick' ? 15 : 10;
  }

  update(player) {
    if (!this.active || this.health <= 0) return;

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
      // 사거리 안에 들어오면 멈추고 공격 시도 (쿨다운 중이 아닐 때만)
      this.setVelocity(0, 0);
      if (!this.attackCooldown) {
        if (this.type === 'stick') this.performAttack(player, 'stick');
        else this.performAttack(player, 'rock', myTy === pTy ? 'row' : 'col', myTx, myTy, pTx, pTy);
      }
    } else {
      // 사거리 밖이면 플레이어를 향해 추격 (인간이 좀비를 잡으러 옴)
      this.chaseTowards(player);
    }
  }

  // 플레이어 방향으로 4방향 이동 (대각선 없이 더 큰 축을 우선 이동)
  chaseTowards(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;

    if (Math.abs(dx) < 4 && Math.abs(dy) < 4) {
      this.setVelocity(0, 0);
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      this.setVelocity(dx > 0 ? this.chaseSpeed : -this.chaseSpeed, 0);
      this.facing = dx > 0 ? 'right' : 'left';
    } else {
      this.setVelocity(0, dy > 0 ? this.chaseSpeed : -this.chaseSpeed);
      this.facing = dy > 0 ? 'down' : 'up';
    }
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

  performAttack(player, kind, axis, myTx, myTy, pTx, pTy) {
    this.attackCooldown = true;
    const cd = kind === 'stick' ? 700 : 1200;
    this.scene.time.delayedCall(cd, () => (this.attackCooldown = false));

    if (kind === 'stick') {
      // 3칸 스윙: 즉시 타격
      player.takeDamage(this.attackDamage);
      this.flashAttack();
    } else {
      // 원거리: 투사체를 직선으로 날림 (간단 트윈 처리)
      this.throwRock(player, axis, myTx, myTy, pTx, pTy);
    }
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
