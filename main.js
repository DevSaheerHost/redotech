import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, push, onValue, update, remove } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
console.log('App running Smother')
import {firebaseConfig} from '/firebase/config.js';
const $ = s => document.querySelector(s)

const CACHE_KEY = 'redotech_customers';
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

const App={
  state:{},
  ui:{},
}
App.ui = {
  authError:$('.authError')
}

App.ui.form = {
  name: $('#name'),
  phone: $('#number'),
  device: $('#device'),
  issue: $('#issue'),
  status: 'pending'
};

App.state = {
  editingCustomerId: null
};

const setError = (msg) => {
  App.error = msg;
  App.ui.authError.textContent=App.error
  console.error(msg);
};


const setSaving = (v) => App.busy = v;

App.state.customers = [];      // source of truth
App.state.filteredCustomers = []; // what UI shows



// const userRef = ref(db, 'users/123');
//await set(userRef, { name: 'Babu' });


// for log
// push(ref(db, 'logs'), {
//   msg: 'hello',
//   time: Date.now()
// });











const fetchData = () => {
  const uid = App.auth.user.uid;

  // 🚀 1. Load from cache first (instant UI)
  const cached = loadCache();
  if (cached) {
    console.log('Loaded from cache');
    setCustomers(cached);
    setLoading(false);
  }

  // 🔄 2. Then listen to Firebase (real-time + fresh)
  const listRef = ref(db, `customers/${uid}`);
  const unsub = onValue(listRef, (snapshot) => {
    const data = snapshot.val() || {};
    const parsed = Object.entries(data).map(([id, value]) => ({
      id,
      ...value,
    }));

    parsed.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

// ✅ single source of truth
App.state.customers = parsed;
App.state.filteredCustomers = parsed;

// render
setCustomers(App.state.filteredCustomers);
saveCache(parsed);

    if (parsed.length === 0) {
      $('#loadingLabel').textContent = 'No customers yet.';
    } else {
      $('#loadingLabel') && $('#loadingLabel').remove();
    }

    // ✅ Update UI
    
    setLoading(false);

    // 💾 Save to cache
    

// const searchInput=$('#rtSearchInput')
// const resultsBox = $('#rtSearchResults');
// searchInput.addEventListener('input', () => {
//     const q = searchInput.value.toLowerCase().trim();
//     resultsBox.innerHTML = '';
//     if (!q) return;

//     Object.values(data).forEach(item => {
//       const hay = `${item.name} ${item.phone} ${item.ticketId}`.toLowerCase();
// console.log(hay)
//       if (hay.includes(q)) {
//         resultsBox.innerHTML += `
//           <div class="rt-result-card">
//             <div class="rt-result-name">${item.name}</div>
//             <div class="rt-result-meta">${item.phone} • ${item.device}</div>
//           </div>
//         `;
//       }
//     });
// })

  });

  return () => unsub();
};
const setCustomers=(d)=>{
  $('#customerList').innerHTML = d.map((c)=>getCustomerList(c)).join('')
}
const setLoading = (v) => App.loading = v;




const searchInput = $('#rtSearchInput');
const resultsBox = $('#rtSearchResults');

if (searchInput) {
  searchInput.addEventListener('input', () => {
    applySearchAndFilters();
  });
}



function applySearchAndFilters() {
  const q = (searchInput?.value || '').toLowerCase().trim();

  const fromDate = filterFromDate?.value;
  const toDate = filterToDate?.value;
  const minAmount = Number(filterMinAmount?.value || 0);
  const maxAmount = Number(filterMaxAmount?.value || Infinity);
  const name = (filterName?.value || '').toLowerCase();
  const phone = filterPhone?.value || '';

  const filtered = App.state.customers.filter(c => {
    // 🔎 Search
    const hay = `${c.name} ${c.phone} ${c.device} ${c.issue}`.toLowerCase();
    if (q && !hay.includes(q)) return false;

    // 👤 Name
    if (name && !c.name?.toLowerCase().includes(name)) return false;

    // 📞 Phone
    if (phone && !String(c.phone || '').includes(phone)) return false;

    // 💰 Amount
    const amt = Number(c.amount || 0);
    if (amt < minAmount || amt > maxAmount) return false;

    // 📅 Date
    if (fromDate || toDate) {
      const created = new Date(c.createdAt || 0).toISOString().slice(0,10);
      if (fromDate && created < fromDate) return false;
      if (toDate && created > toDate) return false;
    }

    return true;
  });

  App.state.filteredCustomers = filtered;
  setCustomers(filtered);

  // Optional: show count
  //console.log(filtered);
}



