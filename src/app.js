// =====================================
// CONFIG
// =====================================

const API_URL = "/api/submit";
const SUGGESTION_API_URL = "/api/suggestion";
const CHANNEL_URL = "https://whatsapp.com/channel/0029Vb8XERa1SWt4lel3mY23";
const WA_NUMBER = "6281389490706";
const WA_MESSAGE = encodeURIComponent("Halo, saya mau tanya soal DapurSya");
const MAX_ANAK = 10;
const MENU_EMOJI = "🍽️";
const CUSTOMER_STORAGE_KEY = "dapursya_customer";

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
    <header class="site-header">
      <a class="brand-lockup" href="/" aria-label="Dapur Sya — kembali ke halaman utama">
        <img
          src="/dapursya-logo.png"
          alt="Dapur Sya — Cita Rasa Resep Keluarga"
          width="770"
          height="224"
        >
      </a>
    </header>

    <main class="card">
      <h2>Pilih Menu Besok</h2>

      <div id="tanggal"></div>
      <div id="statusOrder"></div>

      <section class="order-form-section">
        <div class="form-section-heading">
          <h3>Data Pemesan</h3>
          <p>Cukup diisi sekali. Tidak perlu membuat akun.</p>
        </div>

        <div id="rememberedCustomer" class="remembered-customer" hidden></div>

        <div id="customerEditor" class="customer-editor">
          <div class="form-group">
            <label for="namaPemesan">Nama orang tua/pemesan</label>
            <input
              id="namaPemesan"
              type="text"
              maxlength="100"
              autocomplete="name"
              placeholder="Contoh: Ibu Dina"
            >
          </div>

          <div class="form-group">
            <label for="whatsapp">Nomor WhatsApp aktif</label>
            <input
              id="whatsapp"
              type="tel"
              inputmode="numeric"
              maxlength="20"
              autocomplete="tel"
              placeholder="Contoh: 0812 3456 7890"
            >
            <p class="form-helper">Digunakan untuk identitas pesanan dan konfirmasi jika diperlukan.</p>
          </div>

          <label class="remember-customer-option">
            <input id="rememberCustomer" type="checkbox">
            <span>
              Ingat data saya di perangkat ini
              <small>Jangan dicentang jika memakai perangkat bersama.</small>
            </span>
          </label>
        </div>
      </section>

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
          <div id="emptyState" class="empty-state" style="display:none">
            Belum ada yang memilih menu hari ini 🍱
          </div>
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

      <section class="menu-suggestion-card">
        <button
          type="button"
          id="suggestionToggle"
          class="suggestion-toggle"
          aria-expanded="false"
          aria-controls="suggestionPanel"
        >
          <span class="suggestion-toggle-icon" aria-hidden="true">💡</span>
          <span>
            <strong>Punya ide menu untuk besok?</strong>
            <small>Klik untuk menyarankan menu favorit anak.</small>
          </span>
          <span class="suggestion-chevron" aria-hidden="true">▾</span>
        </button>

        <form id="suggestionPanel" class="suggestion-panel" hidden>
          <label for="menuSuggestion">Saran menu</label>
          <textarea
            id="menuSuggestion"
            maxlength="120"
            rows="3"
            placeholder="Contoh: nasi kuning, ayam katsu, atau sop makaroni..."
          ></textarea>
          <div class="suggestion-footer">
            <small>Maksimal 120 karakter.</small>
            <button type="submit" id="submitSuggestion" class="suggestion-submit">
              Kirim Saran
            </button>
          </div>
          <p id="suggestionStatus" class="suggestion-status" aria-live="polite"></p>
        </form>
      </section>
    </main>
  </div>

  <div id="toast"></div>

  <aside id="successNotice" class="success-notice" aria-hidden="true">
    <button
      type="button"
      id="successNoticeToggle"
      class="success-notice-toggle"
      aria-expanded="false"
      aria-controls="successNoticeDetails"
    >
      <span class="success-notice-brand" aria-hidden="true">
        <img src="/dapursya-icon-512.png" alt="">
        <span class="success-notice-check">✓</span>
      </span>
      <span class="success-notice-heading">
        <strong>Pesanan berhasil!</strong>
        <small>Tercatat aman di Dapur Sya · Lihat detail</small>
      </span>
      <span id="successNoticeChevron" class="success-notice-chevron" aria-hidden="true">›</span>
    </button>

    <div id="successNoticeDetails" class="success-notice-details" hidden>
      <div class="success-notice-intro">
        <span aria-hidden="true">🌿</span>
        <p>
          <strong>Terima kasih sudah memesan.</strong>
          <small>Pesanan akan kami siapkan dengan penuh perhatian.</small>
        </p>
      </div>
      <div id="modalText" class="success-notice-order"></div>
      <div class="success-notice-actions">
        <a id="waConfirmBtn" class="wa-modal-btn" target="_blank" rel="noopener">
          <span aria-hidden="true">💬</span> Simpan Detail ke WhatsApp
        </a>
        <a
          class="success-channel-btn"
          href="${CHANNEL_URL}"
          target="_blank"
          rel="noopener"
        >
          <span aria-hidden="true">📸</span>
          <span>
            <strong>Ikuti Saluran Dapur Sya</strong>
            <small>Lihat aktivitas dan momen kebersamaan</small>
          </span>
          <span class="success-channel-arrow" aria-hidden="true">→</span>
        </a>
        <button type="button" id="tutupModal" class="success-notice-close">
          Tutup
        </button>
      </div>
    </div>
  </aside>

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
`;

// =====================================
// DOM & STATE
// =====================================

const tombolKirim = document.getElementById("kirim");
const toast = document.getElementById("toast");
const successNotice = document.getElementById("successNotice");
const successNoticeToggle = document.getElementById("successNoticeToggle");
const successNoticeDetails = document.getElementById("successNoticeDetails");
const successNoticeChevron = document.getElementById("successNoticeChevron");
const modalText = document.getElementById("modalText");
const waConfirmBtn = document.getElementById("waConfirmBtn");
const tutupModal = document.getElementById("tutupModal");
const loadingBar = document.getElementById("loadingBar");
const statusOrder = document.getElementById("statusOrder");
const tanggal = document.getElementById("tanggal");
const btnText = document.getElementById("btnText");
const emptyState = document.getElementById("emptyState");
const namaAnakContainer = document.getElementById("namaAnakContainer");
const tambahAnak = document.getElementById("tambahAnak");
const menuPilihan = document.getElementById("menuPilihan");
const addonsContainer = document.getElementById("addonsContainer");
const catatanInput = document.getElementById("catatan");
const closedModal = document.getElementById("closedModal");
const closedModalText = document.getElementById("closedModalText");
const namaPemesanInput = document.getElementById("namaPemesan");
const whatsappInput = document.getElementById("whatsapp");
const rememberCustomerInput = document.getElementById("rememberCustomer");
const rememberedCustomer = document.getElementById("rememberedCustomer");
const customerEditor = document.getElementById("customerEditor");
const suggestionToggle = document.getElementById("suggestionToggle");
const suggestionPanel = document.getElementById("suggestionPanel");
const menuSuggestionInput = document.getElementById("menuSuggestion");
const submitSuggestion = document.getElementById("submitSuggestion");
const suggestionStatus = document.getElementById("suggestionStatus");

const state = {
  namaAnak: [""],
  selectedMenu: "",
  selectedAddons: [],
  menuNames: [],
  menuDetails: {},
  addonsMaster: [],
  stats: {},
  sedangMengirim: false,
  configLoaded: false,
  orderStatus: "BUKA",
  statusMessage: "",
  openTime: "",
  closeTime: "",
  sedangMengirimSaran: false,
  configLoading: false,
  configRetryAttempts: 0,
};

let configRetryTimer = null;
let rememberedCustomerSnapshot = null;

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

function menuEmoji() {
  return MENU_EMOJI;
}

function normalizeWhatsapp(value) {
  let digits = String(value ?? "").replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith("8")) {
    digits = `62${digits}`;
  }

  return digits;
}

function maskWhatsapp(value) {
  const digits = normalizeWhatsapp(value);
  return digits ? `•••• ${digits.slice(-4)}` : "";
}

function loadRememberedCustomer() {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOMER_STORAGE_KEY) || "null");
    const normalizedWhatsapp = normalizeWhatsapp(saved?.whatsapp);

    if (!saved?.nama || !/^628\d{8,11}$/.test(normalizedWhatsapp)) {
      localStorage.removeItem(CUSTOMER_STORAGE_KEY);
      rememberedCustomerSnapshot = null;
      rememberedCustomer.hidden = true;
      customerEditor.hidden = false;
      return;
    }

    namaPemesanInput.value = saved.nama;
    whatsappInput.value = normalizedWhatsapp;
    rememberCustomerInput.checked = true;
    rememberedCustomerSnapshot = {
      nama: saved.nama,
      whatsapp: normalizedWhatsapp,
    };
    rememberedCustomer.hidden = false;
    customerEditor.hidden = true;
    rememberedCustomer.innerHTML = `
      <span><b aria-hidden="true">✓</b> Data terakhir digunakan: <strong>${escapeHtml(saved.nama)}</strong> · ${maskWhatsapp(normalizedWhatsapp)}</span>
      <button type="button" id="changeCustomerBtn" aria-expanded="false" aria-controls="customerEditor">Ganti</button>
    `;
    const changeCustomerBtn = document.getElementById("changeCustomerBtn");
    changeCustomerBtn?.addEventListener("click", () => {
      const willEdit = customerEditor.hidden;
      customerEditor.hidden = !willEdit;
      rememberedCustomer.classList.toggle("editing", willEdit);
      changeCustomerBtn.textContent = willEdit ? "Batal" : "Ganti";
      changeCustomerBtn.setAttribute("aria-expanded", String(willEdit));

      if (willEdit) {
        window.setTimeout(() => {
          namaPemesanInput.focus();
          namaPemesanInput.select();
        }, 50);
        return;
      }

      namaPemesanInput.value = rememberedCustomerSnapshot.nama;
      whatsappInput.value = rememberedCustomerSnapshot.whatsapp;
      rememberCustomerInput.checked = true;
    });
  } catch {
    localStorage.removeItem(CUSTOMER_STORAGE_KEY);
    rememberedCustomerSnapshot = null;
    rememberedCustomer.hidden = true;
    customerEditor.hidden = false;
  }
}

function saveRememberedCustomer(customer) {
  try {
    if (rememberCustomerInput.checked) {
      localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer));
    } else {
      localStorage.removeItem(CUSTOMER_STORAGE_KEY);
    }
  } catch {
    // Pemesanan tetap berjalan jika browser memblokir localStorage.
  }
}

whatsappInput.addEventListener("input", () => {
  whatsappInput.value = whatsappInput.value.replace(/[^\d+\s-]/g, "");
});

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
      <div class="${state.configLoaded ? "menu-config-error" : "menu-loading-state"}">
        ${
          state.configLoaded
            ? "Menu belum tersedia. Silakan chat admin untuk konfirmasi."
            : "Sedang memuat menu Dapur Sya..."
        }
      </div>
    `;
    return;
  }

  const counts = state.menuNames.map((menu) => Number(state.stats[menu] || 0));
  const total = counts.reduce((sum, count) => sum + count, 0);
  const maxCount = Math.max(...counts);
  const winners = state.menuNames.filter(
    (menu) => Number(state.stats[menu] || 0) === maxCount
  );

  menuPilihan.innerHTML = state.menuNames
    .map((menu, index) => {
      const badge = getBadgeText(menu, total, maxCount, winners);
      const sideDish = state.menuDetails[menu] || "";
      return `
        <button
          type="button"
          class="menu-card menu-choice ${state.selectedMenu === menu ? "selected" : ""}"
          data-menu-index="${index}"
        >
          ${badge ? `<span class="badge">${badge}</span>` : ""}
          <span class="emoji">${menuEmoji()}</span>
          <span class="menu-choice-title">${escapeHtml(menu)}</span>
          ${
            sideDish
              ? `<span class="menu-side-dish" title="${escapeHtml(sideDish)}">Pelengkap: ${escapeHtml(sideDish)}</span>`
              : ""
          }
          <span class="menu-count">
            👥 ${Number(state.stats[menu] || 0)} orang memilih
          </span>
        </button>
      `;
    })
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

