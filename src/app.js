// =====================================
// CONFIG
// =====================================

const API_URL="/api/submit"
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

<div id="successModal" class="modal">

    <div class="modal-content">

        <div class="success-icon">🍱</div>

        <h2>Pesanan Berhasil!</h2>

        <p id="modalText"></p>

        <button id="tutupModal">
            Tutup
        </button>

    </div>

</div>

</div>
`
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

let menuTerpilih = ""
let sedangMengirim = false;

tombolKirim.addEventListener("click", async () => {

    if (sedangMengirim) return;

    sedangMengirim = true;

    tombolKirim.disabled = true;
    tombolKirim.textContent = "⏳ Mengirim...";

  if (inputNama.value.trim() === "") {

      showToast("⚠ Nama anak wajib diisi", "warning")

      return

}

if (menuTerpilih === "") {

    showToast("⚠ Pilih salah satu menu","warning")

    return

}

const nama = inputNama.value.trim();
const catatan = inputCatatan.value.trim();

    const data = {

    nama,

    menu: menuTerpilih,

    catatan

}

try {

    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    const result = await response.json();

    console.log(result);

    showSuccessModal(nama, menuTerpilih);

} catch (error) {

    console.error(error);

    showToast("❌ Terjadi kesalahan", "error");

} finally {

    sedangMengirim = false;

    tombolKirim.disabled = false;

    tombolKirim.textContent = "Kirim Pilihan";

}

})

menuCards.forEach(card => {

    card.addEventListener('click', () => {

        menuCards.forEach(c => c.classList.remove('selected'))

        card.classList.add('selected')
        menuTerpilih = card.dataset.menu

    })

})

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

function showSuccessModal(nama, menu){

    modalText.innerHTML = `
        <strong>${nama}</strong><br><br>
        Menu yang dipilih:<br>
        <b>${menu}</b>
    `;

    modal.classList.add("show");

}

tutupModal.addEventListener("click",()=>{

    modal.classList.remove("show");

    inputNama.value="";

    inputCatatan.value="";

    menuTerpilih="";

    menuCards.forEach(c=>c.classList.remove("selected"));

    inputNama.focus();

});