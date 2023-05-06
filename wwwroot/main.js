import { initViewer, loadModel } from './viewer.js';
import { initTree } from './sidebar.js';
import {getAllItems} from './dashboard.js';

const login = document.getElementById('login');
try {
    const resp = await fetch('/api/auth/profile');
    if (resp.ok) {
        const user = await resp.json();
        login.innerText = `Logout (${user.name})`;
        login.onclick = () => window.location.replace('/api/auth/logout');
        // const viewer = await initViewer(document.getElementById('preview'));
        // initTree('#tree', (id) => loadModel(viewer, window.btoa(id).replace(/=/g, '')));

        // Init views
        console.log("user is", user);
        const start = Date.now();
        console.log("hold on...");
        let allItems = await getAllItems();
        const end = Date.now();
        console.log(`Execution time: ${end - start} ms`);
        console.log("all your stuff:", allItems); // 161 items; 12831 ms

    } else {
        login.innerText = 'Login';
        login.onclick = () => window.location.replace('/api/auth/login');
    }
    login.style.visibility = 'visible';
} catch (err) {
    alert('Could not initialize the application. See console for more details.');
    console.error(err);
}