// =====================================
// CONFIG
// =====================================

const API_URL = "/api/submit";
const WA_NUMBER = "6281389490706";
const WA_MESSAGE = encodeURIComponent("Halo, saya mau tanya soal DapurSya");
const MAX_ANAK = 10;
const MENU_EMOJIS = ["🍱", "🍗", "🍛", "🍝", "🥘", "🍲", "🍚", "🍽️"];

document.querySelector("#app").innerHTML = `
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

      <div id="globalStats" class="global-stats"></div>

      <section class="order-form-section">
        <div class="form-section-heading">
          <h3>Nama Anak</h3>
          <p>Masukkan nama dan kelas setiap anak.</p>
        </div>

        <div id="namaAnakContainer"></div>

        <button type="button" id="tambahAnak" class="tambah-anak-btn">
          + Tambah Anak
        </button>
      </section>

      <section class="order-form-section">
        <div class="form-group">
          <label>Pilih Menu untuk Semua Anak</label>
          <p class="form-helper">Menu yang dipilih berlaku untuk semua nama di atas.</p>
          <div id="menuPilihan" class="menu-grid"></div>
        </div>

        <div id="addonsContainer"></div>

        <div class="form-group">
          <label for="catatan">Catatan</label>
          <textarea id="catatan" placeholder="Opsional, berlaku untuk semua anak..."></textarea>
        </div>
      </section>

      <button id="kirim" disabled>
        <span id="btnText">Memuat Menu...</span>
      </button>
    </main>

    <div id="toast"></div>

    <div id="successModal" class="modal">
      <div class="modal-content">
        <div class="success-icon">🍱</div>
        <h2>Pesanan Berhasil!</h2>
        <p id="modalText"></p>
        <a id="waConfirmBtn" class="wa-modal-btn" target="_blank" rel="noopener">
          📩 Simpan Bukti ke WA
        </a>
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
// DOM & STATE
// =====================================

const tombolKirim = document.getElementById("kirim");
const toast = document.getElementById("toast");
const modal = document.getElementById("successModal");
const modalText = document.getElementById("modalText");
const waConfirmBtn = document.getElementById("waConfirmBtn");
const tutupModal = document.getElementById("tutupModal");
const loadingBar = document.getElementById("loadingBar");
const statusOrder = document.getElementById("statusOrder");
const tanggal = document.getElementById("tanggal");
const btnText = document.getElementById("btnText");
const emptyState = document.getElementById("emptyState");
const globalStats = document.getElementById("globalStats");
const namaAnakContainer = document.getElementById("namaAnakContainer");
const tambahAnak = document.getElementById("tambahAnak");
const menuPilihan = document.getElementById("menuPilihan");
const addonsContainer = document.getElementById("addonsContainer");
const catatanInput = document.getElementById("catatan");
const closedModal = document.getElementById("closedModal");
const closedModalText = document.getElementById("closedModalText");

const state = {
  namaAnak: [""],
  selectedMenu: "",
  selectedAddons: [],
  menuNames: [],
  addonsMaster: [],
  stats: {},
  sedangMengirim: false,
  configLoaded: false,
  openTime: "",
  closeTime: "",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function arraysEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function menuEmoji(index) {
  return MENU_EMOJIS[index] || "🍽️";
}

// =====================================
// NAMA ANAK
// =====================================

function renderNamaAnak() {
  namaAnakContainer.innerHTML = state.namaAnak
    .map(
      (nama, index) => `
        <div class="nama-anak-row">
          <div class="form-group nama-anak-field">
            <label for="anakNama${index}">Anak ${index + 1}</label>
            <input
              id="anakNama${index}"
              class="anak-nama-input"
              data-index="${index}"
              type="text"
              maxlength="100"
              placeholder="Contoh: Andi - 3B"
              autocomplete="off"
              value="${escapeHtml(nama)}"
            >
          </div>
          ${
            state.namaAnak.length > 1
              ? `<button type="button" class="hapus-anak-btn" data-index="${index}">✕ Hapus</button>`
              : ""
          }
        </div>
      `
    )
    .join("");

  namaAnakContainer.querySelectorAll(".anak-nama-input").forEach((input) => {
    input.addEventListener("input", () => {
      state.namaAnak[Number(input.dataset.index)] = input.value;
    });
  });

  namaAnakContainer.querySelectorAll(".hapus-anak-btn").forEach((button) => {
    button.addEventListener("click", () => {
      state.namaAnak.splice(Number(button.dataset.index), 1);
      renderNamaAnak();
    });
  });

  tambahAnak.disabled = state.namaAnak.length >= MAX_ANAK;
}

tambahAnak.addEventListener("click", () => {
  if (state.namaAnak.length >= MAX_ANAK) {
    showToast(`⚠ Maksimal ${MAX_ANAK} anak per pengiriman`, "warning");
    return;
  }

  state.namaAnak.push("");
  renderNamaAnak();

  const lastInput = namaAnakContainer.querySelector(
    `.anak-nama-input[data-index="${state.namaAnak.length - 1}"]`
  );
  lastInput?.focus();
});

// =====================================
// MENU, ADD-ONS, DAN STATISTIK
// =====================================

function renderMenuPilihan() {
  if (state.menuNames.length === 0) {
    menuPilihan.innerHTML = `
      <div class="menu-config-error">
        Menu belum tersedia. Silakan chat admin untuk konfirmasi.
      </div>
    `;
    return;
  }

  menuPilihan.innerHTML = state.menuNames
    .map(
      (menu, index) => `
        <button
          type="button"
          class="menu-card menu-choice ${state.selectedMenu === menu ? "selected" : ""}"
          data-menu-index="${index}"
        >
          <span class="emoji">${menuEmoji(index)}</span>
          <span class="menu-choice-title">${escapeHtml(menu)}</span>
        </button>
      `
    )
    .join("");

  menuPilihan.querySelectorAll(".menu-choice").forEach((card) => {
    card.addEventListener("click", () => {
      const menu = state.menuNames[Number(card.dataset.menuIndex)];
      if (!menu) return;
      state.selectedMenu = menu;
      renderMenuPilihan();
    });
  });
}

function renderAddons() {
  if (state.addonsMaster.length === 0) {
    addonsContainer.innerHTML = "";
    return;
  }

  addonsContainer.innerHTML = `
    <div class="form-group">
      <button type="button" id="addonsToggle" class="addons-toggle">
        + Tambah Add-ons <span class="addons-toggle-icon">▾</span>
      </button>
      <div id="addonsPanel" class="addons-panel">
        ${state.addonsMaster
          .map(
            (addon, index) => `
              <label class="addons-item">
                <span class="addons-item-left">
                  <input
                    type="checkbox"
                    class="addons-checkbox"
                    data-addon-index="${index}"
                    ${state.selectedAddons.includes(addon.nama) ? "checked" : ""}
                  >
                  ${escapeHtml(addon.nama)}
                </span>
                <span class="addons-item-price">
                  Rp${Number(addon.harga).toLocaleString("id-ID")}
                </span>
              </label>
            `
          )
          .join("")}
      </div>
      <p class="form-helper">Add-ons yang dipilih berlaku untuk setiap anak.</p>
    </div>
  `;

  const toggle = document.getElementById("addonsToggle");
  const panel = document.getElementById("addonsPanel");

  toggle.addEventListener("click", () => {
    const isOpen = panel.classList.toggle("open");
    toggle.querySelector(".addons-toggle-icon").textContent = isOpen ? "▴" : "▾";
  });

  panel.querySelectorAll(".addons-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const addon = state.addonsMaster[Number(checkbox.dataset.addonIndex)];
      if (!addon) return;

      if (checkbox.checked) {
        if (!state.selectedAddons.includes(addon.nama)) {
          state.selectedAddons.push(addon.nama);
        }
      } else {
        state.selectedAddons = state.selectedAddons.filter(
          (nama) => nama !== addon.nama
        );
      }
    });
  });
}

function getBadgeText(menu, total, maxCount, winners) {
  if (total === 0) return "";
  if (state.menuNames.length === 1) return "🍱 Menu Hari Ini";

  const count = Number(state.stats[menu] || 0);
  if (count !== maxCount) return "";
  return winners.length > 1 ? "⚖ Sama Populer" : "🔥 Favorit Hari Ini";
}

function renderStats() {
  if (state.menuNames.length === 0) {
    globalStats.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }

  const counts = state.menuNames.map((menu) => Number(state.stats[menu] || 0));
  const total = counts.reduce((sum, count) => sum + count, 0);
  const maxCount = Math.max(...counts);
  const winners = state.menuNames.filter(
    (menu) => Number(state.stats[menu] || 0) === maxCount
  );

  emptyState.style.display = total === 0 ? "block" : "none";

  globalStats.innerHTML = state.menuNames
    .map((menu, index) => {
      const badge = getBadgeText(menu, total, maxCount, winners);
      return `
        <div class="menu-card static">
          ${badge ? `<div class="badge">${badge}</div>` : ""}
          <div class="emoji">${menuEmoji(index)}</div>
          <h3>${escapeHtml(menu)}</h3>
          <div class="menu-count">
            👥 <span>${Number(state.stats[menu] || 0)}</span> orang memilih
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadStats() {
  try {
    const response = await fetch("/api/stats");
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Gagal mengambil statistik");
    }

    state.stats = data.perMenu || {};
    renderStats();
  } catch (error) {
    console.error(error);
  }
}

