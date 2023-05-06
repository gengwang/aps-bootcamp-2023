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

  // an item can be a top folder, a non-top folder, or an item (file or data exchange)
  return items.map((d) => {
    const parent = !folderId ? projectId : folderId;
    return {
      ...d,
      parent: parent,
      hub: hubId,
      project: projectId,
      folder: d.type === "folders" ? d.id : parent,
    };
  });
}

async function* getItemsInProjectsRecursivelyAsync(hubId, projectId, folderId) {
  let newItems = await getItemsInProjectsAsync(hubId, projectId, folderId);

  // transform
  newItems = newItems.map((d) => ({
    parent: d.parent,
    id: d.id,
    hub: hubId,
    project: projectId,
    folder: d.id, // a folder's folder is itself!
    type: d.type,
    label: d.attributes?.displayName,
    lastModified: d.attributes?.lastModifiedTimeRollup,
    lastModifiedBy: d.attributes?.lastModifiedUserName,
    url: d.links?.webView?.href,
    hidden: d.attributes?.hidden,
  }));

  for (const newItem of newItems) {
    const { type, hub, project, folder } = newItem;

    if (type === "folders") {
      yield newItem; // return folder
      yield* getItemsInProjectsRecursivelyAsync(hub, project, folder); // then drill down
    } else {
      yield newItem; // return folder
    }
  }
}

/* Get all the hubs, projects, folders and items under the user's ACC hubs */
async function getAllAsync() {
  let hubs = await getHubsAsync();
  hubs = hubs.map((d) => ({
    id: d.id,
    type: d.type,
    label: d.attributes?.name,
    region: d.attributes?.region,
    url: d.links?.self?.href,
    parent: null,
  }));

  // TODO: There are some interesting attributes such as "scopes",
  // "relationships>rootFolder" and "relationship>topFolders" that can be added
  let projects = await Promise.all(
    await hubs.map((hub) => getProjectsInHubAsync(hub.id))
  );

  projects = _.flatten(projects).map((d) => ({
    id: d.id,
    type: d.type,
    label: d.attributes?.name,
    url: d.links?.webView?.href,
    parent: d.parent,
    hub: d.parent,
  }));

  let foldersAndItems = await Promise.all(
    await projects.map((project) => {
      const { hub: hubId, id: projectId } = project;
      return toArray(getItemsInProjectsRecursivelyAsync(hubId, projectId));
    })
  );

  foldersAndItems = foldersAndItems.flat();
  const stuff = [...hubs, ...projects, ...foldersAndItems];
  return stuff;
}

export { getAllAsync as getAllItems };
