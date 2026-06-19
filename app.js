const form = document.querySelector('#generatorForm');
const referenceInput = document.querySelector('#referenceInput');
const referencePreview = document.querySelector('#referencePreview');
const referencePreviewWrap = document.querySelector('#referencePreviewWrap');
const clearImageBtn = document.querySelector('#clearImageBtn');
const gallery = document.querySelector('#gallery');
const template = document.querySelector('#imageCardTemplate');
const statusText = document.querySelector('#statusText');
const summaryCount = document.querySelector('#summaryCount');
const downloadAllBtn = document.querySelector('#downloadAllBtn');
const downloadZipBtn = document.querySelector('#downloadZipBtn');

let referenceImage = null;
let generatedImages = [];

const aspectSizes = {
  '16:9': { width: 1280, height: 720, css: '16 / 9' },
  '1:1': { width: 1024, height: 1024, css: '1 / 1' },
  '9:16': { width: 720, height: 1280, css: '9 / 16' },
};

referenceInput.addEventListener('change', async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  referenceImage = await loadImage(file);
  referencePreview.src = referenceImage.src;
  referencePreviewWrap.classList.remove('hidden');
});

clearImageBtn.addEventListener('click', () => {
  referenceInput.value = '';
  referenceImage = null;
  referencePreview.removeAttribute('src');
  referencePreviewWrap.classList.add('hidden');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!referenceImage) {
    statusText.textContent = 'Vui lòng chọn ảnh tham chiếu trước khi tạo.';
    return;
  }

  const count = clamp(Number(document.querySelector('#imageCount').value), 1, 60);
  const aspectRatio = document.querySelector('#aspectRatio').value;
  const stylePrompt = document.querySelector('#stylePrompt').value.trim();
  const strength = Number(document.querySelector('#variationStrength').value);
  const filePrefix = sanitizeFileName(document.querySelector('#filePrefix').value || 'generated-image');
  const size = aspectSizes[aspectRatio];

  generatedImages = [];
  gallery.className = 'gallery';
  gallery.innerHTML = '';
  setDownloadState(false);
  statusText.textContent = `Đang tạo ${count} ảnh ${aspectRatio}...`;

  for (let index = 0; index < count; index += 1) {
    const canvas = generateVariant(referenceImage, size, stylePrompt, strength, index);
    const fileName = `${filePrefix}-${aspectRatio.replace(':', 'x')}-${String(index + 1).padStart(2, '0')}.png`;
    generatedImages.push({ canvas, fileName });
    renderCard(canvas, fileName, size.css);
    summaryCount.textContent = generatedImages.length;
    await nextFrame();
  }

  statusText.textContent = `Đã tạo ${generatedImages.length} ảnh. Bạn có thể tải ZIP hoặc từng ảnh.`;
  setDownloadState(true);
});

downloadAllBtn.addEventListener('click', () => {
  generatedImages.forEach(({ canvas, fileName }, index) => {
    setTimeout(() => downloadCanvas(canvas, fileName), index * 180);
  });
});

downloadZipBtn.addEventListener('click', async () => {
  if (!generatedImages.length) return;
  if (!window.JSZip) {
    statusText.textContent = 'Không tải được thư viện ZIP. Đang tải từng ảnh thay thế.';
    downloadAllBtn.click();
    return;
  }
  statusText.textContent = 'Đang đóng gói ZIP...';
  const zip = new JSZip();
  for (const { canvas, fileName } of generatedImages) {
    const blob = await canvasToBlob(canvas);
    zip.file(fileName, blob);
  }
  const archive = await zip.generateAsync({ type: 'blob' });
  downloadBlob(archive, `generated-images-${Date.now()}.zip`);
  statusText.textContent = `Đã đóng gói ${generatedImages.length} ảnh vào ZIP.`;
});

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
}

function generateVariant(image, size, prompt, strength, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  const random = mulberry32(hashString(`${prompt}-${seed}-${strength}`));

  drawCoverImage(ctx, image, size.width, size.height);

  const hue = Math.floor(random() * 360);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = `hsla(${hue}, 85%, 58%, ${strength / 180})`;
  ctx.fillRect(0, 0, size.width, size.height);

  ctx.globalCompositeOperation = 'screen';
  const gradient = ctx.createRadialGradient(
    size.width * random(), size.height * random(), 20,
    size.width * random(), size.height * random(), Math.max(size.width, size.height) * 0.85
  );
  gradient.addColorStop(0, `hsla(${(hue + 90) % 360}, 90%, 65%, ${strength / 130})`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size.width, size.height);

  ctx.globalCompositeOperation = 'source-over';
  addNoise(ctx, size.width, size.height, strength, random);
  addPromptSignature(ctx, prompt, seed + 1, size.width, size.height);
  return canvas;
}

function drawCoverImage(ctx, image, width, height) {
  const ratio = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * ratio;
  const drawHeight = image.height * ratio;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
}

function addNoise(ctx, width, height, strength, random) {
  const dots = Math.floor((width * height * strength) / 32000);
  ctx.save();
  for (let i = 0; i < dots; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${random() * 0.12})`;
    const radius = random() * 2.4 + 0.4;
    ctx.beginPath();
    ctx.arc(random() * width, random() * height, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function addPromptSignature(ctx, prompt, number, width, height) {
  const text = prompt || 'custom style';
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
  ctx.fillRect(0, height - 72, width, 72);
  ctx.fillStyle = 'rgba(255,255,255,.82)';
  ctx.font = `${Math.max(18, Math.round(width / 52))}px Inter, sans-serif`;
  ctx.fillText(`#${String(number).padStart(2, '0')}  ${text.slice(0, 80)}`, 28, height - 28);
  ctx.restore();
}

function renderCard(canvas, fileName, ratio) {
  const node = template.content.cloneNode(true);
  const card = node.querySelector('.image-card');
  const previewCanvas = node.querySelector('canvas');
  const label = node.querySelector('span');
  const button = node.querySelector('button');
  card.style.setProperty('--card-ratio', ratio);
  previewCanvas.width = canvas.width;
  previewCanvas.height = canvas.height;
  previewCanvas.getContext('2d').drawImage(canvas, 0, 0);
  label.textContent = fileName;
  button.addEventListener('click', () => downloadCanvas(canvas, fileName));
  gallery.appendChild(node);
}

function setDownloadState(enabled) {
  downloadAllBtn.disabled = !enabled;
  downloadZipBtn.disabled = !enabled;
}

function downloadCanvas(canvas, fileName) {
  canvas.toBlob((blob) => downloadBlob(blob, fileName), 'image/png');
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

function downloadBlob(blob, fileName) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

function sanitizeFileName(value) {
  return value.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'generated-image';
}

function clamp(value, min, max) {
  return Math.min(Math.max(value || min, min), max);
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function hashString(value) {
  let hash = 1779033703 ^ value.length;
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
