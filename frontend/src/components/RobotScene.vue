<template>
  <div ref="wrapRef" class="robot-scene">
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

const MODEL_URL = `${import.meta.env.BASE_URL}models/lab-robot.glb`
/* 模型归一化后的目标高度，以及脚底在场景中的高度 */
const MODEL_HEIGHT = 3.1
const BASE_Y = -1.58

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
let frameId = 0
let visible = true
let disposed = false
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
const clock = new THREE.Clock()
const pointer = { x: 0, y: 0 }
const pointerTarget = { x: 0, y: 0 }

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
      model.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.castShadow = true
        mesh.receiveShadow = true
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        materials.forEach((material) => {
          material.side = THREE.FrontSide
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

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.02
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
  camera.position.set(0, 0.4, 9.6)

  const hemi = new THREE.HemisphereLight(0xfff6ec, 0xd8d2c6, 1.6)
  scene.add(hemi)

  const key = new THREE.DirectionalLight(0xffffff, 3)
  key.position.set(4.2, 7, 7)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.near = 0.5
  key.shadow.camera.far = 30
  key.shadow.camera.left = -5
  key.shadow.camera.right = 5
  key.shadow.camera.top = 5
  key.shadow.camera.bottom = -5
  key.shadow.bias = -0.0008
  key.shadow.radius = 3
  scene.add(key)

  const rim = new THREE.DirectionalLight(0xff9ec4, 2)
  rim.position.set(-6, 2.4, -4.5)
  scene.add(rim)

  const fill = new THREE.DirectionalLight(0xffe7cf, 1.4)
  fill.position.set(-3, -2, 5)
  scene.add(fill)

  faceGlow = new THREE.PointLight(0xff9a7a, 4, 14)
  faceGlow.position.set(0, 1, 2.6)
  scene.add(faceGlow)

  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.ShadowMaterial({ opacity: 0.16 })
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
    renderer.setSize(width, height, false)
    camera.aspect = width / height
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

  window.addEventListener('pointermove', onPointerMove, { passive: true })
  loadModel()
  render()
}

function onPointerMove(event: PointerEvent) {
  const wrap = wrapRef.value
  if (!wrap) return
  const rect = wrap.getBoundingClientRect()
  pointerTarget.x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1))
  pointerTarget.y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1))
}

function render() {
  if (!renderer || !scene || !camera) return
  frameId = window.requestAnimationFrame(render)
  if (!visible) return

  const elapsed = clock.getElapsedTime()

  pointer.x += (pointerTarget.x - pointer.x) * 0.055
  pointer.y += (pointerTarget.y - pointer.y) * 0.055

  if (robot) {
    robot.position.y = BASE_Y + Math.sin(elapsed * 0.85) * 0.045
    const yaw = Math.sin(elapsed * 0.32) * 0.06 + pointer.x * 0.22
    robot.rotation.y += (yaw - robot.rotation.y) * 0.05
    robot.rotation.x += (-pointer.y * 0.04 - robot.rotation.x) * 0.05
  }

  if (faceGlow) {
    faceGlow.intensity = 4 + Math.sin(elapsed * 1.7) * 0.8
  }

  camera.position.x += (pointer.x * 0.36 - camera.position.x) * 0.035
  camera.position.y += (0.4 + pointer.y * 0.14 - camera.position.y) * 0.035
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
  window.removeEventListener('pointermove', onPointerMove)
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()

  if (scene) disposeObject(scene)
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
