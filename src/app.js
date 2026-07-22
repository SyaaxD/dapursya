// =====================================
// CONFIG
// =====================================

const API_URL = "/api/submit";
const WA_NUMBER = "6281389490706";
const WA_MESSAGE = encodeURIComponent("Halo, saya mau tanya soal DapurSya");

document.querySelector('#app').innerHTML = `
<div id="loadingBar"></div>
<a
  id="waFloat"
  class="wa-float"
  href="https://wa.me/${WA_NUMBER}?text=${WA_MESSAGE}"
  target="_blank"
  rel="noopener"
>💬 Chat Admin</a>
<div class="container">

    <header>
        <h1>Dapur<span>Sya</span></h1>
        <p>Cita Rasa Resep Keluarga</p>
    </header>

    <main class="card">
        <h2>Pilih Menu Besok</h2>

        <div id="tanggal"></div>
        <div id="statusOrder"></div>

        <div id="emptyState" class="empty-state">
            Belum ada yang memilih menu hari ini 🍱
        </div>

        <div class="global-stats">
            <div class="menu-card static">
                <div class="badge" id="badge1"></div>
                <div class="emoji">🍗</div>
                <h3 id="menuTitle1">Ayam Teriyaki</h3>
                <div class="menu-count">👥 <span id="ayamCount">0</span> orang memilih</div>
            </div>
            <div class="menu-card static">
                <div class="badge" id="badge2"></div>
                <div class="emoji">🐟</div>
                <h3 id="menuTitle2">Ikan Crispy</h3>
                <div class="menu-count">👥 <span id="ikanCount">0</span> orang memilih</div>
            </div>
        </div>

        <div id="anakContainer"></div>

        <button type="button" id="tambahAnak" class="tambah-anak-btn">+ Tambah Anak</button>

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
            <a id="waConfirmBtn" class="wa-modal-btn" target="_blank" rel="noopener">📩 Simpan Bukti ke WA</a>
            <button id="tutupModal">Tutup</button>
        </div>
    </div>

    <div id="closedModal" class="modal">
        <div class="modal-content">
            <div class="success-icon">🕒</div>
            <h2>Belum Bisa Pesan</h2>
            <p id="closedModalText"></p>
            <a
              class="wa-modal-btn"
              href="https://wa.me/${WA_NUMBER}?text=${WA_MESSAGE}"
              target="_blank"
              rel="noopener"
            >💬 Chat Admin</a>
        </div>
    </div>
</div>
`;

// =====================================
// DOM ELEMENTS
// =====================================

const tombolKirim = document.getElementById("kirim");
const toast = document.getElementById("toast");
const modal = document.getElementById("successModal");
const modalText = document.getElementById("modalText");
const waConfirmBtn = document.getElementById("waConfirmBtn");
const tutupModal = document.getElementById("tutupModal");
const loadingBar = document.getElementById("loadingBar");
const ayamCount = document.getElementById("ayamCount");
const ikanCount = document.getElementById("ikanCount");
const menuTitle1 = document.getElementById("menuTitle1");
const menuTitle2 = document.getElementById("menuTitle2");
const statusOrder = document.getElementById("statusOrder");
const tanggal = document.getElementById("tanggal");
const badge1 = document.getElementById("badge1");
const badge2 = document.getElementById("badge2");
const btnText = document.getElementById("btnText");
const emptyState = document.getElementById("emptyState");
const anakContainer = document.getElementById("anakContainer");
const tambahAnak = document.getElementById("tambahAnak");
const closedModal = document.getElementById("closedModal");
const closedModalText = document.getElementById("closedModalText");

// =====================================
// STATE
// =====================================

const state = {
  anakList: [{ nama: "", menu: "", catatan: "", addons: [] }],
  menuNames: ["Ayam Teriyaki", "Ikan Crispy"],
  addonsMaster: [],
  sedangMengirim: false,
  openTime: "",
  closeTime: "20:00", // fallback sebelum /api/config kebaca
};

// =====================================
// RENDER ANAK BLOCKS
// =====================================

