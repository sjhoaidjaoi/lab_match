<template>
  <div
    ref="wrapRef"
    class="robot-scene"
    role="button"
    tabindex="0"
    aria-label="点一下和 E宝 打招呼"
    @click="onPoke"
    @keydown.enter.prevent="onPoke"
    @keydown.space.prevent="onPoke"
  >
    <canvas ref="canvasRef" class="robot-canvas"></canvas>
    <div class="robot-loading" :class="{ done: !loading }" aria-hidden="true">
      <span class="loading-ring"></span>
      <span class="loading-text">LOADING 3D · {{ progress }}%</span>
    </div>
    <div v-if="unsupported" class="robot-fallback" aria-hidden="true">
      <span class="fallback-face"></span>
      <span class="fallback-body"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

const emit = defineEmits<{ (event: 'poke'): void }>()

const MODEL_URL = `${import.meta.env.BASE_URL}models/lab-robot.glb`
/* 模型归一化后的目标高度，以及脚底在场景中的高度 */
const MODEL_HEIGHT = 3.38
const BASE_Y = -1.62
/* 绘制缓冲上限：超采样后不超过这个边长，兼顾锐度与帧率 */
const MAX_BUFFER = 1600
const SUPERSAMPLE = 1.3
/* 相机默认距离；容器被压窄（并排对话）时按宽高比后退，保证 E宝 不出画 */
const BASE_Z = 9.35
const COMFORT_ASPECT = 0.74
const MAX_BACKOFF = 1.42

const wrapRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const loading = ref(true)
const progress = ref(0)
const unsupported = ref(false)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let robot: THREE.Group | null = null
let model: THREE.Object3D | null = null
let dracoLoader: DRACOLoader | null = null
let faceGlow: THREE.PointLight | null = null
let envMap: THREE.Texture | null = null
let frameId = 0
let visible = true
let disposed = false
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
const clock = new THREE.Clock()
/* 渲染节流：约 30fps（单位秒）。见 render() 内注释。 */
const FRAME_BUDGET = 1 / 30
let frameAccum = 0
/* E宝 现在是「立在那儿」的：不再跟随鼠标转头，相机也不再做视差推移。
   姿态只由两件事驱动 —— 一次吸气式上下浮动（0.045 单位，肉眼几乎察觉不到），
   以及点击产生的弹簧脉冲。所以这里不再有 pointer / pointerTarget。 */
/* 点击反馈：只给脸补一次暖光，位置和姿态完全不动。
   原来是一次弹簧脉冲（lift 上跳 + tilt 侧倾），按下瞬间整只机器人会往上蹿一下再歪回来，
   看起来像页面抖了一下 —— 交互反馈不该用位移来表达，光就够了。 */
const reaction = { glow: 0 }
let elapsed = 0

function react() {
  reaction.glow = 1
}

function onPoke() {
  if (loading.value) return
  react()
  emit('poke')
}

defineExpose({ react })

function loadModel() {
  dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath(`${import.meta.env.BASE_URL}draco/`)
  const loader = new GLTFLoader()
  loader.setDRACOLoader(dracoLoader)
  loader.load(
    MODEL_URL,
    (gltf) => {
      if (disposed) {
        disposeObject(gltf.scene)
        return
      }
      model = gltf.scene
      const maxAnisotropy = renderer?.capabilities.getMaxAnisotropy() ?? 1
      /* 贴图开满各向异性过滤：曲面与斜视角下的细节不再糊成一片 */
      const TEXTURE_SLOTS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'specularColorMap', 'specularIntensityMap'] as const
      model.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.castShadow = true
        mesh.receiveShadow = true
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        materials.forEach((material) => {
          material.side = THREE.FrontSide
          TEXTURE_SLOTS.forEach((slot) => {
            const texture = (material as unknown as Record<string, unknown>)[slot] as THREE.Texture | undefined
            if (!texture) return
            texture.anisotropy = maxAnisotropy
            texture.needsUpdate = true
          })
          /* 法线细节收一点，保留圆润的黏土质感，避免细碎噪点被看成脏边 */
          if ((material as THREE.MeshStandardMaterial).normalMap) {
            ;(material as THREE.MeshStandardMaterial).normalScale.setScalar(0.86)
          }
          material.needsUpdate = true
        })
      })

      model.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(model)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const scale = MODEL_HEIGHT / (size.y || 1)
      model.scale.setScalar(scale)
      /* 水平居中、脚底贴到 pivot 原点 */
      model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale)

      robot = new THREE.Group()
      robot.position.y = BASE_Y
      robot.add(model)
      scene?.add(robot)

      loading.value = false
      progress.value = 100
    },
    (event) => {
      if (event.total) progress.value = Math.min(100, Math.round((event.loaded / event.total) * 100))
    },
    () => {
      loading.value = false
      unsupported.value = true
    }
  )
}

