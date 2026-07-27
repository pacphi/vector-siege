import * as THREE from 'three';
import type { Enemy, EnemyKind, GameState, Impact } from './types';

const GREEN = 0x65ff9b, RED = 0xff594d, AMBER = 0xffca58;
const lineMaterial = (color = GREEN) => new THREE.MeshBasicMaterial({ color, wireframe: true });
const colorForKind = (kind: EnemyKind) =>
  kind === 'saucer' ? AMBER : kind === 'drone' ? 0xff6cf8 : kind === 'fast' ? AMBER : RED;

function tankMesh(color = RED) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.7, .9, 3.7), lineMaterial(color));
  hull.position.y = .55; g.add(hull);
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(.8, .95, .55, 6), lineMaterial(color));
  turret.position.y = 1.25; g.add(turret);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(.25, .25, 2.7), lineMaterial(color));
  barrel.position.set(0, 1.32, 1.55); g.add(barrel);
  return g;
}

function enemyMesh(e: Enemy) {
  if (e.kind === 'saucer') {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.45, 2.6, .8, 8), lineMaterial(AMBER)); m.position.y = 6; return m;
  }
  if (e.kind === 'drone') {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(1.7), lineMaterial(0xff6cf8)); m.position.y = 2.5; return m;
  }
  const m = tankMesh(e.kind === 'fast' ? AMBER : RED);
  if (e.kind === 'fast') m.scale.set(.75, .75, 1.15);
  return m;
}

export class View {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(72, 1, .1, 200);
  private entities = new Map<number, THREE.Object3D>();
  private bursts = new Map<number, THREE.Group>();
  private player = tankMesh(GREEN);

  constructor(private host: HTMLElement) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color(0x010705);
    this.scene.fog = new THREE.FogExp2(0x010705, .014);
    this.host.prepend(this.renderer.domElement);
    this.renderer.domElement.id = 'game-canvas';
    this.renderer.domElement.setAttribute('aria-label', 'Vector Siege game view');
    this.renderer.domElement.tabIndex = 0;
    const grid = new THREE.GridHelper(160, 40, 0x2bcf6e, 0x103f29);
    this.scene.add(grid, this.player);
    this.addScenery();
    addEventListener('resize', () => this.resize());
    this.resize();
  }

  private addScenery() {
    const random = (() => { let x = 12345; return () => (x = (x * 16807) % 2147483647) / 2147483647; })();
    for (let i = 0; i < 35; i++) {
      const geometry = i % 3 ? new THREE.DodecahedronGeometry(1.8 + random() * 3, 0) : new THREE.BoxGeometry(4, 3 + random() * 6, 4);
      const rock = new THREE.Mesh(geometry, lineMaterial(0x287348));
      const angle = random() * Math.PI * 2, radius = 15 + random() * 58;
      rock.position.set(Math.sin(angle) * radius, geometry.type === 'BoxGeometry' ? 2 : 1.4, Math.cos(angle) * radius);
      rock.rotation.y = random() * Math.PI;
      this.scene.add(rock);
    }
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(72, 72, .2, 64, 1, true), lineMaterial(0x35a866));
    rim.position.y = .1; this.scene.add(rim);
  }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  render(s: GameState, elapsed: number) {
    const live = new Set<number>();
    for (const e of s.enemies) {
      live.add(e.id);
      let mesh = this.entities.get(e.id);
      if (!mesh) { mesh = enemyMesh(e); this.entities.set(e.id, mesh); this.scene.add(mesh); }
      mesh.position.x = e.position.x; mesh.position.z = e.position.z; mesh.rotation.y = e.heading;
      if (e.kind === 'saucer') mesh.position.y = 5 + Math.sin(elapsed * 3) * .7;
      if (e.kind === 'drone') mesh.rotation.y += elapsed * 2;
    }
    for (const shot of s.shots) {
      live.add(shot.id);
      let mesh = this.entities.get(shot.id);
      if (!mesh) {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(.18, 5, 4), new THREE.MeshBasicMaterial({ color: shot.owner === 'player' ? GREEN : RED }));
        this.entities.set(shot.id, mesh); this.scene.add(mesh);
      }
      mesh.position.set(shot.position.x, .9, shot.position.z);
    }
    this.renderImpacts(s.impacts);
    for (const [id, mesh] of this.entities) if (!live.has(id)) { this.scene.remove(mesh); this.entities.delete(id); }
    const p = s.player;
    this.player.position.set(p.position.x, 0, p.position.z); this.player.rotation.y = p.heading;
    this.player.visible = false;
    const eye = 1.85;
    this.camera.position.set(p.position.x, eye, p.position.z);
    this.camera.lookAt(p.position.x + Math.sin(p.heading) * 20, eye, p.position.z + Math.cos(p.heading) * 20);
    this.renderer.render(this.scene, this.camera);
  }

  private renderImpacts(impacts: Impact[]) {
    const live = new Set<number>();
    for (const impact of impacts) {
      live.add(impact.id);
      let burst = this.bursts.get(impact.id);
      if (!burst) {
        burst = this.createBurst(impact);
        this.bursts.set(impact.id, burst);
        this.scene.add(burst);
      }
      const duration = impact.destroyed ? 1.15 : .7;
      const age = duration - impact.ttl;
      const progress = Math.min(1, age / duration);
      burst.position.set(impact.position.x, 1.2, impact.position.z);
      burst.rotation.y += .045;
      burst.children.forEach((piece, index) => {
        const velocity = piece.userData.velocity as THREE.Vector3 | undefined;
        if (!velocity) {
          piece.scale.setScalar(1 + progress * 5);
          const material = (piece as THREE.Mesh).material as THREE.Material;
          material.opacity = 1 - progress;
          return;
        }
        piece.position.copy(velocity).multiplyScalar(age * (impact.destroyed ? 4.8 : 3));
        piece.position.y -= 4.2 * age * age;
        piece.rotation.x += .12 + index * .006;
        piece.rotation.z += .09;
        const material = (piece as THREE.Mesh).material as THREE.Material;
        material.opacity = Math.max(0, 1 - progress);
      });
    }
    for (const [id, burst] of this.bursts) {
      if (live.has(id)) continue;
      this.scene.remove(burst);
      burst.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => material.dispose());
      });
      this.bursts.delete(id);
    }
  }

  private createBurst(impact: Impact) {
    const group = new THREE.Group();
    let seed = impact.id * 16807;
    const random = () => (seed = seed * 48271 % 2147483647) / 2147483647;
    const count = impact.destroyed ? 24 : 12;
    const color = colorForKind(impact.kind);
    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: i % 4 === 0 ? 0xffffff : color,
        wireframe: i % 3 !== 0,
        transparent: true,
      });
      const piece = new THREE.Mesh(
        new THREE.TetrahedronGeometry(.12 + random() * (impact.destroyed ? .42 : .25)),
        material,
      );
      const angle = random() * Math.PI * 2;
      const speed = .35 + random() * .9;
      piece.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        .35 + random() * 1.15,
        Math.sin(angle) * speed,
      );
      group.add(piece);
    }
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(.55, .055, 4, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 }),
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    return group;
  }
}