function applyFilters() {
  applySearchAndFilters();
  closeFilterPopup();
}



const onStatusChange = (e) => {
  const select = e.target;
  if (select.tagName !== 'SELECT') return;

  const customerId = select.dataset.id;
  const newStatus = select.value;
  const uid = App.auth.user.uid;

  const customerRef = ref(db, `customers/${uid}/${customerId}`);
  const historyRef = ref(db, `customers/${uid}/${customerId}/statusHistory`);

  const now = Date.now();

  const updates = {};
  updates['status'] = newStatus;
  updates['updatedAt'] = now;

  update(customerRef, updates);

  push(historyRef, {
    status: newStatus,
    at: now
  });
};




const StatusBadge = (status) =>
  `<span class="badge ${status}">${status}</span>`;

const getCustomerList = c => {
  const amount = Number(c.amount || 0);
  const advance = Number(c.advance || 0);
  const balance = amount - advance;

  return `
  <li class="list-item">
    <div class="item-main">
      <div>
        <p class="title">
          ${c.name}
          ${StatusBadge(c.status)}
        </p>

        <p class="muted small">
          ${c.device} • <a href="tel:${c.phone}">${c.phone}</a>
        </p>

        <p class="muted small">${c.issue}</p>

        <!-- 💰 Finance Row -->
        <div class="finance-row">
          <span>Total: <b>₹${amount}</b></span>
          <span>Advance: <b class="adv">₹${advance}</b></span>
          <span>Balance: 
            <b class="${balance > 0 ? 'bal-due' : 'bal-clear'}">
              ₹${balance}
            </b>
          </span>
        </div>
      </div>
    </div>

    <div class="item-actions">
      <select data-id="${c.id}">
        <option value="pending" ${c.status === 'pending' ? 'selected' : ''}>Pending</option>
        <option value="in-progress" ${c.status === 'in-progress' ? 'selected' : ''}>In progress</option>
        <option value="waiting-parts" ${c.status === 'waiting-parts' ? 'selected' : ''}>Waiting for parts</option>
        <option value="ready" ${c.status === 'ready' ? 'selected' : ''}>Ready for pickup</option>
        <option value="done" ${c.status === 'done' ? 'selected' : ''}>Done</option>
      </select>

      <div class="tool">
        <button class="ghost delete-btn" data-id="${c.id}">Delete</button>
        <button class="ghost edit-btn" data-id="${c.id}">Edit</button>
      </div>

      <button class="ghost copy-btn" data-url="${c.trackingUrl}">
        Copy tracking link
      </button>
    </div>
  </li>
  `;
}





$('#customerList').addEventListener('change', onStatusChange);



onAuthStateChanged(auth, (user) => {
  if (user) {
    App.auth={
      user: user
    }
   // console.log(user.uid);
    $('#emailLabel').textContent=user.email
    fetchData()
  } else {
    console.log('Not logged in');
    window.location='./auth'
    $('#logout-btn').textContent='LogIn'
  }
});




const renderSPA = () => {
  const page = location.hash.replace('#', '') || 'serviceView';

  document.querySelectorAll('.view').forEach(el => {
   // el.classList.remove('hidden', el.id === page);
   el.classList.add('hidden')
  });
  $(`#${page}`)&& $(`#${page}`).classList.remove('hidden')
  if(page ==='formView')$('#name').focus()
};



window.addEventListener('hashchange', renderSPA);
window.addEventListener('DOMContentLoaded', renderSPA);

$('.fab').onclick =()=>location.hash='formView'







$('form').onsubmit=(e)=>handleAdd(e)




const handleAdd = async (e) => {
  e.preventDefault();

  setSaving(true);
  
  App.ui.form = {
  name: $('#name').value,
  phone: $('#number').value,
  device: $('#device').value,
  issue: $('#issue').value,
  status: 'pending',
  amount: $('#amount').value,
  advance : $('#advance').value
};


  try {
    const uid = App.auth.user.uid;
    const customersRef = ref(db, `customers/${uid}`);
  //  const newItemRef = push(customersRef);
    const customerId =
  App.state.editingCustomerId || push(customersRef).key;

const customerRef = ref(db, `customers/${uid}/${customerId}`);

    const now = Date.now();

    const trackingUrl =
      `${window.location.origin}/track/${uid}/${customerRef.key}`;

    const payload = {
      ...App.ui.form,
      trackingUrl,
      createdAt: now,
      updatedAt: now,
      ownerEmail: App.auth.user.email,
      status: App.ui.form.status || 'pending',
      statusHistory: {
        [now]: {
          status: App.ui.form.status || 'pending',
          at: now,
          by: uid
        }
      }
    };

    await set(customerRef, payload);

    resetForm()
fetchData()
location.hash='';
  } catch (err) {
    setError(err.message || 'Unable to save customer');
  } finally {
    setSaving(false);
  }
};

