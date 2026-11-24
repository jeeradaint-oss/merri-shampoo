// ==========================================================================
// Body Scent / merri - Main Application Script (script.js)
// ==========================================================================

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyS8z7lTy0tWc-WWg47weK0J_Y-qPEIcj_ZoJBgXc2E0GcXfROyU1PmTlILGJz9FofK7w/exec';
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSILuLnpAQ-W9P3bRVPOavAcBq7bgcVB42768J8Svrmixk6DbZod03hxH5kZ0CTmnzqAzguVe6VfATg/pub?gid=649715055&single=true&output=csv';

document.addEventListener('DOMContentLoaded', () => {
  // 1. หน้า product.html: โหลดสินค้าและกรองตาม mood
  if (document.getElementById('product-list')) {
    initProductPage();
  }

  // 2. หน้า order.html: รับค่า item & price จาก URL และส่งฟอร์มไป Apps Script
  if (document.getElementById('orderForm')) {
    initOrderPage();
  }

  // 3. หน้า admin.html: ดึงข้อมูลจาก Google Sheets CSV มาแสดงในตาราง
  if (document.querySelector('#ordersTable tbody')) {
    initAdminPage();
  }
});

// ==========================================================================
// 1. PRODUCT PAGE (product.html)
// ==========================================================================

let allProducts = [];

const MOOD_OPTIONS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'fresh', label: 'Fresh' },
  { key: 'sweet', label: 'Sweet' },
  { key: 'confident', label: 'Confident' },
  { key: 'romance', label: 'Romance' }
];

function initProductPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialMood = (urlParams.get('mood') || 'all').toLowerCase();

  renderFilterButtons(initialMood);

  fetch('products.json')
    .then(response => {
      if (!response.ok) throw new Error('ไม่สามารถโหลดไฟล์ products.json ได้');
      return response.json();
    })
    .then(products => {
      allProducts = products;
      filterAndRenderProducts(initialMood);
    })
    .catch(error => {
      console.error('Error loading products:', error);
      const listEl = document.getElementById('product-list');
      if (listEl) {
        listEl.innerHTML = '<p style="text-align:center; width:100%;">ไม่สามารถโหลดรายการสินค้าได้ในขณะนี้</p>';
      }
    });
}

function renderFilterButtons(activeMood) {
  const filterBar = document.getElementById('filter-bar');
  if (!filterBar) return;

  filterBar.innerHTML = MOOD_OPTIONS.map(mood => {
    const isActive = mood.key === activeMood ? 'active' : '';
    const dotHtml = mood.key !== 'all' ? `<span class="mood-dot"></span>` : '';
    return `
      <button type="button" class="filter-btn ${isActive}" data-mood="${mood.key}">
        ${dotHtml}${mood.label}
      </button>
    `;
  }).join('');

  filterBar.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedMood = btn.getAttribute('data-mood');

      filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // อัปเดต URL parameter โดยไม่รีโหลดหน้า
      const newUrl = new URL(window.location);
      if (selectedMood === 'all') {
        newUrl.searchParams.delete('mood');
      } else {
        newUrl.searchParams.set('mood', selectedMood);
      }
      window.history.replaceState({}, '', newUrl);

      filterAndRenderProducts(selectedMood);
    });
  });
}

