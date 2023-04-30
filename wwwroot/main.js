import { initViewer, loadModel } from './viewer.js';
import { initTree } from './sidebar.js';
import {getAllItems} from './dashboard.js';

// function getHubsAsync() {
//     return new Promise(async (resolve, reject) => {
//         const resp = await fetch('/api/hubs');
//         if(resp.ok) {
//             resolve(resp.json());
//         } else {
//             reject(await resp.text());
//         }
//     });
// }
// async function getHubsAsync2() {
//   return await fetch("/api/hubs")
//     .then((res) => res.json())
//     .catch((err) => console.error(err));
// }
// async function getProjectsInHubAsync(hubId) {
//   return await fetch(`/api/hubs/${hubId}/projects`)
//     .then((res) => res.json())
//     .catch((err) => console.error(err));
// }

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

        // const hubs = await getHubsAsync2();
        // console.log("hubs:", hubs);
        // const projects1 = await getProjectsInHubAsync('a.YnVzaW5lc3M6YXV0b2Rlc2s2MTMy');
        // // const projects2 = await getProjectsInHubAsync('b.5f045cf4-0872-47b6-96b7-a90d703b0735');
        // console.log("projects1:", projects1);
        // console.log("projects2:", projects2);

        let allItems = await getAllItems()
        // .then((d) =>
        //   console.log("all items:", d)
        // );
        // console.log("all items v3:", allItems);

        // Promise.all(allItems).then(d => { console.log(">>", d);});

    } else {
        login.innerText = 'Login';
        login.onclick = () => window.location.replace('/api/auth/login');
    }
    login.style.visibility = 'visible';
} catch (err) {
    alert('Could not initialize the application. See console for more details.');
    console.error(err);
}