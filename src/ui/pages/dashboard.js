
export function renderDashboard() {
    const container = document.getElementById('view-overview');
    if (!container) return;

    // Clear existing simple stats
    container.innerHTML = `<h2 class="section-heading" style="max-width:900px; margin:0 auto 20px auto; padding:0; width:100%; box-sizing:border-box;">Dashboard</h2>`;

    const bento = document.createElement('div');
    bento.className = 'bento-grid';
    container.appendChild(bento);

    // --- DATA PREP ---
    const tasks = window.appData?.tasks || [];
    const history = window.appData?.history || {};
    const meds = window.appData?.meds || [];
    
    // 1. Gamification Level
    // Simple XP Logic: 100 XP per task completed. Level up every 1000 XP.
    const completedTotal = tasks.filter(t => t.completedCount).reduce((acc, t) => acc + (t.completedCount || 0), 0) 
                         + Object.values(history).reduce((acc, day) => acc + (day.completed || 0), 0); 
    // ^ This is a rough estimation. Let's just use "History" entries count if available, else standard tasks count.
    
    // Better XP calculation:
    // Let's assume we store "totalXP" in appData.stats. If not, calculate from total completed tasks in history.
    let totalTasksDone = 0;
    if (window.appData.stats && window.appData.stats.totalTasks) {
        totalTasksDone = window.appData.stats.totalTasks;
    } else {
        // Fallback calc
         totalTasksDone = Object.values(history).reduce((sum, day) => sum + (day.completed || 0), 0);
    }
    
    const xpPerTask = 50;
    const totalXP = totalTasksDone * xpPerTask;
    const level = Math.floor(totalXP / 1000) + 1;
    const xpCurrentLevel = totalXP % 1000;
    const xpNextLevel = 1000;
    const xpPercent = (xpCurrentLevel / xpNextLevel) * 100;
    
    const streak = window.appData.stats?.currentStreak || 0;

    // --- WIDGET 1: GAMIFICATION (Hero) ---
    const heroCard = document.createElement('div');
    heroCard.className = 'bento-card col-span-2';
    heroCard.style.background = 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)';
    heroCard.style.color = 'white';
    heroCard.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
                <div style="font-size:0.9rem; opacity:0.9; font-weight:600;">LEVEL ${level} CAREGIVER</div>
                <div style="font-size:2.5rem; font-weight:800; margin-top:4px;">${totalXP.toLocaleString()} XP</div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:3rem;">🔥 ${streak}</div>
                <div style="font-size:0.8rem; opacity:0.8;">Day Streak</div>
            </div>
        </div>
        <div style="margin-top:auto;">
            <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:6px;">
                <span>Progress to Level ${level + 1}</span>
                <span>${xpCurrentLevel} / ${xpNextLevel} XP</span>
            </div>
            <div class="xp-bar-container" style="background:rgba(255,255,255,0.2);">
                <div class="xp-bar-fill" style="width:${xpPercent}%; background:white;"></div>
            </div>
        </div>
    `;
    bento.appendChild(heroCard);

    // --- WIDGET 2: PRODUCTIVITY (Ring Chart) ---
    // Calculate today's completion
    const todayStr = new Date().toDateString(); // "Fri Dec 13 2025" - simplified
    // Actually our keys in history are usually YYYY-MM-DD.
    // Let's rely on today's tasks calculation if available.
    // We'll simplisticly check how many tasks are marked "checked" in appData.tasks (assuming they are reset)
    // OR roughly use the 'd-done' element if it exists? No, better to recalculate.
    
    // Quick Calc:
    const activeTasks = tasks.filter(t => !t.recur || t.recurDays?.includes(new Date().toLocaleDateString('en-US', {weekday:'short'}))); // Very rough
    const doneCount = activeTasks.filter(t => t.checked).length;
    const totalCount = activeTasks.length || 1; // avoid /0
    const prodPercent = Math.round((doneCount / totalCount) * 100);

    const prodCard = document.createElement('div');
    prodCard.className = 'bento-card';
    prodCard.innerHTML = `
        <div class="b-title">🚀 Productivity</div>
        <div class="circle-chart" style="background: conic-gradient(var(--primary) ${prodPercent}%, #f3f4f6 0%); margin: 20px auto;">
            <div class="circle-inner">
                <span style="font-weight:800; font-size:1.4rem; color:var(--text-dark);">${prodPercent}%</span>
                <span style="font-size:0.7rem; color:var(--text-light);">Today</span>
            </div>
        </div>
        <div style="text-align:center; font-size:0.9rem; color:var(--text-light);">
            ${doneCount} of ${totalCount} tasks done
        </div>
    `;
    bento.appendChild(prodCard);

    // --- WIDGET 3: SLEEP ANALYSIS ---
    // Mock Week Data or Fetch
    const avgSleep = "6h 40m";
    const sleepDebt = "2h";
    
    const sleepCard = document.createElement('div');
    sleepCard.className = 'bento-card';
    sleepCard.innerHTML = `
        <div class="b-title">😴 Sleep Pulse</div>
        <div>
            <div class="b-sub">Avg Duration (7d)</div>
            <div class="b-stat" style="color:#6366f1;">${avgSleep}</div>
        </div>
        <div style="margin-top:12px; padding:10px; background:#fff1f2; border-radius:12px; color:#be123c; font-size:0.85rem; display:flex; gap:8px; align-items:center;">
            <span>⚠️</span>
            <span>Refill tank! You have <b>${sleepDebt}</b> sleep debt.</span>
        </div>
    `;
    bento.appendChild(sleepCard);

    // --- WIDGET 4: MEDICATIONS (Weekly Bar Chart) ---
    const medCard = document.createElement('div');
    medCard.className = 'bento-card col-span-2';
    medCard.innerHTML = `
        <div style="display:flex; justify-content:space-between;">
            <div class="b-title">💊 Med Adherence</div>
            <span class="sleep-score score-good">98% Weekly</span>
        </div>
        
        <div class="mini-chart-row" style="gap:12px;">
            <!-- MOCK DATA for M T W T F S S -->
            ${[0.8, 0.9, 1, 1, 0.6, 1, 0.9].map(val => `
                <div class="bar-col" style="height:100%;">
                    <div class="bar-fill" style="height:${val * 100}%; background: ${val < 0.8 ? '#f87171' : '#10b981'};"></div>
                </div>
            `).join('')}
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:8px; color:var(--text-light); font-size:0.8rem;">
            <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
        </div>
    `;
    bento.appendChild(medCard);

    // --- WIDGET 5: CAREGIVER REPORT ---
    const reportCard = document.createElement('div');
    reportCard.className = 'bento-card col-span-2';
    reportCard.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:start;">
            <div style="flex:1; padding-right:16px;">
                <div class="b-title">📝 Reporting</div>
                <div style="font-size:0.9rem; color:var(--text-light); margin-bottom:12px; line-height:1.5;">
                    Generate a PDF summary of behavior, sleep, and medication adherence for your doctor or teacher.
                </div>
                <button class="report-btn" style="width:auto; padding:10px 24px; margin-top:0;">
                    <span>📄</span> Generate PDF
                </button>
            </div>
            <div style="background:#FFFFFF; padding:16px; border-radius:12px; min-width:140px;">
                <div style="font-size:0.85rem; font-weight:600; color:var(--text-dark); margin-bottom:12px; border-bottom:1px solid #eee; padding-bottom:8px;">
                    This Week
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:8px;">
                    <span>Incidents</span>
                    <b>2</b>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:8px;">
                    <span>Masking</span>
                    <b>Low</b>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.9rem;">
                    <span>Mood</span>
                    <b style="color:#10b981;">Happy</b>
                </div>
            </div>
        </div>
    `;
    bento.appendChild(reportCard);
}
