/**
 * Applied Materials AI - Cleanroom Jobs & Assignments Engine
 * Manages persistent Jobs and sequential Steps, worker-specific job queues,
 * strict sequential step rules, in-progress job lock rules, manager overview/editor,
 * and voice commands. Connects seamlessly with amat_labor_workers.
 */

class JobsEngine {
  constructor() {
    this.STORAGE_KEY_JOBS = 'amat_jobs';
    this.STORAGE_KEY_STEPS = 'amat_job_steps';
    this.STORAGE_KEY_VIEW_MODE = 'amat_jobs_view_mode';

    this.jobs = [];
    this.steps = [];
    this.viewMode = localStorage.getItem(this.STORAGE_KEY_VIEW_MODE) || 'worker'; // 'worker' | 'manager'
    this.isViewOpen = false;
    this.isProcessingAction = false; // Prevents double-submission

    this.initData();
  }

  initData() {
    this.jobs = this.loadJobs();
    this.steps = this.loadSteps();
  }

  getAssistantName() {
    if (window.getAssistantName) return window.getAssistantName();
    const stored = localStorage.getItem('amat_assistant_name');
    if (!stored || stored === 'J.A.R.V.I.S.' || stored === 'Jarvis') return 'Voxel';
    return stored;
  }

  getCurrentWorkerId() {
    if (window.laborEngine && window.laborEngine.getCurrentUserId) {
      return window.laborEngine.getCurrentUserId();
    }
    return localStorage.getItem('amat_labor_current_user') || 'w_1';
  }

  getCurrentWorker() {
    if (window.laborEngine && window.laborEngine.getCurrentUser) {
      return window.laborEngine.getCurrentUser();
    }
    const workers = this.getAllWorkers();
    return workers.find(w => w.id === this.getCurrentWorkerId()) || workers[0] || null;
  }

  getAllWorkers() {
    if (window.laborEngine && window.laborEngine.workers && window.laborEngine.workers.length > 0) {
      return window.laborEngine.workers;
    }
    try {
      const raw = localStorage.getItem('amat_labor_workers');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  isWorkerClockedIn(workerId) {
    const workers = this.getAllWorkers();
    const worker = workers.find(w => w.id === workerId);
    return worker ? worker.status === 'clocked_in' : false;
  }

  // --- DATA LOADING & PERSISTENCE ---
  loadJobs() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_JOBS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse jobs data', e);
    }

    // Default Cleanroom Jobs Seed Data
    const now = Date.now();
    const defaultJobs = [
      {
        id: 'job_1',
        title: 'CVD Chamber 4 Vacuum Purge & Deposition Prep',
        description: 'Decontaminate chemical vapor deposition chamber and verify vacuum seals prior to wafer batch 42.',
        assignedWorkerId: 'w_1', // Elena Rostova
        priority: 1,
        status: 'in_progress',
        startedAt: now - 35 * 60 * 1000,
        completedAt: null
      },
      {
        id: 'job_2',
        title: 'Wafer Thermal Anneal Temperature Calibration',
        description: 'Calibrate pyrometric optical sensors and quartz heating lamps across zones 1-4.',
        assignedWorkerId: 'w_1', // Elena Rostova
        priority: 2,
        status: 'not_started',
        startedAt: null,
        completedAt: null
      },
      {
        id: 'job_3',
        title: 'Extreme Ultraviolet Lithography Reticle Alignment',
        description: 'Perform sub-nanometer overlay drift check and reticle auto-collimation.',
        assignedWorkerId: 'w_2', // Alex Chen
        priority: 1,
        status: 'completed',
        startedAt: now - 180 * 60 * 1000,
        completedAt: now - 65 * 60 * 1000
      },
      {
        id: 'job_4',
        title: 'Plasma Etch Gas Flow Verification',
        description: 'Verify CF4 and oxygen mixture supply pressures and RF induction coil ignition.',
        assignedWorkerId: 'w_2', // Alex Chen
        priority: 2,
        status: 'not_started',
        startedAt: null,
        completedAt: null
      },
      {
        id: 'job_5',
        title: 'Cleanroom Atmospheric Particle Count Certification',
        description: 'Verify ISO Class 1 cleanroom particle threshold in fabrication bay 3.',
        assignedWorkerId: 'w_3', // Marcus Vance
        priority: 1,
        status: 'not_started',
        startedAt: null,
        completedAt: null
      }
    ];

    this.saveJobs(defaultJobs);
    return defaultJobs;
  }

