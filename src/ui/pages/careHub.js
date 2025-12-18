import { medicationService } from '../../services/medicationService.js';
import { openAddMedModal } from '../modals/medicationModal.js';
import { renderSleepTracker } from '../modals/sleep.js?v=29';


// Tab State
let currentTab = 'meds'; // 'meds' or 'sleep'

export function renderCareHub() {
    const container = document.getElementById('care-hub-content');
    if (!container) return;

    // Global showComingSoon handled in index.html or external module

    // Clear
    container.innerHTML = '';

    // --- Tab Navigation ---
    const tabContainer = document.createElement('div');
    tabContainer.className = 'care-hub-tabs';
    tabContainer.style.display = 'flex';
    tabContainer.style.gap = '20px';
    tabContainer.style.marginBottom = '20px';
    tabContainer.style.borderBottom = '1px solid #e5e7eb';

    // Tab 1: Active Medications
    const medsTab = document.createElement('div');
    medsTab.id = 'tab-btn-meds';
    medsTab.innerText = 'Active Medications';
    medsTab.style.padding = '8px 4px';
    medsTab.style.cursor = 'pointer';
    medsTab.style.fontSize = '1.1rem';
    medsTab.style.fontWeight = '600';
    medsTab.style.color = currentTab === 'meds' ? 'var(--primary)' : '#6B7280';
    medsTab.style.borderBottom = currentTab === 'meds' ? '2px solid var(--primary)' : '2px solid transparent';
    medsTab.onclick = () => switchCareHubTab('meds');
    tabContainer.appendChild(medsTab);

    // Tab 2: Sleep Quality
    const sleepTab = document.createElement('div');
    sleepTab.id = 'tab-btn-sleep';
    sleepTab.innerText = 'Sleep Quality';
    sleepTab.style.padding = '8px 4px';
    sleepTab.style.cursor = 'pointer';
    sleepTab.style.fontSize = '1.1rem';
    sleepTab.style.fontWeight = '600';
    sleepTab.style.color = currentTab === 'sleep' ? 'var(--primary)' : '#6B7280';
    sleepTab.style.borderBottom = currentTab === 'sleep' ? '2px solid var(--primary)' : '2px solid transparent';
    sleepTab.onclick = () => switchCareHubTab('sleep');
    tabContainer.appendChild(sleepTab);

    container.appendChild(tabContainer);

    // --- Tab Content Containers ---
    const medsContent = document.createElement('div');
    medsContent.id = 'meds-tab-content';
    medsContent.style.display = currentTab === 'meds' ? 'block' : 'none';
    container.appendChild(medsContent);

    const sleepContent = document.createElement('div');
    sleepContent.id = 'sleep-tab-content';
    sleepContent.style.display = currentTab === 'sleep' ? 'block' : 'none';

    // Render Sleep Tracker
    // Pass configured initial settings if available (persisted in DB/notes)
    const sleepConfig = window.appData && window.appData.sleep && window.appData.sleep.config;
    renderSleepTracker(sleepContent, sleepConfig);

    container.appendChild(sleepContent);

    // Render Active Meds Grid (into the tab content)
    renderMeds();

    // SPECIFIC 6 CARDS for Care Hub Redesign (Grid) (Keeping them below tabs? Or likely below the active tab content?)
    // User image shows "Active Medications" header (now tabs) is seemingly the main content area.
    // The "Grid Cards" (Meds Tracker, Sleep Quality, etc.) below might be redundant if we are tabbing?
    // User said: "In care hub page I want where we have the title Active Medications to be a Tab nav bar"
    // The previous implementation had "Care Hub" -> "Explore templates..." -> "Grid".
    // AND `renderMeds` prepended itself.
    // So visual order was: Meds List -> Explore Text -> Grid.
    // If I put tabs at top, it will be: Tabs -> Meds Content / Sleep Content.
    // What about the Grid?
    // User didn't say to remove the grid. Just "where we have the title Active Medications".
    // I will append the Grid at the bottom, outside tabs, as "More Tools" or similar.
    // OR, if "Sleep Quality template" becomes a tab, maybe the grid item "Sleep Quality" *added* the tab?
    // For now I'll keep the grid at the bottom.

    // INJECT: "Explore templates..." text before the grid
    const exploreText = document.createElement('p');
    exploreText.style.color = 'var(--text-light)';
    exploreText.style.marginBottom = '24px';
    exploreText.style.marginTop = '80px'; // Increased separation
    exploreText.innerText = 'Explore templates and routines to boost your wellbeing.';
    container.appendChild(exploreText);

    // Create Grid Container
    const grid = document.createElement('div');
    grid.className = 'care-hub-grid';
    // ... grid population logic follows in existing code ...
    // to keep this replace simple I will rely on the existing code for grid population but I'll need to reconnect variables.
    // Actually I am replacing lines 4-126. The grid logic starts at line 14 but I'm replacing it.
    // I need to include the grid logic in my replacement or ensure it matches. 
    // The view showed lines 14-60 defining data. I need to include that.

    const careHubData = [
        {
            icon: "💊",
            title: "Meds Tracker",
            desc: "Risperidone, Ritalin logs.",
            color: "#dc3545", // Red
            config: { customAction: "openAddMedModal" }
        },
        {
            icon: "😴",
            title: "Sleep Quality",
            desc: "Track duration & wakings.",
            color: "#6610f2", // Indigo
            config: { customAction: "switchToSleepTab" }
        },
        {
            icon: "🐪",
            title: "Camel Milk",
            desc: "Track ml & reaction.",
            color: "#fd7e14", // Orange
            config: { customAction: "showComingSoon" }
        },
        {
            icon: "🎟️",
            title: "Daily Report",
            desc: "Share status with Teacher/Nanny.",
            color: "#0d6efd", // Blue
            config: { customAction: "showComingSoon" }
        },
        {
            icon: "🧱",
            title: "Sensory Reset",
            desc: "Lifting & calming tasks.",
            color: "#198754", // Green
            config: { customAction: "showComingSoon" }
        },
        {
            icon: "🚽",
            title: "Potty Training",
            desc: "Track accidents & success.",
            color: "#0dcaf0", // Teal
            config: { customAction: "showComingSoon" }
        }
    ];

    careHubData.forEach(item => {
        const card = document.createElement('div');
        card.className = 'grid-card';
        card.style.borderTop = `4px solid ${item.color}`;

        // Top Content
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = `
            <div style="background: ${item.color}15; color: ${item.color};" class="grid-card-icon">${item.icon}</div>
            <div class="grid-card-title">${item.title}</div>
            <div class="grid-card-desc">${item.desc}</div>
        `;
        card.appendChild(contentDiv);

        // Action Button
        const btn = document.createElement('button');
        btn.className = 'card-btn';
        btn.style.color = item.color;
        btn.style.background = `${item.color}10`;
        btn.innerText = 'Use Template';

        // Robust Event Listener Binding
        btn.onclick = (e) => {
            e.stopPropagation();
            console.log("Clicked:", item.title, "Action:", item.config?.customAction);

            if (item.config?.customAction === "openAddMedModal") {
                if (window.openAddMedModal) window.openAddMedModal();
                else console.error("openAddMedModal missing");
            }
            else if (item.config?.customAction === "switchToSleepTab") {
                if (window.switchCareHubTab) {
                    window.switchCareHubTab('sleep');
                    window.scrollTo(0, 0);
                } else console.error("switchCareHubTab missing");
            }
            else if (item.config?.customAction === "showComingSoon") {
                if (window.showComingSoon) window.showComingSoon(item.title);
                else {
                    alert(`🚧 ${item.title} feature is coming soon! (Fallback)`);
                    console.error("showComingSoon missing");
                }
            }
            else {
                // Default
                if (window.openTaskModal) window.openTaskModal(null, item.title);
            }
        };

        card.appendChild(btn);
        grid.appendChild(card);
    });

    container.appendChild(grid);
}