function formatRupiah(value) {
  return `Rp${Number(value || 0).toLocaleString("id-ID")}`;
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
    emptyState.style.display = "none";
    renderMenuPilihan();
    return;
  }

  const counts = state.menuNames.map((menu) => Number(state.stats[menu] || 0));
  const total = counts.reduce((sum, count) => sum + count, 0);

  emptyState.style.display = total === 0 ? "block" : "none";
  renderMenuPilihan();
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
  if (state.configLoading) return;
  state.configLoading = true;

  try {
    const response = await fetch("/api/config");
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Gagal mengambil konfigurasi");
    }

    const nextMenus = Array.isArray(data.menus)
      ? data.menus.filter((menu) => typeof menu === "string" && menu.trim())
      : [];
    const nextMenuDetails =
      data.menuDetails && typeof data.menuDetails === "object"
        ? data.menuDetails
        : {};
    const nextAddons = Array.isArray(data.addons) ? data.addons : [];
    const menusChanged = !arraysEqual(state.menuNames, nextMenus);
    const menuDetailsChanged = !arraysEqual(state.menuDetails, nextMenuDetails);
    const addonsChanged = !arraysEqual(state.addonsMaster, nextAddons);

    state.configLoaded = true;
    state.configRetryAttempts = 0;
    clearTimeout(configRetryTimer);
    configRetryTimer = null;
    state.orderStatus = data.status || "BUKA";
    state.statusMessage = data.message || "";
    state.openTime = data.openTime || "";
    state.closeTime = data.closeTime || "";
    updateTanggal();

    if (menusChanged || menuDetailsChanged) {
      state.menuNames = nextMenus;
      state.menuDetails = nextMenuDetails;

      if (!state.menuNames.includes(state.selectedMenu)) {
        state.selectedMenu = "";
      }

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
      state.configRetryAttempts += 1;
      const retryDelay = Math.min(
        2000 * 2 ** (state.configRetryAttempts - 1),
        10000
      );

      statusOrder.textContent = "⏳ Sedang menghubungkan ke menu...";
      tombolKirim.disabled = true;
      btnText.textContent = "Mencoba Lagi...";
      renderMenuPilihan();

      clearTimeout(configRetryTimer);
      configRetryTimer = setTimeout(loadConfig, retryDelay);
    }
  } finally {
    state.configLoading = false;
  }
}