async function loadConfig() {
  try {
    const response = await fetch("/api/config");
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Gagal mengambil konfigurasi");
    }

    const nextMenus = Array.isArray(data.menus)
      ? data.menus.filter((menu) => typeof menu === "string" && menu.trim())
      : [];
    const nextAddons = Array.isArray(data.addons) ? data.addons : [];
    const menusChanged = !arraysEqual(state.menuNames, nextMenus);
    const addonsChanged = !arraysEqual(state.addonsMaster, nextAddons);

    state.configLoaded = true;
    state.openTime = data.config?.["Open Time"] || "";
    state.closeTime = data.config?.["Close Time"] || "";

    if (menusChanged) {
      state.menuNames = nextMenus;

      if (!state.menuNames.includes(state.selectedMenu)) {
        state.selectedMenu = "";
      }

      renderMenuPilihan();
      renderStats();
    }

    if (addonsChanged) {
      state.addonsMaster = nextAddons;
      const activeNames = new Set(nextAddons.map((addon) => addon.nama));
      state.selectedAddons = state.selectedAddons.filter((nama) =>
        activeNames.has(nama)
      );
      renderAddons();
    }

    checkOrderingTime();
  } catch (error) {
    console.error(error);

    if (!state.configLoaded) {
      statusOrder.textContent = "⚠ Gagal memuat menu. Silakan refresh halaman.";
      tombolKirim.disabled = true;
      btnText.textContent = "Menu Tidak Tersedia";
    }
  }
}

