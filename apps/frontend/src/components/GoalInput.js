/**
 * MELO Goal Input Component
 * 
 * Full-screen input for the user to enter their high-level goal.
 * Features: electric border glow on focus, pulsing START button.
 */

/**
 * @param {HTMLElement} container
 * @param {Function} onSubmit - Called with the goal string
 */
export function renderGoalInput(container, onSubmit) {
  const el = document.createElement('main');
  el.className = 'goal-screen';
  el.id = 'goal-screen';
  el.innerHTML = `
    <div class="goal-screen__hero">
      <h1 class="goal-screen__title">What do you want MELO to do?</h1>
      <p class="goal-screen__desc">
        Describe your goal in plain language. MELO will plan, execute, evaluate, and iterate until the task is complete.
      </p>
    </div>
    <form class="goal-input" id="goal-form">
      <div class="goal-input__field-wrap">
        <textarea
          id="goal-textarea"
          class="goal-input__textarea"
          placeholder="e.g. Find the best laptop under ₹80,000 for a computer science student"
          rows="3"
          autofocus
        ></textarea>
        <div class="goal-input__footer">
          <span class="goal-input__hint">Press Ctrl+Enter or click START</span>
          <button type="submit" class="goal-input__submit" id="goal-submit">
            START
          </button>
        </div>
      </div>
    </form>
  `;

  container.appendChild(el);

  const form = el.querySelector('#goal-form');
  const textarea = el.querySelector('#goal-textarea');
  const submitBtn = el.querySelector('#goal-submit');

  // Submit handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const goal = textarea.value.trim();
    if (!goal) return;
    submitBtn.disabled = true;
    textarea.disabled = true;
    onSubmit(goal);
  });

  // Ctrl+Enter shortcut
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });

  return el;
}
