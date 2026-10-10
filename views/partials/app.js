const header = document.querySelector(".site-header");
addEventListener("scroll", () => header.classList.toggle("scrolled", scrollY > 8), { passive: true });

// Live search: hide books that don't match the title or author
const filter = document.getElementById("filter");
if (filter) {
  const entries = [...document.querySelectorAll(".entry")];
  const none = document.getElementById("nomatch");
  filter.addEventListener("input", () => {
    const q = filter.value.trim().toLowerCase();
    let shown = 0;
    entries.forEach((el) => {
      const match = el.dataset.search.includes(q);
      el.hidden = !match;
      if (match) shown++;
    });
    if (none) none.hidden = shown > 0;
  });
}

// "Read more" appears only on notes that are actually cut off
document.querySelectorAll(".notes").forEach((notes) => {
  if (notes.scrollHeight <= notes.clientHeight + 1) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "more";
  btn.textContent = "Read more";
  btn.addEventListener("click", () => {
    const open = notes.classList.toggle("open");
    btn.textContent = open ? "Show less" : "Read more";
  });
  notes.after(btn);
});