  loadSteps() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_STEPS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse steps data', e);
    }

    const now = Date.now();
    const defaultSteps = [
      // Job 1 Steps (Elena - In Progress: step 1 done)
      {
        id: 'step_1_1',
        jobId: 'job_1',
        stepNumber: 1,
        text: 'Inspect primary chamber turbomolecular pump pressure seals and vacuum flange gaskets',
        completed: true,
        completedAt: now - 35 * 60 * 1000
      },
      {
        id: 'step_1_2',
        jobId: 'job_1',
        stepNumber: 2,
        text: 'Initiate high-purity nitrogen purge flush and verify exhaust scrubber pressure',
        completed: false,
        completedAt: null
      },
      {
        id: 'step_1_3',
        jobId: 'job_1',
        stepNumber: 3,
        text: 'Calibrate silane and ammonia mass flow controllers to 250 sccm baseline',
        completed: false,
        completedAt: null
      },
      {
        id: 'step_1_4',
        jobId: 'job_1',
        stepNumber: 4,
        text: 'Perform final high-vacuum leak check down to 10^-6 Torr and log seal integrity',
        completed: false,
        completedAt: null
      },

      // Job 2 Steps (Elena - Not Started)
      {
        id: 'step_2_1',
        jobId: 'job_2',
        stepNumber: 1,
        text: 'Power on pyrometric optical sensor array and verify baseline dark current calibration',
        completed: false,
        completedAt: null
      },
      {
        id: 'step_2_2',
        jobId: 'job_2',
        stepNumber: 2,
        text: 'Measure quartz lamp zone 1 through 4 heat gradients under inert argon atmosphere',
        completed: false,
        completedAt: null
      },
      {
        id: 'step_2_3',
        jobId: 'job_2',
        stepNumber: 3,
        text: 'Verify steady-state wafer temperature holds within ±0.5°C at 1050°C target',
        completed: false,
        completedAt: null
      },

      // Job 3 Steps (Alex - Completed)
      {
        id: 'step_3_1',
        jobId: 'job_3',
        stepNumber: 1,
        text: 'Load 300mm calibration test reticle into stage 1 vacuum chuck',
        completed: true,
        completedAt: now - 170 * 60 * 1000
      },
      {
        id: 'step_3_2',
        jobId: 'job_3',
        stepNumber: 2,
        text: 'Perform dual-wavelength laser interferometry auto-collimation',
        completed: true,
        completedAt: now - 120 * 60 * 1000
      },
      {
        id: 'step_3_3',
        jobId: 'job_3',
        stepNumber: 3,
        text: 'Execute sub-nanometer overlay drift diagnostics and lock optic mirrors',
        completed: true,
        completedAt: now - 65 * 60 * 1000
      },

      // Job 4 Steps (Alex - Not Started)
      {
        id: 'step_4_1',
        jobId: 'job_4',
        stepNumber: 1,
        text: 'Inspect CF4 and oxygen mixture supply cylinders and manifold regulator seals',
        completed: false,
        completedAt: null
      },
      {
        id: 'step_4_2',
        jobId: 'job_4',
        stepNumber: 2,
        text: 'Ignite inductively coupled plasma RF coil at 13.56 MHz and verify reflected power < 5W',
        completed: false,
        completedAt: null
      },
      {
        id: 'step_4_3',
        jobId: 'job_4',
        stepNumber: 3,
        text: 'Sample optical emission spectroscopy endpoint wavelength and calibrate gas ratios',
        completed: false,
        completedAt: null
      },

      // Job 5 Steps (Marcus - Not Started)
      {
        id: 'step_5_1',
        jobId: 'job_5',
        stepNumber: 1,
        text: 'Zero-calibrate laser optical particle counter for 0.1 micron sensitivity threshold',
        completed: false,
        completedAt: null
      },
      {
        id: 'step_5_2',
        jobId: 'job_5',
        stepNumber: 2,
        text: 'Sample HEPA filter airflow laminar velocity across all 12 ceiling plenums in Bay 3',
        completed: false,
        completedAt: null
      },
      {
        id: 'step_5_3',
        jobId: 'job_5',
        stepNumber: 3,
        text: 'Generate and sign ISO Class 1 cleanroom particle count compliance telemetry',
        completed: false,
        completedAt: null
      }
    ];

    this.saveSteps(defaultSteps);
    return defaultSteps;
  }

  saveJobs(data = this.jobs) {
    this.jobs = data;
    localStorage.setItem(this.STORAGE_KEY_JOBS, JSON.stringify(this.jobs));
  }

  saveSteps(data = this.steps) {
    this.steps = data;
    localStorage.setItem(this.STORAGE_KEY_STEPS, JSON.stringify(this.steps));
  }

  // --- QUERY HELPERS ---
  getJobsForWorker(workerId) {
    return this.jobs
      .filter(j => j.assignedWorkerId === workerId)
      .sort((a, b) => (a.priority || 999) - (b.priority || 999));
  }

  getStepsForJob(jobId) {
    return this.steps
      .filter(s => s.jobId === jobId)
      .sort((a, b) => a.stepNumber - b.stepNumber);
  }

  /**
   * Returns the job currently 'in_progress' for a worker, if any.
   */
  getActiveJob(workerId) {
    const workerJobs = this.getJobsForWorker(workerId);
    return workerJobs.find(j => j.status === 'in_progress') || null;
  }

  /**
   * Returns the next job to be worked on (highest priority job that is not completed).
   */
  getUpNextJob(workerId) {
    const workerJobs = this.getJobsForWorker(workerId);
    const active = workerJobs.find(j => j.status === 'in_progress');
    if (active) return active;
    return workerJobs.find(j => j.status === 'not_started') || null;
  }

  // --- STEP & JOB RULES ENGINE ---

  /**
   * Rule: Can check off step only if:
   * 1. Worker is clocked in.
   * 2. No OTHER job is in_progress (Lock rule).
   * 3. All lower-numbered steps in this job are completed.
   */
  canCheckStep(stepId, workerId = null) {
    const targetWorkerId = workerId || this.getCurrentWorkerId();

    // Clock-in requirement
    if (!this.isWorkerClockedIn(targetWorkerId)) {
      return { allowed: false, reason: 'clocked_out', message: 'Clock in before starting a job.' };
    }

    const step = this.steps.find(s => s.id === stepId);
    if (!step) return { allowed: false, reason: 'not_found', message: 'Step not found.' };

    const job = this.jobs.find(j => j.id === step.jobId);
    if (!job) return { allowed: false, reason: 'not_found', message: 'Job not found.' };

    if (job.assignedWorkerId !== targetWorkerId) {
      return { allowed: false, reason: 'not_assigned', message: 'This job is assigned to another worker.' };
    }

    if (job.status === 'completed') {
      return { allowed: false, reason: 'already_completed', message: 'Job is already completed.' };
    }

    // LOCK RULE: If another job for this worker is in_progress, cannot work on this job!
    const activeJob = this.getActiveJob(targetWorkerId);
    if (activeJob && activeJob.id !== job.id) {
      return {
        allowed: false,
        reason: 'locked_other_job',
        message: `You've already started ${activeJob.title}. Please finish it before moving on.`,
        activeJobTitle: activeJob.title
      };
    }

    // STEP ORDER RULE: All lower-numbered steps must be completed
    const jobSteps = this.getStepsForJob(job.id);
    for (const s of jobSteps) {
      if (s.stepNumber < step.stepNumber && !s.completed) {
        return {
          allowed: false,
          reason: 'sequential_order',
          message: `Step ${s.stepNumber} must be completed before Step ${step.stepNumber}.`,
          blockingStepNumber: s.stepNumber
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Rule: Worker may un-check ONLY the most recently completed step.
   */
  canUncheckStep(stepId, workerId = null) {
    const targetWorkerId = workerId || this.getCurrentWorkerId();
    const step = this.steps.find(s => s.id === stepId);
    if (!step || !step.completed) return { allowed: false, reason: 'not_completed' };

    const job = this.jobs.find(j => j.id === step.jobId);
    if (!job) return { allowed: false, reason: 'not_found' };

    if (job.assignedWorkerId !== targetWorkerId) {
      return { allowed: false, reason: 'not_assigned' };
    }

    if (job.status === 'completed') {
      return { allowed: false, reason: 'job_completed', message: 'Cannot uncheck steps on a completed job.' };
    }

    // Check if any higher-numbered step is completed
    const jobSteps = this.getStepsForJob(job.id);
    const hasHigherCompleted = jobSteps.some(s => s.stepNumber > step.stepNumber && s.completed);
    if (hasHigherCompleted) {
      return {
        allowed: false,
        reason: 'not_most_recent',
        message: 'You may only un-check the most recently completed step to correct a mistake.'
      };
    }

    return { allowed: true };
  }

  /**
   * Check off a step with debounce and rule enforcement.
   */
  checkStep(stepId) {
    if (this.isProcessingAction) return { success: false, message: 'Processing previous action...' };
    this.isProcessingAction = true;

    try {
      const currentWorkerId = this.getCurrentWorkerId();
      const checkResult = this.canCheckStep(stepId, currentWorkerId);

      if (!checkResult.allowed) {
        if (window.appendAiMessage) {
          window.appendAiMessage(checkResult.message, '⚠️ Step Restriction');
        }
        if (window.speechEngine && window.speechEngine.speak) {
          window.speechEngine.speak(checkResult.message);
        }
        return { success: false, ...checkResult };
      }

      const step = this.steps.find(s => s.id === stepId);
      const job = this.jobs.find(j => j.id === step.jobId);
      const now = Date.now();

      // Check step
      step.completed = true;
      step.completedAt = now;

      // Auto In-Progress rule: if job was not_started, set to in_progress and record startedAt
      if (job.status === 'not_started') {
        job.status = 'in_progress';
        job.startedAt = now;
      }

      this.saveSteps();
      this.saveJobs();
      this.render();

      const jobSteps = this.getStepsForJob(job.id);
      const doneCount = jobSteps.filter(s => s.completed).length;
      const totalCount = jobSteps.length;
      const allDone = doneCount === totalCount;

      let msg = `Step ${step.stepNumber} completed: "${step.text}". (${doneCount} of ${totalCount} steps done).`;
      if (allDone) {
        msg += ` All steps are complete! You may now mark "${job.title}" complete, sir.`;
      }

      if (window.appendAiMessage) {
        window.appendAiMessage(msg, `✅ Step ${step.stepNumber} Done`);
      }
      if (window.speechEngine && window.speechEngine.speak) {
        window.speechEngine.speak(allDone ? `Step ${step.stepNumber} complete. All steps for this job are finished. Ready to mark job complete, sir.` : `Step ${step.stepNumber} completed. ${doneCount} of ${totalCount} steps done.`);
      }

      return { success: true, step, job, doneCount, totalCount, allDone, message: msg };
    } finally {
      setTimeout(() => { this.isProcessingAction = false; }, 300);
    }
  }

  /**
   * Un-check the most recently completed step.
   */
  uncheckStep(stepId) {
    if (this.isProcessingAction) return { success: false };
    this.isProcessingAction = true;

    try {
      const currentWorkerId = this.getCurrentWorkerId();
      const uncheckResult = this.canUncheckStep(stepId, currentWorkerId);

      if (!uncheckResult.allowed) {
        const msg = uncheckResult.message || 'Cannot un-check this step.';
        if (window.appendAiMessage) window.appendAiMessage(msg, '⚠️ Action Denied');
        if (window.speechEngine && window.speechEngine.speak) window.speechEngine.speak(msg);
        return { success: false, ...uncheckResult };
      }

      const step = this.steps.find(s => s.id === stepId);
      const job = this.jobs.find(j => j.id === step.jobId);

      step.completed = false;
      step.completedAt = null;

      // If no other steps are completed, return job to "not_started" and reset startedAt
      const jobSteps = this.getStepsForJob(job.id);
      const anyCompleted = jobSteps.some(s => s.completed);
      if (!anyCompleted) {
        job.status = 'not_started';
        job.startedAt = null;
      }

      this.saveSteps();
      this.saveJobs();
      this.render();

      const msg = `Un-checked Step ${step.stepNumber} on "${job.title}". Job returned to ${job.status.replace('_', ' ')}.`;
      if (window.appendAiMessage) {
        window.appendAiMessage(msg, `↩️ Step ${step.stepNumber} Reverted`);
      }

      return { success: true, step, job, message: msg };
    } finally {
      setTimeout(() => { this.isProcessingAction = false; }, 300);
    }
  }

  /**
   * Marks a job complete once all steps are checked.
   */
  markJobComplete(jobId) {
    if (this.isProcessingAction) return { success: false };
    this.isProcessingAction = true;

    try {
      const job = this.jobs.find(j => j.id === jobId);
      if (!job) return { success: false, message: 'Job not found.' };

      const currentWorkerId = this.getCurrentWorkerId();
      if (job.assignedWorkerId !== currentWorkerId) {
        return { success: false, message: 'Only the assigned worker can complete this job.' };
      }

      const jobSteps = this.getStepsForJob(job.id);
      const unfinished = jobSteps.filter(s => !s.completed);

      if (unfinished.length > 0) {
        const msg = `Cannot mark complete. ${unfinished.length} step(s) remain unchecked on "${job.title}".`;
        if (window.appendAiMessage) window.appendAiMessage(msg, '⚠️ Incomplete Steps');
        if (window.speechEngine && window.speechEngine.speak) window.speechEngine.speak(msg);
        return { success: false, message: msg, remaining: unfinished.length };
      }

      const now = Date.now();
      job.status = 'completed';
      job.completedAt = now;

      this.saveJobs();
      this.render();

      // Find next job by priority
      const nextJob = this.getUpNextJob(currentWorkerId);
      let reply = `Job "${job.title}" is now marked Completed!`;
      if (nextJob) {
        reply += ` Up next: "${nextJob.title}".`;
      } else {
        reply += ` All assigned jobs are now finished, sir!`;
      }

      if (window.appendAiMessage) {
        window.appendAiMessage(reply, '🎉 Job Completed');
      }
      if (window.speechEngine && window.speechEngine.speak) {
        window.speechEngine.speak(reply);
      }

      return { success: true, job, nextJob, message: reply };
    } finally {
      setTimeout(() => { this.isProcessingAction = false; }, 300);
    }
  }

  // --- MANAGER CRUD & REORDERING OPERATIONS ---
  addJob(jobData, stepsList) {
    const newJobId = 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const workerJobs = this.getJobsForWorker(jobData.assignedWorkerId);
    const defaultPriority = workerJobs.length + 1;

    const newJob = {
      id: newJobId,
      title: jobData.title.trim(),
      description: (jobData.description || '').trim(),
      assignedWorkerId: jobData.assignedWorkerId,
      priority: parseInt(jobData.priority, 10) || defaultPriority,
      status: 'not_started',
      startedAt: null,
      completedAt: null
    };

    this.jobs.push(newJob);

    // Create steps
    if (Array.isArray(stepsList)) {
      stepsList.forEach((text, idx) => {
        if (text && text.trim()) {
          this.steps.push({
            id: 'step_' + Date.now() + '_' + (idx + 1) + '_' + Math.random().toString(36).substr(2, 4),
            jobId: newJobId,
            stepNumber: idx + 1,
            text: text.trim(),
            completed: false,
            completedAt: null
          });
        }
      });
    }

    this.saveJobs();
    this.saveSteps();
    this.render();

    const msg = `Created cleanroom assignment "${newJob.title}" with priority ${newJob.priority}.`;
    if (window.appendAiMessage) window.appendAiMessage(msg, '📋 Job Created');
    return newJob;
  }

  editJob(jobId, updatedData) {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) return null;

    // Safety check if job is in_progress and worker is being reassigned
    if (job.status === 'in_progress' && updatedData.assignedWorkerId && updatedData.assignedWorkerId !== job.assignedWorkerId) {
      const workers = this.getAllWorkers();
      const currentWorker = workers.find(w => w.id === job.assignedWorkerId);
      const workerName = currentWorker ? currentWorker.name : 'assigned worker';
      const confirmed = confirm(`⚠️ Warning: "${job.title}" is currently IN PROGRESS by ${workerName}. Reassigning it will transfer the active shift lock. Are you sure?`);
      if (!confirmed) return null;
    }

    if (updatedData.title) job.title = updatedData.title.trim();
    if (updatedData.description !== undefined) job.description = updatedData.description.trim();
    if (updatedData.assignedWorkerId) job.assignedWorkerId = updatedData.assignedWorkerId;
    if (updatedData.priority !== undefined) job.priority = parseInt(updatedData.priority, 10) || job.priority;

    this.saveJobs();
    this.render();
    return job;
  }

  deleteJob(jobId) {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) return false;

    // Safety prompt if job is in_progress
    if (job.status === 'in_progress') {
      const workers = this.getAllWorkers();
      const currentWorker = workers.find(w => w.id === job.assignedWorkerId);
      const workerName = currentWorker ? currentWorker.name : 'assigned worker';
      const confirmed = confirm(`⚠️ Warning: "${job.title}" is currently IN PROGRESS by ${workerName}. Deleting it will terminate the shift job. Are you sure you want to delete this active job?`);
      if (!confirmed) return false;
    } else {
      if (!confirm(`Are you sure you want to delete "${job.title}"?`)) return false;
    }

    this.jobs = this.jobs.filter(j => j.id !== jobId);
    this.steps = this.steps.filter(s => s.jobId !== jobId);

    this.saveJobs();
    this.saveSteps();
    this.render();

    if (window.appendAiMessage) {
      window.appendAiMessage(`Job "${job.title}" has been deleted.`, '🗑️ Job Removed');
    }
    return true;
  }

  reorderJob(jobId, direction) {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) return;

    const workerJobs = this.getJobsForWorker(job.assignedWorkerId);
    const index = workerJobs.findIndex(j => j.id === jobId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= workerJobs.length) return;

    const otherJob = workerJobs[targetIndex];
    const tempPriority = job.priority;
    job.priority = otherJob.priority;
    otherJob.priority = tempPriority;

    this.saveJobs();
    this.render();
  }

  reorderStep(jobId, stepId, direction) {
    const steps = this.getStepsForJob(jobId);
    const index = steps.findIndex(s => s.id === stepId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const stepA = steps[index];
    const stepB = steps[targetIndex];

    const tempNum = stepA.stepNumber;
    stepA.stepNumber = stepB.stepNumber;
    stepB.stepNumber = tempNum;

    this.saveSteps();
    this.render();
  }

  addStepToJob(jobId, text) {
    if (!text || !text.trim()) return null;
    const steps = this.getStepsForJob(jobId);
    const newStep = {
      id: 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      jobId,
      stepNumber: steps.length + 1,
      text: text.trim(),
      completed: false,
      completedAt: null
    };
    this.steps.push(newStep);
    this.saveSteps();
    this.render();
    return newStep;
  }

  deleteStepFromJob(jobId, stepId) {
    const step = this.steps.find(s => s.id === stepId);
    if (!step) return;

    this.steps = this.steps.filter(s => s.id !== stepId);

    // Re-index remaining steps
    const remainingSteps = this.getStepsForJob(jobId);
    remainingSteps.forEach((s, idx) => {
      s.stepNumber = idx + 1;
    });

    this.saveSteps();
    this.render();
  }

  editStepPrompt(jobId, stepId) {
    const step = this.steps.find(s => s.id === stepId && s.jobId === jobId);
    if (!step) return;
    const newText = prompt(`Edit Step ${step.stepNumber} text:`, step.text);
    if (newText !== null && newText.trim()) {
      step.text = newText.trim();
      this.saveSteps();
      this.render();
      if (window.appendAiMessage) {
        window.appendAiMessage(`Updated Step ${step.stepNumber} text: "${step.text}"`, '✏️ Step Modified');
      }
    }
  }

  // --- VOICE DIRECTIVE HANDLERS ---
  getCurrentJobVoice() {
    const workerId = this.getCurrentWorkerId();
    const worker = this.getCurrentWorker();
    const workerName = worker ? worker.name : 'Operator';

    const activeJob = this.getActiveJob(workerId);
    if (activeJob) {
      const steps = this.getStepsForJob(activeJob.id);
      const nextStep = steps.find(s => !s.completed);
      const nextStepText = nextStep ? `Next step is Step ${nextStep.stepNumber}: "${nextStep.text}".` : 'All steps are completed. Ready to mark complete.';
      return `Your current active job is "${activeJob.title}". ${nextStepText}`;
    }

    const upNext = this.getUpNextJob(workerId);
    if (upNext) {
      const steps = this.getStepsForJob(upNext.id);
      return `You have not started a job yet, ${workerName}. Up next by priority is "${upNext.title}" with ${steps.length} steps. Say "complete step" to begin Step 1.`;
    }

    return `All assigned cleanroom jobs are completed for ${workerName}, sir. Uptime is nominal.`;
  }

  getNextStepVoice() {
    const workerId = this.getCurrentWorkerId();
    const activeJob = this.getActiveJob(workerId) || this.getUpNextJob(workerId);

    if (!activeJob) {
      return 'You currently have no remaining unchecked jobs or steps, sir.';
    }

    const steps = this.getStepsForJob(activeJob.id);
    const nextStep = steps.find(s => !s.completed);

    if (!nextStep) {
      return `All steps on "${activeJob.title}" are already completed, sir. You may say "mark job complete".`;
    }

    return `On "${activeJob.title}", your next step is Step ${nextStep.stepNumber}: "${nextStep.text}".`;
  }

  readStepVoice(requestedStepStr) {
    const workerId = this.getCurrentWorkerId();
    const activeJob = this.getActiveJob(workerId) || this.getUpNextJob(workerId);

    if (!activeJob) {
      return 'You currently have no assigned jobs to read steps from, sir.';
    }

    const steps = this.getStepsForJob(activeJob.id);
    if (steps.length === 0) {
      return `"${activeJob.title}" has no steps registered.`;
    }

    let targetStep = null;
    const req = (requestedStepStr || '').trim().toLowerCase();

    // Word to number mapping
    const wordToNum = {
      'one': 1, 'first': 1, '1st': 1,
      'two': 2, 'second': 2, '2nd': 2,
      'three': 3, 'third': 3, '3rd': 3,
      'four': 4, 'fourth': 4, '4th': 4,
      'five': 5, 'fifth': 5, '5th': 5,
      'six': 6, 'sixth': 6, '6th': 6,
      'seven': 7, 'seventh': 7, '7th': 7,
      'eight': 8, 'eighth': 8, '8th': 8,
      'nine': 9, 'ninth': 9, '9th': 9,
      'ten': 10, 'tenth': 10, '10th': 10
    };

    if (!req || req === 'next' || req === 'current' || req === 'my next step') {
      targetStep = steps.find(s => !s.completed) || steps[steps.length - 1];
    } else if (wordToNum[req] !== undefined) {
      const stepNum = wordToNum[req];
      targetStep = steps.find(s => s.stepNumber === stepNum);
    } else {
      const match = req.match(/\d+/);
      if (match) {
        const stepNum = parseInt(match[0], 10);
        targetStep = steps.find(s => s.stepNumber === stepNum);
      }
    }

    if (!targetStep) {
      return `Step ${requestedStepStr} was not found on "${activeJob.title}". This job has ${steps.length} sequential steps.`;
    }

    const statusStr = targetStep.completed ? 'Completed' : 'Pending';
    return `Step ${targetStep.stepNumber} of "${activeJob.title}" reads: "${targetStep.text}". Status is ${statusStr}.`;
  }

  completeNextStepVoice() {
    const workerId = this.getCurrentWorkerId();

    if (!this.isWorkerClockedIn(workerId)) {
      return 'Clock in before starting a job. Please clock in to active shift first, sir.';
    }

    const activeJob = this.getActiveJob(workerId) || this.getUpNextJob(workerId);
    if (!activeJob) {
      return 'There are no active jobs available to complete steps on, sir.';
    }

    // Find next step in this job
    const steps = this.getStepsForJob(activeJob.id);
    const nextStep = steps.find(s => !s.completed);

    if (!nextStep) {
      return `All steps on "${activeJob.title}" are already done, sir. Please say "mark job complete".`;
    }

    const result = this.checkStep(nextStep.id);
    return result.message;
  }

  markJobCompleteVoice() {
    const workerId = this.getCurrentWorkerId();
    const activeJob = this.getActiveJob(workerId);

    if (!activeJob) {
      const upNext = this.getUpNextJob(workerId);
      if (upNext) {
        const steps = this.getStepsForJob(upNext.id);
        const unfinished = steps.filter(s => !s.completed).length;
        return `"${upNext.title}" has ${unfinished} unchecked steps remaining and cannot be marked complete yet.`;
      }
      return 'There is no active job in progress to mark complete, sir.';
    }

    const result = this.markJobComplete(activeJob.id);
    return result.message;
  }

  getStepsLeftVoice() {
    const workerId = this.getCurrentWorkerId();
    const activeJob = this.getActiveJob(workerId) || this.getUpNextJob(workerId);

    if (!activeJob) {
      return 'You have 0 steps remaining, sir. All jobs are done!';
    }

    const steps = this.getStepsForJob(activeJob.id);
    const remaining = steps.filter(s => !s.completed).length;

    return `You have ${remaining} step${remaining === 1 ? '' : 's'} remaining on "${activeJob.title}".`;
  }

  // --- NAVIGATION & VIEW FLIPPING ---
  isJobsOpen() {
    return this.isViewOpen;
  }

  openJobs() {
    this.isViewOpen = true;

    // Hide chat, sidebar, manage labor
    const chatSection = document.querySelector('.chat-section');
    const actionSidebar = document.querySelector('.action-sidebar');
    const manageLaborSection = document.getElementById('manageLaborSection');
    const jobsSection = document.getElementById('jobsSection');
    const navJobsBtn = document.getElementById('navJobsBtn');
    const navLaborBtn = document.getElementById('navManageLaborBtn');
    const navTranscriptBtn = document.getElementById('navTranscriptBtn');

    if (chatSection) chatSection.style.display = 'none';
    if (actionSidebar) actionSidebar.style.display = 'none';
    if (manageLaborSection) manageLaborSection.style.display = 'none';

    if (jobsSection) {
      jobsSection.style.display = 'flex';
      jobsSection.classList.remove('fade-out');
      jobsSection.classList.add('fade-in');
    }

    if (navJobsBtn) navJobsBtn.classList.add('active');
    if (navLaborBtn) navLaborBtn.classList.remove('active');
    if (navTranscriptBtn) navTranscriptBtn.classList.remove('active');

    if (window.laborEngine) window.laborEngine.isViewOpen = false;

    this.render();
    return 'Opening Jobs & Assignments';
  }

  closeJobs() {
    if (!this.isViewOpen) {
      return 'You are already on the operational HUD interface, sir.';
    }

    this.isViewOpen = false;
    const chatSection = document.querySelector('.chat-section');
    const actionSidebar = document.querySelector('.action-sidebar');
    const jobsSection = document.getElementById('jobsSection');
    const navJobsBtn = document.getElementById('navJobsBtn');
    const navTranscriptBtn = document.getElementById('navTranscriptBtn');

    if (jobsSection) jobsSection.style.display = 'none';
    if (chatSection) {
      chatSection.style.display = '';
      chatSection.classList.add('fade-in');
    }
    if (actionSidebar) actionSidebar.style.display = '';
    if (navJobsBtn) navJobsBtn.classList.remove('active');
    if (navTranscriptBtn) navTranscriptBtn.classList.add('active');

    return 'Returning to operational interface, sir.';
  }

  toggleView() {
    if (this.isViewOpen) {
      return this.closeJobs();
    } else {
      return this.openJobs();
    }
  }

  setViewMode(mode) {
    this.viewMode = mode;
    localStorage.setItem(this.STORAGE_KEY_VIEW_MODE, mode);
    this.render();
  }

  // --- RENDERING METHODS ---
  render() {
    this.renderHeader();
    if (this.viewMode === 'manager') {
      this.renderManagerView();
    } else {
      this.renderWorkerView();
    }
  }

  renderHeader() {
    const worker = this.getCurrentWorker();
    const workerName = worker ? worker.name : 'Operator';
    const isClockedIn = worker ? worker.status === 'clocked_in' : false;

    const workerPill = document.getElementById('jobsCurrentWorkerPill');
    if (workerPill) {
      workerPill.innerHTML = `
        <span class="worker-avatar">👤</span>
        <span class="worker-name">${this.escape(workerName)}</span>
        <span class="worker-shift-tag ${isClockedIn ? 'clocked-in' : 'clocked-out'}">
          ${isClockedIn ? '● Clocked In' : '○ Clocked Out'}
        </span>
      `;
    }

    const workerSelect = document.getElementById('jobsWorkerSelect');
    if (workerSelect) {
      const allWorkers = this.getAllWorkers();
      const currentId = this.getCurrentWorkerId();
      workerSelect.innerHTML = allWorkers.map(w => {
        const selected = w.id === currentId ? 'selected' : '';
        const inTag = w.status === 'clocked_in' ? '● In' : '○ Out';
        return `<option value="${w.id}" ${selected}>${this.escape(w.name)} (${this.escape(w.role || 'Tech')}) [${inTag}]</option>`;
      }).join('');
    }

    // Toggle view buttons
    const workerViewBtn = document.getElementById('tabWorkerViewBtn');
    const managerViewBtn = document.getElementById('tabManagerViewBtn');
    if (workerViewBtn && managerViewBtn) {
      if (this.viewMode === 'manager') {
        managerViewBtn.classList.add('active');
        workerViewBtn.classList.remove('active');
      } else {
        workerViewBtn.classList.add('active');
        managerViewBtn.classList.remove('active');
      }
    }
  }

  renderWorkerView() {
    const workerViewContainer = document.getElementById('jobsWorkerViewContainer');
    const managerViewContainer = document.getElementById('jobsManagerViewContainer');
    if (workerViewContainer) workerViewContainer.style.display = 'block';
    if (managerViewContainer) managerViewContainer.style.display = 'none';

    const currentWorkerId = this.getCurrentWorkerId();
    const currentWorker = this.getCurrentWorker();
    const isClockedIn = this.isWorkerClockedIn(currentWorkerId);

    // Clock-in Banner
    const clockinBanner = document.getElementById('jobsClockinNotice');
    if (clockinBanner) {
      if (!isClockedIn) {
        clockinBanner.style.display = 'flex';
        clockinBanner.innerHTML = `
          <div class="notice-icon">⚠️</div>
          <div class="notice-text">
            <strong>Clock In Required:</strong> You are currently Clocked Out. Cleanroom protocols require you to clock in to active shift before checking off job steps.
          </div>
          <button type="button" class="primary-btn mini-btn" onclick="window.laborEngine.clockInUser('${currentWorkerId}'); window.jobsEngine.render();">
            ▶ Clock In Now
          </button>
        `;
      } else {
        clockinBanner.style.display = 'none';
      }
    }

    const workerJobs = this.getJobsForWorker(currentWorkerId);
    const activeJob = this.getActiveJob(currentWorkerId);
    const upNextJob = this.getUpNextJob(currentWorkerId);

    const activeJobsContainer = document.getElementById('workerActiveJobsList');
    const completedJobsContainer = document.getElementById('workerCompletedJobsList');
    const allDoneContainer = document.getElementById('workerAllDoneSummary');

    const completedJobs = workerJobs.filter(j => j.status === 'completed');
    const pendingJobs = workerJobs.filter(j => j.status !== 'completed');

    // All jobs done check
    if (workerJobs.length > 0 && pendingJobs.length === 0) {
      if (allDoneContainer) {
        allDoneContainer.style.display = 'block';
        const totalDurationSec = completedJobs.reduce((acc, j) => {
          if (j.startedAt && j.completedAt) {
            return acc + Math.floor((j.completedAt - j.startedAt) / 1000);
          }
          return acc;
        }, 0);

        allDoneContainer.innerHTML = `
          <div class="all-done-card">
            <div class="all-done-icon">🎉</div>
            <h3>All jobs done</h3>
            <p>Every assigned task for <strong>${this.escape(currentWorker?.name || 'Operator')}</strong> is complete and verified.</p>
            <div class="all-done-stats">
              <span class="stat-box"><strong>${completedJobs.length}</strong> jobs completed</span>
              <span class="stat-box"><strong>${this.formatCompactDuration(totalDurationSec)}</strong> total time</span>
              <span class="stat-box">Status: <strong>Optimal Nominal</strong></span>
            </div>
          </div>
        `;
      }
    } else {
      if (allDoneContainer) allDoneContainer.style.display = 'none';
    }

    // Render Active / Pending Jobs
    if (activeJobsContainer) {
      if (pendingJobs.length === 0 && completedJobs.length === 0) {
        activeJobsContainer.innerHTML = `
          <div class="empty-state">
            <p>No cleanroom jobs currently assigned to ${this.escape(currentWorker?.name || 'you')}.</p>
            <small>Switch to Facility Manager View to create and assign assignments.</small>
          </div>
        `;
      } else {
        activeJobsContainer.innerHTML = pendingJobs.map(job => {
          const isCurrentActive = activeJob && activeJob.id === job.id;
          const isUpNext = !activeJob && upNextJob && upNextJob.id === job.id;
          const isLockedByOther = activeJob && activeJob.id !== job.id;
          const steps = this.getStepsForJob(job.id);
          const completedCount = steps.filter(s => s.completed).length;
          const totalCount = steps.length;
          const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
          const allStepsDone = completedCount === totalCount && totalCount > 0;

          // Status badge
          let statusBadgeClass = 'not-started';
          let statusBadgeText = 'Not Started';
          if (job.status === 'in_progress') {
            statusBadgeClass = 'in-progress';
            statusBadgeText = 'In Progress';
          }

          let lockBannerHtml = '';
          if (isLockedByOther) {
            lockBannerHtml = `
              <div class="job-lock-overlay">
                <span class="lock-icon">🔒</span>
                <span>Finish "<strong>${this.escape(activeJob.title)}</strong>" first</span>
              </div>
            `;
          }

          let upNextBadge = '';
          if (isUpNext) {
            upNextBadge = `<span class="up-next-badge">⭐ Up Next</span>`;
          } else if (isCurrentActive) {
            upNextBadge = `<span class="active-job-badge">⚡ Active Job</span>`;
          }

          // Render Steps
          const stepsHtml = steps.map((s, idx) => {
            const isCompleted = s.completed;
            const canCheck = this.canCheckStep(s.id, currentWorkerId).allowed;
            const canUncheck = this.canUncheckStep(s.id, currentWorkerId).allowed;
            const isMostRecent = canUncheck;

            let stepStateClass = 'step-pending';
            if (isCompleted) stepStateClass = 'step-done';
            else if (!canCheck) stepStateClass = 'step-locked';

            let checkControlHtml = '';
            if (isCompleted) {
              if (isMostRecent) {
                checkControlHtml = `
                  <button type="button" class="step-checkbox checked undoable"
                          onclick="window.jobsEngine.uncheckStep('${s.id}')"
                          title="Click to un-check (undo mistake)"
                          aria-label="Undo Step ${s.stepNumber}">
                    <span class="check-mark">✓</span>
                  </button>
                `;
              } else {
                checkControlHtml = `
                  <div class="step-checkbox checked locked-checked"
                       title="Earlier completed step cannot be un-checked"
                       aria-label="Step ${s.stepNumber} complete">
                    <span class="check-mark">✓</span>
                  </div>
                `;
              }
            } else {
              if (canCheck) {
                checkControlHtml = `
                  <button type="button" class="step-checkbox unchecked"
                          onclick="window.jobsEngine.checkStep('${s.id}')"
                          title="Check off Step ${s.stepNumber}"
                          aria-label="Check off Step ${s.stepNumber}">
                    <span class="step-num-icon">${s.stepNumber}</span>
                  </button>
                `;
              } else {
                checkControlHtml = `
                  <div class="step-checkbox locked"
                       title="Complete lower-numbered steps first"
                       aria-label="Step ${s.stepNumber} locked">
                    <span class="lock-icon">🔒</span>
                  </div>
                `;
              }
            }

            let timeBadge = '';
            if (s.completed && s.completedAt) {
              const timeStr = new Date(s.completedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
              timeBadge = `<span class="step-time">Done at ${timeStr}</span>`;
            }

            return `
              <div class="step-item ${stepStateClass} ${isLockedByOther ? 'locked-by-job' : ''}">
                <div class="step-control">${checkControlHtml}</div>
                <div class="step-content">
                  <div class="step-header-row">
                    <span class="step-number-tag">Step ${s.stepNumber}</span>
                    ${timeBadge}
                  </div>
                  <div class="step-text">${this.escape(s.text)}</div>
                </div>
              </div>
            `;
          }).join('');

          // Complete Job Button
          let completeJobBtnHtml = '';
          if (allStepsDone && job.status === 'in_progress') {
            completeJobBtnHtml = `
              <div class="mark-job-complete-box">
                <div class="complete-ready-text">✨ All ${totalCount} steps completed! Ready to verify and log.</div>
                <button type="button" class="primary-btn mark-complete-btn" onclick="window.jobsEngine.markJobComplete('${job.id}')" aria-label="Mark Job Complete">
                  ✅ Mark Job Complete
                </button>
              </div>
            `;
          }

          return `
            <div class="job-card ${isCurrentActive ? 'current-active-job' : ''} ${isUpNext ? 'up-next-job' : ''} ${isLockedByOther ? 'is-locked-job' : ''}">
              ${lockBannerHtml}
              <div class="job-card-header">
                <div class="job-title-row">
                  <span class="job-priority-pill">#${job.priority}</span>
                  <h4 class="job-title">${this.escape(job.title)}</h4>
                  ${upNextBadge}
                  <span class="job-status-badge ${statusBadgeClass}">${statusBadgeText}</span>
                </div>
                ${job.description ? `<p class="job-desc">${this.escape(job.description)}</p>` : ''}
                <div class="job-progress-wrapper">
                  <div class="job-progress-meta">
                    <span>Progress: <strong>${completedCount} of ${totalCount}</strong> steps done</span>
                    <span>${Math.round(pct)}%</span>
                  </div>
                  <div class="job-progress-bar">
                    <div class="progress-fill" style="width: ${pct}%"></div>
                  </div>
                </div>
              </div>
              <div class="job-steps-list">
                ${stepsHtml}
              </div>
              ${completeJobBtnHtml}
            </div>
          `;
        }).join('');
      }
    }

    // Render Completed Jobs List
    if (completedJobsContainer) {
      if (completedJobs.length === 0) {
        completedJobsContainer.innerHTML = `
          <div class="empty-state mini">
            <p>No completed jobs yet for this shift.</p>
          </div>
        `;
      } else {
        completedJobsContainer.innerHTML = completedJobs.map(job => {
          const steps = this.getStepsForJob(job.id);
          const finishTime = job.completedAt ? new Date(job.completedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Earlier';
          const durationSec = (job.startedAt && job.completedAt) ? Math.floor((job.completedAt - job.startedAt) / 1000) : 0;
          const durationStr = durationSec > 0 ? this.formatCompactDuration(durationSec) : '';

          return `
            <div class="job-card completed-job-card">
              <div class="job-card-header">
                <div class="job-title-row">
                  <span class="job-priority-pill completed">#${job.priority}</span>
                  <h4 class="job-title">${this.escape(job.title)}</h4>
                  <span class="job-status-badge completed">✓ Completed</span>
                </div>
                <div class="job-completed-meta">
                  <span>Finished at ${finishTime}</span>
                  ${durationStr ? `<span>• Took ${durationStr}</span>` : ''}
                  <span>• ${steps.length} of ${steps.length} steps verified</span>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  renderManagerView() {
    const workerViewContainer = document.getElementById('jobsWorkerViewContainer');
    const managerViewContainer = document.getElementById('jobsManagerViewContainer');
    if (workerViewContainer) workerViewContainer.style.display = 'none';
    if (managerViewContainer) managerViewContainer.style.display = 'block';

    const allWorkers = this.getAllWorkers();

    // 1. Overview Table
    const overviewTableBody = document.getElementById('managerOverviewTbody');
    if (overviewTableBody) {
      overviewTableBody.innerHTML = allWorkers.map(w => {
        const isClockedIn = w.status === 'clocked_in';
        const workerJobs = this.getJobsForWorker(w.id);
        const activeJob = this.getActiveJob(w.id);
        const upNextJob = this.getUpNextJob(w.id);
        const currentJob = activeJob || upNextJob;

        let jobTitleText = '<span class="text-dim">No jobs assigned</span>';
        let progressText = '-';
        let statusTag = '<span class="status-pill idle">Idle</span>';

        if (currentJob) {
          jobTitleText = `<strong>#${currentJob.priority}</strong> ${this.escape(currentJob.title)}`;
          const steps = this.getStepsForJob(currentJob.id);
          const done = steps.filter(s => s.completed).length;
          progressText = `${done} / ${steps.length} (${steps.length > 0 ? Math.round((done / steps.length) * 100) : 0}%)`;

          if (currentJob.status === 'in_progress') {
            statusTag = '<span class="status-pill in-progress">● In Progress</span>';
          } else if (currentJob.status === 'completed') {
            statusTag = '<span class="status-pill completed">✓ Completed</span>';
          } else {
            statusTag = '<span class="status-pill not-started">○ Pending</span>';
          }
        }

        return `
          <tr>
            <td>
              <div class="worker-table-cell">
                <strong>${this.escape(w.name)}</strong>
                <small>${this.escape(w.role || 'Cleanroom Specialist')}</small>
              </div>
            </td>
            <td>
              <span class="worker-badge ${isClockedIn ? 'clocked-in' : 'clocked-out'}">
                <span class="badge-dot"></span>
                ${isClockedIn ? 'Clocked In' : 'Clocked Out'}
              </span>
            </td>
            <td>${jobTitleText}</td>
            <td>${progressText}</td>
            <td>${statusTag}</td>
            <td>
              <button type="button" class="ghost-btn mini-btn" onclick="window.jobsEngine.switchToWorkerAndFilter('${w.id}')">
                View Queue
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // 2. All Jobs Management List
    const managerJobsList = document.getElementById('managerJobsList');
    if (managerJobsList) {
      if (this.jobs.length === 0) {
        managerJobsList.innerHTML = `
          <div class="empty-state">
            <p>No jobs created yet. Click "+ Create New Cleanroom Job" above to add assignments.</p>
          </div>
        `;
      } else {
        const sortedJobs = [...this.jobs].sort((a, b) => {
          if (a.assignedWorkerId !== b.assignedWorkerId) {
            return a.assignedWorkerId.localeCompare(b.assignedWorkerId);
          }
          return (a.priority || 999) - (b.priority || 999);
        });

        managerJobsList.innerHTML = sortedJobs.map(job => {
          const worker = allWorkers.find(w => w.id === job.assignedWorkerId);
          const workerName = worker ? worker.name : 'Unassigned';
          const steps = this.getStepsForJob(job.id);
          const completedCount = steps.filter(s => s.completed).length;

          let statusBadgeClass = 'not-started';
          if (job.status === 'in_progress') statusBadgeClass = 'in-progress';
          else if (job.status === 'completed') statusBadgeClass = 'completed';

          const stepsEditorHtml = steps.map(s => `
            <div class="manager-step-row">
              <span class="step-num-tag">${s.stepNumber}</span>
              <span class="step-text-val ${s.completed ? 'completed' : ''}">${this.escape(s.text)}</span>
              <div class="step-manager-actions">
                <button type="button" class="icon-btn mini" onclick="window.jobsEngine.editStepPrompt('${job.id}', '${s.id}')" title="Edit Step Text">✎</button>
                <button type="button" class="icon-btn mini" onclick="window.jobsEngine.reorderStep('${job.id}', '${s.id}', 'up')" title="Move Step Up">↑</button>
                <button type="button" class="icon-btn mini" onclick="window.jobsEngine.reorderStep('${job.id}', '${s.id}', 'down')" title="Move Step Down">↓</button>
                <button type="button" class="icon-btn mini danger" onclick="window.jobsEngine.deleteStepFromJob('${job.id}', '${s.id}')" title="Delete Step">&times;</button>
              </div>
            </div>
          `).join('');

          return `
            <div class="manager-job-item ${job.status}">
              <div class="manager-job-header">
                <div class="manager-job-left">
                  <div class="priority-badge">#${job.priority}</div>
                  <div>
                    <h4>${this.escape(job.title)}</h4>
                    <div class="manager-job-meta">
                      <span>Assigned to: <strong>${this.escape(workerName)}</strong></span>
                      <span>• Progress: <strong>${completedCount}/${steps.length}</strong></span>
                      <span class="job-status-badge ${statusBadgeClass}">${job.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
                <div class="manager-job-actions">
                  <button type="button" class="action-btn mini" onclick="window.jobsEngine.reorderJob('${job.id}', 'up')" title="Increase Priority">↑</button>
                  <button type="button" class="action-btn mini" onclick="window.jobsEngine.reorderJob('${job.id}', 'down')" title="Decrease Priority">↓</button>
                  <button type="button" class="action-btn mini" onclick="window.jobsEngine.openEditJobModal('${job.id}')">Edit</button>
                  <button type="button" class="action-btn mini danger" onclick="window.jobsEngine.deleteJob('${job.id}')">Delete</button>
                </div>
              </div>
              <div class="manager-steps-block">
                <h5>Steps (${steps.length}):</h5>
                <div class="manager-steps-list">${stepsEditorHtml}</div>
                <form class="add-step-inline-form" onsubmit="event.preventDefault(); const inp = this.querySelector('input'); window.jobsEngine.addStepToJob('${job.id}', inp.value); inp.value='';">
                  <input type="text" class="form-input mini" placeholder="+ Add next step..." required />
                  <button type="submit" class="secondary-btn mini-btn">Add Step</button>
                </form>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  switchToWorkerAndFilter(workerId) {
    if (window.laborEngine && window.laborEngine.setCurrentUser) {
      window.laborEngine.setCurrentUser(workerId);
    }
    this.setViewMode('worker');
  }

  openEditJobModal(jobId) {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) return;

    const modal = document.getElementById('jobEditModal');
    if (!modal) return;

    document.getElementById('editJobId').value = job.id;
    document.getElementById('editJobTitle').value = job.title;
    document.getElementById('editJobDesc').value = job.description || '';
    document.getElementById('editJobPriority').value = job.priority;

    const workerSelect = document.getElementById('editJobWorkerSelect');
    if (workerSelect) {
      const allWorkers = this.getAllWorkers();
      workerSelect.innerHTML = allWorkers.map(w => `
        <option value="${w.id}" ${w.id === job.assignedWorkerId ? 'selected' : ''}>
          ${this.escape(w.name)} (${this.escape(w.role || 'Tech')})
        </option>
      `).join('');
    }

    modal.classList.add('open');
  }

  openCreateJobModal() {
    const modal = document.getElementById('jobCreateModal');
    if (!modal) return;

    document.getElementById('newJobTitle').value = '';
    document.getElementById('newJobDesc').value = '';
    document.getElementById('newJobPriority').value = '1';
    document.getElementById('newJobStepsText').value = '';

    const workerSelect = document.getElementById('newJobWorkerSelect');
    if (workerSelect) {
      const allWorkers = this.getAllWorkers();
      const currentWorkerId = this.getCurrentWorkerId();
      workerSelect.innerHTML = allWorkers.map(w => `
        <option value="${w.id}" ${w.id === currentWorkerId ? 'selected' : ''}>
          ${this.escape(w.name)} (${this.escape(w.role || 'Tech')})
        </option>
      `).join('');
    }

    modal.classList.add('open');
  }

  formatCompactDuration(totalSeconds) {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  init() {
    this.render();

    // Navigation buttons
    const navJobsBtn = document.getElementById('navJobsBtn');
    if (navJobsBtn) {
      navJobsBtn.addEventListener('click', () => {
        this.toggleView();
      });
    }

    const backBtn = document.getElementById('backToHudFromJobsBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.closeJobs();
      });
    }

    // Worker dropdown change in Jobs header
    const workerSelect = document.getElementById('jobsWorkerSelect');
    if (workerSelect) {
      workerSelect.addEventListener('change', (e) => {
        if (window.laborEngine && window.laborEngine.setCurrentUser) {
          window.laborEngine.setCurrentUser(e.target.value);
        }
        this.render();
      });
    }

    // Tabs
    const workerTab = document.getElementById('tabWorkerViewBtn');
    const managerTab = document.getElementById('tabManagerViewBtn');
    if (workerTab) {
      workerTab.addEventListener('click', () => this.setViewMode('worker'));
    }
    if (managerTab) {
      managerTab.addEventListener('click', () => this.setViewMode('manager'));
    }

    // Create Job Button
    const createJobBtn = document.getElementById('managerCreateJobBtn');
    if (createJobBtn) {
      createJobBtn.addEventListener('click', () => this.openCreateJobModal());
    }

    // Create Job Form
    const createJobForm = document.getElementById('createJobForm');
    if (createJobForm) {
      createJobForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('newJobTitle').value;
        const description = document.getElementById('newJobDesc').value;
        const assignedWorkerId = document.getElementById('newJobWorkerSelect').value;
        const priority = document.getElementById('newJobPriority').value;
        const rawSteps = document.getElementById('newJobStepsText').value;

        const stepsList = rawSteps
          .split('\n')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        this.addJob({ title, description, assignedWorkerId, priority }, stepsList);

        const modal = document.getElementById('jobCreateModal');
        if (modal) modal.classList.remove('open');
      });
    }

    // Edit Job Form
    const editJobForm = document.getElementById('editJobForm');
    if (editJobForm) {
      editJobForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('editJobId').value;
        const title = document.getElementById('editJobTitle').value;
        const description = document.getElementById('editJobDesc').value;
        const assignedWorkerId = document.getElementById('editJobWorkerSelect').value;
        const priority = document.getElementById('editJobPriority').value;

        this.editJob(id, { title, description, assignedWorkerId, priority });

        const modal = document.getElementById('jobEditModal');
        if (modal) modal.classList.remove('open');
      });
    }

    // Modal Close buttons
    document.querySelectorAll('.modal-close-jobs').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#jobCreateModal, #jobEditModal').forEach(m => m.classList.remove('open'));
      });
    });
  }
}

// Global instance
window.jobsEngine = new JobsEngine();
document.addEventListener('DOMContentLoaded', () => {
  window.jobsEngine.init();
});
