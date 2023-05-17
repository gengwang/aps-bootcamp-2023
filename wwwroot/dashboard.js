//////////////////////////////////////////////////////
/// HELPERS

async function reduce(asyncIter, f, init) {
  let res = init;
  for await (const x of asyncIter) {
    res = f(res, x);
  }
  return res;
}

const toArray = (iter) => reduce(iter, (a, x) => (a.push(x), a), []);

//////////////////////////////////////////////////////
/// "private" Methods
async function _getHubsAsync() {
  return await fetch("/api/hubs")
    .then((res) => res.json())
    .catch((err) => console.error(err));
}

async function _getProjectsInHubAsync(hubId) {
  return await fetch(`/api/hubs/${hubId}/projects`)
    .then((res) => res.json())
    .catch((err) => console.error(err));
}

async function _getItemsInProjectsAsync(hubId, projectId, folderId) {
  return await fetch(
    `/api/hubs/${hubId}/projects/${projectId}/folders/${folderId}/contents`
  )
    .then((res) => res.json())
    .catch((err) => console.error(err));
  }

//////////////////////////////////////////////////////
 
async function getHubsAsync() {
  const hubs = await fetch("/api/hubs")
    .then((res) => res.json())
    .catch((err) => console.error(err));

  return hubs.map((d) => {
    const id = d.id;
    const name = d.attributes?.name;
    const url = null;
    const newRoute = [{ id: id, name: name, url: url }];
    return { id: id, type: d.type, parent: null, name: name, url: url, route: newRoute, region: d.attributes?.region};
  });
}

/**
 * 
 * @param route [{name: hubName, id: hubId}] 
 * @returns  list of projects
 */
async function getProjectsInHubAsync(route) {
  const { id:hubId } = route[0];
  const projects = await fetch(`/api/hubs/${hubId}/projects`)
    .then((res) => res.json())
    .catch((err) => console.error(err));
  return projects.map((d) => {
    const id = d.id;
    const name = d.attributes?.name;
    const url = d.links?.webView?.href;
    const newRoute = [...route, {id: id, name: name, url: url}];
    return {
      id: id,
      type: d.type,
      parent: hubId,
      name: name,
      url: url,
      route: newRoute,
    };
  });
}

/**
 * 
 * @param {*} route: [{name: hubName, id: hubId}, {name: projectName, id: projectId}, {name: folderName, id: folderId}, ...] 
 * @returns items in a project. An item can be a top folder, a non-top folder, or an item (file or data exchange)
 */
async function getItemsInProjectsAsync(route) {
  const {id: hubId} = route[0];
  const {id: projectId} = route[1];
  const folderId = route.length >= 3 ? route[route.length - 1].id : undefined;

  const items = await fetch(
    `/api/hubs/${hubId}/projects/${projectId}/folders/${folderId}/contents`
  )
    .then((res) => res.json())
    .catch((err) => console.error(err));

  return items.map((d) => {
    const id = d.id;
    const name = d.attributes?.displayName? d.attributes?.displayName : d.attributes?.name;
    const url = d.links?.webView?.href;
    const newRoute = [...route, {id: id, name: name, url: url}];
    const parentId = !folderId ? projectId : folderId; // if it's a top folder or not

    return {
      id: id,
      parent: parentId,
      name: name,
      url: url,
      type: d.type,
      route: newRoute,
      extensionType: d.attributes?.extension?.type, // 'items:autodesk.bim360:File', 'items:autodesk.bim360:FDX', 'items:autodesk.bim360:C4RModel
      sourceFileName: d.attributes?.extension?.data?.sourceFileName,
      lastModified: d.attributes?.lastModifiedTime,
      lastModifiedBy: d.attributes?.lastModifiedUserName,
      createTime: d.attributes?.createTime,
      hidden: d.attributes?.hidden,
    };
  });
}

async function* getItemsInProjectsRecursivelyAsync(route) {

  let newItems = await getItemsInProjectsAsync(route);

  for (const newItem of newItems) {
    if (newItem.type === "folders") {
      yield newItem; // return folder
      yield* getItemsInProjectsRecursivelyAsync(newItem.route); // then drill down
    } else {
      yield newItem; // return folder
    }
  }
}

