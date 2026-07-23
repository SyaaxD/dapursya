import './style.css'

const STORAGE_KEY = 'dapursya_admin_key'
const PAYMENT_STATUSES = [
  'Belum Lunas',
  'Sebagian',
  'Lunas',
  'Dibatalkan',
  'Refund',
]
const PAYMENT_METHODS = ['', 'Tunai', 'Transfer', 'QRIS', 'Lainnya']

const now = new Date()

document.querySelector('#app').innerHTML = `
  <div class="container">
    <header>
      <h1>Dapur<span>Sya</span></h1>
      <p>Panel Admin</p>
    </header>

    <main class="card" id="loginCard">
      <h2>Masuk Admin</h2>
      <div class="form-group">
        <label for="password">Kode Admin</label>
        <input id="password" type="password" autocomplete="current-password" placeholder="Masukkan kode admin">
      </div>
      <button id="loginBtn">Masuk</button>
      <p id="loginError" class="admin-error"></p>
    </main>

    <main class="card admin-data-card" id="dataCard">
      <div class="admin-title-row">
        <div>
          <h2>Daftar Pembayaran</h2>
          <div id="periodLabel" class="admin-period"></div>
        </div>
        <button id="refreshBtn" class="admin-small-btn">↻ Muat Ulang</button>
      </div>

      <div class="admin-filters">
        <div>
          <label for="monthFilter">Bulan</label>
          <select id="monthFilter">
            ${Array.from({ length: 12 }, (_, index) => {
              const month = index + 1
              const label = new Date(2026, index, 1).toLocaleDateString('id-ID', {
                month: 'long',
              })
              return `<option value="${month}" ${month === now.getMonth() + 1 ? 'selected' : ''}>${label}</option>`
            }).join('')}
          </select>
        </div>
        <div>
          <label for="yearFilter">Tahun</label>
          <input id="yearFilter" type="number" min="2025" max="2100" value="${now.getFullYear()}">
        </div>
        <div>
          <label for="dateFilter">Tanggal kirim</label>
          <input id="dateFilter" type="date">
        </div>
      </div>

      <div id="paymentSummary" class="payment-summary-grid"></div>
      <div id="paymentTable" class="admin-scroll-table admin-payment-table"></div>

      <details class="admin-details">
        <summary>Ringkasan menu dan data mentah</summary>

        <h2 class="admin-subheading">Menu Favorit</h2>
        <div id="menuFavoritTable"></div>

        <h2 class="admin-subheading">Rekap Nama Anak</h2>
        <div id="summaryTable"></div>

        <h2 class="admin-subheading">Data RESPON Bulan Ini</h2>
        <div id="rawTable" class="admin-scroll-table"></div>
      </details>

      <button id="logoutBtn" class="admin-logout-btn">Keluar</button>
    </main>
  </div>
`

const loginCard = document.getElementById('loginCard')
const dataCard = document.getElementById('dataCard')
const passwordInput = document.getElementById('password')
const loginBtn = document.getElementById('loginBtn')
const loginError = document.getElementById('loginError')
const summaryTable = document.getElementById('summaryTable')
const menuFavoritTable = document.getElementById('menuFavoritTable')
const rawTable = document.getElementById('rawTable')
const periodLabel = document.getElementById('periodLabel')
const logoutBtn = document.getElementById('logoutBtn')
const refreshBtn = document.getElementById('refreshBtn')
const monthFilter = document.getElementById('monthFilter')
const yearFilter = document.getElementById('yearFilter')
const dateFilter = document.getElementById('dateFilter')
const paymentSummary = document.getElementById('paymentSummary')
const paymentTable = document.getElementById('paymentTable')

let currentResult = null

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str ?? ''
  return div.innerHTML
}

function formatRupiah(value) {
  return `Rp${Number(value || 0).toLocaleString('id-ID')}`
}

