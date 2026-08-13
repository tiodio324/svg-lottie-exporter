(() => {
  const FORMAT = {
    png: { ext: 'png', mime: 'image/png', quality: false },
    jpeg: { ext: 'jpg', mime: 'image/jpeg', quality: true },
    webp: { ext: 'webp', mime: 'image/webp', quality: true },
  };

  const THEME_KEY = 'sle-ui-theme';
  const PREVIEW_KEY = 'sle-preview-theme';
  const PICKER_ID = 'sle-export';
  const HANDLE_DB = 'sle-fs';
  const HANDLE_STORE = 'handles';
  const HANDLE_KEY = 'export';
  const THEME_ICONS = {
    moon: '<svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21 14.55A9 9 0 0 1 9.45 3 7.5 7.5 0 1 0 21 14.55z"/></svg>',
    sun: '<svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0-3a1 1 0 0 1 1 1v1.5a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm0 17a1 1 0 0 1 1 1V21a1 1 0 1 1-2 0v-1.5a1 1 0 0 1 1-1zM3 11h1.5a1 1 0 1 1 0 2H3a1 1 0 1 1 0-2zm16.5 0H21a1 1 0 1 1 0 2h-1.5a1 1 0 1 1 0-2zM5.05 5.05a1 1 0 0 1 1.41 0l1.06 1.06a1 1 0 1 1-1.41 1.41L5.05 6.46a1 1 0 0 1 0-1.41zm11.43 11.43a1 1 0 0 1 1.41 0l1.06 1.06a1 1 0 1 1-1.41 1.41l-1.06-1.06a1 1 0 0 1 0-1.41zM5.05 18.95a1 1 0 0 1 0-1.41l1.06-1.06a1 1 0 1 1 1.41 1.41l-1.06 1.06a1 1 0 0 1-1.41 0zm11.43-11.43a1 1 0 0 1 0-1.41l1.06-1.06a1 1 0 1 1 1.41 1.41l-1.06 1.06a1 1 0 0 1-1.41 0z"/></svg>',
  };

  const state = {
    items: [],
    lockRatio: true,
    customSize: false,
    aspect: 1,
    renderToken: 0,
    uiTheme: 'dark',
    previewTheme: 'dark',
  };

  const el = {
    files: document.getElementById('files'),
    drop: document.getElementById('drop'),
    list: document.getElementById('list'),
    status: document.getElementById('status'),
    saveAllBtn: document.getElementById('saveAllBtn'),
    clearBtn: document.getElementById('clearBtn'),
    width: document.getElementById('width'),
    height: document.getElementById('height'),
    padding: document.getElementById('padding'),
    square: document.getElementById('square'),
    quality: document.getElementById('quality'),
    qualityLabel: document.getElementById('qualityLabel'),
    qualityField: document.getElementById('qualityField'),
    sizeHint: document.getElementById('sizeHint'),
    bgHint: document.getElementById('bgHint'),
    recolorOn: document.getElementById('recolorOn'),
    recolorRow: document.getElementById('recolorRow'),
    iconPicker: document.getElementById('iconPicker'),
    iconColor: document.getElementById('iconColor'),
    bgPicker: document.getElementById('bgPicker'),
    bgColor: document.getElementById('bgColor'),
    bgRow: document.getElementById('bgRow'),
    suffix: document.getElementById('suffix'),
    lockRatio: document.getElementById('lockRatio'),
    uiTheme: document.getElementById('uiTheme'),
    previewTheme: document.getElementById('previewTheme'),
  };

  let debounceTimer = 0;
  let lastDirHandle = null;

  document.querySelectorAll('input[name="format"]').forEach((input) => {
    input.addEventListener('change', onSettingsChange);
  });
  document.querySelectorAll('input[name="scale"]').forEach((input) => {
    input.addEventListener('change', onScalePreset);
  });
  document.querySelectorAll('input[name="bgMode"]').forEach((input) => {
    input.addEventListener('change', onSettingsChange);
  });

  el.quality.addEventListener('input', () => {
    el.qualityLabel.textContent = Number(el.quality.value).toFixed(2);
    scheduleRender();
  });
  el.width.addEventListener('input', () => onManualSize('width'));
  el.height.addEventListener('input', () => onManualSize('height'));
  el.padding.addEventListener('input', scheduleRender);
  el.square.addEventListener('change', scheduleRender);
  el.recolorOn.addEventListener('change', onSettingsChange);
  el.iconColor.addEventListener('input', () => syncPicker(el.iconColor, el.iconPicker));
  el.iconPicker.addEventListener('input', () => {
    el.iconColor.value = el.iconPicker.value;
    scheduleRender();
  });
  el.bgColor.addEventListener('input', () => syncPicker(el.bgColor, el.bgPicker));
  el.bgPicker.addEventListener('input', () => {
    el.bgColor.value = el.bgPicker.value;
    scheduleRender();
  });
  el.suffix.addEventListener('input', scheduleRender);
  el.lockRatio.addEventListener('click', toggleLock);
  el.uiTheme.addEventListener('click', () => setUiTheme(state.uiTheme === 'dark' ? 'light' : 'dark'));
  el.previewTheme.addEventListener('click', toggleAllPreviews);

  restoreThemes();

  el.drop.addEventListener('click', () => el.files.click());
  el.drop.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      el.files.click();
    }
  });
  el.files.addEventListener('change', () => addFiles(el.files.files));
  el.clearBtn.addEventListener('click', clearAll);
  el.saveAllBtn.addEventListener('click', saveAll);

  ;['dragenter', 'dragover'].forEach((type) => {
    el.drop.addEventListener(type, (event) => {
      event.preventDefault();
      el.drop.classList.add('is-over');
    });
  });
  ;['dragleave', 'drop'].forEach((type) => {
    el.drop.addEventListener(type, (event) => {
      event.preventDefault();
      el.drop.classList.remove('is-over');
    });
  });
  el.drop.addEventListener('drop', (event) => {
    addFiles(event.dataTransfer?.files);
  });

  onSettingsChange();

  function settings() {
    const format = document.querySelector('input[name="format"]:checked').value;
    const scaleInput = document.querySelector('input[name="scale"]:checked').value;
    const bgMode = document.querySelector('input[name="bgMode"]:checked').value;
    return {
      format,
      scale: scaleInput === 'custom' ? 'custom' : Number(scaleInput),
      width: clampInt(el.width.value, 1, 8192),
      height: clampInt(el.height.value, 1, 8192),
      padding: clampInt(el.padding.value, 0, 512),
      square: el.square.checked,
      quality: Number(el.quality.value),
      recolor: el.recolorOn.checked ? parseColor(el.iconColor.value) : null,
      background: bgMode === 'color' ? parseColor(el.bgColor.value) : null,
      suffix: el.suffix.value.trim(),
    };
  }

  function onSettingsChange() {
    const { format, background } = settings();
    el.qualityField.hidden = !FORMAT[format].quality;
    el.recolorRow.style.opacity = el.recolorOn.checked ? '1' : '0.4';
    el.bgRow.style.opacity = background ? '1' : '0.4';
    el.bgHint.textContent = background
      ? 'Этот цвет попадёт в файл.'
      : format === 'png'
        ? 'В PNG шахматка только в превью, файл без фона.'
        : 'JPEG без альфы: если фон не задан, будет белый.';
    scheduleRender();
  }

  function onScalePreset() {
    const value = document.querySelector('input[name="scale"]:checked').value;
    state.customSize = value === 'custom';
    if (!state.customSize && state.items[0]) {
      applyScaleToFields(Number(value), state.items[0]);
    }
    scheduleRender();
  }

  function applyScaleToFields(scale, item) {
    el.width.value = Math.round(item.naturalWidth * scale);
    el.height.value = Math.round(item.naturalHeight * scale);
    state.aspect = item.naturalWidth / item.naturalHeight;
  }

  function onManualSize(axis) {
    document.querySelector('input[name="scale"][value="custom"]').checked = true;
    state.customSize = true;
    if (state.lockRatio && state.aspect) {
      if (axis === 'width') {
        el.height.value = Math.max(1, Math.round(Number(el.width.value) / state.aspect));
      } else {
        el.width.value = Math.max(1, Math.round(Number(el.height.value) * state.aspect));
      }
    }
    scheduleRender();
  }

  function toggleLock() {
    state.lockRatio = !state.lockRatio;
    el.lockRatio.classList.toggle('is-on', state.lockRatio);
    el.lockRatio.setAttribute('aria-pressed', String(state.lockRatio));
  }

  function restoreThemes() {
    try {
      const savedUi = localStorage.getItem(THEME_KEY);
      const savedPreview = localStorage.getItem(PREVIEW_KEY);
      if (savedUi === 'light' || savedUi === 'dark') state.uiTheme = savedUi;
      if (savedPreview === 'light' || savedPreview === 'dark') state.previewTheme = savedPreview;
    } catch (err) {}
    applyUiTheme();
    syncThemeButtons();
  }

  function setUiTheme(theme) {
    state.uiTheme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch (err) {}
    applyUiTheme();
    syncThemeButtons();
  }

  function applyUiTheme() {
    document.documentElement.dataset.theme = state.uiTheme;
  }

  function toggleAllPreviews() {
    state.previewTheme = state.previewTheme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(PREVIEW_KEY, state.previewTheme); } catch (err) {}
    for (const item of state.items) item.previewTheme = null;
    syncThemeButtons();
    if (state.items.length) paintCards(settings());
  }

  function toggleCardPreview(item) {
    const current = item.previewTheme || state.previewTheme;
    item.previewTheme = current === 'dark' ? 'light' : 'dark';
    paintCards(settings());
  }

  function cardPreviewTheme(item) {
    return item.previewTheme || state.previewTheme;
  }

  function syncThemeButton(button, theme, titles) {
    const isDark = theme === 'dark';
    button.classList.toggle('is-on', isDark);
    button.classList.toggle('is-light', !isDark);
    button.setAttribute('aria-pressed', String(isDark));
    button.title = isDark ? titles.dark : titles.light;
    const moon = button.querySelector('.icon-moon');
    const sun = button.querySelector('.icon-sun');
    if (moon) moon.hidden = !isDark;
    if (sun) sun.hidden = isDark;
  }

  function syncThemeButtons() {
    syncThemeButton(el.uiTheme, state.uiTheme, {
      dark: 'Тёмная тема интерфейса',
      light: 'Светлая тема интерфейса',
    });
    syncThemeButton(el.previewTheme, state.previewTheme, {
      dark: 'Тёмное превью всех карточек',
      light: 'Светлое превью всех карточек',
    });
  }

  function makeThemeButton(theme, titles) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-btn';
    button.innerHTML = `<span class="sr">${titles.dark}</span>${THEME_ICONS.moon}${THEME_ICONS.sun}`;
    syncThemeButton(button, theme, titles);
    return button;
  }

  function syncPicker(textInput, picker) {
    const color = parseColor(textInput.value);
    if (color && color.startsWith('#') && (color.length === 7)) {
      picker.value = color;
    }
    scheduleRender();
  }

  async function addFiles(fileList) {
    const svgs = [...(fileList || [])].filter((file) =>
      file.name.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml'
    );
    if (!svgs.length) return;

    for (const file of svgs.sort((a, b) => a.name.localeCompare(b.name))) {
      try {
        const xml = prepareSvg(await file.text());
        const image = await loadImage(svgToDataUrl(xml));
        const item = {
          sourceName: file.name,
          xml,
          naturalWidth: image.naturalWidth || 320,
          naturalHeight: image.naturalHeight || 200,
          blob: null,
          outName: '',
          outWidth: 0,
          outHeight: 0,
          error: '',
          previewTheme: null,
        };
        state.items.push(item);
      } catch (error) {
        state.items.push({
          sourceName: file.name,
          xml: '',
          naturalWidth: 0,
          naturalHeight: 0,
          blob: null,
          outName: '',
          outWidth: 0,
          outHeight: 0,
          error: error.message || 'Не удалось прочитать SVG',
          previewTheme: null,
        });
      }
    }

    if (state.items[0] && !state.customSize) {
      const scale = document.querySelector('input[name="scale"]:checked').value;
      applyScaleToFields(scale === 'custom' ? 1 : Number(scale), state.items[0]);
    }
    el.files.value = '';
    await renderAll();
  }

  function clearAll() {
    state.items = [];
    el.list.replaceChildren();
    updateChrome();
  }

  function scheduleRender() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(renderAll, 120);
  }

  async function renderAll() {
    const token = ++state.renderToken;
    const opts = settings();
    for (const item of state.items) {
      if (token !== state.renderToken) return;
      if (!item.xml) continue;
      try {
        const result = await rasterize(item, opts);
        item.blob = result.blob;
        item.outName = result.name;
        item.outWidth = result.width;
        item.outHeight = result.height;
        item.error = '';
      } catch (error) {
        item.error = error.message || 'Ошибка растеризации';
        item.blob = null;
      }
    }
    if (token !== state.renderToken) return;
    paintCards(opts);
    updateChrome();
  }

  function paintCards(opts) {
    el.list.replaceChildren();
    for (const item of state.items) {
      const card = document.createElement('article');
      card.className = `card${item.error ? ' is-error' : ''}`;
      const previewTheme = cardPreviewTheme(item);

      const preview = document.createElement('div');
      preview.className = `preview is-${previewTheme}${opts.background ? ' is-solid' : ''}`;
      if (opts.background) preview.style.setProperty('--preview-bg', opts.background);

      const themeBtn = makeThemeButton(previewTheme, {
        dark: 'Тёмное превью карточки',
        light: 'Светлое превью карточки',
      });
      themeBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleCardPreview(item);
      });
      preview.appendChild(themeBtn);

      if (item.blob) {
        const img = document.createElement('img');
        img.alt = item.outName;
        img.src = URL.createObjectURL(item.blob);
        img.onload = () => URL.revokeObjectURL(img.src);
        preview.appendChild(img);
      }

      const name = document.createElement('div');
      name.className = 'card__name';
      name.textContent = item.error || item.outName;

      const size = document.createElement('div');
      size.className = 'card__size';
      size.textContent = item.error
        ? item.sourceName
        : `${item.outWidth}×${item.outHeight}`;

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Скачать';
      button.disabled = !item.blob;
      button.addEventListener('click', () => saveOne(item));

      card.append(preview, name, size, button);
      el.list.appendChild(card);
    }
  }

  function updateChrome() {
    const ready = state.items.filter((item) => item.blob).length;
    const total = state.items.length;
    el.saveAllBtn.disabled = ready === 0;
    el.clearBtn.disabled = total === 0;
    el.status.textContent = total
      ? `${ready} из ${total} готовы`
      : 'Файлов нет';
    if (state.items[0]) {
      const first = state.items[0];
      el.sizeHint.textContent = `Размер исходника: ${first.naturalWidth}×${first.naturalHeight}`;
    } else {
      el.sizeHint.textContent = '';
    }
  }

  async function rasterize(item, opts) {
    const image = await loadImage(svgToDataUrl(item.xml));
    const srcW = image.naturalWidth || item.naturalWidth;
    const srcH = image.naturalHeight || item.naturalHeight;
    const scale = opts.scale === 'custom'
      ? Math.min(opts.width / srcW, opts.height / srcH)
      : opts.scale;
    let drawW = Math.max(1, Math.round(srcW * (opts.scale === 'custom' ? scale : opts.scale)));
    let drawH = Math.max(1, Math.round(srcH * (opts.scale === 'custom' ? scale : opts.scale)));

    if (opts.scale === 'custom') {
      drawW = Math.max(1, Math.round(srcW * (opts.width / srcW)));
      drawH = Math.max(1, Math.round(srcH * (opts.height / srcH)));
      if (state.lockRatio) {
        const s = Math.min(opts.width / srcW, opts.height / srcH);
        drawW = Math.max(1, Math.round(srcW * s));
        drawH = Math.max(1, Math.round(srcH * s));
      } else {
        drawW = opts.width;
        drawH = opts.height;
      }
    }

    let canvasW = drawW + opts.padding * 2;
    let canvasH = drawH + opts.padding * 2;
    if (opts.square) {
      const side = Math.max(canvasW, canvasH);
      canvasW = side;
      canvasH = side;
    }

    const layer = document.createElement('canvas');
    layer.width = drawW;
    layer.height = drawH;
    const layerCtx = layer.getContext('2d', { alpha: true });
    layerCtx.imageSmoothingEnabled = true;
    layerCtx.imageSmoothingQuality = 'high';
    layerCtx.clearRect(0, 0, drawW, drawH);
    layerCtx.drawImage(image, 0, 0, drawW, drawH);
    if (opts.recolor) {
      layerCtx.globalCompositeOperation = 'source-in';
      layerCtx.fillStyle = opts.recolor;
      layerCtx.fillRect(0, 0, drawW, drawH);
      layerCtx.globalCompositeOperation = 'source-over';
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d', { alpha: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, canvasW, canvasH);

    const format = FORMAT[opts.format];
    const bg = opts.background || (opts.format === 'jpeg' ? '#ffffff' : null);
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }

    const x = Math.round((canvasW - drawW) / 2);
    const y = Math.round((canvasH - drawH) / 2);
    ctx.drawImage(layer, x, y);

    const blob = await canvasToBlob(canvas, format.mime, format.quality ? opts.quality : undefined);
    const base = item.sourceName.replace(/\.svg$/i, '');
    const name = `${base}${opts.suffix}.${format.ext}`;
    return { blob, name, width: canvasW, height: canvasH };
  }

  function canvasToBlob(canvas, mime, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('canvas.toBlob вернул пусто')),
        mime,
        quality
      );
    });
  }

  function prepareSvg(xml) {
    return xml
      .replace(/\sstyle="[^"]*"/, '')
      .replace(/<svg\b/, '<svg style="background:none"');
  }

  function svgToDataUrl(xml) {
    const bytes = new TextEncoder().encode(xml);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return `data:image/svg+xml;base64,${btoa(binary)}`;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Не удалось растрировать SVG'));
      image.src = src;
    });
  }

  function parseColor(value) {
    const text = String(value || '').trim();
    if (!text) return null;
    if (/^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(text)) {
      return expandHex(text);
    }
    if (/^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+\s*)?\)$/i.test(text)) {
      return text.replace(/\s+/g, '');
    }
    if (/^[\da-f]{6}$/i.test(text)) return `#${text}`;
    return null;
  }

  function expandHex(hex) {
    if (hex.length === 4) {
      return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }
    if (hex.length === 5) {
      return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}${hex[4]}${hex[4]}`;
    }
    return hex;
  }

  function clampInt(value, min, max) {
    const n = Number.parseInt(String(value), 10);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  async function saveOne(item) {
    if (!item.blob) return;
    if (window.showSaveFilePicker) {
      try {
        await restoreHandle();
        const handle = await openSavePicker({
          suggestedName: item.outName,
          types: [pickerType(item.outName)],
        });
        const writable = await handle.createWritable();
        await writable.write(item.blob);
        await writable.close();
        await rememberHandle(handle);
      } catch (error) {
        if (error.name !== 'AbortError') throw error;
      }
      return;
    }
    fallbackDownload(item);
  }

  async function saveAll() {
    const files = state.items.filter((item) => item.blob);
    if (!files.length) return;
    if (window.showDirectoryPicker) {
      try {
        await restoreHandle();
        const directory = await openDirPicker();
        for (const file of files) {
          const handle = await directory.getFileHandle(file.outName, { create: true });
          const writable = await handle.createWritable();
          await writable.write(file.blob);
          await writable.close();
        }
        await rememberHandle(directory);
      } catch (error) {
        if (error.name !== 'AbortError') throw error;
      }
      return;
    }
    files.forEach(fallbackDownload);
  }

  async function openSavePicker(extra) {
    const options = { id: PICKER_ID, ...extra };
    try {
      return await window.showSaveFilePicker(withStartIn(options));
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      return await window.showSaveFilePicker(options);
    }
  }

  async function openDirPicker() {
    const options = { id: PICKER_ID, mode: 'readwrite' };
    try {
      return await window.showDirectoryPicker(withStartIn(options));
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      return await window.showDirectoryPicker(options);
    }
  }

  function withStartIn(options) {
    return lastDirHandle ? { ...options, startIn: lastDirHandle } : options;
  }

  function idbRequest(mode, run) {
    return new Promise((resolve, reject) => {
      const open = indexedDB.open(HANDLE_DB, 1);
      open.onupgradeneeded = () => open.result.createObjectStore(HANDLE_STORE);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction(HANDLE_STORE, mode);
        const request = run(tx.objectStore(HANDLE_STORE));
        request.onsuccess = () => {
          resolve(request.result);
          db.close();
        };
        request.onerror = () => {
          reject(request.error);
          db.close();
        };
      };
    });
  }

  async function restoreHandle() {
    if (lastDirHandle) return lastDirHandle;
    try {
      lastDirHandle = (await idbRequest('readonly', (store) => store.get(HANDLE_KEY))) || null;
    } catch {
      lastDirHandle = null;
    }
    return lastDirHandle;
  }

  async function rememberHandle(handle) {
    if (!handle) return;
    lastDirHandle = handle;
    try {
      await idbRequest('readwrite', (store) => store.put(handle, HANDLE_KEY));
    } catch {}
  }

  function pickerType(name) {
    if (name.endsWith('.jpg')) return { description: 'JPEG', accept: { 'image/jpeg': ['.jpg', '.jpeg'] } };
    if (name.endsWith('.webp')) return { description: 'WebP', accept: { 'image/webp': ['.webp'] } };
    return { description: 'PNG', accept: { 'image/png': ['.png'] } };
  }

  function fallbackDownload(item) {
    const url = URL.createObjectURL(item.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = item.outName;
    link.click();
    URL.revokeObjectURL(url);
  }
})();