function renderAnakBlock(anak, i) {
  const addonsHtml = state.addonsMaster.length
    ? `
      <div class="form-group">
        <button type="button" class="addons-toggle anak-addons-toggle" data-index="${i}">
          + Tambah Add-ons <span class="addons-toggle-icon">▾</span>
        </button>
        <div class="addons-panel anak-addons-panel" data-index="${i}">
          ${state.addonsMaster
            .map(
              (addon, j) => `
            <label class="addons-item">
              <span class="addons-item-left">
                <input type="checkbox" class="addons-checkbox anak-addons-checkbox" data-index="${i}" data-addon="${j}" ${
                anak.addons.includes(addon.nama) ? "checked" : ""
              }>
                ${addon.nama}
              </span>
              <span class="addons-item-price">Rp${addon.harga.toLocaleString("id-ID")}</span>
            </label>
          `
            )
            .join("")}
        </div>
      </div>
    `
    : "";

  return `
    <div class="anak-block">
      <div class="anak-block-header">
        <span class="anak-block-title">Anak ${i + 1}</span>
        ${
          state.anakList.length > 1
            ? `<button type="button" class="hapus-anak-btn" data-index="${i}">✕ Hapus</button>`
            : ""
        }
      </div>

      <div class="form-group">
        <label for="anakNama${i}">Nama Anak & Kelas</label>
        <input id="anakNama${i}" class="anak-nama-input" data-index="${i}" type="text" placeholder="Contoh : Andi - 3B" autocomplete="off" value="${anak.nama}">
      </div>

      <div class="form-group">
        <label>Pilih Menu</label>
        <div class="menu-grid anak-menu-grid" data-index="${i}">
          <div class="menu-card ${anak.menu === state.menuNames[0] ? "selected" : ""}" data-menu="${state.menuNames[0]}" data-index="${i}">
            <div class="emoji">🍗</div>
            <h3>${state.menuNames[0]}</h3>
          </div>
          <div class="menu-card ${anak.menu === state.menuNames[1] ? "selected" : ""}" data-menu="${state.menuNames[1]}" data-index="${i}">
            <div class="emoji">🐟</div>
            <h3>${state.menuNames[1]}</h3>
          </div>
        </div>
      </div>

      ${addonsHtml}

      <div class="form-group">
        <label for="anakCatatan${i}">Catatan</label>
        <textarea id="anakCatatan${i}" class="anak-catatan-input" data-index="${i}" placeholder="Opsional...">${anak.catatan}</textarea>
      </div>
    </div>
  `;
}

function renderAnakList() {
  anakContainer.innerHTML = state.anakList
    .map((anak, i) => renderAnakBlock(anak, i))
    .join("");

  attachAnakListeners();
}

function attachAnakListeners() {
  anakContainer.querySelectorAll(".anak-nama-input").forEach((input) => {
    input.addEventListener("input", () => {
      state.anakList[Number(input.dataset.index)].nama = input.value;
    });
  });

  anakContainer.querySelectorAll(".anak-catatan-input").forEach((textarea) => {
    textarea.addEventListener("input", () => {
      state.anakList[Number(textarea.dataset.index)].catatan = textarea.value;
    });
  });

  anakContainer.querySelectorAll(".anak-menu-grid .menu-card").forEach((card) => {
    card.addEventListener("click", () => {
      const i = Number(card.dataset.index);
      state.anakList[i].menu = card.dataset.menu;

      anakContainer
        .querySelectorAll(`.anak-menu-grid[data-index="${i}"] .menu-card`)
        .forEach((c) => c.classList.remove("selected"));

      card.classList.add("selected");
    });
  });

  anakContainer.querySelectorAll(".anak-addons-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = btn.dataset.index;
      const panel = anakContainer.querySelector(`.anak-addons-panel[data-index="${i}"]`);
      const icon = btn.querySelector(".addons-toggle-icon");
      const isOpen = panel.classList.toggle("open");
      icon.textContent = isOpen ? "▴" : "▾";
    });
  });

  anakContainer.querySelectorAll(".anak-addons-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const i = Number(checkbox.dataset.index);
      const addon = state.addonsMaster[Number(checkbox.dataset.addon)];

      if (checkbox.checked) {
        state.anakList[i].addons.push(addon.nama);
      } else {
        state.anakList[i].addons = state.anakList[i].addons.filter(
          (nama) => nama !== addon.nama
        );
      }
    });
  });

  anakContainer.querySelectorAll(".hapus-anak-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.anakList.splice(Number(btn.dataset.index), 1);
      renderAnakList();
    });
  });
}

tambahAnak.addEventListener("click", () => {
  if (state.anakList.length >= 10) {
    showToast("⚠ Maksimal 10 anak per pengiriman", "warning");
    return;
  }

  state.anakList.push({ nama: "", menu: "", catatan: "", addons: [] });
  renderAnakList();
});

renderAnakList();

// =====================================
// VALIDATION
// =====================================

