// ============================================
// 전역 입력 상태 (키보드 + 터치 UI가 공통으로 씀)
// ============================================
window.InputState = {
  moveX: 0,
  moveY: 0,
  attackPressed: false
};

const TILE = 32; // 히트박스 기준 1칸 크기

class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, name = '이름 없는 좀비') {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // 스프라이트는 32x64, 판정(히트박스)은 하단 32x32 정사각형만 사용
    this.body.setSize(TILE, TILE);
    this.body.setOffset(0, TILE);
    this.setCollideWorldBounds(true);

    this.speed = 140;
    this.facing = 'down'; // up, down, left, right
    this.playerName = name;
    this.health = 100;
    this.maxHealth = 100;
    this.attackCooldown = false;
    this.attackRange = 1; // 정면 1칸만 타격 (나무 막대기 청년과 공격 방식 스왑됨)
  }

  update() {
    const input = window.InputState;
    let vx = input.moveX;
    let vy = input.moveY;

    // 방향 정규화 (대각선 스피드 보정) - 단, 이동은 4방향으로 스냅
    if (Math.abs(vx) > Math.abs(vy)) {
      vy = 0;
      this.facing = vx > 0 ? 'right' : vx < 0 ? 'left' : this.facing;
    } else if (vy !== 0) {
      vx = 0;
      this.facing = vy > 0 ? 'down' : 'up';
    }

    this.setVelocity(vx * this.speed, vy * this.speed);

    if (input.attackPressed && !this.attackCooldown) {
      this.performAttack();
    }
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