/* Get all the hubs, projects, folders and items under the user's ACC hubs */
async function getAllAsync() {
  let hubs = await getHubsAsync();

  // TODO: There are some interesting attributes such as "scopes",
  // "relationships>rootFolder" and "relationship>topFolders" that can be added
  let projects = await Promise.all(
    await hubs.map((hub) => getProjectsInHubAsync(hub.route))
  );

  projects = _.flatten(projects);

  let foldersAndItems = await Promise.all(
    await projects.map((project) => {
      return toArray(getItemsInProjectsRecursivelyAsync(project.route));
    })
  );

  foldersAndItems = foldersAndItems.flat();
  const stuff = [...hubs, ...projects, ...foldersAndItems];
  return stuff;
}

async function lab() {
  // _getHubsAsync().then(d=>console.log('hubs:', d));
  // return;

  getHubsAsync().then(d=>console.log('hubs:', d));
  // getProjectsInHubAsync({id:'a.YnVzaW5lc3M6YXV0b2Rlc2s2MTMy',  name: 'Forge Data'}).then(d => console.log('Forge Data:', d));
  // getProjectsInHubAsync({id:'b.5f045cf4-0872-47b6-96b7-a90d703b0735', name: 'Trial account geng.wang@autodesk.com'}).then(d => console.log('In trial account, projects:', d));
  getProjectsInHubAsync([{
    "id": "b.5f045cf4-0872-47b6-96b7-a90d703b0735",
    "name": "Trial account geng.wang@autodesk.com",
    "url": null
}]).then(d => console.log('In trial account, projects:', d));
  // 500
  // getProjectsInHubAsync('b.5bab4ae3-4c3d-431b-95d3-eb22e8e50894').then(d => console.log('Data Exchanges', d));
  // 500
  // getProjectsInHubAsync('b.d7617730-85af-494f-9105-9b16425b7e97').then(d => console.log('Data Exchange API Private Beta', d));
  // 500
  // getProjectsInHubAsync('b.e3be8c87-1df5-470f-9214-1b6cc85452fa').then(d => console.log('FDX Testing PROD', d));
  
  // trial account ADSK
  const hubId = "b.5f045cf4-0872-47b6-96b7-a90d703b0735";
  // Sample Project - Seaport Civic Center
  // https://acc.autodesk.com/docs/files/projects/e362309c-30dc-400c-b1f0-a43c961f72c7
  const projectId = "b.e362309c-30dc-400c-b1f0-a43c961f72c7";
  // Project Files
  const projectFilesFolderId = "urn:adsk.wipprod:fs.folder:co.IlCxBV4SQv6EoUFcjqd1sQ";
  // // Beta UX Testing
  const uxTestingFolderId = "urn:adsk.wipprod:fs.folder:co.mTWdcyBUQz2OxLW-oIk7iw";
  
  const routeToProject = [
    {
      id: "b.5f045cf4-0872-47b6-96b7-a90d703b0735",
      name: "Trial account geng.wang@autodesk.com",
      url: null,
    },
    {
      id: "b.e362309c-30dc-400c-b1f0-a43c961f72c7",
      name: "Sample Project - Seaport Civic Center",
      url: "https://acc.autodesk.com/docs/files/projects/e362309c-30dc-400c-b1f0-a43c961f72c7",
    },
  ];

  const routeToProjectFilesFolder = [
    {
      id: "b.5f045cf4-0872-47b6-96b7-a90d703b0735",
      name: "Trial account geng.wang@autodesk.com",
      url: null,
    },
    {
      id: "b.e362309c-30dc-400c-b1f0-a43c961f72c7",
      name: "Sample Project - Seaport Civic Center",
      url: "https://acc.autodesk.com/docs/files/projects/e362309c-30dc-400c-b1f0-a43c961f72c7",
    },
    {
      id: "urn:adsk.wipprod:fs.folder:co.IlCxBV4SQv6EoUFcjqd1sQ",
      name: "Project Files",
      url: "https://acc.autodesk.com/docs/files/projects/e362309c-30dc-400c-b1f0-a43c961f72c7?folderUrn=urn%3Aadsk.wipprod%3Afs.folder%3Aco.IlCxBV4SQv6EoUFcjqd1sQ",
    },
  ];
  const items = await getItemsInProjectsAsync(routeToProjectFilesFolder);
  console.log("items>>", items);

}

export { getAllAsync as getAllItems, lab };