// =====================================
// VALIDASI & SUBMIT
// =====================================

function validateForm() {
  const customerName = namaPemesanInput.value.trim();
  const whatsapp = normalizeWhatsapp(whatsappInput.value);

  if (!customerName) {
    showToast("⚠ Nama orang tua/pemesan wajib diisi", "warning");
    namaPemesanInput.focus();
    return false;
  }

  if (!/^628\d{8,11}$/.test(whatsapp)) {
    showToast("⚠ Periksa kembali nomor WhatsApp", "warning");
    whatsappInput.focus();
    return false;
  }

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
  const slowRequestTimer = setTimeout(() => {
    if (state.sedangMengirim) {
      btnText.innerHTML =
        `<span class="spinner"></span> Masih memproses, jangan kirim ulang...`;
    }
  }, 8000);

  const sharedNote = catatanInput.value.trim();
  const customer = {
    nama: namaPemesanInput.value.trim(),
    whatsapp: normalizeWhatsapp(whatsappInput.value),
  };
  const orders = state.namaAnak.map((nama) => ({
    nama: nama.trim(),
    menu: state.selectedMenu,
    catatan: sharedNote,
    addons: [...state.selectedAddons],
  }));

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer, orders }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      showToast(`⚠ ${result.message || "Pesanan gagal dikirim"}`, "warning");
      return;
    }

    saveRememberedCustomer(customer);
    loadRememberedCustomer();
    showSuccessNotice(result);
    loadStats();
  } catch (error) {
    console.error(error);
    showToast("❌ Koneksi terputus. Periksa internet lalu coba lagi.", "error");
  } finally {
    clearTimeout(slowRequestTimer);
    state.sedangMengirim = false;
    setLoading(false);
    stopLoading();
    checkOrderingTime();
  }
}

