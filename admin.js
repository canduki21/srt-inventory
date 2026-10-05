function stockClass(n, lowAt) {
  if (n === 0)      return 'n-zero';
  if (n <= lowAt)   return 'n-low';
  return 'n-ok';
}

async function loadAdminInventory() {
  const container = document.getElementById('table-container');
  const lastUpdated = document.getElementById('last-updated');

  try {
    const url = `https://api.airtable.com/v0/${CONFIG.BASE_ID}/${encodeURIComponent(CONFIG.TABLE_NAME)}`
              + `?sort[0][field]=SKU&sort[0][direction]=asc&pageSize=100`;

    const res  = await fetch(url, {
      headers: { Authorization: `Bearer ${CONFIG.API_KEY}` }
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    lastUpdated.textContent = 'Updated ' + new Date().toLocaleTimeString();

    const wrap = document.createElement('div');
    wrap.className = 'admin-table-wrap';

    const table = document.createElement('table');
    table.className = 'admin-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>SIMULANT</th>
          <th>1 KG</th>
          <th>5 KG</th>
          <th>20 KG</th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement('tbody');

    data.records.forEach(r => {
      const f   = r.fields;
      const s1  = f.Stock_1kg  ?? 0;
      const s5  = f.Stock_5kg  ?? 0;
      const s20 = f.Stock_20kg ?? 0;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${f.SKU}</td>
        <td class="${stockClass(s1,  5)}">${s1}</td>
        <td class="${stockClass(s5,  3)}">${s5}</td>
        <td class="${stockClass(s20, 2)}">${s20}</td>
      `;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    wrap.appendChild(table);
    container.className = '';
    container.innerHTML = '';
    container.appendChild(wrap);

  } catch (err) {
    container.textContent = '⚠ Could not load inventory — check config.js';
    console.error(err);
  }
}

loadAdminInventory();
