/* async function getHubsAsync() {
    return new Promise(async (resolve, reject) => {
        const resp = await fetch('/api/hubs');
        if(resp.ok) {
            resolve(resp.json());
        } else {
            reject(await resp.text());
        }
    });
} */

// import { all } from "../routes/hubs";

async function getHubsAsync() {
  return await fetch("/api/hubs")
    .then((res) => res.json())
    .catch((err) => console.error(err));
}
async function getProjectsInHubAsync(hubId) {
  const hubs = await fetch(`/api/hubs/${hubId}/projects`)
    .then((res) => res.json())
    .catch((err) => console.error(err));
  return hubs.map((d) => ({ ...d, parent: hubId }));
}

async function getItemsInProjectsAsync(hubId, projectId, folderId) {
  const items = await fetch(
    `/api/hubs/${hubId}/projects/${projectId}/folders/${folderId}/contents`
  )
    .then((res) => res.json())
    .catch((err) => console.error(err));

  return items.map((d) => ({ ...d, parent: !folderId ? projectId : folderId, hub: hubId, project: projectId, folder: d.id }));
}


async function reduce(asyncIter, f, init) {
  let res = init;
  for await (const x of asyncIter) {
    res = f(res, x);
  }
  return res;
}

const toArray = iter => reduce(iter, (a, x) => (a.push(x), a), []);

async function* getItemsInProjectsAsync2(hubId, projectId, folderId) {
  
  let newItems = await getItemsInProjectsAsync(hubId, projectId, folderId);

  // for await (const item of newItems) {
  //   console.log("new item:", item);
  //   // break;
  // }
  // transform 
  newItems = newItems.map((d) => ({
    parent: d.parent,
    id: d.id,
    hub: hubId,
    project: projectId,
    folder: d.id, // a folder's folder is itself!
    type: d.type,
    label: d.attributes?.displayName,
    url: d.links?.webView?.href,
    hidden: d.attributes?.hidden,
  }));

  for (const newItem of newItems) {
    // console.log('tranformed:', newItem);
    const {type, hub, project, folder} = newItem;

    
    // This will return only items but not folders
    /* if(type === "folders") {
      yield* getItemsInProjectsAsync2(hub, project, folder);
    } else {
      yield newItem;
    } */

    if(type === "folders") {
      yield newItem;
      yield* getItemsInProjectsAsync2(hub, project, folder);
    } else {
      yield newItem;
    }

  }
  
}

function forAwait(asyncIter, f) {
  asyncIter.next().then(({ done, value }) => {
    if (done) return;
    f(value);
    forAwait(asyncIter, f);
  });
}

// returns a dataTable consisting of rows of items
async function* getAllItemsRecursively(
  folderItems
) {

  let dataTable = [];

  let newItems = await Promise.all(
    await folderItems.map((item) =>
      getItemsInProjectsAsync(item.hub, item.project, item?.folder)
    )
  );

  newItems = _.flatten(newItems).map((d) => ({
    parent: d.parent, // folders? we got this from the async call
    id: d.id,
    hub: d.hub,
    project: d.project,
    folder: d.folder,
    type: d.type,
    label: d.attributes?.name,
    url: d.links?.webView?.href,
    hidden: undefined,
  }));

  console.log("new items:::", newItems);

  dataTable?.push(...newItems);

  const newFolders = newItems
    .flat()
    .filter((d) => d.type === "folders");

  if (newFolders.length > 0) {
    yield getAllItemsRecursively(newFolders);
  }
   else {
    yield dataTable;
  }
}