// Global Switch Handler
window.switchCareHubTab = function (tabName) {
    currentTab = tabName;

    // Update Content Visibility
    const medsContent = document.getElementById('meds-tab-content');
    const sleepContent = document.getElementById('sleep-tab-content');
    if (medsContent) medsContent.style.display = tabName === 'meds' ? 'block' : 'none';
    if (sleepContent) sleepContent.style.display = tabName === 'sleep' ? 'block' : 'none';

    // Update Tab Styles
    const medsBtn = document.getElementById('tab-btn-meds');
    const sleepBtn = document.getElementById('tab-btn-sleep');

    if (medsBtn) {
        medsBtn.style.color = tabName === 'meds' ? 'var(--primary)' : '#6B7280';
        medsBtn.style.borderBottom = tabName === 'meds' ? '2px solid var(--primary)' : '2px solid transparent';
    }
    if (sleepBtn) {
        sleepBtn.style.color = tabName === 'sleep' ? 'var(--primary)' : '#6B7280';
        sleepBtn.style.borderBottom = tabName === 'sleep' ? '2px solid var(--primary)' : '2px solid transparent';
    }
}

export function renderMeds() {
    // Target the TAB content, not the main container
    const container = document.getElementById('meds-tab-content');
    // Fallback if tabs not rendered yet (safety)
    const fallbackContainer = document.getElementById('care-hub-content');

    const meds = window.appData?.meds || [];

    // Create or Clear Grid
    if (container) container.innerHTML = '';

    if (!container && fallbackContainer) {
        // If we are in fallback mode (no tabs), we look for existing section
        let medsSection = document.getElementById('meds-section');
        if (!medsSection) {
            medsSection = document.createElement('div');
            medsSection.id = 'meds-section';
            fallbackContainer.prepend(medsSection); // Legacy behavior
        }
        // ... But since we refactored renderCareHub, this path is unlikely unless renderMeds called standalone.
    }

    // If container exists, we append directly to it.
    const target = container || document.getElementById('meds-section') || document.body; // fallback to body is bad but safe

    if (meds.length === 0) {
        target.innerHTML = '<div style="color:#6B7280; text-align:center; padding:20px;">No active medications. Use the tracker below to add one.</div>';
        return;
    }

    // Grid/List Container
    const list = document.createElement('div');
    list.className = 'meds-list-grid';
    list.style.display = 'grid';
    list.style.gap = '10px';
    list.style.gridTemplateColumns = 'repeat(auto-fit, minmax(340px, 1fr))';
    target.appendChild(list);

    // ... list population uses meds (lines 137+) ...

    meds.forEach(med => {
        const takenToday = med.stats?.takenCount || 0;
        const frequency = med.frequency || 1;
        const inventory = med.inventory || 0;
        const isLow = inventory <= (med.limit || 5);

        const card = document.createElement('div');
        card.className = 'med-card-restored';

        // Styles matching the image
        card.style.display = 'flex';
        card.style.justifyContent = 'space-between';
        card.style.alignItems = 'center';
        card.style.background = 'white';
        card.style.border = '1px solid var(--border-light)'; // Added subtle border
        card.style.width = '100%'; // Ensure it fills grid cell
        card.style.borderRadius = '12px';
        card.style.padding = '16px';
        card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
        card.style.borderLeft = '6px solid var(--primary)';
        card.style.cursor = 'pointer';
        card.style.transition = 'transform 0.1s ease';

        // Click to open details (delegated to non-button areas)
        card.onclick = (e) => {
            if (!e.target.closest('button')) {
                window.openMedDetails(med.id);
            }
        };

        // Left Side
        const left = document.createElement('div');
        left.style.display = 'flex';
        left.style.flexDirection = 'column';
        left.style.gap = '4px';

        const name = document.createElement('div');
        name.innerText = med.name;
        name.style.fontWeight = '700';
        name.style.fontSize = '1.1rem';
        name.style.color = '#111827';

        const dosage = document.createElement('div');
        dosage.innerText = med.dosage;
        dosage.style.color = '#6B7280';
        dosage.style.fontSize = '0.9rem';

        const badge = document.createElement('div');
        badge.innerText = `${inventory} Left`;
        badge.style.alignSelf = 'flex-start';
        badge.style.fontSize = '0.8rem';
        badge.style.padding = '4px 10px';
        badge.style.borderRadius = '20px';
        badge.style.marginTop = '4px';
        badge.style.fontWeight = '500';

        if (isLow) {
            badge.style.backgroundColor = '#FEF2F2';
            badge.style.color = '#DC2626';
        } else {
            badge.style.backgroundColor = '#ECFDF5';
            badge.style.color = '#059669';
        }

        left.appendChild(name);
        left.appendChild(dosage);
        left.appendChild(badge);

        // Right Side (Button & Schedule)
        const right = document.createElement('div');
        right.style.display = 'flex';
        right.style.flexDirection = 'column';
        right.style.alignItems = 'flex-end';
        right.style.gap = '8px';

        // 1. Time Slots (Chips)
        const chipsContainer = document.createElement('div');
        chipsContainer.style.display = 'flex';
        chipsContainer.style.gap = '4px';

        // Ensure reminderTimes exists or generate placeholders
        const reminders = med.reminderTimes && med.reminderTimes.length > 0
            ? med.reminderTimes
            : Array(frequency).fill(0).map((_, i) => `${8 + (i * 4)}:00`); // Fallback 8, 12...

        // Slot Logic
        let nextSlotIndex = -1;
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();

        reminders.forEach((timeStr, index) => {
            const isTaken = index < takenToday;
            const chip = document.createElement('div');
            chip.innerText = timeStr;
            chip.style.fontSize = '0.75rem';
            chip.style.padding = '2px 6px';
            chip.style.borderRadius = '4px';
            chip.style.fontWeight = '600';

            if (isTaken) {
                chip.style.backgroundColor = '#10B981'; // Green (Taken)
                chip.style.color = 'white';
            } else {
                // Check if this is the NEXT slot
                if (nextSlotIndex === -1) nextSlotIndex = index;

                chip.style.backgroundColor = '#F3F4F6'; // Grey (Pending)
                chip.style.color = '#6B7280';
            }
            chipsContainer.appendChild(chip);
        });
        right.appendChild(chipsContainer);

        // 2. Button Logic
        const btn = document.createElement('button');
        const isDone = takenToday >= frequency;

        // Time Check For Next Slot
        let isTime = true; // Default true if no schedule
        let btnText = isDone ? 'Done' : 'Take';

        if (!isDone && nextSlotIndex !== -1) {
            const nextTimeStr = reminders[nextSlotIndex];
            const [h, m] = nextTimeStr.split(':').map(Number);
            const slotMins = h * 60 + m;

            // "Right Time" Logic: 
            // - Active if NOW > (Slot - 60mins)
            // - i.e., can take 1 hour before
            if (currentMins < slotMins - 60) {
                isTime = false;
                btnText = `Next: ${nextTimeStr}`;
            } else {
                btnText = `Take ${nextTimeStr}`;
            }
        }

        btn.innerText = isDone ? 'Done' : btnText;
        // Style adjustments
        const canClick = !isDone && isTime;

        btn.style.backgroundColor = canClick ? 'var(--primary)' : '#D1D5DB';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.padding = '8px 16px';
        btn.style.borderRadius = '8px';
        btn.style.fontWeight = '600';
        btn.style.cursor = canClick ? 'pointer' : 'default';
        btn.style.fontSize = '0.9rem';

        if (canClick) {
            btn.onclick = (e) => {
                e.stopPropagation();
                btn.innerText = 'Taking...';

                const userId = window.currentUser?.id || 'anon_user';

                if (!window.services || !window.services.medication) {
                    alert("System error: Services not ready.");
                    btn.innerText = 'Error';
                    return;
                }

                window.services.medication.takeMedication(med, userId)
                    .then((updatedMed) => {
                        // Update Global State
                        if (window.appData && window.appData.meds) {
                            const idx = window.appData.meds.findIndex(m => m.id === updatedMed.id);
                            if (idx !== -1) window.appData.meds[idx] = updatedMed;
                        }

                        // Persist to LocalStorage
                        if (typeof window.saveData === 'function') {
                            window.saveData();
                        } else {
                            console.warn("saveData not found, persisting manually fallback");
                            if (window.APP_STORAGE_KEY) {
                                localStorage.setItem(window.APP_STORAGE_KEY, JSON.stringify(window.appData));
                            }
                        }

                        window.renderMeds();
                    })
                    .catch(err => {
                        console.error(err);
                        alert("Error: " + err.message);
                        btn.innerText = 'Error';
                    });
            };
        }

        right.appendChild(btn);

        card.appendChild(left);
        card.appendChild(right);
        list.appendChild(card);
    });
}

