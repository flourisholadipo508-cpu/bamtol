let currentActiveCategory = "";
let selectedRow1Tag = "All";
let selectedRow2Tag = "All";
let activeCurrency = "NGN";
const usdRate = 1500;

// --- ⚡ INSTANT CONTENTFUL DATABASE PIPELINE CONTROLS ---
const SPACE_ID = "pcxjqx2p5oqh";
const ACCESS_TOKEN = "MIy89CjGo6KQGx9iezs_DquLi47xfZJPKWs85Ng8IR0";

const storeData = {
    clothing: { title: "Premium Clothing", subtitle: "Luxury outer layers and tailored silhouettes.", row1: ["All", "Men", "Women", "Kids"], row2: ["All", "Formal", "Casual", "Sport", "Native", "Undergarment"], items: [] },
    footwear: { title: "Signature Footwear", subtitle: "Hand-finished premium pairs structured for grace.", row1: ["All", "Men", "Women"], row2: ["All", "Formal", "Casual", "Sport"], items: [] },
    accessories: { title: "Luxury Accessories", subtitle: "Distinct accents to complete an elite ensemble.", row1: ["All", "Men", "Women"], row2: ["All"], items: [] },
    jewelry: { title: "Fine Jewelry", subtitle: "Exquisite investment statement pieces.", row1: ["All"], row2: ["All", "Whole Sets", "Watches", "Necklaces", "Rings", "Bracelets"], items: [] }
};

// Automated Cloud Pipeline Fetcher
async function fetchCloudInventory() {
    const url = `https://contentful.com{SPACE_ID}/environments/master/entries?access_token=${ACCESS_TOKEN}&content_type=boutiqueItem&include=2`;
    try {
        const res = await fetch(url);
        const json = await res.json();
        if (json.items) { processContentfulData(json); }
    } catch (err) { console.error("Cloud Connection Error:", err); }
}

function processContentfulData(data) {
    Object.keys(storeData).forEach(cat => storeData[cat].items = []);
    
    // Create image dictionary lookup map
    const mediaMap = {};
    if (data.includes && data.includes.Asset) {
        data.includes.Asset.forEach(asset => {
            if (asset.fields && asset.fields.file) {
                let fileObj = asset.fields.file;
                let fileUrl = "";
                
                // Safely handle localized or flat image url paths
                if (typeof fileObj === 'string') { fileUrl = fileObj; }
                else if (fileObj.url) { fileUrl = fileObj.url; }
                else { for (let key in fileObj) { if (fileObj[key] && fileObj[key].url) fileUrl = fileObj[key].url; } }
                
                if (fileUrl) {
                    if (!fileUrl.startsWith("https:")) fileUrl = "https:" + fileUrl;
                    mediaMap[asset.sys.id] = fileUrl;
                }
            }
        });
    }

    data.items.forEach(entry => {
        const rawFields = entry.fields;
        if (!rawFields) return;

        // 🌟 AUTOMATIC UNWRAPPER: Converts {"en-US": "value"} into flat "value" fields
        const fields = {};
        for (let key in rawFields) {
            let val = rawFields[key];
            if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val.sys)) {
                let localeKeys = Object.keys(val);
                fields[key] = localeKeys.length > 0 ? val[localeKeys[0]] : val;
            } else {
                fields[key] = val;
            }
        }

        // Standardize category and tag names to all lowercase strings
        const targetCategory = fields.category ? String(fields.category).toLowerCase().trim() : 'clothing';
        
        let imageUrl = "gii.png";
        if (fields.productImage) {
            let assetId = "";
            if (fields.productImage.sys) {
                assetId = fields.productImage.sys.id;
            } else if (typeof fields.productImage === 'object') {
                let localeKey = Object.keys(fields.productImage);
                if (fields.productImage[localeKey] && fields.productImage[localeKey].sys) {
                    assetId = fields.productImage[localeKey].sys.id;
                }
            }
            if (assetId && mediaMap[assetId]) imageUrl = mediaMap[assetId];
        }

        if (storeData[targetCategory]) {
            storeData[targetCategory].items.push({
                name: fields.name || "Boutique Essential",
                desc: fields.desc || "",
                price: Number(fields.price || 0),
                r1: fields.filterProfile || "All",
                r2: fields.filterStyle || "All",
                hash: Array.isArray(fields.searchHashtags) ? fields.searchHashtags : [],
                imageFile: imageUrl,
                deal: fields.isSpecialDeal === true || fields.isSpecialDeal === "true"
            });
        }
    });
    
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
        grid.innerHTML = '<p style="text-align:center; color:#888; width:100%; padding:40px;">No items found in this section yet. Open Contentful to upload stock items!</p>';
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
            if (!item.deal) return;
            hasDeals = true;
            const combinedHash = item.hash.join(' ');
            const waText = encodeURIComponent(`Hello Bamtol World! I saw this Special Deal on your Homepage: ${item.name} (${formatPrice(item.price)}). Is it available?`);
            
            target.innerHTML += `
                <div class="product-card"> 
                    <button class="share-card-btn" onclick="shareProduct('${item.name}', '${combinedHash}')">🔗</button> 
                    <img src="${item.imageFile}" class="product-img" onerror="this.src='gii.png'"> 
                    <div class="product-info"> 
                        <h3 class="product-title">${item.name}</h3>
                        <p class="product-desc">${item.desc}</p> 
                        <p class="product-price" style="background-color:#d4af37; color:#111;">${formatPrice(item.price)}</p> 
                    </div> 
                    <a href="https://wa.me{waText}" target="_blank" class="order-whatsapp-btn">Claim Deal on WhatsApp</a> 
                </div>`;
        });
    });

    if (!hasDeals) { 
        target.innerHTML = '<p style="text-align:center; color:#888; width:100%;">Welcome! Any items uploaded in Contentful with Special Deal set to True will display here automatically.</p>'; 
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
