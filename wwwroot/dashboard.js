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

// returns a dataTable consisting of rows of items
async function getAllItemsRecursively(
  folderItems,
  dataTable
) {

  // let dataTable = [];

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
    getAllItemsRecursively(newFolders);
  }
  //  else {

    // return dataTable;
  // }
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


const topLevelItems = await getItemsInProjectsAsync('b.5f045cf4-0872-47b6-96b7-a90d703b0735', 'b.e362309c-30dc-400c-b1f0-a43c961f72c7', undefined);
// Expects around a dozen folders
const someFolderItems = await getItemsInProjectsAsync('b.5f045cf4-0872-47b6-96b7-a90d703b0735', 'b.fefc31c1-4543-43e5-a5e0-cef84dcec443', 'urn:adsk.wipprod:fs.folder:co.rV-crPy6Tu2Za5U_Eyeq6Q');
// const topLevelItems = await getItemsInProjectsAsync('b.5f045cf4-0872-47b6-96b7-a90d703b0735', 'b.e362309c-30dc-400c-b1f0-a43c961f72c7');

// const secLevelItems = await getItemsInProjectsAsync('b.5f045cf4-0872-47b6-96b7-a90d703b0735', 'b.e362309c-30dc-400c-b1f0-a43c961f72c7', 'urn:adsk.wipprod:fs.folder:co.IlCxBV4SQv6EoUFcjqd1sQ');

// console.log("test top items:", topLevelItems);
console.log("test folder items:", someFolderItems);
// console.log("test 2nd level items:", secLevelItems);

// const hubsAndProjects = [...hubs, ...projects];
// console.log("hubs and projects:", hubsAndProjects);
let _allStuff = [...hubs, ...projects];
const items = await getAllItemsRecursively(projects, _allStuff);
console.log("all items:", items, "all stuff:", _allStuff);

// return  [...hubs, ...projects, ...topItems, ...allItems];
// return  [...hubs, ...projects];

}

export { getAllItemsAsync as getAllItems };
