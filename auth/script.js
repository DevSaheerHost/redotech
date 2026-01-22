import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth , createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

import {firebaseConfig} from '../firebase/config.js';


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
const user = auth.currentUser



const $ = s => document.querySelector(s);

const App = {
  error: null,
  busy: false,
};



App.auth={
    mode:'login',
  }
  
  
App.ui={
  form:$('form'),
  authError:$('.auth-card .error'),
  switchAuthMode:$('#switchMode'),
  authModeLabel: $('#authModeLabel'),
  authSubmitBtn: $('#authSubmitBtn'),
  email: $('#email'),
  password: $('#password')
}


//--------- AUTH START -----------//

const setError = (msg) => {
  App.error = msg;
  App.ui.authError.textContent=App.error
  console.error(msg);
};

const setBusy = (v) => App.busy = v;

const toggleAuthMode=e=>{
  const target = e.currentTarget
  const currMode = App.auth.mode 
  App.auth.mode=currMode==='login'?'signup':'login'
  target.textContent= App.auth.mode==='login'?'Create one': 'Login'
  
  
  authModeLabel.textContent=App.auth.mode ==='login'?`Don't have an account?`:'Already registered?'
  
  authSubmitBtn.textContent=App.auth.mode==='login'?'Login':'Create account'
}

const handleSubmit = async (e) => {
  e.preventDefault();
  setBusy(true);
  const email = App.ui.email.value
  const password = App.ui.password.value
  if(password.length < 6){
    setError('Password minimum 6 char');
    return
  }
  authSubmitBtn.textContent='Requesting...'  
  authSubmitBtn.disabled=true
  try {
    if (App.auth.mode === 'login') {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
    }
  } catch (err) {
      authSubmitBtn.disabled=false;
      authSubmitBtn.textContent=App.auth.mode==='login'?'Login':'Create account'


    setError(getAuthErrorMessage(err))
  } finally {
    setBusy(false);
  }
};



const getAuthErrorMessage = (err) => {
  console.log(err.code)
  const code = err.code || '';

  if (code.includes('auth/invalid-credential'))
    return 'Incorrect email or password';

  if (code.includes('auth/invalid-email'))
    return 'Please enter a valid email address';

  if (code.includes('auth/user-not-found'))
    return 'No account found with this email';

  if (code.includes('auth/wrong-password'))
    return 'Incorrect password';

  if (code.includes('auth/email-already-in-use'))
    return 'This email is already registered';

  if (code.includes('auth/weak-password'))
    return 'Password should be at least 6 characters';

  if (code.includes('auth/network-request-failed'))
    return 'Network error. Check your internet connection';

  if (code.includes('auth/too-many-requests'))
    return 'Too many attempts. Try again later';

  return 'Login failed. Please try again';
};




onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log(user.uid);
    window.location='../'
  } else {
    console.log('Not logged in');
    
  }
});
//--------- AUTH END -----------//









document.addEventListener('DOMContentLoaded', () => {
  App.ui.form.onsubmit = handleSubmit;
  App.ui.switchAuthMode.onclick=e=>toggleAuthMode(e)
  
});