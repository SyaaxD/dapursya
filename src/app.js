// =====================================
// CONFIG
// =====================================

const API_URL = "/api/submit";

document.querySelector('#app').innerHTML = `
<div id="loadingBar"></div>
<div class="container">

    <header>
        <h1>Dapur<span>Sya</span></h1>
        <p>Cita Rasa Resep Keluarga</p>
    </header>

    <main class="card">
        <h2>Pilih Menu Besok</h2>

        <div id="tanggal"></div>
        <div id="statusOrder"></div>
        <div id="countdown"></div>

        <div id="emptyState" class="empty-state">
            Belum ada yang memilih menu hari ini 🍱
        </div>

        <div class="form-group">
            <label>Nama Anak & Kelas</label>
            <input id="nama" type="text" placeholder="Contoh : Andi - 3B">
        </div>

        <div class="form-group">
            <label>Pilih Menu</label>
            <div class="menu-grid">
                <div class="menu-card" data-menu="Ayam Teriyaki">
                    <div class="badge" id="badge1"></div>
                    <div class="emoji">🍗</div>
                    <h3>Ayam Teriyaki</h3>
                    <p>Nasi • Sayur • Buah</p>
                    <div class="menu-count">👥 <span id="ayamCount">0</span> orang memilih</div>
                </div>

                <div class="menu-card" data-menu="Ikan Crispy">
                    <div class="badge" id="badge2"></div>
                    <div class="emoji">🐟</div>
                    <h3>Ikan Crispy</h3>
                    <p>Nasi • Sayur • Buah</p>
                    <div class="menu-count">👥 <span id="ikanCount">0</span> orang memilih</div>
                </div>
            </div>
        </div>

        <div class="form-group">
            <label>Catatan</label>
            <textarea id="catatan" placeholder="Opsional..."></textarea>
        </div>

        <button id="kirim">
            <span id="btnText">Kirim Pilihan</span>
        </button>
    </main>

    <div id="toast"></div>

    <div id="successModal" class="modal">
        <div class="modal-content">
            <div class="success-icon">🍱</div>
            <h2>Pesanan Berhasil!</h2>
            <p id="modalText"></p>
            <button id="tutupModal">Tutup</button>
        </div>
    </div>
</div>
`;

// =====================================
// DOM ELEMENTS
// =====================================

const inputNama = document.getElementById("nama");
const inputCatatan = document.getElementById("catatan");
const tombolKirim = document.getElementById("kirim");
const toast = document.getElementById("toast");
const modal = document.getElementById("successModal");
const modalText = document.getElementById("modalText");
const tutupModal = document.getElementById("tutupModal");
const menuCards = document.querySelectorAll(".menu-card");
const ayamCount = document.getElementById("ayamCount");
const ikanCount = document.getElementById("ikanCount");
const loadingBar = document.getElementById("loadingBar");
const menuTitle1 = document.querySelector('.menu-card:nth-child(1) h3');
const menuTitle2 = document.querySelector('.menu-card:nth-child(2) h3');
const countdown = document.getElementById("countdown");
const statusOrder = document.getElementById("statusOrder");
const tanggal = document.getElementById("tanggal");
const badge1 = document.getElementById("badge1");
const badge2 = document.getElementById("badge2");
const btnText = document.getElementById("btnText");
const emptyState = document.getElementById("emptyState");

// =====================================
// STATE
// =====================================

const state = {
  menuTerpilih: "",
  sedangMengirim: false,
  openTime: "",
  closeTime: "20:00", // fallback sebelum /api/config kebaca
};

// =====================================
// VALIDATION
// =====================================

function validateForm() {
  if (inputNama.value.trim() === "") {
    showToast("⚠ Nama anak wajib diisi", "warning");
    inputNama.focus();
    return false;
  }

  if (state.menuTerpilih === "") {
    showToast("⚠ Pilih salah satu menu", "warning");
    return false;
  }

  return true;
}

// =====================================
// EVENTS
// =====================================

tombolKirim.addEventListener("click", handleSubmit);

menuCards.forEach((card) => {
  card.addEventListener("click", () => {
    menuCards.forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    state.menuTerpilih = card.dataset.menu;
  });
});

tutupModal.addEventListener("click", () => {
  modal.classList.remove("show");
  resetForm();
});

// =====================================
// SUBMIT HANDLER
// =====================================

async function handleSubmit() {
  if (tombolKirim.disabled) {
    showToast("⏳ Tunggu sebentar...", "warning");
    return;
  }

  if (state.sedangMengirim) return;

  state.sedangMengirim = true;
  setLoading(true);
  startLoading();

  if (!validateForm()) {
    state.sedangMengirim = false;
    setLoading(false);
    stopLoading();
    return;
  }

  const nama = inputNama.value.trim();
  const catatan = inputCatatan.value.trim();

  const data = {
    nama,
    menu: state.menuTerpilih,
    catatan,
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Gagal mengirim data");
    }

    showSuccessModal(nama, state.menuTerpilih);
    loadStats();
  } catch (error) {
    console.error(error);
    showToast("❌ Terjadi kesalahan", "error");
  } finally {
    state.sedangMengirim = false;
    setLoading(false);
    stopLoading();
    checkOrderingTime(); // re-sync tombol kalau jam tutup lewat pas lagi kirim
  }
}

// =====================================
// STATS (live counter)
// =====================================

