// Vanilla JS Sleep Tracker Component
import { supabase } from '../../config/supabaseClient.js';

// --- Helper Functions (Math) ---
const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

const describeArc = (x, y, radius, startAngle, endAngle) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);

  // Calculate if it's a large arc (more than 180 degrees)
  // IMPORTANT: Handle the 360 wrap-around logic for visual rendering
  let angleDiff = endAngle - startAngle;
  if (angleDiff < 0) angleDiff += 360;

  const largeArcFlag = angleDiff <= 180 ? "0" : "1";

  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
};

const calculateAngle = (x, y, centerX, centerY) => {
  const dx = x - centerX;
  const dy = y - centerY;
  let angle = Math.atan2(dy, dx) * 180 / Math.PI;
  angle += 90; // Adjust for 12 o'clock start
  if (angle < 0) angle += 360;
  return angle;
};


export function renderSleepTracker(targetElement, initialConfig = null) {
  const container = typeof targetElement === 'string'
    ? document.getElementById(targetElement)
    : targetElement;

  if (!container) return;

  // --- State ---
  // Load from Config (DB) -> LocalStorage -> Default
  const savedSchedule = localStorage.getItem('sleep_schedule_prefs');
  let defaults = { start: 300, end: 180, days: [0, 1, 2, 3, 4] };

  if (initialConfig) {
      if (initialConfig.start !== undefined) defaults.start = initialConfig.start;
      if (initialConfig.end !== undefined) defaults.end = initialConfig.end;
      if (initialConfig.selected_days !== undefined) defaults.days = initialConfig.selected_days;
  } else if (savedSchedule) {
    const parsed = JSON.parse(savedSchedule);
    defaults.start = parsed.start ?? defaults.start;
    defaults.end = parsed.end ?? defaults.end;
    defaults.days = parsed.days ?? defaults.days;
  }

  let startAngle = defaults.start; 
  let endAngle = defaults.end;   
  let openAccordionIndex = null;
  let isDragging = null; 
  let selectedDays = [...defaults.days]; 
  let hygieneStatus = { noCoffee: false, noScreens: true, darkRoom: false, tookMeds: false };
  let isDirty = false;

  // --- Template ---
  container.innerHTML = `
    <div class="dashboard-grid">
      
      <!-- COLUMN 1: SLEEP CLOCK -->
      <div class="left-column">
        <h3 style="color: #284393; margin-bottom: 10px; font-weight: 600;">Sleep Schedule</h3>
        <p class="instruction-text">Drag handles to set time</p>

        <div class="clock-container" id="clock-wrapper">
          <svg width="300" height="300" viewBox="0 0 300 300" id="sleep-clock-svg">
            <!-- Background Circle -->
            <circle cx="150" cy="150" r="100" fill="#e2e8f0" opacity="0.6" />
            
            <!-- Pie Slice (Fill) -->
            <path id="clock-slice" fill="#284393" opacity="0.25" />

            <!-- Active Arc (Stroke) -->
            <path id="clock-arc" fill="none" stroke="#196BDE" stroke-width="6" stroke-linecap="round" />

            <!-- Labels rendered via JS -->
            <g id="clock-labels-group"></g>
            
            <!-- Handles (Default Blue #196BDE) -->
            <circle id="handle-start" r="12" fill="#196BDE" stroke="white" stroke-width="3" style="cursor: grab; filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.2));" />
            <circle id="handle-end" r="12" fill="#196BDE" stroke="white" stroke-width="3" style="cursor: grab; filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.2));" />
          </svg>
        </div>

        <!-- Stats Display -->
        <div class="sleep-stats">
          <div class="time-range" id="stats-range">10:00 PM - 06:00 AM</div>
          <div class="stats-row">
            <div class="sleep-duration" id="stats-duration">8h 00m</div>
            <div class="cycle-badge" id="stats-cycles">🟢 5.3 Cycles (Perfect)</div>
          </div>
          
          <!-- Day Selector -->
          <div class="day-selector" id="day-selector"></div>
        </div>
      </div>

      <!-- COLUMN 2: RIGHT ACCORDION & TOOLS -->
      <div class="right-column" style="display: flex; flex-direction: column; gap: 16px;">
        
        <!-- 1. Brown Noise Card -->
        <div id="brown-noise-card"></div>

        <!-- 2. Accordion -->
        <div class="accordion-wrapper" id="sleep-accordion"></div>

        <!-- 3. Chart Section -->
        <div class="chart-section" style="background: white; border-radius: 16px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 2px 5px rgba(0,0,0,0.05); height: 180px; display: flex; flex-direction: column;">
            <div style="font-weight: 600; color: #334155; margin-bottom: 10px; font-size: 0.9rem;">Sleep History</div>    
            <div id="sleep-chart" style="flex: 1; min-height: 0;"></div>
        </div>

        <!-- 4. Save Button -->
        <button id="save-sleep-btn" style="
            width: 100%;
            background-color: #D1D5DB;
            color: white;
            border: none;
            padding: 16px;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            transition: all 0.2s;
        ">
            Save Sleep Log
        </button>

      </div>
    </div>
    `;

  // --- Render Functions ---
  const updateSaveButtonState = () => {
      const btn = container.querySelector('#save-sleep-btn');
      if (!btn) return;
      if (isDirty) {
          btn.style.backgroundColor = "#284393";
          btn.style.boxShadow = "0 4px 6px -1px rgba(40, 67, 147, 0.2)";
      } else {
          btn.style.backgroundColor = "#D1D5DB";
          btn.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
      }
  };

  const setDirty = () => {
      isDirty = true;
      updateSaveButtonState();
      // Also persist to localStorage for immediate UI state on reload
      localStorage.setItem('sleep_schedule_prefs', JSON.stringify({ start: startAngle, end: endAngle, days: selectedDays }));
  };

  const updateClockVisuals = () => {

    const svg = container.querySelector('#sleep-clock-svg');
    if (!svg) return;

    // Handles
    const startPos = polarToCartesian(150, 150, 100, startAngle);
    const endPos = polarToCartesian(150, 150, 100, endAngle);

    const handleStart = container.querySelector('#handle-start');
    const handleEnd = container.querySelector('#handle-end');

    handleStart.setAttribute('cx', startPos.x);
    handleStart.setAttribute('cy', startPos.y);
    handleEnd.setAttribute('cx', endPos.x);
    handleEnd.setAttribute('cy', endPos.y);

    // Handle Interact Colors (Blue Default #196BDE, Teal Active #39d2c0)
    handleStart.setAttribute('fill', isDragging === 'start' ? '#39d2c0' : '#196BDE');
    handleEnd.setAttribute('fill', isDragging === 'end' ? '#39d2c0' : '#196BDE');

    // Paths
    let sa = startAngle;
    let ea = endAngle;
    // If end < start, we might interpret it as crossing midnight
    let diff = ea - sa;
    if (diff < 0) diff += 360;

    const arcPath = container.querySelector('#clock-arc');
    // SVG Arc: M start A r r 0 large-arc sweep end
    const largeArc = diff > 180 ? 1 : 0;
    const d = [
      "M", startPos.x, startPos.y,
      "A", 100, 100, 0, largeArc, 1, endPos.x, endPos.y
    ].join(" ");
    arcPath.setAttribute('d', d);

    // Slice (Wedge)
    const slicePath = container.querySelector('#clock-slice');
    const dSlice = [
      "M", 150, 150,
      "L", startPos.x, startPos.y,
      "A", 100, 100, 0, largeArc, 1, endPos.x, endPos.y,
      "Z"
    ].join(" ");
    slicePath.setAttribute('d', dSlice);

    // --- Text Stats ---
    const getHoursMins = (angle) => {
      const totalHours = angle / 15; // 360deg / 24h = 15deg/h
      const h = Math.floor(totalHours);
      const m = Math.floor((totalHours - h) * 60);
      return { h, m };
    }

    const tStart = getHoursMins(startAngle);
    const tEnd = getHoursMins(endAngle);

    const formatTime = (t) => {
      let h = t.h;
      const ampm = h >= 12 && h < 24 ? 'PM' : 'AM';
      if (h >= 24) h -= 24;
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      return `${h}:${t.m.toString().padStart(2, '0')} ${ampm}`;
    };

    const rangeText = `${formatTime(tStart)} - ${formatTime(tEnd)}`;
    container.querySelector('#stats-range').textContent = rangeText;

    // Duration calculation
    const durationHours = diff / 15;
    const totalMinutes = Math.round(durationHours * 60);

    // --- Update Global State for Stats ---
    if (!window.appData) window.appData = {};
    if (!window.appData.sleep) window.appData.sleep = {};
    window.appData.sleep.durationMinutes = totalMinutes;

    // Dispatch event for real-time sync with main app
    window.dispatchEvent(new CustomEvent('sleep-updated'));

    // --- Stats Text ---
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const durationText = `${hours}h ${mins.toString().padStart(2, '0')}m`;

    // Update DOM
    container.querySelector('#stats-duration').innerText = durationText;

    // --- Cycle Badge Logic ---
    const totalHours = totalMinutes / 60;
    let badgeClass = 'warning';
    let badgeIcon = '🟠';
    let badgeText = 'Fair';

    // Calculate Cycles (1 cycle = 90 mins = 1.5 hours)
    const cycles = (totalMinutes / 90).toFixed(1);

    if (totalHours >= 7.5) {
      badgeClass = 'success';
      badgeIcon = '🟢';
      badgeText = 'Perfect';
    } else if (totalHours < 6) {
      badgeClass = 'danger';
      badgeIcon = '🔴';
      badgeText = 'Low';
    }

    const badgeEl = container.querySelector('#stats-cycles');
    // Ensure we are fully replacing classes
    badgeEl.setAttribute('class', `cycle-badge ${badgeClass}`);
    badgeEl.innerHTML = `${badgeIcon} ${cycles} Cycles (${badgeText})`;
  };

  const renderDaySelector = () => {
    const containerEl = container.querySelector('#day-selector');
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    containerEl.innerHTML = days.map((day, index) => `
        <div class="day-circle ${selectedDays.includes(index) ? 'active' : ''}" data-index="${index}">
            ${day}
        </div>
      `).join('');

    // Bind clicks
    containerEl.querySelectorAll('.day-circle').forEach(el => {
      el.onclick = (e) => {
        const idx = parseInt(e.currentTarget.dataset.index);
        if (selectedDays.includes(idx)) {
          selectedDays = selectedDays.filter(d => d !== idx);
        } else {
          selectedDays.push(idx);
        }
        setDirty();
        renderDaySelector();
      };
    });
  };

  const renderClockLabels = () => {
    const svg = container.querySelector('#sleep-clock-svg');
    // Remove any existing dynamically added labels to prevent duplicates on re-render
    svg.querySelectorAll('.clock-label').forEach(label => label.remove());

    const labels = [];
    for (let i = 0; i < 24; i++) {
      let type = 'sub-minor';
      if (i % 6 === 0) type = 'major';
      else if (i % 3 === 0) type = 'minor';

      // 0 hours = 0 degrees, 1 hour = 15 degrees
      labels.push({ txt: i.toString(), deg: i * 15, type });
    }

    labels.forEach(l => {
      const r = 125; // Radius to push labels outward from the 100px clock circle
      const pos = polarToCartesian(150, 150, r, l.deg);
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute('x', pos.x);
      text.setAttribute('y', pos.y);
      text.setAttribute('class', `clock-label ${l.type}`);
      text.textContent = l.txt;
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('text-anchor', 'middle'); // Ensure horizontal centering
      svg.insertBefore(text, svg.firstChild); // Insert at the beginning of SVG for background rendering
    });
  }

  const renderChart = () => {
    const chartEl = container.querySelector('#sleep-chart');
    if (!chartEl) return;

    // Data Source (Fallback to 0s if no history)
    // In a real app, this would come from window.appData.sleep.weekLogs
    const hasHistory = window.appData?.sleep?.weekLogs && window.appData.sleep.weekLogs.length > 0;

    // Default Data (Zeros)
    let data = [
      { day: 'M', hours: 0, range: '' }, { day: 'T', hours: 0, range: '' },
      { day: 'W', hours: 0, range: '' }, { day: 'T', hours: 0, range: '' },
      { day: 'F', hours: 0, range: '' }, { day: 'S', hours: 0, range: '' },
      { day: 'S', hours: 0, range: '' }
    ];

    // If history exists, map it here. Using Mock Data as requested for visualization.
    if (true) {
      data = [
        { day: 'M', hours: 6.5, range: '10:30 PM - 05:00 AM' },
        { day: 'T', hours: 7.0, range: '10:00 PM - 05:00 AM' },
        { day: 'W', hours: 8.5, range: '09:30 PM - 06:00 AM' },
        { day: 'T', hours: 5.0, range: '01:00 AM - 06:00 AM' },
        { day: 'F', hours: 7.5, range: '11:00 PM - 06:30 AM' },
        { day: 'S', hours: 9.0, range: '10:00 PM - 07:00 AM' },
        { day: 'S', hours: 8.0, range: '10:00 PM - 06:00 AM' }
      ];
    }

    // --- Tooltip Element (Lazy Create) ---
    let tooltip = container.querySelector('#chart-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'chart-tooltip';
      tooltip.style.cssText = `
            position: absolute;
            background: #1e293b;
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 0.75rem;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 100;
            white-space: nowrap;
            display: flex;
            flex-direction: column;
            gap: 2px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
      // Append to chart section
      chartEl.parentElement.style.position = 'relative';
      chartEl.parentElement.appendChild(tooltip);
    }

    // Render Bars
    chartEl.innerHTML = `
        <div style="display: flex; align-items: flex-end; justify-content: space-between; height: 100%; width: 100%; padding-bottom: 24px; box-sizing: border-box; position: relative;">
            ${data.map((d, i) => {
      // Max height 100px roughly
      const heightPct = Math.min((d.hours / 10) * 100, 100);
      const color = '#39d2c0'; // Teal

      return `
                <div class="bar-col" style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; width: 22px; position: relative;">
                    <div class="bar-visual" 
                        data-range="${d.range}" 
                        data-hours="${d.hours}"
                        style="
                            /* Visuals */
                            width: 14px; /* Thicker bars */
                            height: ${d.hours > 0 ? heightPct + '%' : '4px'}; 
                            height: ${d.hours > 0 ? heightPct + '%' : '0'};
                            background-color: ${color};
                            border-radius: 10px 10px 0 0; /* Fully rounded top */
                            transition: height 0.3s ease;
                        "
                    ></div>
                    <div class="bar-label" style="
                        position: absolute; 
                        bottom: -24px; 
                        font-size: 0.75rem; 
                        color: #94a3b8;
                    ">${d.day}</div>
                </div>
                `;
    }).join('')}
            
            <!-- X-Axis Line -->
            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 1px; background-color: #e2e8f0;"></div>
        </div>
    `;

    // Bind Hover Events
    const bars = chartEl.querySelectorAll('.bar-visual');
    bars.forEach(bar => {
      bar.addEventListener('mouseenter', (e) => {
        const range = e.target.dataset.range;
        const hours = e.target.dataset.hours;
        if (hours == 0) return; // interactive only if data? Screenshot bar hovered.

        tooltip.innerHTML = `<span style="font-weight:600;">${hours} hrs</span><span style="opacity:0.8">${range}</span>`;
        tooltip.style.opacity = '1';

        // Position
        const rect = e.target.getBoundingClientRect();
        const parentRect = container.querySelector('.chart-section').getBoundingClientRect();

        const left = rect.left - parentRect.left - (tooltip.offsetWidth / 2) + (rect.width / 2);
        const top = rect.top - parentRect.top - tooltip.offsetHeight - 8;

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
      });

      bar.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
      });
    });
  };

  const renderAccordion = () => {
    const accEl = container.querySelector('#sleep-accordion');

    // --- Hygiene Grid HTML Generator ---
    const getHygieneGridHTML = () => {
      const items = [
        { id: 'noCoffee', icon: '☕', label: 'No Coffee' },
        { id: 'noScreens', icon: '📱', label: 'No Screens' },
        { id: 'darkRoom', icon: 'Hz', label: 'Dark Room', iconHTML: '<span style="background:#1e293b; color:white; border-radius:50%; width:20px; height:20px; display:inline-flex; align-items:center; justify-content:center; font-size:12px;">☾</span>' },
        { id: 'tookMeds', icon: 'aa', label: 'Took Meds', iconHTML: '💊' }
      ];

      return `
            <div class="hygiene-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 10px;">
                ${items.map(item => {
        const isActive = hygieneStatus[item.id];
        const bg = isActive ? '#EEF2FF' : 'white';
        const border = isActive ? '1px solid #284393' : '1px solid #e2e8f0';
        const color = isActive ? '#284393' : '#334155'; // Text color
        const icon = item.iconHTML || item.icon;
        const weight = isActive ? '600' : '400';

        return `
                    <div class="hygiene-card" data-id="${item.id}" style="
                        background: ${bg}; 
                        border: ${border}; 
                        border-radius: 12px; 
                        padding: 12px; 
                        display: flex; 
                        align-items: center; 
                        gap: 8px; 
                        cursor: pointer; 
                        transition: all 0.2s ease;
                    ">
                        <div style="font-size: 1.1rem;">${icon}</div>
                        <div style="font-size: 0.9rem; color: ${color}; font-weight: ${weight};">${item.label}</div>
                    </div>
                    `;
      }).join('')}
            </div>
        `;
    };

    const items = [
      { title: "✅ Sleep Hygiene", content: getHygieneGridHTML() }
    ];

    accEl.innerHTML = items.map((item, idx) => `
            <div class="accordion-item ${openAccordionIndex === idx ? 'open' : ''}" data-index="${idx}">
              <div class="accordion-header">
                <span>${item.title}</span>
                <span style="transform: ${openAccordionIndex === idx ? 'rotate(45deg)' : 'rotate(0deg)'}; transition: 0.3s; font-size: 1.5rem;">+</span>
              </div>
              <div class="accordion-content">
                ${item.content}
              </div>
            </div>
        `).join('');

    // Bind Header Clicks
    accEl.querySelectorAll('.accordion-header').forEach(header => {
      header.onclick = (e) => {
        const idx = parseInt(e.currentTarget.parentElement.dataset.index);
        openAccordionIndex = openAccordionIndex === idx ? null : idx;
        renderAccordion(); // Re-render to animate class
      };
    });

    // Bind Hygiene Card Clicks
    accEl.querySelectorAll('.hygiene-card').forEach(card => {
      card.onclick = (e) => {
        e.stopPropagation(); // Prevent accordion collapse
        const id = e.currentTarget.dataset.id;
        hygieneStatus[id] = !hygieneStatus[id];
        renderAccordion(); // Re-render to update UI
      };
    });
  };

  const renderBrownNoiseCard = () => {
    const containerEl = container.querySelector('#brown-noise-card');
    if (!containerEl) return;

    let isPlaying = false;
    let audioCtx = null;
    let noiseSource = null;
    let gainNode = null;

    // Render Layout
    containerEl.innerHTML = `
        <div style="background-color: #EEEEEE; border-radius: 16px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; width: 100%; box-sizing: border-box;">
            <div>
                <div style="font-weight: 700; fontSize: 1rem; color: #334155; margin-bottom: 2px;">🌊 Brown Noise</div>
                <div style="font-size: 0.85rem; color: #94a3b8;">Calms ADHD brain (Generated)</div>
            </div>
            <div id="bn-play-btn" style="width: 45px; height: 45px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; cursor: pointer; transition: background-color 0.2s ease; user-select: none; background-color: #284393;">
                ▶
            </div>
        </div>
      `;

    // --- Brown Noise Generation Helper ---
    const createBrownNoise = (ctx) => {
      const bufferSize = ctx.sampleRate * 2; // 2 seconds loop
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + (0.02 * white)) / 1.02;
        data[i] = lastOut * 3.5; // Compensate for gain loss
      }
      return buffer;
    };

    const startNoise = () => {
      if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
      }

      // Resume context if suspended (browser requirements)
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const buffer = createBrownNoise(audioCtx);
      noiseSource = audioCtx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.5; // Default volume

      noiseSource.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      noiseSource.start(0);

      // Fade in
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
    };

    const stopNoise = () => {
      if (noiseSource) {
        // Fade out
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        noiseSource.stop(audioCtx.currentTime + 0.1);
        noiseSource = null;
      }
    };

    const btn = containerEl.querySelector('#bn-play-btn');

    btn.onclick = () => {
      if (isPlaying) {
        stopNoise();
        isPlaying = false;
        updateBtn();
      } else {
        startNoise();
        isPlaying = true;
        updateBtn();
      }
    };

    function updateBtn() {
      if (isPlaying) {
        btn.innerText = '⏸';
        btn.style.backgroundColor = '#334155'; // Dark Grey
      } else {
        btn.innerText = '▶';
        btn.style.backgroundColor = '#284393'; // Blue
      }
    }
  };

  // --- Interaction Logic (Drag) ---
  // Use container.querySelector to ensure we find elements even if not yet attached to document
  const wrapper = container.querySelector('#clock-wrapper');
  const svg = container.querySelector('#sleep-clock-svg');

  // Mouse/Touch Events
  const getAngleFromEvent = (e) => {
    const rect = svg.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return calculateAngle(clientX - rect.left, clientY - rect.top, centerX, centerY);
  };

  const handleStart = container.querySelector('#handle-start');
  const handleEnd = container.querySelector('#handle-end');

  if (handleStart) {
    handleStart.addEventListener('mousedown', (e) => { isDragging = 'start'; e.preventDefault(); });
    handleStart.addEventListener('touchstart', (e) => { isDragging = 'start'; e.preventDefault(); });
  }

  if (handleEnd) {
    handleEnd.addEventListener('mousedown', (e) => { isDragging = 'end'; e.preventDefault(); });
    handleEnd.addEventListener('touchstart', (e) => { isDragging = 'end'; e.preventDefault(); });
  }

  const moveHandler = (e) => {
    if (!isDragging) return;
    const newAngle = getAngleFromEvent(e);

    // Snap to 15 deg steps (1 hour) or 7.5 deg (30 min)
    const snapped = Math.round(newAngle / 7.5) * 7.5;

    if (isDragging === 'start') {
      startAngle = snapped;
    } else {
      endAngle = snapped;
    }
    setDirty();
    updateClockVisuals();
  };

  const stopHandler = () => {
    isDragging = null;
  };

  window.addEventListener('mousemove', moveHandler);
  window.addEventListener('touchmove', moveHandler);
  window.addEventListener('mouseup', stopHandler);
  window.addEventListener('touchend', stopHandler);

  // Save Button Logic
  const saveBtn = container.querySelector('#save-sleep-btn');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      // Calculate duration hours for DB
      let diff = endAngle - startAngle;
      if (diff < 0) diff += 360;
      const hours = diff / 15; // 24h clock, 15 deg = 1h
      const minutes = Math.round(hours * 60);

      const origText = saveBtn.textContent;
      saveBtn.textContent = "Saving...";

      try {
        // 1. Log the event
        const { error: logError } = await supabase
          .from('sleep_logs')
          .insert({
            user_id: window.currentUser.id,
            duration_minutes: minutes,
            notes: `Slept from angle ${startAngle} to ${endAngle} [Config: ${JSON.stringify({ start: startAngle, end: endAngle, selected_days: selectedDays })}]`
          });

        if (logError) throw logError;

        // 2. Upsert the Master Schedule
        const { error: schedError } = await supabase
          .from('sleep_schedules')
          .upsert({
              user_id: window.currentUser.id,
              start_angle: startAngle,
              end_angle: endAngle,
              selected_days: selectedDays,
              updated_at: new Date().toISOString()
          });

          if (schedError) {
              console.warn("Failed to upsert sleep schedule (non-critical):", schedError);
          }

        saveBtn.textContent = "Saved!";
        saveBtn.style.backgroundColor = "#10B981"; // Success Green
        isDirty = false;
        updateSaveButtonState();

        setTimeout(() => {
          saveBtn.textContent = origText;
          updateSaveButtonState();
        }, 2000);
      } catch (err) {
        console.error(err);
        saveBtn.textContent = "Error";
        alert("Failed to save sleep log: " + err.message);
      }
    };
  }

  // --- Init ---
  updateClockVisuals();
  renderClockLabels();
  renderChart();
  renderAccordion();
  renderBrownNoiseCard();
  renderDaySelector();
  updateSaveButtonState();
}