tombolKirim.addEventListener("click", handleSubmit);

tutupModal.addEventListener("click", () => {
  successNotice.classList.remove("show", "expanded");
  successNotice.setAttribute("aria-hidden", "true");
  successNoticeDetails.hidden = true;
  successNoticeToggle.setAttribute("aria-expanded", "false");
  successNoticeChevron.textContent = "›";
  resetForm();
});

successNoticeToggle.addEventListener("click", () => {
  const willExpand = successNoticeDetails.hidden;
  successNoticeDetails.hidden = !willExpand;
  successNotice.classList.toggle("expanded", willExpand);
  successNoticeToggle.setAttribute("aria-expanded", String(willExpand));
  successNoticeChevron.textContent = willExpand ? "⌄" : "›";
});

suggestionToggle.addEventListener("click", () => {
  const willOpen = suggestionPanel.hidden;
  suggestionPanel.hidden = !willOpen;
  suggestionToggle.setAttribute("aria-expanded", String(willOpen));
  suggestionToggle.querySelector(".suggestion-chevron").textContent = willOpen
    ? "▴"
    : "▾";

  if (willOpen) {
    window.setTimeout(() => menuSuggestionInput.focus(), 50);
  }
});

suggestionPanel.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (state.sedangMengirimSaran) return;

  const suggestion = menuSuggestionInput.value.trim();
  if (suggestion.length < 3) {
    suggestionStatus.className = "suggestion-status error";
    suggestionStatus.textContent = "Tulis nama menu minimal 3 karakter ya.";
    menuSuggestionInput.focus();
    return;
  }

  state.sedangMengirimSaran = true;
  submitSuggestion.disabled = true;
  submitSuggestion.textContent = "Mengirim...";
  suggestionStatus.className = "suggestion-status";
  suggestionStatus.textContent = "";

  try {
    const response = await fetch(SUGGESTION_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestion }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Saran belum berhasil dikirim.");
    }

    menuSuggestionInput.value = "";
    suggestionStatus.className = "suggestion-status success";
    suggestionStatus.textContent = result.message;
  } catch (error) {
    suggestionStatus.className = "suggestion-status error";
    suggestionStatus.textContent =
      error.message || "Saran belum berhasil dikirim. Coba lagi ya.";
  } finally {
    state.sedangMengirimSaran = false;
    submitSuggestion.disabled = false;
    submitSuggestion.textContent = "Kirim Saran";
  }
});

