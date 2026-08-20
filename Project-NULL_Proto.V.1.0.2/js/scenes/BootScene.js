class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // 사용자가 보내준 캐릭터 원화에서 정면 포즈를 크롭/가공한 임시 스프라이트.
    // 실제 쿼터뷰(탑다운) 버전이 완성되면 이 3개 파일만 교체하면 됨.
    this.load.image('player_cadaver', 'assets/sprites/player_zombie.png'); // 일반 좀비(주인공)
    this.load.image('enemy_stick', 'assets/sprites/enemy_stick.png');       // 나무 막대기 청년
    this.load.image('enemy_rock', 'assets/sprites/enemy_rock.png');         // 돌멩이 청년
    this.load.image('logo', 'assets/ui/logo.png');                          // 타이틀 로고

    this.loadFailed = false;
    this.load.on('loaderror', () => (this.loadFailed = true));
  }

  create() {
    // 로컬 서버 없이 file://로 직접 열면 브라우저 보안정책 때문에 이미지 로드가
    // 실패할 수 있음. 이 경우 도형 플레이스홀더로 대체하고 화면에 안내 표시.
    ['player_cadaver', 'enemy_stick', 'enemy_rock'].forEach((key) => {
      if (!this.textures.exists(key)) this.loadFailed = true;
    });

    if (this.loadFailed) {
      this.makePlaceholderTexture('player_cadaver', 0x6a8f5c, true);
      this.makePlaceholderTexture('enemy_stick', 0x4a4a5a, true);
      this.makePlaceholderTexture('enemy_rock', 0xbca27a, true);

      this.add.text(this.scale.width / 2, this.scale.height / 2,
        '이미지 로드 실패\n로컬 서버(예: npx serve)로 실행해주세요',
        { fontFamily: 'sans-serif', fontSize: '16px', color: '#ff8888', align: 'center' }
      ).setOrigin(0.5);

      this.time.delayedCall(2000, () => this.scene.start('TitleScene'));
    } else {
      this.scene.start('TitleScene');
    }
  }

  // 이미지 로드 실패시에만 쓰이는 비상용 플레이스홀더
  makePlaceholderTexture(key, color, overwrite = false) {
    if (overwrite && this.textures.exists(key)) this.textures.remove(key);
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(color, 1);
    g.fillRect(0, 32, 32, 32);
    g.lineStyle(1, 0xffffff, 0.5);
    g.strokeRect(0, 32, 32, 32);
    g.generateTexture(key, 32, 64);
    g.destroy();
  }
}