function setup() {
  const canvas = canvasRef.value
  const wrap = wrapRef.value
  if (!canvas || !wrap) return

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  } catch {
    loading.value = false
    unsupported.value = true
    return
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 0.88
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  scene = new THREE.Scene()

  /* 柔和环境反射：黏土/哑光材质有了包裹光，造型才显得圆润而不是平涂 */
  const pmrem = new THREE.PMREMGenerator(renderer)
  envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envMap
  scene.environmentIntensity = 0.38
  pmrem.dispose()

  camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
  camera.position.set(0, 0.4, BASE_Z)

  /* 环境光压低：原来 1.6 会把白色头壳打成灰白一片，看起来像失焦 */
  const hemi = new THREE.HemisphereLight(0xfff6ec, 0xd8d2c6, 0.55)
  scene.add(hemi)

  /* 主光偏侧上方，白色头壳才有明暗过渡，不再是平的一片白 */
  const key = new THREE.DirectionalLight(0xfffaf4, 2.3)
  key.position.set(5.4, 7.2, 5.4)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.near = 0.5
  key.shadow.camera.far = 30
  key.shadow.camera.left = -5
  key.shadow.camera.right = 5
  key.shadow.camera.top = 5
  key.shadow.camera.bottom = -5
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.02
  key.shadow.radius = 2
  scene.add(key)

  const rim = new THREE.DirectionalLight(0xffb0cd, 1.55)
  rim.position.set(-5.6, 2.2, -4.2)
  scene.add(rim)

  const fill = new THREE.DirectionalLight(0xffe7cf, 0.82)
  fill.position.set(-3, -2, 5)
  scene.add(fill)

  /* 脸部暖光只做轻微呼吸感，强度一大就会糊掉五官 */
  faceGlow = new THREE.PointLight(0xff9a7a, 1.1, 10)
  faceGlow.position.set(0, 1.05, 2.2)
  scene.add(faceGlow)

  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.ShadowMaterial({ opacity: 0.11 })
  )
  shadowPlane.rotation.x = -Math.PI / 2
  shadowPlane.position.y = BASE_Y - 0.02
  shadowPlane.receiveShadow = true
  scene.add(shadowPlane)

  const resize = () => {
    if (!renderer || !camera || !wrap) return
    const width = wrap.clientWidth
    const height = wrap.clientHeight
    if (!width || !height) return
    /* 逻辑像素 × 超采样，再按缓冲上限收敛：1 倍屏也能得到锐利边缘。
       DPR 上限从 2 收到 1.6：2048 缓冲的 16.5 万面模型在集显上每帧要约 4ms，
       而 E宝 是纯装饰、边缘又软，1.6 × 1.3 的超采样已经看不出与 2 倍的差别。 */
    const baseRatio = Math.min(window.devicePixelRatio || 1, 1.6)
    const longest = Math.max(width, height)
    const supersample = Math.min(SUPERSAMPLE, MAX_BUFFER / (longest * baseRatio))
    renderer.setPixelRatio(baseRatio * Math.max(1, supersample))
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    /* 竖向画布被压窄时相机会左右裁切：按比例后退，画面仍是完整的 E宝 */
    const backoff = Math.min(MAX_BACKOFF, Math.max(1, COMFORT_ASPECT / camera.aspect))
    camera.position.z = BASE_Z * backoff
    camera.updateProjectionMatrix()
  }
  resize()

  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(wrap)

  intersectionObserver = new IntersectionObserver(
    (entries) => {
      visible = entries[0]?.isIntersecting ?? true
      if (visible && !frameId) render()
    },
    { threshold: 0.05 }
  )
  intersectionObserver.observe(wrap)

  loadModel()
  render()
}

