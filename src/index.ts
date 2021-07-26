import axios from 'axios'
import {
  BufferGeometry,
  BufferAttribute,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer,
  Fog,
  Vector3,
} from 'three'
import './style/index.scss'
const kernels = require('./data/kernels.csv')

let w = 0,
  h = 0
const session = Date.now()

const scene = new Scene()
const camera = new PerspectiveCamera(5)
camera.position.set(1, 0, 1)

let position = 0

const renderer = new WebGLRenderer({ antialias: true })
const overlayDom = document.createElement('canvas')
const overlay = overlayDom.getContext('2d')
const prodCanvas = document.createElement('canvas')
const prodContext = prodCanvas.getContext('2d')

const beginTime = kernels[0].usedAt
const endTime = kernels[kernels.length - 1].usedAt
const duration = endTime - beginTime
const vertices = new Float32Array(kernels.length * 3)
for (let i = 0; i < kernels.length; i++) {
  vertices[i * 3 + 0] = Math.random() * 2 - 1
  vertices[i * 3 + 1] = -(kernels[i].usedAt - beginTime) / duration
  vertices[i * 3 + 2] = Math.random() * 2 - 1
}

console.log(beginTime, endTime, duration, vertices)

const cloudGeometry = new BufferGeometry()
cloudGeometry.setAttribute('position', new BufferAttribute(vertices, 3))

const cloudMaterial = new PointsMaterial({ size: 0.05, color: 0xeeeeee })
const cloud = new Points(cloudGeometry, cloudMaterial)
scene.add(cloud)

scene.fog = new Fog(
  0x888888,
  camera.position.length() - 1,
  camera.position.length() + 1
)

renderer.domElement.classList.add('renderer')
overlayDom.classList.add('overlay')
document.body.appendChild(renderer.domElement)
document.body.appendChild(overlayDom)

const tmp = new Vector3()
let cnt = 0
function render() {
  renderer.render(scene, camera)

  if (!overlay) {
    throw new Error('Invalid overlay context')
  }

  overlay.clearRect(0, 0, w, h)
  for (let i = 0; i < kernels.length; i++) {
    if (i % 40 === Math.floor(cnt / 180) % 10) {
      tmp.set(vertices[i * 3 + 0], vertices[i * 3 + 1], vertices[i * 3 + 2])
      const v = tmp.project(camera)
      if (v.x < -1 || v.x > 1 || v.y < -1 || v.y > 1) continue

      overlay.fillStyle = '#eee'
      overlay.font = 'normal 40px "Courier New"'
      overlay.fillText(
        kernels[i].usedBy,
        ((v.x + 1) / 2) * w + 40,
        (1 - (v.y + 1) / 2) * h + 0
      )
      overlay.fillText(
        new Date(kernels[i].usedAt * 1000).toISOString(),
        ((v.x + 1) / 2) * w + 40,
        (1 - (v.y + 1) / 2) * h + 50
      )
    }
  }

  if (!prodContext) {
    throw new Error('Invalid prodContext')
  }

  prodContext.clearRect(0, 0, w, h)
  prodContext.drawImage(renderer.domElement, 0, 0, w, h)
  prodContext.drawImage(overlayDom, 0, 0, w, h)
}

function tick() {
  position += 0.0003

  camera.position.y = -position
  camera.lookAt(0, -position, 0)
  render()

  prodCanvas.toBlob(async blob => {
    await axios.post(`/dest?session=${session}&id=${cnt}`, blob, {
      headers: {
        'Content-Type': 'image/png',
      },
    })
    cnt++
    requestAnimationFrame(tick)
  })
}

requestAnimationFrame(tick)

function updateSize() {
  w = 6480
  h = 1080

  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()

  overlayDom.width = w
  overlayDom.height = h

  prodCanvas.width = w
  prodCanvas.height = h
}

window.addEventListener('resize', updateSize)
window.addEventListener('load', updateSize)
