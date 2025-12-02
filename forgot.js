document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('forgotForm');
    const emailInput = document.getElementById('email');
    
    // View Elements
    const formView = document.getElementById('reset-form-view');
    const successView = document.getElementById('success-view');
    const emailDisplay = document.getElementById('user-email-display');

    form.addEventListener('submit', function(event) {
        event.preventDefault();

        const email = emailInput.value.trim();
        const requiredDomain = '@hakaauto.co.id';

        if (!email.endsWith(requiredDomain)) {
            alert(`Email tidak valid!\nHarap gunakan email dengan domain: ${requiredDomain}`);
            emailInput.style.borderColor = 'red';
            emailInput.focus();
            return;
        }

        const btn = form.querySelector('button');
        const originalText = btn.innerText;
        
        btn.innerText = 'Mengirim...';
        btn.style.opacity = '0.7';
        btn.disabled = true;
        emailInput.style.borderColor = '#E2E8F0';

        setTimeout(() => {
            formView.style.display = 'none';
            successView.style.display = 'block';
            
            emailDisplay.innerText = email;
            
        }, 1500);
    });

    emailInput.addEventListener('input', function() {
        this.style.borderColor = '#E2E8F0';
    });
});