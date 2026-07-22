import './style.css'

const STORAGE_KEY = 'dapursya_admin_key'

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
        <input id="password" type="password" placeholder="Masukkan kode admin">
      </div>
      <button id="loginBtn">Masuk</button>
      <p id="loginError" class="admin-error"></p>
    </main>

    <main class="card admin-data-card" id="dataCard">
      <h2>Rekap Pesanan</h2>
      <div id="periodLabel" class="admin-period"></div>

      <h2 class="admin-subheading">Menu Favorit</h2>
      <div id="menuFavoritTable"></div>

      <div id="summaryTable"></div>

      <h2 class="admin-subheading">Semua Pesanan Bulan Ini</h2>
      <div id="rawTable" class="admin-scroll-table"></div>

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

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str ?? ''
  return div.innerHTML
}

async function fetchRekap(key) {
  const response = await fetch('/api/rekap', {
    headers: { 'x-admin-key': key },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || 'Password salah atau terjadi kesalahan')
  }

  return response.json()
}

function renderData(result) {
  const bulanNama = new Date().toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  })

  periodLabel.textContent = `Bulan ${bulanNama} — total ${result.total} pesanan`

  const menuEntries = Object.entries(result.rekapMenu).sort((a, b) => b[1] - a[1])

  menuFavoritTable.innerHTML = `
    <table class="admin-table">
      <tr>
        <th>Menu</th>
        <th class="admin-table-num">Jumlah Dipilih</th>
      </tr>
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
          <td class="admin-table-num">Rp${(result.rekapTambahanPerAnak[nama] || 0).toLocaleString('id-ID')}</td>
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
        <th>Nama</th>
        <th>Menu</th>
        <th>Add-ons</th>
      </tr>
      ${result.data
        .map(
          (row) => `
        <tr>
          <td>${escapeHtml(row.tanggal)}</td>
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

async function tryLogin(key) {
  try {
    const result = await fetchRekap(key)

    sessionStorage.setItem(STORAGE_KEY, key)
    loginCard.style.display = 'none'
    dataCard.classList.add('show')

    renderData(result)
  } catch (error) {
    loginError.textContent = '❌ ' + error.message
    loginError.classList.add('show')
    sessionStorage.removeItem(STORAGE_KEY)
  }
}

loginBtn.addEventListener('click', () => {
  const key = passwordInput.value.trim()
  if (!key) return
  tryLogin(key)
})

passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginBtn.click()
})

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem(STORAGE_KEY)
  dataCard.classList.remove('show')
  loginCard.style.display = 'block'
  passwordInput.value = ''
})

// Auto-login kalau sesi masih tersimpan (misal reload halaman)
const savedKey = sessionStorage.getItem(STORAGE_KEY)
if (savedKey) {
  passwordInput.value = savedKey
  tryLogin(savedKey)
}