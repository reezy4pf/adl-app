import { supabase } from '../config/supabaseClient.js';

export const taskService = {
    /**
     * Create or Update a Task
     * @param {Object} task - Task object
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Saved task
     */
    async saveTask(task, userId) {
        if (!task.title && !task.text) throw new Error("Task title required");

        const taskData = {
            ...task,
            updated_at: new Date().toISOString()
        };

        if (userId && supabase) {
            // DB Mapping
            const dbTask = {
                id: taskData.id,
                user_id: userId,
                title: taskData.title || taskData.text,
                start_time: taskData.startTime,
                end_time: taskData.endTime,
                date: taskData.date,
                note: taskData.note,
                status: taskData.status || 'pending',
                checked: taskData.checked || false,
                recur_days: taskData.recurDays,
                reminder: taskData.reminder,
                template_id: taskData.templateId,
                // Valid Columns Only (fixed in previous step)
                color: taskData.color
                // Removed: location, ends_next_day, border_color, text_color to avoid 400
            };

            const { error } = await supabase
                .from('tasks')
                .upsert(dbTask);

            if (error) throw error;
        }

        return taskData;
    },

    /**
     * Delete a Task
     */
    async deleteTask(taskId) {
        if (supabase) {
            await supabase.from('tasks').delete().eq('id', taskId);
        }
        return true;
    }
};