function normalizeWhatsapp(value) {
  let digits = String(value ?? '').replace(/\D/g, '')
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`
  if (digits.startsWith('8')) digits = `62${digits}`
  return digits
}

function toInputDate(value) {
  const match = String(value || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!match) return ''
  return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
}

async function fetchRekap(key) {
  const params = new URLSearchParams({
    bulan: monthFilter.value,
    tahun: yearFilter.value,
  })
  const response = await fetch(`/api/rekap?${params}`, {
    headers: { 'x-admin-key': key },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || 'Password salah atau terjadi kesalahan')
  }

  return response.json()
}

function renderSummary(result) {
  const summary = result.paymentSummary || {}
  const totalPayments = result.payments?.length || 0
  const paidCount = summary.statusCounts?.Lunas || 0
  const partialCount = summary.statusCounts?.Sebagian || 0
  const unpaidCount = summary.statusCounts?.['Belum Lunas'] || 0

  paymentSummary.innerHTML = `
    <div class="payment-summary-card">
      <span>Total Tagihan</span>
      <strong>${formatRupiah(summary.totalBilled)}</strong>
      <small>${totalPayments} box/anak</small>
    </div>
    <div class="payment-summary-card success">
      <span>Sudah Dibayar</span>
      <strong>${formatRupiah(summary.totalPaid)}</strong>
      <small>${paidCount} lunas · ${partialCount} sebagian</small>
    </div>
    <div class="payment-summary-card warning">
      <span>Belum Diterima</span>
      <strong>${formatRupiah(summary.outstanding)}</strong>
      <small>${unpaidCount} belum lunas</small>
    </div>
  `
}

function makeOptions(options, selected) {
  return options
    .map(
      (option) =>
        `<option value="${escapeHtml(option)}" ${option === selected ? 'selected' : ''}>${escapeHtml(option || '— Pilih —')}</option>`
    )
    .join('')
}

function renderPayments(payments) {
  const selectedDate = dateFilter.value
  const filtered = [...payments]
    .filter((payment) => !selectedDate || toInputDate(payment.serviceDate) === selectedDate)
    .sort((a, b) => b.rowNumber - a.rowNumber)

  if (!filtered.length) {
    paymentTable.innerHTML = `
      <div class="admin-empty-state">
        Tidak ada pembayaran untuk periode atau tanggal yang dipilih.
      </div>
    `
    return
  }

  paymentTable.innerHTML = `
    <table class="admin-table admin-table-small">
      <thead>
        <tr>
          <th>Tanggal</th>
          <th>Pemesan</th>
          <th>Anak & Menu</th>
          <th class="admin-table-num">Tagihan</th>
          <th>Status</th>
          <th>Jumlah Dibayar</th>
          <th>Metode</th>
          <th>Catatan</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
        ${filtered
          .map((payment) => {
            const wa = normalizeWhatsapp(payment.whatsapp)
            const waLink = wa
              ? `<a class="admin-wa-link" href="https://wa.me/${wa}" target="_blank" rel="noopener">WA ${escapeHtml(payment.whatsapp)}</a>`
              : '<span class="admin-muted">Nomor lama tidak tersedia</span>'

            return `
              <tr data-payment-row="${payment.rowNumber}" data-total="${payment.total}">
                <td>
                  ${escapeHtml(payment.serviceDate || payment.orderedAt)}
                  <small class="admin-cell-sub">${escapeHtml(payment.orderId)}</small>
                </td>
                <td>
                  <strong>${escapeHtml(payment.customerName || 'Data lama')}</strong>
                  ${waLink}
                </td>
                <td>
                  <strong>${escapeHtml(payment.childName)}</strong>
                  <small class="admin-cell-sub">${escapeHtml(payment.menu)}</small>
                  ${payment.addons ? `<small class="admin-cell-sub">${escapeHtml(payment.addons)}</small>` : ''}
                </td>
                <td class="admin-table-num"><strong>${formatRupiah(payment.total)}</strong></td>
                <td>
                  <select class="payment-status">
                    ${makeOptions(PAYMENT_STATUSES, payment.status)}
                  </select>
                </td>
                <td>
                  <input class="payment-paid" type="number" min="0" max="${payment.total}" step="1000" value="${payment.paidAmount}">
                </td>
                <td>
                  <select class="payment-method">
                    ${makeOptions(PAYMENT_METHODS, payment.method)}
                  </select>
                </td>
                <td>
                  <input class="payment-note" type="text" maxlength="200" value="${escapeHtml(payment.adminNote)}" placeholder="Opsional">
                </td>
                <td>
                  <button type="button" class="payment-save admin-small-btn">Simpan</button>
                </td>
              </tr>
            `
          })
          .join('')}
      </tbody>
    </table>
  `

  paymentTable.querySelectorAll('.payment-status').forEach((select) => {
    select.addEventListener('change', () => {
      const row = select.closest('[data-payment-row]')
      const paidInput = row.querySelector('.payment-paid')
      const total = Number(row.dataset.total)

      if (select.value === 'Lunas') paidInput.value = total
      if (select.value === 'Belum Lunas' || select.value === 'Dibatalkan') {
        paidInput.value = 0
      }
    })
  })

  paymentTable.querySelectorAll('.payment-save').forEach((button) => {
    button.addEventListener('click', () => savePayment(button))
  })
}

async function savePayment(button) {
  const row = button.closest('[data-payment-row]')
  const key = sessionStorage.getItem(STORAGE_KEY)

  button.disabled = true
  button.textContent = 'Menyimpan...'

  try {
    const response = await fetch('/api/payment', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': key,
      },
      body: JSON.stringify({
        rowNumber: Number(row.dataset.paymentRow),
        status: row.querySelector('.payment-status').value,
        paidAmount: Number(row.querySelector('.payment-paid').value) || 0,
        method: row.querySelector('.payment-method').value,
        adminNote: row.querySelector('.payment-note').value,
      }),
    })
    const result = await response.json().catch(() => ({}))

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal menyimpan pembayaran')
    }

    button.textContent = '✓ Tersimpan'
    await loadAdminData()
  } catch (error) {
    button.disabled = false
    button.textContent = 'Coba Lagi'
    window.alert(error.message)
  }
}

function renderSupportingTables(result) {
  const menuEntries = Object.entries(result.rekapMenu).sort((a, b) => b[1] - a[1])
  menuFavoritTable.innerHTML = `
    <table class="admin-table">
      <tr><th>Menu</th><th class="admin-table-num">Jumlah Dipilih</th></tr>
      ${menuEntries
        .map(
          ([menu, jumlah], i) => `
            <tr>
              <td>${i === 0 ? '🔥 ' : ''}${escapeHtml(menu)}</td>
              <td class="admin-table-num">${jumlah}</td>
            </tr>
          `
        )
        .join('')}
    </table>
  `

  const entries = Object.entries(result.rekapPerAnak).sort((a, b) => b[1] - a[1])
  summaryTable.innerHTML = `
    <table class="admin-table">
      <tr>
        <th>Nama Anak</th>
        <th class="admin-table-num">Jumlah Pesan</th>
        <th class="admin-table-num">Total Add-ons</th>
      </tr>
      ${entries
        .map(
          ([nama, jumlah]) => `
            <tr>
              <td>${escapeHtml(nama)}</td>
              <td class="admin-table-num">${jumlah}</td>
              <td class="admin-table-num">${formatRupiah(result.rekapTambahanPerAnak[nama] || 0)}</td>
            </tr>
          `
        )
        .join('')}
    </table>
  `

  rawTable.innerHTML = `
    <table class="admin-table admin-table-small">
      <tr>
        <th>Tanggal</th>
        <th>Order ID</th>
        <th>Pemesan</th>
        <th>Nama Anak</th>
        <th>Menu</th>
        <th>Add-ons</th>
      </tr>
      ${result.data
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.tanggal)}</td>
              <td>${escapeHtml(row.orderId)}</td>
              <td>${escapeHtml(row.customerName)}</td>
              <td>${escapeHtml(row.nama)}</td>
              <td>${escapeHtml(row.menu)}</td>
              <td>${escapeHtml(row.addons)}</td>
            </tr>
          `
        )
        .join('')}
    </table>
  `
}

