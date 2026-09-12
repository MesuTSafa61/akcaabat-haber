const menuButton = document.querySelector(".menu-button");
const navigation = document.querySelector(".navigation");
const searchInput = document.querySelector(".search input");
const searchButton = document.querySelector(".search button");

if (menuButton) {
  menuButton.addEventListener("click", () => {
    navigation.classList.toggle("mobile-open");
  });
}

if (searchButton && searchInput) {
  searchButton.addEventListener("click", () => {
    const query = searchInput.value.trim();

    if (!query) {
      searchInput.focus();
      return;
    }

    alert(`"${query}" için arama yapılacak.`);
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      searchButton.click();
    }
  });
}

document.querySelectorAll(".nav-inner a").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-inner a").forEach((item) => {
      item.classList.remove("active");
    });

    link.classList.add("active");
  });
});

document.querySelectorAll("a[href='#']").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
  });
});

const updateTime = () => {
  const timeElement = document.querySelector(".breaking-time");

  if (!timeElement) return;

  const now = new Date();

  timeElement.textContent = now.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit"
  });
};

updateTime();
setInterval(updateTime, 60000);