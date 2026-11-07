/* Join Alumni form: posts to a form service when one is configured in
   src/_data/site.json (forms.alumniEndpoint), otherwise opens a pre-filled email. */
(function () {
  "use strict";
  const form = document.querySelector("[data-alumni-form]");
  if (!form) return;
  const endpoint = form.dataset.endpoint;
  const email = form.dataset.email;
  const status = form.querySelector("[data-form-status]");
  const error = form.querySelector("[data-form-error]");
  const labels = {
    first_name: "First name", last_name: "Last name", email: "Email", phone: "Phone",
    name_of_co: "Name of CO", years_as_cadet: "Years with squadron as a cadet", years_as_staff: "Years with squadron as staff",
  };

  function validate() {
    const bad = [];
    ["first_name", "last_name", "email"].forEach((n) => {
      const el = form.elements[n];
      const ok = el.value.trim() && (n !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
      el.setAttribute("aria-invalid", String(!ok));
      if (!ok) bad.push(el);
    });
    if (bad.length) {
      error.textContent = "Please enter your first name, last name and a valid email address.";
      error.hidden = false;
      bad[0].focus();
      return false;
    }
    error.hidden = true;
    return true;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (form.elements._gotcha.value) return; // spam bot
    const data = Object.fromEntries(new FormData(form));
    delete data._gotcha;

    if (!endpoint) {
      const body = Object.entries(labels).map(([k, l]) => `${l}: ${(data[k] || "").trim()}`).join("\n");
      location.href = `mailto:${email}?subject=${encodeURIComponent("Join the 395 Alumni Association – " + data.first_name + " " + data.last_name)}&body=${encodeURIComponent("Please add me to the 395 Squadron Alumni Association.\n\n" + body)}`;
      status.className = "form-status is-success";
      status.textContent = "Your email app should open with your details – just press send. If nothing happens, email " + email + ".";
      status.hidden = false;
      return;
    }

    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) });
      if (!res.ok) throw new Error(res.statusText);
      form.reset();
      status.className = "form-status is-success";
      status.textContent = "Thank you! Your details have been sent to the Alumni Association.";
    } catch (err) {
      status.className = "form-status is-error";
      status.textContent = "Sorry – the form couldn’t be sent. Please try again later or email " + email + ".";
    } finally {
      status.hidden = false;
      btn.disabled = false;
    }
  });
})();