function renderData(result) {
  currentResult = result
  const periodDate = new Date(result.tahun, result.bulan - 1, 1)
  const bulanNama = periodDate.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  })

  periodLabel.textContent = `${bulanNama} — ${result.payments.length} baris pembayaran`
  renderSummary(result)
  renderPayments(result.payments || [])
  renderSupportingTables(result)
}

async function loadAdminData() {
  const key = sessionStorage.getItem(STORAGE_KEY) || passwordInput.value.trim()
  if (!key) return

  refreshBtn.disabled = true
  refreshBtn.textContent = 'Memuat...'

  try {
    const result = await fetchRekap(key)
    sessionStorage.setItem(STORAGE_KEY, key)
    loginCard.style.display = 'none'
    dataCard.classList.add('show')
    loginError.classList.remove('show')
    renderData(result)
  } catch (error) {
    loginError.textContent = '❌ ' + error.message
    loginError.classList.add('show')
    sessionStorage.removeItem(STORAGE_KEY)
    dataCard.classList.remove('show')
    loginCard.style.display = 'block'
  } finally {
    refreshBtn.disabled = false
    refreshBtn.textContent = '↻ Muat Ulang'
  }
}

loginBtn.addEventListener('click', loadAdminData)
passwordInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') loginBtn.click()
})
refreshBtn.addEventListener('click', loadAdminData)
monthFilter.addEventListener('change', loadAdminData)
yearFilter.addEventListener('change', loadAdminData)
dateFilter.addEventListener('change', () => {
  if (currentResult) renderPayments(currentResult.payments || [])
})

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem(STORAGE_KEY)
  currentResult = null
  dataCard.classList.remove('show')
  loginCard.style.display = 'block'
  passwordInput.value = ''
})

const savedKey = sessionStorage.getItem(STORAGE_KEY)
if (savedKey) {
  passwordInput.value = savedKey
  loadAdminData()
}
