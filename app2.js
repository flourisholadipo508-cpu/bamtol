let currentActiveCategory = "";
let selectedRow1Tag = "All";
let selectedRow2Tag = "All";
let activeCurrency = "NGN";
const usdRate = 1500;

// --- 📊 INSTANT GOOGLE SHEETS LIVE INVENTORY CONFIG ---
const GOOGLE_SHEET_ID = "1BrZXWnF7sqxUuUmTpFEFr20SmGn-GH2iJlUDHIkMqZY";

const storeData = {
    clothing: { title: "Premium Clothing", subtitle: "Luxury outer layers and tailored silhouettes.", row1: ["All", "Men", "Women", "Kids"], row2: ["All", "Formal", "Casual", "Sport", "Native", "Undergarment"], items: [] },
    footwear: { title: "Signature Footwear", subtitle: "Hand-finished premium pairs structured for grace.", row1: ["All", "Men", "Women"], row2: ["All", "Formal", "Casual", "Sport"], items: [] },
    accessories: { title: "Luxury Accessories", subtitle: "Distinct accents to complete an elite ensemble.", row1: ["All", "Men", "Women"], row2: ["All"], items: [] },
    jewelry: { title: "Fine Jewelry", subtitle: "Exquisite investment statement pieces.", row1: ["All"], row2: ["All", "Whole Sets", "Watches", "Necklaces", "Rings", "Bracelets"], items: [] }
};

// Automated Spreadsheet Database Pipeline Fetcher
async function fetchCloudInventory() {
    // Upgraded CSV endpoint structure that safely bypasses Google's modern layout blocks
    const url = `https://google.com{GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv`;
    try {
        const res = await fetch(url);
        const text = await res.text();
        parseCSVData(text);
    } catch (err) { console.error("Spreadsheet Data Connection Loss:", err); }
}

function parseCSVData(csvText) {
    Object.keys(storeData).forEach(cat => storeData[cat].items = []);
    
    // Split spreadsheet strings by row breaks cleanly
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return;

    // Clean up quote wrappers from column headers
    const headers = lines[0].split(',').map(h => h.replace(/^"|"\$/g, '').trim());

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Match columns safely while ignoring hidden commas inside product description boxes
        const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*\$)/g) || lines[i].split(',');
        const item = {};
        
        headers.forEach((headerName, index) => {
            let val = matches[index] ? matches[index].replace(/^"|"\$/g, '').trim() : "";
            if (headerName) item[headerName] = val;
        });

        if (!item.category) continue;
        const targetCategory = item.category.toLowerCase().trim();
        
        let tagsArray = [];
        if (item.searchHashtags) {
            tagsArray = item.searchHashtags.split(',').map(t => t.trim());
        }

        if (storeData[targetCategory]) {
            storeData[targetCategory].items.push({
                name: item.name || "Boutique Essential",
                desc: item.desc || "",
                price: Number(item.price) || 0,
                r1: item.filterProfile || "All",
                r2: item.filterStyle || "All",
                hash: tagsArray,
                imageFile: item.imageFile || "gii.png",
                deal: String(item.isSpecialDeal).toUpperCase() === "TRUE"
            });
        }
    }

    renderHomeDeals();
    if (currentActiveCategory) { renderCatalogItems(); }
}

function toggleCurrency() {
    activeCurrency = (activeCurrency === "NGN") ? "USD" : "NGN";
    document.getElementById('currencyBtn').innerText = (activeCurrency === "NGN") ? "₦ NGN" : "\$ USD";
    if (currentActiveCategory) { renderCatalogItems(); }
    renderHomeDeals();
}

function formatPrice(amt) {
    if (activeCurrency === "USD") { return "\$" + (amt / usdRate).toFixed(2); }
    return "₦" + amt.toLocaleString();
}

async function shareProduct(name, hashTags) {
    const shareData = { title: name, text: `Check out ${name} on Bamtol World! ${hashTags}`, url: window.location.href };
    try {
        if (navigator.share) { await navigator.share(shareData); } 
        else { navigator.clipboard.writeText(`${name} - ${hashTags} - ${window.location.href}`); alert("Product link copied!"); }
    } catch (e) {}
}

function copyAddress() {
    navigator.clipboard.writeText(document.getElementById('showroom-address-text').innerText);
    alert("Showroom address copied!");
}

function navigateTo(viewId) {
    document.getElementById("categoryMenu").classList.remove("show");
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active-view'));
    if (viewId !== 'catalog') currentActiveCategory = "";
    updateDropdownDots();
    const homeIcon = document.getElementById("headerHomeIcon");
    if (homeIcon) { homeIcon.style.display = (viewId === 'home') ? "none" : "flex"; }
    document.getElementById(`${viewId}-view`).classList.add('active-view');
    window.scrollTo(0, 0);
}

function toggleDropdown(e) { e.stopPropagation(); document.getElementById("categoryMenu").classList.toggle("show"); }

function updateDropdownDots() {
    ['clothing', 'footwear', 'accessories', 'jewelry'].forEach(cat => {
        const el = document.getElementById(`dot-${cat}`);
        if(el) el.innerHTML = (cat === currentActiveCategory) ? "&#8226;" : "";
    });
}