async function loadStats() {
  try {
    const response = await fetch("/api/stats");
    const data = await response.json();

    const ayam = data.ayam ?? 0;
    const ikan = data.ikan ?? 0;

    animateNumber(ayamCount, Number(ayamCount.textContent), ayam);
    animateNumber(ikanCount, Number(ikanCount.textContent), ikan);

    emptyState.style.display = ayam + ikan === 0 ? "block" : "none";

    updateBadges(ayam, ikan);
  } catch (error) {
    console.error(error);
  }
}

function updateBadges(ayam, ikan) {
  if (ayam > ikan) {
    badge1.textContent = "🔥 Favorit Hari Ini";
    badge2.textContent = "";
  } else if (ikan > ayam) {
    badge2.textContent = "🔥 Favorit Hari Ini";
    badge1.textContent = "";
  } else {
    badge1.textContent = "⚖ Sama Populer";
    badge2.textContent = "⚖ Sama Populer";
  }
}

// =====================================
// CONFIG (menu & jam buka/tutup dari Sheet)
// =====================================

async function loadConfig() {
  try {
    const response = await fetch("/api/config");
    const data = await response.json();

    menuTitle1.textContent = data.config["Menu 1"];
    menuTitle2.textContent = data.config["Menu 2"];

    state.openTime = data.config["Open Time"];
    state.closeTime = data.config["Close Time"] || state.closeTime;

    menuCards[0].dataset.menu = data.config["Menu 1"];
    menuCards[1].dataset.menu = data.config["Menu 2"];

    checkOrderingTime();
  } catch (error) {
    console.error(error);
  }
}

// =====================================
// ANIMATION HELPER
// =====================================

function animateNumber(element, start, end) {
  if (start === end) return;

  const duration = 500;
  const startTime = performance.now();

  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const value = Math.floor(start + (end - start) * progress);
    element.textContent = value;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// =====================================
// DATE & COUNTDOWN
// =====================================

function updateTanggal() {
  const besok = new Date();
  besok.setDate(besok.getDate() + 1);

  tanggal.textContent = besok.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function updateCountdown() {
  const [jam, menit] = state.closeTime.split(":").map(Number);

  const sekarang = new Date();
  const tutup = new Date();
  tutup.setHours(jam, menit, 0, 0);

  const selisih = tutup - sekarang;

  if (selisih <= 0) {
    countdown.textContent = "🔴 Pemesanan sudah ditutup";
    return;
  }

  const h = Math.floor(selisih / 1000 / 60 / 60);
  const m = Math.floor((selisih / 1000 / 60) % 60);
  const s = Math.floor((selisih / 1000) % 60);

  countdown.textContent = `⏰ Ditutup dalam ${h}j ${m}m ${s}d`;
}

function checkOrderingTime() {
  if (!state.openTime || !state.closeTime) return;

  const sekarang = new Date();
  const sekarangMenit = sekarang.getHours() * 60 + sekarang.getMinutes();

  const [openJam, openMenit] = state.openTime.split(":").map(Number);
  const [closeJam, closeMenit] = state.closeTime.split(":").map(Number);

  const openTotal = openJam * 60 + openMenit;
  const closeTotal = closeJam * 60 + closeMenit;

  if (sekarangMenit < openTotal) {
    statusOrder.textContent = `⏳ Dibuka pukul ${state.openTime}`;
    tombolKirim.disabled = true;
    btnText.textContent = "Belum Dibuka";
  } else if (sekarangMenit >= closeTotal) {
    statusOrder.textContent = "🔴 Pemesanan Ditutup";
    tombolKirim.disabled = true;
    btnText.textContent = "Pemesanan Ditutup";
  } else {
    statusOrder.textContent = "🟢 Pemesanan Dibuka";
    tombolKirim.disabled = false;
    btnText.textContent = "Kirim Pilihan";
  }
}

// =====================================
// HELPERS
// =====================================

function showToast(pesan, tipe) {
  toast.textContent = pesan;
  toast.className = "";

  if (tipe === "success") toast.style.background = "#16a34a";
  if (tipe === "warning") toast.style.background = "#f59e0b";
  if (tipe === "error") toast.style.background = "#dc2626";

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function showSuccessModal(nama, menu) {
  modalText.replaceChildren();

  const namaEl = document.createElement("strong");
  namaEl.textContent = nama;

  const menuEl = document.createElement("b");
  menuEl.textContent = menu;

  modalText.append(
    namaEl,
    document.createElement("br"),
    document.createElement("br"),
    "Menu yang dipilih:",
    document.createElement("br"),
    menuEl
  );

  modal.classList.add("show");
}

function resetForm() {
  inputNama.value = "";
  inputCatatan.value = "";
  state.menuTerpilih = "";

  menuCards.forEach((card) => card.classList.remove("selected"));

  inputNama.focus();
}

function setLoading(isLoading) {
  tombolKirim.disabled = isLoading;

  btnText.innerHTML = isLoading
    ? `<span class="spinner"></span> Mengirim...`
    : "Kirim Pilihan";
}

function startLoading() {
  loadingBar.style.opacity = "1";
  loadingBar.style.width = "15%";

  setTimeout(() => (loadingBar.style.width = "55%"), 150);
  setTimeout(() => (loadingBar.style.width = "80%"), 500);
}

function stopLoading() {
  loadingBar.style.width = "100%";

  setTimeout(() => (loadingBar.style.opacity = "0"), 200);
  setTimeout(() => (loadingBar.style.width = "0%"), 500);
}

// =====================================
// INIT
// =====================================

updateTanggal();
updateCountdown();

loadStats();
loadConfig();

setInterval(loadStats, 5000);
setInterval(updateCountdown, 1000);
setInterval(loadConfig, 10000);