// =====================================
// TANGGAL & JAM PEMESANAN
// =====================================

function updateTanggal() {
  const targetDate = new Date();
  const nowMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();
  const [openHour, openMinute] = state.openTime.split(":").map(Number);
  const [closeHour, closeMinute] = state.closeTime.split(":").map(Number);
  const openTotal = openHour * 60 + openMinute;
  const closeTotal = closeHour * 60 + closeMinute;
  const validSchedule = [openTotal, closeTotal].every(Number.isFinite);
  const morningPart =
    validSchedule && openTotal > closeTotal && nowMinutes < closeTotal;

  if (!morningPart) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  tanggal.textContent = targetDate.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function showClosedModal(pesan) {
  closedModalText.textContent = pesan;
  closedModal.classList.add("show");
  document.body.classList.add("modal-open");
  closedModal.scrollTop = 0;
}

function hideClosedModal() {
  closedModal.classList.remove("show");
  document.body.classList.remove("modal-open");
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

  const statusValue = String(state.orderStatus || "")
    .trim()
    .toLocaleLowerCase("id-ID");
  const manuallyClosed = ["tutup", "libur", "off", "closed"].includes(
    statusValue
  );

  if (manuallyClosed) {
    statusOrder.textContent = statusValue === "libur"
      ? "🔴 DapurSya sedang libur"
      : "🔴 Pemesanan Ditutup";
    tombolKirim.disabled = true;
    btnText.textContent = statusValue === "libur" ? "Sedang Libur" : "Pemesanan Ditutup";
    showClosedModal(
      state.statusMessage ||
      "Pemesanan sedang ditutup. Kalau ada pertanyaan, langsung chat kami lewat WhatsApp ya."
    );
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

  const withinWindow =
    openTotal === closeTotal ||
    (openTotal < closeTotal
      ? sekarangMenit >= openTotal && sekarangMenit < closeTotal
      : sekarangMenit >= openTotal || sekarangMenit < closeTotal);

  if (!withinWindow) {
    statusOrder.textContent = `⏳ Dibuka pukul ${state.openTime}`;
    tombolKirim.disabled = true;
    btnText.textContent = "Belum Dibuka";
    showClosedModal(
      state.statusMessage ||
      `Pemesanan dibuka setiap pukul ${state.openTime} WIB sampai ${state.closeTime} WIB hari berikutnya.`
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

function showSuccessNotice(result) {
  const orders = Array.isArray(result.orders) ? result.orders : [];
  modalText.replaceChildren();

  const receiptMeta = document.createElement("div");
  receiptMeta.className = "success-receipt-meta";

  const receiptLabel = document.createElement("span");
  receiptLabel.textContent = "DETAIL PESANAN";

  const orderIdEl = document.createElement("strong");
  orderIdEl.textContent = `#${result.orderId || "-"}`;
  receiptMeta.append(receiptLabel, orderIdEl);
  modalText.append(receiptMeta);

  if (result.customer?.nama) {
    const customerEl = document.createElement("p");
    customerEl.className = "success-receipt-customer";
    customerEl.textContent = `Pemesan: ${result.customer.nama}`;
    modalText.append(customerEl);
  }

  orders.forEach((order, index) => {
    const orderCard = document.createElement("div");
    orderCard.className = "success-order-item";

    const orderNumber = document.createElement("span");
    orderNumber.className = "success-order-number";
    orderNumber.textContent = String(index + 1).padStart(2, "0");

    const orderInfo = document.createElement("div");
    orderInfo.className = "success-order-info";

    const namaEl = document.createElement("strong");
    namaEl.textContent = order.nama;
    const menuEl = document.createElement("span");
    menuEl.textContent = order.menu;

    const priceEl = document.createElement("b");
    priceEl.textContent = formatRupiah(order.total);

    orderInfo.append(namaEl, menuEl);
    orderCard.append(orderNumber, orderInfo, priceEl);
    modalText.append(orderCard);
  });

  const totalRow = document.createElement("div");
  totalRow.className = "success-total-row";

  const totalLabel = document.createElement("span");
  totalLabel.append("Total tagihan", document.createElement("small"));
  totalLabel.querySelector("small").textContent = `${orders.length} pesanan`;

  const totalEl = document.createElement("strong");
  totalEl.textContent = formatRupiah(result.grandTotal);
  totalRow.append(totalLabel, totalEl);
  modalText.append(totalRow);

  const confirmText = orders
    .map(
      (order) =>
        `${order.nama} - ${order.menu} - ${formatRupiah(order.total)}`
    )
    .join("\n");
  waConfirmBtn.href = `https://wa.me/?text=${encodeURIComponent(
    `✅ Pesanan DapurSya sudah masuk!\nID: ${result.orderId || "-"}\n${confirmText}\nTotal: ${formatRupiah(result.grandTotal)}`
  )}`;
  successNoticeDetails.hidden = true;
  successNotice.classList.remove("expanded");
  successNotice.classList.add("show");
  successNotice.setAttribute("aria-hidden", "false");
  successNoticeToggle.setAttribute("aria-expanded", "false");
  successNoticeChevron.textContent = "›";
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
loadRememberedCustomer();
updateTanggal();
loadConfig();
loadStats();

setInterval(() => {
  if (!document.hidden) loadStats();
}, 15000);

setInterval(() => {
  if (!document.hidden) loadConfig();
}, 30000);

setInterval(checkOrderingTime, 1000);
