import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { firebaseConfig } from "../firebase/config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const $ = s => document.querySelector(s);

// extract uid & customerId from URL
const [, uid, customerId] = location.pathname.split('/').slice(-3);

if (!uid || !customerId) {
  $('#error').textContent = 'Invalid tracking link';
  $('#loading').remove();
  throw new Error('Invalid URL');
}

const customerRef = ref(db, `customers/${uid}/${customerId}`);

get(customerRef).then(snapshot => {
  if (!snapshot.exists()) {
    $('#error').textContent = 'Tracking not found';
    return;
  }

  const data = snapshot.val();

  $('#name').textContent = data.name;
  $('#device').textContent = data.device;
  $('#issue').textContent = data.issue;

  $('#status').textContent = data.status;
  $('#status').classList.add(data.status);

  // status history
  const history = Object.values(data.statusHistory || {})
    .sort((a, b) => b.at - a.at);

  $('#history').innerHTML = history.map(h =>
    `<li>${new Date(h.at).toLocaleString()} – ${h.status}</li>`
  ).join('');

  $('#card').classList.remove('hidden');
})
.catch(err => {
  $('#error').textContent = err.message;
})
.finally(() => {
  $('#loading').remove();
});