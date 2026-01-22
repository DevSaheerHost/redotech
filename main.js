import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, push, onValue, update } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
console.log('App running Smother')
import {firebaseConfig} from '/firebase/config.js';
const $ = s => document.querySelector(s)


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





// const userRef = ref(db, 'users/123');
//await set(userRef, { name: 'Babu' });


// for log
// push(ref(db, 'logs'), {
//   msg: 'hello',
//   time: Date.now()
// });











const fetchData=()=>{
  const listRef = ref(db, `customers/${App.auth.user.uid}`)
    const unsub = onValue(listRef, (snapshot) => {
      const data = snapshot.val() || {}
      const parsed = Object.entries(data).map(([id, value]) => ({
        id,
        ...value,
      }))
      parsed.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      if (parsed.length===0) {
        $('#loadingLabel').textContent='No customers yet.'
      } else(
        $('#loadingLabel').remove()
      )
      setCustomers(parsed)
      setLoading(false)
    })
    return () => unsub()
}
const setCustomers=(d)=>{
  $('#customerList').innerHTML = d.map((c)=>getCustomerList(c)).join('')
}
const setLoading = (v) => App.loading = v;





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

const getCustomerList=c=>`


  <li class="list-item">
                  <div class="item-main">
                    <div>
                      <p class="title">
                        ${c.name}
                        ${StatusBadge(c.status)}
                      </p>
                      <p class="muted small">
                        ${c.device} • ${c.phone}
                      </p>
                      <p class="muted small">${c.issue}</p>
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
    
    
    <button class="ghost edit-btn" data-id="${c.id}">
  Edit
</button>
                    <button class="ghost copy-btn" data-url="${c.trackingUrl}">
                      Copy tracking link
                    </button>
                  </div>
                </li>
                `






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
  $(`#${page}`).classList.remove('hidden')
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
  status: 'pending'
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

  } catch (err) {
    setError(err.message || 'Unable to save customer');
  } finally {
    setSaving(false);
  }
};

const EditHandler = async (e) => {

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


$('#logout-btn').onclick=()=>auth.signOut()