// =====================================
// VALIDASI & SUBMIT
// =====================================

function validateForm() {
  const namesSeen = new Set();

  for (let index = 0; index < state.namaAnak.length; index++) {
    const nama = state.namaAnak[index].trim();

    if (!nama) {
      showToast(`⚠ Nama anak ke-${index + 1} wajib diisi`, "warning");
      return false;
    }

    const normalized = nama.toLocaleLowerCase("id-ID");
    if (namesSeen.has(normalized)) {
      showToast(`⚠ Nama ${nama} ditulis lebih dari sekali`, "warning");
      return false;
    }

    namesSeen.add(normalized);
  }

  if (!state.selectedMenu || !state.menuNames.includes(state.selectedMenu)) {
    showToast("⚠ Pilih satu menu untuk semua anak", "warning");
    return false;
  }

  return true;
}

async function handleSubmit() {
  if (tombolKirim.disabled || state.sedangMengirim) return;
  if (!validateForm()) return;

  state.sedangMengirim = true;
  setLoading(true);
  startLoading();

  const sharedNote = catatanInput.value.trim();
  const orders = state.namaAnak.map((nama) => ({
    nama: nama.trim(),
    menu: state.selectedMenu,
    catatan: sharedNote,
    addons: [...state.selectedAddons],
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

    if (!response.ok || !result.success) {
      showToast(`⚠ ${result.message || "Pesanan gagal dikirim"}`, "warning");
      return;
    }

    showSuccessModal(result.orders || orders);
    await loadStats();
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

tombolKirim.addEventListener("click", handleSubmit);

tutupModal.addEventListener("click", () => {
  modal.classList.remove("show");
  resetForm();
});

// =====================================
// TANGGAL & JAM PEMESANAN
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
  if (state.sedangMengirim) return;

  if (!state.configLoaded) {
    tombolKirim.disabled = true;
    btnText.textContent = "Memuat Menu...";
    return;
  }

  if (state.menuNames.length === 0) {
    statusOrder.textContent = "⚠ Menu belum tersedia";
    tombolKirim.disabled = true;
    btnText.textContent = "Menu Tidak Tersedia";
    return;
  }

  if (!state.openTime || !state.closeTime) {
    statusOrder.textContent = "🟢 Pemesanan Dibuka";
    tombolKirim.disabled = false;
    btnText.textContent = "Kirim Pilihan";
    hideClosedModal();
    return;
  }

  const sekarang = new Date();
  const sekarangMenit = sekarang.getHours() * 60 + sekarang.getMinutes();
  const [openJam, openMenit] = state.openTime.split(":").map(Number);
  const [closeJam, closeMenit] = state.closeTime.split(":").map(Number);
  const openTotal = openJam * 60 + openMenit;
  const closeTotal = closeJam * 60 + closeMenit;

  if (![openTotal, closeTotal].every(Number.isFinite)) {
    statusOrder.textContent = "⚠ Format jam pemesanan tidak valid";
    tombolKirim.disabled = true;
    btnText.textContent = "Hubungi Admin";
    return;
  }

  if (sekarangMenit < openTotal) {
    statusOrder.textContent = `⏳ Dibuka pukul ${state.openTime}`;
    tombolKirim.disabled = true;
    btnText.textContent = "Belum Dibuka";
    showClosedModal(
      "Pemesanan hari ini belum dibuka. Kalau ada pertanyaan, langsung chat kami lewat WhatsApp di bawah ini 👇"
    );
  } else if (sekarangMenit >= closeTotal) {
    statusOrder.textContent = "🔴 Pemesanan Ditutup";
    tombolKirim.disabled = true;
    btnText.textContent = "Pemesanan Ditutup";
    showClosedModal(
      "Waktu pemesanan hari ini sudah lewat. Kalau ada kendala, langsung chat kami lewat WhatsApp di bawah ini 👇"
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
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function showSuccessModal(orders) {
  modalText.replaceChildren();

  orders.forEach((order, index) => {
    if (index > 0) {
      modalText.append(document.createElement("br"), document.createElement("br"));
    }

    const namaEl = document.createElement("strong");
    namaEl.textContent = order.nama;
    const menuEl = document.createElement("b");
    menuEl.textContent = order.menu;

    modalText.append(namaEl, document.createElement("br"), "Menu: ", menuEl);
  });

  const confirmText = orders.map((order) => `${order.nama} - ${order.menu}`).join("\n");
  waConfirmBtn.href = `https://wa.me/?text=${encodeURIComponent(
    `✅ Pesanan DapurSya sudah masuk!\n${confirmText}`
  )}`;
  modal.classList.add("show");
}

function resetForm() {
  state.namaAnak = [""];
  state.selectedMenu = "";
  state.selectedAddons = [];
  catatanInput.value = "";
  renderNamaAnak();
  renderMenuPilihan();
  renderAddons();
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

renderNamaAnak();
renderMenuPilihan();
updateTanggal();
loadConfig();
loadStats();

setInterval(loadStats, 5000);
setInterval(loadConfig, 10000);
setInterval(checkOrderingTime, 1000);
