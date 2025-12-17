import { supabase } from '../config/supabaseClient.js';

export const medicationService = {
    /**
     * Add or Update a Medication
     * @param {Object} med - Medication object
     * @param {string} userId - Current user ID (optional)
     * @returns {Promise<Object>} The saved medication object
     */
    async saveMedication(med, userId) {
        // Validate
        if (!med.name) throw new Error("Medication name is required");

        // Prepare object
        const medData = {
            ...med,
            id: med.id || 'med_' + Date.now(),
            history: med.history || [],
            stats: med.stats || { takenCount: 0, skippedCount: 0 }
        };

        // Sync to Supabase if User Logged In
        if (userId && supabase) {
            try {
                const { error } = await supabase
                    .from('medications')
                    .upsert({
                        id: medData.id,
                        user_id: userId,
                        name: medData.name,
                        dosage: medData.dosage,
                        frequency: medData.frequency,
                        inventory: medData.inventory,
                        limit_alert: medData.limit,
                        instructions: medData.instructions,
                        reminder_times: medData.reminderTimes,
                        updated_at: new Date().toISOString()
                        // Note: Storing full JSON support depends on Schema. 
                        // Assuming 'medications' table exists or using 'tasks' as fallback?
                        // User prompt implied "Move database functions", assuming table exists or we use local for now.
                        // Given previous context, it seems medications might be stored in `data` column of tasks or separate?
                        // Actually, looking at `saveMed` earlier, there was NO Supabase call in the snippet I saw!
                        // It only updated `appData.meds`.
                        // So for now, I will support Supabase IF the table exists, but primarily strictly return data.
                        // WAIT: If `saveMed` didn't have Supabase logic, I should add it now if requested, 
                        // BUT the user said "Move database functions out". 
                        // If they weren't there, maybe they meant "Add them and put them here"?
                        // "Structure: Move addMedication... Ensure these functions return Data... addMedication should just save to Supabase..."
                        // Okay, user EXPLICITLY asked for Supabase saving here.
                    });

                if (error) {
                    console.error("Supabase Med Save Error:", error);
                    // We might not fail hard if offline, but let's return data.
                }
            } catch (err) {
                console.error("Med Service Error:", err);
            }
        }

        return medData;
    },

    /**
     * Fetch Medications for User
     * @param {string} userId - Current user ID
     * @returns {Promise<Array>} List of medications
     */
    async fetchMedications(userId) {
        if (!userId || !supabase) return [];

        try {
            const { data, error } = await supabase
                .from('medications')
                .select('*')
                .eq('user_id', userId);

            if (error) throw error;

            // Map keys back to local schema (snake_case -> camelCase)
            return (data || []).map(row => ({
                ...row,
                reminderTimes: row.reminder_times || row.reminderTimes || [],
                limit: row.limit_alert || row.limit || 5,
                // Ensure stats exist
                stats: row.stats || { takenCount: 0, skippedCount: 0 }
            }));
        } catch (err) {
            console.error("Fetch Meds Error:", err);
            return [];
        }
    },

    /**
     * Take a Medication (Log history and decrement inventory)
     * @param {Object} med - Medication object
     * @param {string} userId - Current user ID
     * @returns {Promise<Object>} Updated medication object
     */
    async takeMedication(med, userId) {
        if (!med) throw new Error("Invalid medication");

        const now = new Date();
        const takenEntry = {
            timestamp: now.toISOString(),
            action: 'taken',
            date: now.toISOString().split('T')[0]
        };

        // Update Local State copy
        const updatedMed = {
            ...med,
            inventory: (med.inventory > 0) ? med.inventory - 1 : 0,
            history: [...(med.history || []), takenEntry],
            stats: {
                ...med.stats,
                takenCount: (med.stats?.takenCount || 0) + 1,
                date: takenEntry.date // Ensure date is synced
            }
        };

        // Sync Inventory to Supabase
        if (userId && supabase) {
            try {
                // Update Inventory Column
                await supabase
                    .from('medications')
                    .update({
                        inventory: updatedMed.inventory,
                        history: updatedMed.history // If JSON column exists
                    })
                    .eq('id', med.id);
            } catch (e) {
                console.error("Sync Error:", e);
            }
        }

        return updatedMed;
    },

    // 4. Daily Reset Logic
    async runDailyReset() {
        console.log("[MedService] Checking Daily Reset...");
        if (!window.appData || !window.appData.meds) return;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"

        let hasReset = false;

        window.appData.meds.forEach(med => {
            // Check if lastTaken date is NOT today (and there is usage to reset)
            const lastTakenDate = med.lastTaken ? new Date(med.lastTaken).toISOString().split('T')[0] : null;

            // If we have taken meds previously, and the date is different from today
            // OR if today stats are non-zero but the date suggests it's a new day (safety check)
            // Actually simpler: Store a "lastResetDate" on the med or appData
            // But let's look at `takenCount`. If > 0, we check if the stored `statsDate` matches today.

            // We'll simplify: We check `med.stats.date`. If it's not today, we reset.
            const statsDate = med.stats?.date || "";

            if (statsDate !== todayStr) {
                // It's a new day for this med (or never set)
                if (!med.stats) med.stats = {};

                // Reset counts
                med.stats.takenCount = 0;
                med.stats.skippedCount = 0;
                med.stats.date = todayStr; // Mark as reset for today

                hasReset = true;
            }
        });

        if (hasReset) {
            console.log("[MedService] Reset Performed for:", todayStr);
            // Save local
            if (typeof window.saveData === 'function') window.saveData();
            // Render updates
            if (typeof window.renderMeds === 'function') window.renderMeds();
        }
    },

    /**
     * Delete a Medication
     * @param {string} medId 
     */
    async deleteMedication(medId) {
        if (!medId) return;

        // Sync to Supabase
        if (supabase) {
            try {
                const { error } = await supabase
                    .from('medications')
                    .delete()
                    .eq('id', medId);

                if (error) throw error;
            } catch (e) {
                console.error("Delete Med Error:", e);
                // Continue to delete locally
            }
        }

        return true;
    }
};