function render() {
  if (!renderer || !scene || !camera) return
  frameId = window.requestAnimationFrame(render)
  if (!visible) {
    /* 不可见时仍要吞掉 clock 增量，否则重新可见的第一帧会拿到一个巨大的 dt */
    clock.getDelta()
    return
  }

  const dt = Math.min(clock.getDelta(), 0.06)
  /* 限帧 30fps。E宝只是缓慢漂浮 + 阻尼回弹，30fps 在观感上与 60fps 无差，
     但 GPU 占用直接砍半 —— 登录页同时还有五团光斑在动，这里是性价比最高的一刀。
     注意累加到 FRAME_BUDGET 再一次性推进物理，否则跳过的帧会让动画整体变慢。 */
  frameAccum += dt
  if (frameAccum < FRAME_BUDGET) return
  const step = Math.min(frameAccum, 0.1)
  frameAccum = 0
  elapsed += step

  reaction.glow *= Math.exp(-5 * step)

  if (robot) {
    /* 只有呼吸浮动；朝向恒定，点击也不位移 */
    robot.position.y = BASE_Y + Math.sin(elapsed * 0.85) * 0.045
  }

  if (faceGlow) {
    faceGlow.intensity = 1.1 + Math.sin(elapsed * 1.7) * 0.16 + reaction.glow * 1.6
  }

  /* 相机固定在正面机位，不再做鼠标视差 */
  camera.lookAt(0, -0.1, 0)

  renderer.render(scene, camera)
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    mesh.geometry?.dispose()
    if (!mesh.material) return
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) value.dispose()
      })
      material.dispose()
    })
  })
}

onMounted(setup)

onBeforeUnmount(() => {
  disposed = true
  cancelAnimationFrame(frameId)
  frameId = 0
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()

  if (scene) disposeObject(scene)
  envMap?.dispose()
  envMap = null
  dracoLoader?.dispose()
  dracoLoader = null

  renderer?.dispose()
  renderer = null
  scene = null
  camera = null
  robot = null
  model = null
  faceGlow = null
})
</script>

<style scoped>
.robot-scene {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: pointer;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.robot-scene:focus-visible {
  border-radius: 20px;
  box-shadow: inset 0 0 0 2px rgba(234, 88, 12, 0.45);
}

.robot-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.robot-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  transition: opacity 0.5s ease, visibility 0.5s ease;
}

.robot-loading.done {
  opacity: 0;
  visibility: hidden;
}

.loading-ring {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 1px solid rgba(20, 22, 26, 0.14);
  border-top-color: #ff5f9e;
  animation: robotSpin 1.1s linear infinite;
}

.loading-text {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.26em;
  color: rgba(20, 22, 26, 0.5);
  font-variant-numeric: tabular-nums;
}

@keyframes robotSpin {
  to {
    transform: rotate(360deg);
  }
}

.robot-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.fallback-face {
  width: 44%;
  aspect-ratio: 1.24 / 1;
  border-radius: 26%;
  background: linear-gradient(135deg, #ffcf7a, #ff6f8f 55%, #ff4f9a);
  box-shadow: 0 18px 40px rgba(20, 22, 26, 0.22);
}

.fallback-body {
  width: 30%;
  height: 26%;
  margin-top: 3%;
  border-radius: 18%;
  background: #f8f6f2;
  box-shadow: 0 18px 40px rgba(20, 22, 26, 0.16);
}

</style>
