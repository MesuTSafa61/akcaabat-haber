(function () {
  "use strict";
  function attach(container, save) {
    let active = null;
    container.addEventListener("pointerdown", event => {
      const handle = event.target.closest("[data-sort-handle]");
      if (!handle || !container.contains(handle) || (event.pointerType === "mouse" && event.button !== 0)) return;
      const row = handle.closest("[data-sort-id]");
      if (!row) return;
      active = { row, handle, startY: event.clientY, moved: false };
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    container.addEventListener("pointermove", event => {
      if (!active) return;
      if (Math.abs(event.clientY - active.startY) > 7) {
        active.moved = true;
        active.row.classList.add("is-dragging");
      }
      container.querySelectorAll(".sort-over").forEach(row => row.classList.remove("sort-over"));
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-sort-id]");
      if (target && container.contains(target) && target !== active.row) target.classList.add("sort-over");
    });
    container.addEventListener("pointerup", event => {
      if (!active) return;
      const { row, moved } = active;
      active = null;
      row.classList.remove("is-dragging");
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-sort-id]");
      container.querySelectorAll(".sort-over").forEach(item => item.classList.remove("sort-over"));
      if (!moved || !target || !container.contains(target) || target === row) return;
      const rows = [...container.querySelectorAll("[data-sort-id]")];
      if (rows.indexOf(row) < rows.indexOf(target)) target.after(row);
      else target.before(row);
      save([...container.querySelectorAll("[data-sort-id]")].map(item => item.dataset.sortId));
    });
    container.addEventListener("pointercancel", () => {
      if (active) active.row.classList.remove("is-dragging");
      active = null;
      container.querySelectorAll(".sort-over").forEach(row => row.classList.remove("sort-over"));
    });
  }
  window.EditorialSortable = { attach };
})();
