import { medicationService } from '../../services/medicationService.js';
import { renderMeds } from '../pages/careHub.js';


// --- Neuro-Behavioral Tracking Logic ---
window.toggleNeuroOptions = function () {
    const toggle = document.getElementById('neuro-tracking-toggle');
    const optionsDiv = document.getElementById('neuro-options');
    if (toggle && optionsDiv) {
        optionsDiv.style.display = toggle.checked ? 'block' : 'none';
    }
}

export function openAddMedModal(medId = null) {
    const modal = document.getElementById('add-med-modal');
    if (!modal) return;

    if (medId) {
        // Edit Mode
        const medToEdit = window.appData.meds.find(m => m.id === medId);
        if (!medToEdit) return;

        // Parse Dosage (e.g., "10 mg")
        const parts = medToEdit.dosage.split(' ');
        const amount = parts[0] || '';
        const unit = parts[1] || 'mg';

        document.getElementById('med-name').value = medToEdit.name;
        document.getElementById('med-dosage-amount').value = amount;
        document.getElementById('med-dosage-unit').value = unit;
        document.getElementById('med-frequency').value = medToEdit.frequency;
        document.getElementById('med-inventory').value = medToEdit.inventory;
        document.getElementById('med-alert').value = medToEdit.limit;
        document.getElementById('med-instructions').value = medToEdit.instructions || '';

        // Neuro Config
        const config = medToEdit.medication_config || {};
        const toggle = document.getElementById('neuro-tracking-toggle');
        if (toggle) {
            toggle.checked = !!config.track_neuro;
            document.getElementById('neuro-appetite').checked = !!config.track_appetite;
            document.getElementById('neuro-drowsy').checked = !!config.track_drowsy;
            document.getElementById('neuro-irritability').checked = !!config.track_irritability;
            window.toggleNeuroOptions();
        }

        // Populate Reminders
        const times = medToEdit.reminderTimes || medToEdit.reminder_times || [];
        if (times && times.length > 0) {
            document.getElementById('med-reminders-data').value = JSON.stringify(times);
            document.getElementById('med-reminders-display').innerText = '⏰ ' + times.join(', ');
        } else {
            document.getElementById('med-reminders-data').value = '';
            document.getElementById('med-reminders-display').innerText = 'No times set';
        }

        modal.setAttribute('data-editing-id', medToEdit.id);
        modal.querySelector('.modal-title').innerText = 'Edit Medication';
        const submitBtn = modal.querySelector('.btn-modal-primary');
        if (submitBtn) submitBtn.innerText = 'Update Medication';

        updateDosageInput();
    } else {
        // Add Mode
        document.getElementById('med-name').value = '';
        document.getElementById('med-dosage-amount').value = '';
        document.getElementById('med-dosage-unit').value = 'mg';
        document.getElementById('med-frequency').value = '1';
        document.getElementById('med-inventory').value = '';
        document.getElementById('med-alert').value = '5';
        document.getElementById('med-instructions').value = '';

        // Reset Neuro Config
        const toggle = document.getElementById('neuro-tracking-toggle');
        if (toggle) {
            toggle.checked = false;
            document.getElementById('neuro-appetite').checked = false;
            document.getElementById('neuro-drowsy').checked = false;
            document.getElementById('neuro-irritability').checked = false;
            window.toggleNeuroOptions();
        }

        document.getElementById('med-reminders-data').value = '';
        document.getElementById('med-reminders-display').innerText = 'No times set';

        modal.removeAttribute('data-editing-id');
        modal.querySelector('.modal-title').innerText = 'Add Medication';
        const submitBtn = modal.querySelector('.btn-modal-primary');
        if (submitBtn) submitBtn.innerText = 'Save Medication';

        updateDosageInput();
    }

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

export function closeAddMedModal() {
    const modal = document.getElementById('add-med-modal');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
}

export function updateDosageInput() {
    const unit = document.getElementById('med-dosage-unit').value;
    const amountInput = document.getElementById('med-dosage-amount');

    if (unit === 'pills' || unit === 'puffs' || unit === 'drops') {
        amountInput.step = '1';
        amountInput.placeholder = '1';
    } else {
        amountInput.step = '0.1';
        amountInput.placeholder = '0.0';
    }
}

// --- Reminders Logic ---

export function openRemindersModal() {
    const modal = document.getElementById('reminders-modal');
    if (!modal) return;

    const frequency = parseInt(document.getElementById('med-frequency').value) || 1;
    document.getElementById('reminders-count').innerText = frequency;

    const list = document.getElementById('reminders-list');
    list.innerHTML = '';

    // Load existing data
    const existingDataStr = document.getElementById('med-reminders-data').value;
    let existingTimes = [];
    try {
        existingTimes = existingDataStr ? JSON.parse(existingDataStr) : [];
    } catch (e) {
        existingTimes = [];
    }

    // Generate slots
    for (let i = 0; i < frequency; i++) {
        const timeVal = existingTimes[i] || ''; // Default empty

        const row = document.createElement('div');
        row.className = 'reminder-row'; 
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between'; // Spread label and input
        row.style.gap = '16px';

        row.innerHTML = `
            <label style="font-weight: 500; font-size: 1rem; color: #374151; white-space: nowrap;">Dose ${i + 1}</label>
            <div style="position: relative; flex: 1;">
                <input type="time" class="form-input reminder-time-input" value="${timeVal}" 
                    onclick="try{this.showPicker()}catch(e){}"
                    style="width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid #e5e7eb; font-size: 1rem; color: #111827; background: #fff; cursor: pointer;">
            </div>
        `;
        list.appendChild(row);
    }

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

export function closeRemindersModal() {
    const modal = document.getElementById('reminders-modal');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
}

export function saveReminders() {
    const inputs = document.querySelectorAll('.reminder-time-input');
    const times = [];
    inputs.forEach(input => {
        if (input.value) times.push(input.value);
    });

    // Update Hidden Input
    document.getElementById('med-reminders-data').value = JSON.stringify(times);

    // Update Display
    const display = document.getElementById('med-reminders-display');
    if (times.length > 0) {
        display.innerText = '⏰ ' + times.join(', ');
    } else {
        display.innerText = 'No times set';
    }

    closeRemindersModal();
}

export async function saveMed() {
    const name = document.getElementById('med-name').value;
    const amount = document.getElementById('med-dosage-amount').value;
    const unit = document.getElementById('med-dosage-unit').value;
    const dosage = amount ? `${amount} ${unit}` : '';
    const frequency = parseInt(document.getElementById('med-frequency').value) || 1;
    const inventory = parseInt(document.getElementById('med-inventory').value) || 0;
    const alertAt = parseInt(document.getElementById('med-alert').value) || 5;
    const instructions = document.getElementById('med-instructions').value;
    const remindersData = document.getElementById('med-reminders-data').value;
    const reminderTimes = remindersData ? JSON.parse(remindersData) : [];

    // Neuro Config
    const neuroToggle = document.getElementById('neuro-tracking-toggle');
    let medication_config = {};
    if (neuroToggle && neuroToggle.checked) {
        medication_config = {
            track_neuro: true,
            track_appetite: document.getElementById('neuro-appetite').checked,
            track_drowsy: document.getElementById('neuro-drowsy').checked,
            track_irritability: document.getElementById('neuro-irritability').checked
        };
    } else {
        medication_config = { track_neuro: false };
    }

    if (!name) {
        alert("Please enter a medication name.");
        return;
    }

    const editingId = document.getElementById('add-med-modal').getAttribute('data-editing-id');
    let medToSave = {};

    if (editingId) {
        // Find existing
        const index = window.appData.meds.findIndex(m => m.id === editingId);
        if (index !== -1) {
            medToSave = {
                ...window.appData.meds[index],
                name, dosage, frequency, inventory, limit: alertAt, instructions, reminderTimes, medication_config
            };
            window.appData.meds[index] = medToSave;
        }
    } else {
        // Create new
        medToSave = {
            name, dosage, frequency, inventory, limit: alertAt, instructions, reminderTimes, medication_config
        };
        // Optimistic
        medToSave.stats = { takenCount: 0, skippedCount: 0 };
    }

    // Call Service
    const currentUser = window.currentUser; // Managed by Auth Manager
    try {
        const savedMed = await medicationService.saveMedication(medToSave, currentUser?.id);

        if (!editingId) {
            window.appData.meds.push(savedMed);
        } else {
            // Already updated index above
        }

        // Local Persist via legacy function (safe to call if bound)
        if (typeof window.saveData === 'function') window.saveData();

        // Render
        if (typeof window.renderMeds === 'function') {
            window.renderMeds();
        } else if (typeof renderMeds === 'function') {
            renderMeds();
        }

        closeAddMedModal();
    } catch (e) {
        console.error("Save Med Failed:", e);
        alert("Failed to save medication: " + e.message);
    }
}

// --- Details Modal Logic ---
export function openMedDetails(medId) {
    const med = window.appData.meds.find(m => m.id === medId);
    if (!med) return;

    // 1. Populate Data
    document.getElementById('detail-med-name').innerText = med.name;

    // Dosage
    const freqText = med.frequency > 1 ? `${med.frequency}x Daily` : 'Daily';
    document.getElementById('detail-med-dosage').innerText = `${med.dosage} (${freqText})`;

    // Inventory
    let unit = "Units";
    if (med.dosage && med.dosage.includes(' ')) {
        unit = med.dosage.split(' ')[1];
        // e.g. "mg" -> likely "pills" but kept simple for now
    }
    document.getElementById('detail-med-inventory').innerText = `${med.inventory} ${unit} Left (Alert at ${med.limit})`;

    // Instructions
    document.getElementById('detail-med-instructions').innerText = med.instructions || 'No instructions provided.';

    // Reminders List (Row Implementation)
    const remindersContainer = document.getElementById('detail-med-reminders-row');
    if (remindersContainer) {
        remindersContainer.innerHTML = '';
        remindersContainer.style.display = 'flex';
        remindersContainer.style.gap = '8px';
        remindersContainer.style.flexWrap = 'wrap';

        if (med.reminderTimes && med.reminderTimes.length > 0) {
            med.reminderTimes.forEach(time => {
                const chip = document.createElement('span');
                chip.innerText = time;
                chip.style.background = '#F3F4F6';
                chip.style.padding = '4px 8px';
                chip.style.borderRadius = '6px';
                chip.style.fontSize = '0.85rem';
                chip.style.color = '#374151';
                remindersContainer.appendChild(chip);
            });
        } else {
            remindersContainer.innerText = 'No specific times set';
            remindersContainer.style.color = '#9CA3AF';
        }
    }

    // 2. Bind Actions
    const editBtn = document.getElementById('detail-med-edit');
    // Remove old listeners by cloning or just reassigning onclick
    editBtn.onclick = () => {
        closeMedDetailsModal();
        openAddMedModal(med.id);
    };

    const deleteBtn = document.getElementById('detail-med-delete');
    deleteBtn.onclick = () => {
        if (confirm(`Delete ${med.name}?`)) {
            window.services.medication.deleteMedication(med.id)
                .then(() => {
                    // Update Local
                    window.appData.meds = window.appData.meds.filter(m => m.id !== med.id);
                    if (window.renderMeds) window.renderMeds();
                    closeMedDetailsModal();
                })
                .catch(e => alert(e.message));
        }
    };

    // 3. Show Modal
    const modal = document.getElementById('detail-med-name').closest('.modal-overlay');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
}

export function closeMedDetailsModal() {
    const modal = document.getElementById('detail-med-name').closest('.modal-overlay');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}