function buildFilterBar() {
    const r1Box = document.getElementById('row1-tags');
    const r2Box = document.getElementById('row2-tags');
    if(!r1Box || !r2Box) return;
    r1Box.innerHTML = ""; r2Box.innerHTML = "";
    const catData = storeData[currentActiveCategory];
    catData.row1.forEach(t => { r1Box.innerHTML += `<button class="tag-btn ${t===selectedRow1Tag?'active-tag':''}" onclick="setFilter('r1','${t}')">${t}</button>`; });
    catData.row2.forEach(t => { r2Box.innerHTML += `<button class="tag-btn ${t===selectedRow2Tag?'active-tag':''}" onclick="setFilter('r2','${t}')">${t}</button>`; });
}

function setFilter(row, val) {
    if(row === 'r1') selectedRow1Tag = val;
    if(row === 'r2') selectedRow2Tag = val;
    buildFilterBar(); renderCatalogItems();
}

function handleSearch() { renderCatalogItems(); }
function clearSearch() { document.getElementById('catalogSearch').value = ""; renderCatalogItems(); }
function clickHash(tagText) { document.getElementById('catalogSearch').value = tagText; renderCatalogItems(); }

function renderCatalogItems() {
    const grid = document.getElementById('product-display');
    if(!grid) return; grid.innerHTML = '';
    const searchVal = document.getElementById('catalogSearch').value.toLowerCase().trim();
    const data = storeData[currentActiveCategory];

    if(!data.items || data.items.length === 0) {
        grid.innerHTML = '<p style="text-align:center; color:#888; width:100%; padding:40px;">No items found in this section yet. Add stock items directly into your Google Sheet inventory!</p>';
        return;
    }

    data.items.forEach(item => {
        if (selectedRow1Tag !== "All" && item.r1 !== selectedRow1Tag && item.r1 !== "All") return;
        if (selectedRow2Tag !== "All" && item.r2 !== selectedRow2Tag) return;
        const combinedHash = item.hash.join(' ');
        if (searchVal !== "") {
            const matchName = item.name.toLowerCase().includes(searchVal);
            const matchDesc = item.desc.toLowerCase().includes(searchVal);
            const matchHash = combinedHash.toLowerCase().includes(searchVal);
            if (!matchName && !matchDesc && !matchHash) return;
        }
        const hashHTML = item.hash.map(h => `<span onclick="event.stopPropagation(); clickHash('${h}')">${h}</span>`).join(' ');
        const waText = encodeURIComponent(`Hello Bamtol World! I would like to order the ${item.name} (${formatPrice(item.price)}). Is it available?`);
        grid.innerHTML += `
            <div class="product-card">
                <button class="share-card-btn" onclick="shareProduct('${item.name}', '${combinedHash}')">🔗</button>
                <img src="${item.imageFile}" class="product-img" onerror="this.src='gii.png'">
                <div class="product-info">
                    <h3 class="product-title">${item.name}</h3><p class="product-desc">${item.desc}</p>
                    <div class="product-tags-display">${hashHTML}</div><p class="product-price">${formatPrice(item.price)}</p>
                </div>
                <a href="https://wa.me{waText}" target="_blank" class="order-whatsapp-btn">Order on WhatsApp</a>
            </div>`;
    });
}

function renderHomeDeals() {
    const target = document.getElementById('deals-display');
    if(!target) return; target.innerHTML = "";
    let hasDeals = false;
    Object.keys(storeData).forEach(cat => {
        storeData[cat].items.forEach(item => {
            if (!item.deal) return; hasDeals = true;
            const combinedHash = item.hash.join(' ');
            const waText = encodeURIComponent(`Hello Bamtol World! I saw this Special Deal on your Homepage: ${item.name} (${formatPrice(item.price)}). Is it available?`);
            target.innerHTML += `
                <div class="product-card">
                    <button class="share-card-btn" onclick="shareProduct('${item.name}', '${combinedHash}')">🔗</button>
                    <img src="${item.imageFile}" class="product-img" onerror="this.src='gii.png'">
                    <div class="product-info">
                        <h3 class="product-title">${item.name}</h3><p class="product-desc">${item.desc}</p>
                        <p class="product-price" style="background-color:#d4af37; color:#111;">${formatPrice(item.price)}</p>
                    </div>
                    <a href="https://wa.me{waText}" target="_blank" class="order-whatsapp-btn">Claim Deal on WhatsApp</a>
                </div>`;
        });
    });
    if (!hasDeals) {
        target.innerHTML = '<p style="text-align:center; color:#888; width:100%;">Welcome! Any items added to your Google Sheet spreadsheet inventory marked as TRUE for Special Deal will display here automatically.</p>';
    }
}

function openCatalog(categoryKey) {
    currentActiveCategory = categoryKey;
    selectedRow1Tag = "All";
    selectedRow2Tag = "All";
    
    if (document.getElementById('catalogSearch')) {
        document.getElementById('catalogSearch').value = "";
    }
    
    updateDropdownDots();
    document.getElementById('category-title').innerText = storeData[categoryKey].title;
    document.getElementById('category-subtitle').innerText = storeData[categoryKey].subtitle;
    buildFilterBar();
    renderCatalogItems();
    navigateTo('catalog');
}

window.onclick = function(e) {
    if (!e.target.matches('.three-dots-btn')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            if (dropdowns[i].classList.contains('show')) {
                dropdowns[i].classList.remove('show');
            }
        }
    }
}

window.onload = function() {
    fetchCloudInventory();
    renderHomeDeals();
};
