// Small JS helpers — edit or replace as needed
document.addEventListener('DOMContentLoaded', () => {
  // fill current year
  const year = new Date().getFullYear();
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = year;

  // simple theme toggle (light/dark)
  const btn = document.getElementById('themeToggle');
  if (btn){
    btn.addEventListener('click', ()=>{
      document.documentElement.classList.toggle('dark');
      // Tailwind's CDN supports a 'dark' class strategy when configured locally.
      // Here we simply toggle a class to let you add dark styles in the HTML.
      alert('Toggled document .dark class (you can add dark classes to elements).');
    });
  }
});