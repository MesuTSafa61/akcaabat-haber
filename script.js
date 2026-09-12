const menuButton=document.querySelector(".menu-button");
const navigation=document.querySelector(".navigation");
const searchInput=document.querySelector(".search input");
const searchButton=document.querySelector(".search button");

if(menuButton){
  menuButton.addEventListener("click",()=>{
    navigation.classList.toggle("mobile-open");
  });
}

if(searchButton&&searchInput){
  searchButton.addEventListener("click",()=>{
    const query=searchInput.value.trim();
    if(!query){
      searchInput.focus();
      return;
    }
    alert(`"${query}" için arama yapılacak.`);
  });

  searchInput.addEventListener("keydown",event=>{
    if(event.key==="Enter") searchButton.click();
  });
}

document.querySelectorAll(".nav-inner a").forEach(link=>{
  link.addEventListener("click",()=>{
    document.querySelectorAll(".nav-inner a").forEach(item=>{
      item.classList.remove("active");
    });
    link.classList.add("active");
  });
});

document.querySelectorAll("a[href='#']").forEach(link=>{
  link.addEventListener("click",event=>{
    event.preventDefault();
  });
});

const timeElement=document.querySelector(".breaking-time");

const updateTime=()=>{
  if(!timeElement) return;

  const now=new Date();

  timeElement.textContent=now.toLocaleTimeString("tr-TR",{
    hour:"2-digit",
    minute:"2-digit"
  });
};

updateTime();
setInterval(updateTime,60000);

const showPassword=document.querySelector("#showPassword");
const passwordInput=document.querySelector("#adminPassword");

if(showPassword&&passwordInput){
  showPassword.addEventListener("click",()=>{
    const hidden=passwordInput.type==="password";

    passwordInput.type=hidden?"text":"password";
    showPassword.textContent=hidden?"Gizle":"Göster";
  });
}

const loginForm=document.querySelector("#adminLoginForm");
const loginMessage=document.querySelector("#loginMessage");

if(loginForm&&loginMessage){
  loginForm.addEventListener("submit",event=>{
    event.preventDefault();

    const email=document.querySelector("#adminEmail").value.trim();
    const password=document.querySelector("#adminPassword").value;

    if(!email||!password){
      loginMessage.textContent="Lütfen e-posta ve şifrenizi girin.";
      loginMessage.style.display="block";
      return;
    }

    loginMessage.textContent=
      "Giriş sistemi henüz sunucuya bağlanmadı.";
    loginMessage.style.display="block";
  });
}