function filterAndRenderProducts(mood) {
  const listEl = document.getElementById('product-list');
  if (!listEl) return;

  const filtered = mood === 'all'
    ? allProducts
    : allProducts.filter(p => (p.mood || '').toLowerCase() === mood);

  if (filtered.length === 0) {
    listEl.innerHTML = '<p style="text-align:center; grid-column: 1 / -1;">ไม่พบสินค้าในหมวดหมู่นี้</p>';
    return;
  }

  listEl.innerHTML = filtered.map(product => {
    const itemText = `${product.name} ${product.size}`.trim();
    const orderUrl = `order.html?item=${encodeURIComponent(itemText)}&price=${encodeURIComponent(product.price)}`;

    return `
      <article class="product-card" data-mood="${(product.mood || '').toLowerCase()}">
        <div class="product-image-wrap">
          <img src="${product.image}" alt="${product.name}">
        </div>
        <div class="product-body">
          <div class="product-meta">
            <span class="product-mood-tag">
              <span class="mood-dot"></span>${product.mood}
            </span>
            <span>${product.size}</span>
          </div>
          <h3 class="product-title">${product.name}</h3>
          <span class="mood-underline"></span>
          <p class="product-desc">${product.description || ''}</p>
          <div class="product-footer">
            <span class="product-price">฿${product.price}</span>
            <a href="${orderUrl}" class="btn btn-sm">สั่งซื้อ</a>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ==========================================================================
// 2. ORDER PAGE (order.html)
// ==========================================================================

function initOrderPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const itemParam = urlParams.get('item');
  const priceParam = urlParams.get('price');

  const itemsInput = document.getElementById('items');
  const totalInput = document.getElementById('total');

  // เติมชื่อสินค้าและราคาลงในฟอร์มอัตโนมัติทันทีที่โหลดหน้า
  if (itemsInput && itemParam !== null) {
    itemsInput.value = itemParam;
  }
  if (totalInput && priceParam !== null) {
    totalInput.value = priceParam;
  }

  const orderForm = document.getElementById('orderForm');
  orderForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const submitBtn = orderForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'กำลังส่งคำสั่งซื้อ...';
    }

    const payload = {
      customerName: document.getElementById('customerName').value.trim(),
      contact: document.getElementById('contact').value.trim(),
      items: document.getElementById('items').value.trim(),
      total: document.getElementById('total').value.trim(),
      note: document.getElementById('note').value.trim()
    };

    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => {
      window.location.href = 'thankyou.html';
    })
    .catch(error => {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'ยืนยันสั่งซื้อ';
      }
    });
  });
}

// ==========================================================================
// 3. ADMIN PAGE (admin.html)
// ==========================================================================

function initAdminPage() {
  const tbody = document.querySelector('#ordersTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">กำลังโหลดข้อมูลคำสั่งซื้อ...</td></tr>';

  fetch(CSV_URL)
    .then(response => {
      if (!response.ok) throw new Error('ไม่สามารถดึงข้อมูล CSV ได้');
      return response.text();
    })
    .then(csvText => {
      const rows = parseCSV(csvText);

      // ตัดแถวหัวตาราง (แถวแรก) ออก และกรองแถวว่าง
      const dataRows = rows.slice(1).filter(row => row.some(cell => cell.trim() !== ''));

      if (dataRows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">ยังไม่มีรายการคำสั่งซื้อ</td></tr>';
        return;
      }

      // เรียงจากรายการล่าสุดขึ้นก่อน (ข้อมูลใหม่ใน Google Sheets จะต่อท้ายล่างสุด จึง reverse)
      const latestFirstRows = dataRows.reverse();

      tbody.innerHTML = latestFirstRows.map(cols => {
        const timestamp = escapeHTML(cols[0] || '');
        const customerName = escapeHTML(cols[1] || '');
        const contact = escapeHTML(cols[2] || '');
        const items = escapeHTML(cols[3] || '');
        const total = escapeHTML(cols[4] || '');
        const note = escapeHTML(cols[5] || '');

        return `
          <tr>
            <td>${timestamp}</td>
            <td>${customerName}</td>
            <td>${contact}</td>
            <td>${items}</td>
            <td>${total}</td>
            <td>${note}</td>
          </tr>
        `;
      }).join('');
    })
    .catch(error => {
      console.error('Error loading CSV:', error);
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">เกิดข้อผิดพลาดในการโหลดข้อมูลคำสั่งซื้อ</td></tr>';
    });
}

/**
 * ฟังก์ชัน Parse CSV เอง (รองรับข้อความที่มีเครื่องหมายจุลภาค "," หรือขึ้นบรรทัดใหม่ภายในเครื่องหมายคำพูด "")
 */
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // ข้ามเครื่องหมายคำพูดซ้อน ""
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      rows.push(currentRow);
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal !== '' || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    rows.push(currentRow);
  }

  return rows;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
