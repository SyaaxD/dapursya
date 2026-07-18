const API_URL = "/api/submit"
document.querySelector('#app').innerHTML = `

<div class="container">

    <header>
        <h1>Dapur<span>Sya</span></h1>
        <p>Cita Rasa Resep Keluarga</p>
    </header>

    <main class="card">

    <h2>Pilih Menu Besok</h2>

    <div id="tanggal">
        Jumat, 17 Juli 2026
    </div>

    <div class="form-group">

        <label>Nama Anak & Kelas</label>

        <input
          id="nama"
          type="text"
          placeholder="Contoh : Andi - 3B"
        >

    </div>

    <div class="form-group">

    <label>Pilih Menu</label>

    <div class="menu-grid">

        <div class="menu-card" data-menu="Ayam Teriyaki">

            <div class="emoji">🍗</div>

            <h3>Ayam Teriyaki</h3>

            <p>Nasi • Sayur • Buah</p>

        </div>

        <div class="menu-card" data-menu="Ikan Crispy">

            <div class="emoji">🐟</div>

            <h3>Ikan Crispy</h3>

            <p>Nasi • Sayur • Buah</p>

        </div>

    </div>

</div>

    <div class="form-group">

        <label>Catatan</label>

        <textarea
           id="catatan"
           placeholder="Opsional..."
        ></textarea>

    </div>

        <button id="kirim">

           Kirim Pilihan

        </button>

</main>

<div id="toast"></div>

</div>
`
let menuTerpilih = ""

const menuCards = document.querySelectorAll('.menu-card')
const tombolKirim = document.getElementById("kirim")

tombolKirim.addEventListener("click", () => {

    const nama = document.getElementById("nama").value

    const catatan = document.getElementById("catatan").value

  if (nama.trim() === "") {

      showToast("⚠ Nama anak wajib diisi", "warning")

      return

}

if (menuTerpilih === "") {

    showToast("⚠ Pilih salah satu menu","warning")

    return

}

    const data = {

    nama,

    menu: menuTerpilih,

    catatan

}

fetch(API_URL, {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
})

.then(response => response.json())
.then(result => {

    console.log(result)

    showToast("✅ Data berhasil dikirim", "success")

})
.catch(error => {

    console.error(error)

    showToast("❌ Terjadi kesalahan", "error")

})

})

menuCards.forEach(card => {

    card.addEventListener('click', () => {

        menuCards.forEach(c => c.classList.remove('selected'))

        card.classList.add('selected')
        menuTerpilih = card.dataset.menu

    })

})

const toast = document.getElementById("toast")

function showToast(pesan, tipe){

    toast.textContent = pesan

    toast.className = ""

    if(tipe === "success"){

        toast.style.background = "#16a34a"

    }

    if(tipe === "warning"){

        toast.style.background = "#f59e0b"

    }

    if(tipe === "error"){

        toast.style.background = "#dc2626"

    }

    toast.classList.add("show")

    setTimeout(() => {

        toast.classList.remove("show")

    },3000)

}