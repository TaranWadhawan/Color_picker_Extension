document.addEventListener('DOMContentLoaded', () => {
  const pickBtn = document.getElementById('pick-btn');
  const colorPreview = document.getElementById('color-preview');
  const hexDisplay = document.getElementById('hex-display');
  const contrastBadge = document.getElementById('contrast-badge');
  
  const rVal = document.getElementById('r-val');
  const gVal = document.getElementById('g-val');
  const bVal = document.getElementById('b-val');
  
  const hexInput = document.getElementById('hex-input');
  const rgbInput = document.getElementById('rgb-input');
  const hslInput = document.getElementById('hsl-input');
  
  const whiteTextBox = document.getElementById('white-text-box');
  const blackTextBox = document.getElementById('black-text-box');
  
  const historyList = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clear-history');

  // Load configuration and history on open
  chrome.storage.local.get(['history', 'lastColor'], (data) => {
    const history = data.history || [];
    const lastColor = data.lastColor || '#6366f1';
    updateUI(lastColor);
    renderHistory(history);
  });

  // Pick color button click handling
  pickBtn.addEventListener('click', async () => {
    if (!window.EyeDropper) {
      alert("Your browser does not support the EyeDropper API.");
      return;
    }

    try {
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      const hexColor = result.sRGBHex;
      
      updateUI(hexColor);
      saveColor(hexColor);
    } catch (err) {
      console.warn("User cancelled selection or eye dropper failed.", err);
    }
  });

  // Handle Clipboard Copy
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = e.target.getAttribute('data-target');
      const inputEl = document.getElementById(targetId);
      if (inputEl) {
        inputEl.select();
        navigator.clipboard.writeText(inputEl.value);
        const originalText = e.target.innerText;
        e.target.innerText = "Copied!";
        setTimeout(() => {
          e.target.innerText = originalText;
        }, 1200);
      }
    });
  });

  // Clear History Handler
  clearHistoryBtn.addEventListener('click', () => {
    chrome.storage.local.set({ history: [] }, () => {
      renderHistory([]);
    });
  });

  // Calculate Conversions and refresh UI elements
  function updateUI(hex) {
    hex = hex.toUpperCase();
    const rgb = hexToRgb(hex);
    if (!rgb) return;

    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    // Update colors on display cards
    colorPreview.style.backgroundColor = hex;
    hexDisplay.innerText = hex;

    // Set Separated Channels
    rVal.innerText = rgb.r;
    gVal.innerText = rgb.g;
    bVal.innerText = rgb.b;

    // Assign text fields
    hexInput.value = hex;
    rgbInput.value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    hslInput.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

    // Calculate contrast parameters
    const contrastWhite = getContrastRatio(hex, '#FFFFFF');
    const contrastBlack = getContrastRatio(hex, '#000000');

    whiteTextBox.style.backgroundColor = hex;
    blackTextBox.style.backgroundColor = hex;

    // Highlight readability indications
    contrastBadge.innerText = `Contrast Ratio: ${contrastWhite.toFixed(1)}:1`;

    // Save state
    chrome.storage.local.set({ lastColor: hex });
  }

  // Handle saving past choices
  function saveColor(hex) {
    chrome.storage.local.get(['history'], (data) => {
      let list = data.history || [];
      // Clean duplicate and append to front
      list = list.filter(item => item.toUpperCase() !== hex.toUpperCase());
      list.unshift(hex);
      // Cap size at 10 items
      if (list.length > 10) list.pop();
      
      chrome.storage.local.set({ history: list }, () => {
        renderHistory(list);
      });
    });
  }

  // Generate color boxes in the history tray
  function renderHistory(list) {
    historyList.innerHTML = '';
    list.forEach(color => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.style.backgroundColor = color;
      item.title = color;
      item.addEventListener('click', () => {
        updateUI(color);
      });
      historyList.appendChild(item);
    });
  }

  // Conversion Helpers
  function hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; 
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  // Relative Luminance and WCAG calculations
  function getLuminance(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    const parts = [rgb.r, rgb.g, rgb.b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2];
  }

  function getContrastRatio(color1, color2) {
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
  }
});