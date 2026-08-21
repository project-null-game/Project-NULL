// ============================================
// 전역 입력 상태 (키보드 + 터치 UI가 공통으로 씀)
// ============================================
window.InputState = {
  moveX: 0,
  moveY: 0,
  attackPressed: false
};

const TILE = 32; // 히트박스 기준 1칸 크기

// 모든 캐릭터(플레이어/적)가 같은 절대 격자 위상에서 움직이도록 스폰 좌표를 스냅.
// x는 타일 중앙(k*TILE + TILE/2), y는 타일 상단(k*TILE)에 맞춤 -
// 이게 안 맞으면 서로 다른 위상으로 32px씩 움직여서 "같은 칸"이 영원히 안 겹칠 수 있음.
function snapToTileGrid(x, y) {
  return {
    x: Math.round((x - TILE / 2) / TILE) * TILE + TILE / 2,
    y: Math.round(y / TILE) * TILE
  };
}

class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, name = '이름 없는 좀비') {
    const snapped = snapToTileGrid(x, y);
    super(scene, snapped.x, snapped.y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // 스프라이트는 32x64, 판정(히트박스)은 하단 32x32 정사각형만 사용
    this.body.setSize(TILE, TILE);
    this.body.setOffset(0, TILE);
    this.setCollideWorldBounds(true);

    this.speed = 140; // (참고용, 실제 이동은 stepDuration 기준 트윈으로 처리)
    this.stepDuration = 140; // 1칸 이동에 걸리는 시간(ms)
    this.isStepping = false;
    this.facing = 'down'; // up, down, left, right
    this.playerName = name;
    this.health = 100;
    this.maxHealth = 100;
    this.attackCooldown = false;
    this.attackRange = 1; // 정면 1칸만 타격 (나무 막대기 청년과 공격 방식 스왑됨)
  }

  update() {
    const input = window.InputState;
    let dx = input.moveX;
    let dy = input.moveY;

    // 대각선 입력 방지: 좌우 우선
    if (dx !== 0 && dy !== 0) dy = 0;

    if (dx !== 0 || dy !== 0) {
      this.facing = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    }

    if (!this.isStepping && (dx !== 0 || dy !== 0)) {
      this.stepMove(dx, dy);
    }

    if (input.attackPressed && !this.attackCooldown) {
      this.performAttack();
    }
  }

  // 좀비는 한 칸(TILE)씩만 이동 - 좀비고 스타일의 그리드 이동
  stepMove(dx, dy) {
    const targetX = this.x + dx * TILE;
    const targetY = this.y + dy * TILE;

    // 맵 경계를 벗어나는 이동은 무시 (body 하단 히트박스 기준)
    const b = this.scene.physics.world.bounds;
    const halfW = TILE / 2;
    if (targetX - halfW < b.x || targetX + halfW > b.right) return;
    if (targetY < b.y || targetY + TILE > b.bottom) return;

    this.isStepping = true;
    this.setVelocity(0, 0);
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

  // 일반 좀비(주인공) 공격: 바라보는 방향 바로 앞 1칸만 타격 (구 나무 막대기 청년 방식)
  performAttack() {
    this.attackCooldown = true;
    this.scene.time.delayedCall(400, () => (this.attackCooldown = false));

    const tiles = this.getAttackTiles();
    this.scene.resolveAttack(tiles, this);

    // 디버그 표시 (실제 스프라이트 공격 애니메이션으로 나중에 교체)
    this.showAttackDebug(tiles);
  }

  // 플레이어 타일 좌표 기준, 바라보는 방향 바로 앞 1칸 좌표 계산
  getAttackTiles() {
    const tx = Math.floor(this.x / TILE);
    const ty = Math.floor(this.y / TILE);
    let tiles = [];

    switch (this.facing) {
      case 'up':
        tiles = [[tx, ty - 1]];
        break;
      case 'down':
        tiles = [[tx, ty + 1]];
        break;
      case 'left':
        tiles = [[tx - 1, ty]];
        break;
      case 'right':
        tiles = [[tx + 1, ty]];
        break;
    }
    return tiles;
  }

  showAttackDebug(tiles) {
    const g = this.scene.add.graphics();
    g.fillStyle(0xff3333, 0.4);
    tiles.forEach(([tx, ty]) => {
      g.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    });
    this.scene.time.delayedCall(150, () => g.destroy());
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.scene.events.emit('player-health-changed', this.health, this.maxHealth);
  }
}