function validateForm() {
  for (let i = 0; i < state.anakList.length; i++) {
    const anak = state.anakList[i];

    if (anak.nama.trim() === "") {
      showToast(`⚠ Nama anak ke-${i + 1} wajib diisi`, "warning");
      return false;
    }

    if (anak.menu === "") {
      showToast(`⚠ Pilih menu buat anak ke-${i + 1}`, "warning");
      return false;
    }
  }

  return true;
}

// =====================================
// EVENTS
// =====================================

tombolKirim.addEventListener("click", handleSubmit);

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

  const orders = state.anakList.map((anak) => ({
    nama: anak.nama.trim(),
    menu: anak.menu,
    catatan: anak.catatan.trim(),
    addons: anak.addons,
  }));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const result = await response.json();

    if (!result.success) {
      showToast(`⚠ ${result.message}`, "warning");
      return;
    }

    showSuccessModal(result.orders || orders);
    loadStats();
  } catch (error) {
    console.error(error);

    if (error.name === "AbortError") {
      showToast("❌ Koneksi lambat, coba lagi ya", "error");
    } else {
      showToast("❌ Gagal terhubung ke server, coba lagi", "error");
    }
  } finally {
    state.sedangMengirim = false;
    setLoading(false);
    stopLoading();
    checkOrderingTime();
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
// CONFIG (menu, jam buka/tutup, add-ons)
// =====================================

async function loadConfig() {
  try {
    const response = await fetch("/api/config");
    const data = await response.json();

    menuTitle1.textContent = data.config["Menu 1"];
    menuTitle2.textContent = data.config["Menu 2"];

    state.menuNames = [data.config["Menu 1"], data.config["Menu 2"]];
    state.openTime = data.config["Open Time"];
    state.closeTime = data.config["Close Time"] || state.closeTime;
    state.addonsMaster = data.addons || [];

    renderAnakList();
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
// DATE & ORDER WINDOW
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

function showClosedModal(pesan) {
  closedModalText.textContent = pesan;
  closedModal.classList.add("show");
}

function hideClosedModal() {
  closedModal.classList.remove("show");
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
    showClosedModal(
      "Pemesanan hari ini belum dibuka. Tapi jangan khawatir, kalau ada pertanyaan bisa langsung chat kami lewat WhatsApp di bawah ini 👇"
    );
  } else if (sekarangMenit >= closeTotal) {
    statusOrder.textContent = "🔴 Pemesanan Ditutup";
    tombolKirim.disabled = true;
    btnText.textContent = "Pemesanan Ditutup";
    showClosedModal(
      "Yah, waktu pemesanan hari ini udah lewat. Tapi jangan khawatir, kalau ada kendala atau mau tanya, langsung aja chat kami lewat WhatsApp di bawah ini 👇"
    );
  } else {
    statusOrder.textContent = `🟢 Pemesanan Dibuka — tutup pukul ${state.closeTime}`;
    tombolKirim.disabled = false;
    btnText.textContent = "Kirim Pilihan";
    hideClosedModal();
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

function showSuccessModal(orders) {
  modalText.replaceChildren();

  orders.forEach((order, i) => {
    if (i > 0) {
      modalText.append(document.createElement("br"), document.createElement("br"));
    }

    const namaEl = document.createElement("strong");
    namaEl.textContent = order.nama;

    const menuEl = document.createElement("b");
    menuEl.textContent = order.menu;

    modalText.append(namaEl, document.createElement("br"), "Menu: ", menuEl);
  });

  const confirmText = orders.map((o) => `${o.nama} - ${o.menu}`).join("\n");

  waConfirmBtn.href = `https://wa.me/?text=${encodeURIComponent(
    `✅ Pesanan DapurSya sudah masuk!\n${confirmText}`
  )}`;

  modal.classList.add("show");
}

function resetForm() {
  state.anakList = [{ nama: "", menu: "", catatan: "", addons: [] }];
  renderAnakList();
}

function setLoading(isLoading) {
  tombolKirim.disabled = isLoading;

  btnText.innerHTML = isLoading
    ? `<span class="spinner"></span> Mengirim...`
    : "Kirim Pilihan";
}

function startLoading() {
  loadingBar.style.opacity = "1";
  loadingBar.style.width = "25%";

  setTimeout(() => (loadingBar.style.width = "65%"), 80);
  setTimeout(() => (loadingBar.style.width = "85%"), 250);
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

loadStats();
loadConfig();

setInterval(loadStats, 5000);
setInterval(loadConfig, 10000);
setInterval(checkOrderingTime, 1000);