/* Get all the items under the user's ACC hubs */
async function getAllItemsAsync() {

    // v3
    //a.YnVzaW5lc3M6YXV0b2Rlc2s2MTMy
    //b.5f045cf4-0872-47b6-96b7-a90d703b0735
    let hubs = await getHubsAsync();
    hubs = hubs.map((d) => ({
      id: d.id,
      hub: d.id,
      project: undefined,
      folder: undefined,
      type: d.type,
      label: d.attributes?.name,
      url: d.links?.self?.href,
      parent: null,
      hidden: undefined,
    }));

    let projects = await Promise.all(await hubs.map(
        hub => getProjectsInHubAsync(hub.id)
    ));

    console.log("projects!", projects);
    // allItems = _.flatten(projects).map( d=> ({"id": d.id, "type": d.type, "label": d.attributes?.name, "url": d.links?.self?.href}))
    // console.log(">>>", projects);

    projects = _.flatten(projects).map((d) => ({
      parent: d.parent,
      id: d.id,
      hub: d.parent,
      project: d.id,
      folder: undefined,
      type: d.type,
      label: d.attributes?.name,
      url: d.links?.webView?.href,
      hidden: undefined,
    }));

//Sample Project - Seaport Civic Center
//https://acc.autodesk.com/docs/files/projects/e362309c-30dc-400c-b1f0-a43c961f72c7

// folder
// urn:adsk.wipprod:fs.folder:co.mTWdcyBUQz2OxLW-oIk7iw
// Beta UX Testing
const hubId = 'b.5f045cf4-0872-47b6-96b7-a90d703b0735';
const projectId = 'b.fefc31c1-4543-43e5-a5e0-cef84dcec443';
const uxTestingFolderId = 'urn:adsk.wipprod:fs.folder:co.mTWdcyBUQz2OxLW-oIk7iw';
const supportFileFormatsExamplesFolderId = 'urn:adsk.wipprod:fs.folder:co.bnix0c_oVVGu_QVX_MXpzg';
const sharedFolderId = 'urn:adsk.wipprod:fs.folder:co.vsPwHUAZTQOYIzCoAbiQjQ';
const contractorsFolderId = 'urn:adsk.wipprod:fs.folder:co.eVarTvc9WHiYn61Bh-OSFg';
// works on Project Files folder, but not on the top folder (i.e., without folder)
const projectFilesFolderId = 'urn:adsk.wipprod:fs.folder:co.IlCxBV4SQv6EoUFcjqd1sQ';

const topLevelItems = await getItemsInProjectsAsync('b.5f045cf4-0872-47b6-96b7-a90d703b0735', 'b.e362309c-30dc-400c-b1f0-a43c961f72c7', undefined);
// Expects around a dozen folders
const someFolderItems = await getItemsInProjectsAsync('b.5f045cf4-0872-47b6-96b7-a90d703b0735', 'b.fefc31c1-4543-43e5-a5e0-cef84dcec443', 'urn:adsk.wipprod:fs.folder:co.rV-crPy6Tu2Za5U_Eyeq6Q');

const uxTestingFolderItems = await getItemsInProjectsAsync(hubId, projectId, uxTestingFolderId);
// const topLevelItems = await getItemsInProjectsAsync('b.5f045cf4-0872-47b6-96b7-a90d703b0735', 'b.e362309c-30dc-400c-b1f0-a43c961f72c7');

// const secLevelItems = await getItemsInProjectsAsync('b.5f045cf4-0872-47b6-96b7-a90d703b0735', 'b.e362309c-30dc-400c-b1f0-a43c961f72c7', 'urn:adsk.wipprod:fs.folder:co.IlCxBV4SQv6EoUFcjqd1sQ');

// console.log("test top items:", topLevelItems);
console.log("uxTestingFolderItems:", uxTestingFolderItems);
// console.log("test folderx items:", someFolderItems);
// console.log("test 2nd level items:", secLevelItems);

// const hubsAndProjects = [...hubs, ...projects];
// console.log("hubs and projects:", hubsAndProjects);
let _allStuff = [...hubs, ...projects];

// const items = await getAllItemsRecursively(projects);
// for await (const item of items) {
//   console.log("totalll:", item);
// }
// console.log("all items:", items, "all stuff:", _allStuff);


(async () => {
  console.log("yield!!!!");

  // const newItems = await toArray(getItemsInProjectsAsync2(hubId, projectId, projectFilesFolderId));
  // // should be 120? items
  // console.log("yield test projectFilesFolder:", newItems);

  // const newItems = await toArray(getItemsInProjectsAsync2(hubId, projectId, uxTestingFolderId));
  // // should be 23 items
  // console.log("yield test ux testing folder:", newItems);
  
  // const newItems = await toArray(getItemsInProjectsAsync2(hubId, projectId, supportFileFormatsExamplesFolderId));
  // // should be 36 items
  // console.log("yield test supportFileFormatsExamplesFolder:", newItems);

  // const newItems = await toArray(getItemsInProjectsAsync2(hubId, projectId, sharedFolderId));
  // // should be 1 item
  // console.log("yield test sharedFolder:", newItems);

  // const newItems = await toArray(getItemsInProjectsAsync2(hubId, projectId, contractorsFolderId));
  // // should be 0 items
  // console.log("yield test contractorsFolder:", newItems);

  const newItems = await toArray(getItemsInProjectsAsync2(hubId, projectId, undefined));
  // should be 121 items
  console.log("yield test on top folder:", newItems);
})();

// (async ()=> {
//   for await (const x of getItemsInProjectsAsync2(hubId, projectId, uxTestingFolderId)) console.log(">", x);
// })();

// forAwait(getItemsInProjectsAsync2('b.5f045cf4-0872-47b6-96b7-a90d703b0735', 'b.fefc31c1-4543-43e5-a5e0-cef84dcec443', 'urn:adsk.wipprod:fs.folder:co.rV-crPy6Tu2Za5U_Eyeq6Q'), x => console.log(x));
// console.log("all stuff:", _allStuff);

// return  [...hubs, ...projects, ...topItems, ...allItems];
// return  [...hubs, ...projects];

}

export { getAllItemsAsync as getAllItems };
