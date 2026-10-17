/* =============================================
   Password Strength Checker – Application Logic
   ============================================= */

(function () {
    'use strict';

    // ── DOM references ──────────────────────────
    const passwordInput    = document.getElementById('passwordInput');
    const toggleBtn        = document.getElementById('toggleVisibility');
    const eyeIcon          = document.getElementById('eyeIcon');
    const eyeOffIcon       = document.getElementById('eyeOffIcon');
    const checkBtn         = document.getElementById('checkBtn');
    const resultsSection   = document.getElementById('resultsSection');
    const scoreArc         = document.getElementById('scoreArc');
    const scoreNumber      = document.getElementById('scoreNumber');
    const strengthLabel    = document.getElementById('strengthLabel');
    const criteriaList     = document.getElementById('criteriaList');
    const shieldIcon       = document.querySelector('.shield-icon');

    // Full circumference of the SVG circle (r = 52)
    const CIRCUMFERENCE = 2 * Math.PI * 52; // ≈ 326.73

    // ── Criteria definitions ────────────────────
    // Each criterion has a test function and two messages:
    //   pass  → shown when the rule is satisfied
    //   fail  → shown as a suggestion when the rule is NOT satisfied
    const CRITERIA = [
        {
            id: 'length',
            test: (pw) => pw.length >= 8,
            pass: 'Password is at least 8 characters long',
            fail: 'Password should be at least 8 characters long',
        },
        {
            id: 'uppercase',
            test: (pw) => /[A-Z]/.test(pw),
            pass: 'Contains at least one uppercase letter',
            fail: 'Add at least one uppercase letter (A–Z)',
        },
        {
            id: 'lowercase',
            test: (pw) => /[a-z]/.test(pw),
            pass: 'Contains at least one lowercase letter',
            fail: 'Add at least one lowercase letter (a–z)',
        },
        {
            id: 'number',
            test: (pw) => /[0-9]/.test(pw),
            pass: 'Contains at least one number',
            fail: 'Add at least one number (0–9)',
        },
        {
            id: 'special',
            test: (pw) => /[^A-Za-z0-9\s]/.test(pw),
            pass: 'Contains at least one special character',
            fail: 'Add at least one special character (!@#$%…)',
        },
        {
            id: 'no-spaces',
            test: (pw) => !/\s/.test(pw),
            pass: 'Password does not contain spaces',
            fail: 'Remove spaces from your password',
        },
        {
            id: 'no-repeat',
            test: (pw) => !/(.)\1{2,}/.test(pw),
            pass: 'No character repeats more than twice in a row',
            fail: 'Avoid repeating the same character 3+ times in a row',
        },
        {
            id: 'long',
            test: (pw) => pw.length >= 12,
            pass: 'Password is 12 or more characters (great length!)',
            fail: 'Consider making it 12+ characters for extra security',
        },
        {
            id: 'no-common',
            test: (pw) => {
                const common = [
                    'password', '12345678', 'qwerty', 'abc123',
                    'letmein', 'welcome', 'monkey', 'dragon',
                    'master', 'login', '123456789', '1234567890',
                    'admin', 'iloveyou', 'sunshine', 'princess',
                    'football', 'charlie', 'shadow', 'michael',
                ];
                return !common.includes(pw.toLowerCase());
            },
            pass: 'Password is not a commonly used password',
            fail: 'This is a very common password — pick something unique',
        },
        {
            id: 'no-sequential',
            test: (pw) => {
                // Check for 4+ sequential ascending/descending chars
                for (let i = 0; i <= pw.length - 4; i++) {
                    const a = pw.charCodeAt(i);
                    const b = pw.charCodeAt(i + 1);
                    const c = pw.charCodeAt(i + 2);
                    const d = pw.charCodeAt(i + 3);
                    if (b - a === 1 && c - b === 1 && d - c === 1) return false;
                    if (a - b === 1 && b - c === 1 && c - d === 1) return false;
                }
                return true;
            },
            pass: 'No long sequential character patterns found',
            fail: 'Avoid sequential patterns like "abcd" or "1234"',
        },
    ];

    // ── Strength labels mapped to score ─────────
    function getStrengthMeta(score) {
        if (score <= 2)  return { label: 'Very Weak',  color: 'var(--strength-1)' };
        if (score <= 4)  return { label: 'Weak',       color: 'var(--strength-3)' };
        if (score <= 6)  return { label: 'Fair',       color: 'var(--strength-5)' };
        if (score <= 8)  return { label: 'Strong',     color: 'var(--strength-8)' };
        return                   { label: 'Very Strong', color: 'var(--strength-10)' };
    }

    // ── Evaluate password ───────────────────────
    function evaluate(password) {
        const results = CRITERIA.map((c) => ({
            ...c,
            passed: c.test(password),
        }));

        const score = results.filter((r) => r.passed).length;
        return { results, score };
    }

    // ── Render results ──────────────────────────
    function render({ results, score }) {
        const meta = getStrengthMeta(score);

        // Show results section
        resultsSection.classList.remove('hidden');
        // Re-trigger animation
        resultsSection.style.animation = 'none';
        void resultsSection.offsetHeight; // force reflow
        resultsSection.style.animation = '';

        // Update score ring
        const offset = CIRCUMFERENCE - (score / CRITERIA.length) * CIRCUMFERENCE;
        scoreArc.style.strokeDashoffset = offset;
        scoreArc.style.stroke = meta.color;

        // Update score number with counting animation
        animateNumber(scoreNumber, score);
        scoreNumber.style.color = meta.color;

        // Strength label
        strengthLabel.textContent = meta.label;
        strengthLabel.style.color = meta.color;

        // Shield icon check-mark
        if (score >= 7) {
            shieldIcon.classList.add('active');
        } else {
            shieldIcon.classList.remove('active');
        }

        // Build criteria list — show failed items first (suggestions)
        criteriaList.innerHTML = '';

        // Sort: fails first, then passes
        const sorted = [...results].sort((a, b) => a.passed - b.passed);

        sorted.forEach((r) => {
            const li = document.createElement('li');
            li.className = `criteria-item ${r.passed ? 'pass' : 'fail'}`;

            const icon = document.createElement('span');
            icon.className = 'criteria-icon';
            icon.textContent = r.passed ? '✓' : '✕';

            const text = document.createElement('span');
            text.className = 'criteria-text';
            text.textContent = r.passed ? r.pass : r.fail;

            li.appendChild(icon);
            li.appendChild(text);
            criteriaList.appendChild(li);
        });
    }

    // ── Number counting animation ───────────────
    function animateNumber(el, target) {
        const duration = 700;
        const start = parseInt(el.textContent, 10) || 0;
        const startTime = performance.now();

        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out quad
            const eased = 1 - (1 - progress) * (1 - progress);
            el.textContent = Math.round(start + (target - start) * eased);
            if (progress < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }

    // ── Event listeners ─────────────────────────

    // Toggle password visibility
    toggleBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        eyeIcon.classList.toggle('hidden', !isPassword);
        eyeOffIcon.classList.toggle('hidden', isPassword);
    });

    // Check button click
    checkBtn.addEventListener('click', () => {
        const pw = passwordInput.value;
        if (!pw) {
            passwordInput.focus();
            passwordInput.style.borderColor = 'var(--clr-fail)';
            setTimeout(() => (passwordInput.style.borderColor = ''), 1200);
            return;
        }
        render(evaluate(pw));
    });

    // Allow Enter key to trigger check
    passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            checkBtn.click();
        }
    });
})();
