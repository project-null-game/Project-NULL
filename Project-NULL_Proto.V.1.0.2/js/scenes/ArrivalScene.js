class ArrivalScene extends Phaser.Scene {
  constructor() {
    super('ArrivalScene');
  }

  init(data) {
    this.saveData = data.save;
    this.labName = data.labName || '연구소';
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#000000');

    this.add.text(width / 2, height / 2, `${this.labName} 연구소 도착. 끝.`, {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#e0e0e0'
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.65, '(베타 버전: 연구소 내부는 추후 구현 예정)', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#666666'
    }).setOrigin(0.5);

    // 체크포인트 저장 후 타이틀로 복귀 가능하게
    this.saveData.currentScene = 'TitleScene';
    this.saveData.checkpoint = 'lab_arrived';
    SaveManager.save(this.saveData);

    this.time.delayedCall(2500, () => {
      const btn = this.add.text(width / 2, height * 0.78, '[ 타이틀로 돌아가기 ]', {
        fontFamily: 'sans-serif', fontSize: '16px', color: '#aaaaaa'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => this.scene.start('TitleScene'));
    });
  }
}
