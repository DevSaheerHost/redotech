import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { firebaseConfig } from "../firebase/config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const $ = s => document.querySelector(s);

// extract uid & customerId from URL
const [, uid, customerId] = location.pathname.split('/').slice(-3);
//const uid = `HHCrOMN79LfcMPJWYWXLcy6n4LF2`
//const customerId= '-Oj_HhEg3h5YyevwilnW';
$('#test').textContent=`${uid}, ${customerId}`
if (!uid || !customerId) {
  $('#error').textContent = 'Invalid tracking link';
  $('#loading').remove();
  throw new Error('Invalid URL');
}

const customerRef = ref(db, `customers/${uid}/${customerId}`);



onValue(customerRef, (snapshot) => {
  if (!snapshot.exists()) {
    $('#error').textContent = 'Tracking not found';
    $('#loading')?.remove();
    return;
  }

  const data = snapshot.val();

  $('#name').textContent = data.name || '';
  $('#device').textContent = data.device || '';
  $('#issue').textContent = data.issue || '';

  // STATUS (reset + update)
  const statusEl = $('#status');
  statusEl.textContent = data.status || 'Pending';

  // remove old status classes
  statusEl.className = 'badge';
  if (data.status) {
    statusEl.classList.add(data.status);
  }
  
  // ALERT 
  
  //if (window.lastStatus && window.lastStatus !== data.status) {
  // alert('Status updated to: ' + data.status);
//}
//window.lastStatus = data.status;

  // HISTORY
  const history = Object.values(data.statusHistory || {})
    .sort((a, b) => b.at - a.at);

  $('#history').innerHTML = history.map(h =>
    `<li>${new Date(h.at).toLocaleString()} – ${h.status}</li>`
  ).join('');

  $('#card').classList.remove('hidden');
  $('#loading')?.remove();
});




if (window.lastStatus && window.lastStatus !== data.status) {
  alert('Status updated to: ' + data.status);
}
window.lastStatus = data.status;