const EditHandler = async (e) => {
// --------- DELETE ---------
const deleteBtn = e.target.closest('.delete-btn');
if (deleteBtn) {
  const id = deleteBtn.dataset.id;
  const uid = App.auth.user.uid;

  if (!id) {
    console.error('No customer id for delete');
    return;
  }

  const ok = confirm(
    '⚠️ This will permanently delete this service record.\n\nAre you sure?'
  );

  if (!ok) return;

  try {
    const customerRef = ref(db, `customers/${uid}/${id}`);
    await remove(customerRef);

    console.log('Customer deleted:', id);

    // Optional: remove from UI instantly
    const row = deleteBtn.closest('.customer-row, .card, tr');
    if (row) row.remove();

    //alert('Service record deleted successfully.');

  } catch (err) {
    console.error('Delete failed:', err);
    alert('Delete failed. Please try again.');
  }

  return; // ⛔ STOP HERE
}
  
  
  
  
  

  // ---------- COPY ----------
  const copyBtn = e.target.closest('.copy-btn');
  if (copyBtn) {
    const url = copyBtn.dataset.url;

    try {
      await navigator.clipboard.writeText(url);
      console.log('Tracking link copied');
      copyBtn.textContent = 'Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy tracking link', 1200);
    } catch (err) {
      console.error('Copy failed:', err);
    }
    return; // ⛔ STOP HERE
  }

  // ---------- EDIT ----------
  const editBtn = e.target.closest('.edit-btn');
  if (!editBtn) return;

  const id = editBtn.dataset.id;
  const uid = App.auth.user.uid;

  const customerRef = ref(db, `customers/${uid}/${id}`);

  onValue(customerRef, (snap) => {
    const data = snap.val();
    if (!data) return;

    $('#name').value = data.name || '';
    $('#number').value = data.phone || '';
    $('#device').value = data.device || '';
    $('#issue').value = data.issue || '';
    $('#amount').value = data.amount || '';
    $('#advance').value = data.advance || '';

    App.state.editingCustomerId = id;
    location.hash = 'formView';

  }, { onlyOnce: true });
};

$('#customerList').addEventListener('click', EditHandler);

document.addEventListener('input', (e) => {
  if (!e.target.name) return;
  App.ui.form[e.target.name] = e.target.value;
});

const resetForm = () => {
  Object.keys(App.ui.form).forEach(k => App.ui.form[k] = '');
  App.ui.form.status = 'pending';
  App.state.editingCustomerId = null;

  document.querySelector('form').reset();
};


$('#logout-btn').onclick=()=>{
  localStorage.removeItem(CACHE_KEY)
  auth.signOut()}


// install app btn visibility 
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.classList.remove('hidden');
});

installBtn?.addEventListener('click', async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log('Install choice:', outcome);

  deferredPrompt = null;
  installBtn.classList.add('hidden');
});




// save to localstorage 


const saveCache = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      at: Date.now(),
      data
    }));
  } catch (e) {
    console.warn('Cache save failed', e);
  }
};

const loadCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw).data || null;
  } catch (e) {
    console.warn('Cache load failed', e);
    return null;
  }
};


// openSearchView

function openSearchModal() {
  document.getElementById('searchView').classList.remove('hidden');
  setTimeout(() => {
    document.getElementById('rtSearchInput').focus();
  }, 50);
  
  window.location.hash='searchView'
}

function closeSearchModal() {
  document.getElementById('searchView').classList.add('hidden');
    window.history.back()

}

function openFilterPopup() {
  document.getElementById('rtFilterPopup').classList.add('active');
}

function closeFilterPopup() {
  document.getElementById('rtFilterPopup').classList.remove('active');
}



$('#openSearchView').onclick=()=>openSearchModal()
$('#closeSearchModal').onclick=()=>closeSearchModal()
$('#openFilterPopup').onclick=()=>openFilterPopup()
$('#closeFilterPopup').onclick=()=>closeFilterPopup()
$('#applyFilters').onclick=()=>applyFilters()



